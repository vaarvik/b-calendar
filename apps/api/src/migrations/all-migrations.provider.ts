import type { Migration, MigrationProvider } from 'kysely/migration';
import { M0001CalendarsMigration } from './m0001-calendars.migration.js';
import { M0002FeaturedDoorsMigration } from './m0002-featured-doors.migration.js';
import { M0003DoorTimesOfDayMigration } from './m0003-door-times-of-day.migration.js';
import { M0004DraftsAndVersionsMigration } from './m0004-drafts-and-versions.migration.js';
import { M0005HiddenDoorsMigration } from './m0005-hidden-doors.migration.js';
import { M0006DoorVideoAndAudioMigration } from './m0006-door-video-and-audio.migration.js';
import { M0007FollowerLinksMigration } from './m0007-follower-links.migration.js';
import { M0008SecondPhotosMigration } from './m0008-second-photos.migration.js';
import { M0009DoorCommentsMigration } from './m0009-door-comments.migration.js';

/**
 * Every migration, keyed so that string order is execution order. Add new ones at the end.
 * Kysely copies migration objects with spread, which drops class methods, so each class is
 * handed over as a plain `{ up, down }` object bound to its instance.
 */
export class AllMigrationsProvider implements MigrationProvider {
  public getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Required<Migration>> = {
      '0001_calendars': new M0001CalendarsMigration(),
      '0002_featured_doors': new M0002FeaturedDoorsMigration(),
      '0003_door_times_of_day': new M0003DoorTimesOfDayMigration(),
      '0004_drafts_and_versions': new M0004DraftsAndVersionsMigration(),
      '0005_hidden_doors': new M0005HiddenDoorsMigration(),
      '0006_door_video_and_audio': new M0006DoorVideoAndAudioMigration(),
      '0007_follower_links': new M0007FollowerLinksMigration(),
      '0008_second_photos': new M0008SecondPhotosMigration(),
      '0009_door_comments': new M0009DoorCommentsMigration(),
    };
    return Promise.resolve(
      Object.fromEntries(
        Object.entries(migrations).map(([name, migration]) => [
          name,
          { up: (db) => migration.up(db), down: (db) => migration.down(db) } satisfies Migration,
        ]),
      ),
    );
  }
}
