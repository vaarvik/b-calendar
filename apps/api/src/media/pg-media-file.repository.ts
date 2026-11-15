import { MEDIA_TYPES } from '@b-calendar/contracts';
import type {
  AccountId,
  MediaContentType,
  MediaFile,
  MediaFileReader,
  MediaFileWriter,
  MediaId,
} from '@b-calendar/contracts';
import type { Kysely } from 'kysely';
import { z } from 'zod';
import type { Database } from '../shared/shared.model.js';
import type { DatabaseErrorTranslator } from '../shared/shared.ports.js';

const ContentTypeSchema = z
  .string()
  .refine((value): value is MediaContentType => Object.hasOwn(MEDIA_TYPES, value));

export class PgMediaFileRepository implements MediaFileReader, MediaFileWriter {
  public constructor(
    private readonly db: Kysely<Database>,
    private readonly errors: DatabaseErrorTranslator,
  ) {}

  public async listByOwner(owner: AccountId): Promise<MediaFile[]> {
    const rows = await this.db
      .selectFrom('media_files')
      .selectAll()
      .where('owner_id', '=', owner)
      .orderBy('created_at')
      .orderBy('id')
      .execute();
    return rows.map((row) => ({
      id: row.id as MediaId,
      ownerId: row.owner_id as AccountId | null,
      contentType: ContentTypeSchema.parse(row.content_type),
      bytes: Number(row.bytes),
      createdAt: row.created_at,
    }));
  }

  public async create(file: MediaFile): Promise<void> {
    try {
      await this.db
        .insertInto('media_files')
        .values({
          id: file.id,
          owner_id: file.ownerId,
          content_type: file.contentType,
          bytes: file.bytes,
          created_at: file.createdAt,
        })
        .execute();
    } catch (error) {
      throw this.errors.translate(error);
    }
  }
}
