import { ConflictError } from '@b-calendar/contracts';
import type {
  CalendarOwnerId,
  MediaFile,
  MediaFileReader,
  MediaFileWriter,
  MediaId,
} from '@b-calendar/contracts';

/** Upload records in a map. Copies on the way in and out, like a database would. */
export class InMemoryMediaFileRepository implements MediaFileReader, MediaFileWriter {
  private readonly rows = new Map<MediaId, MediaFile>();

  public listByOwner(owner: CalendarOwnerId): Promise<MediaFile[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((row) => row.ownerId === owner)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((row) => structuredClone(row)),
    );
  }

  public create(file: MediaFile): Promise<void> {
    if (this.rows.has(file.id)) {
      return Promise.reject(new ConflictError(`Media file ${file.id} exists.`));
    }
    this.rows.set(file.id, structuredClone(file));
    return Promise.resolve();
  }
}
