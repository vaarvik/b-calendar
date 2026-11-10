import type {
  CalendarId,
  Subscription,
  SubscriptionId,
  SubscriptionReader,
  SubscriptionWriter,
} from '@b-calendar/contracts';
import type { Kysely } from 'kysely';
import type { Database } from '../shared/shared.model.js';

export class PgSubscriptionRepository implements SubscriptionReader, SubscriptionWriter {
  public constructor(private readonly db: Kysely<Database>) {}

  public async listByCalendar(calendarId: CalendarId): Promise<Subscription[]> {
    const rows = await this.db
      .selectFrom('subscriptions')
      .selectAll()
      .where('calendar_id', '=', calendarId)
      .orderBy('created_at')
      .orderBy('id')
      .execute();
    return rows.map((row) => ({
      id: row.id as SubscriptionId,
      calendarId: row.calendar_id as CalendarId,
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
      createdAt: row.created_at,
    }));
  }

  public async upsert(subscription: Subscription): Promise<void> {
    await this.db
      .insertInto('subscriptions')
      .values({
        id: subscription.id,
        calendar_id: subscription.calendarId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        created_at: subscription.createdAt,
      })
      .onConflict((conflict) =>
        conflict.columns(['calendar_id', 'endpoint']).doUpdateSet((excluded) => ({
          p256dh: excluded.ref('excluded.p256dh'),
          auth: excluded.ref('excluded.auth'),
        })),
      )
      .execute();
  }

  public async remove(id: SubscriptionId): Promise<void> {
    await this.db.deleteFrom('subscriptions').where('id', '=', id).execute();
  }
}
