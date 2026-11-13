import type { Kysely } from 'kysely';
import type { Migration } from 'kysely/migration';

/** A door can hold an uploaded video and a song next to its photo. */
export class M0006DoorVideoAndAudioMigration implements Migration {
  public async up(db: Kysely<unknown>): Promise<void> {
    await db.schema
      .alterTable('doors')
      .addColumn('video_url', 'text')
      .addColumn('audio_url', 'text')
      .execute();
  }

  public async down(db: Kysely<unknown>): Promise<void> {
    await db.schema.alterTable('doors').dropColumn('video_url').dropColumn('audio_url').execute();
  }
}
