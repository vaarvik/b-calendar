import type {
  CalendarId,
  Subscription,
  SubscriptionId,
  SubscriptionReader,
  SubscriptionWriter,
} from '@b-calendar/contracts';

/** Push subscriptions in a map. */
export class InMemorySubscriptionRepository implements SubscriptionReader, SubscriptionWriter {
  private readonly rows = new Map<SubscriptionId, Subscription>();

  public listByCalendar(calendarId: CalendarId): Promise<Subscription[]> {
    return Promise.resolve(
      [...this.rows.values()]
        .filter((row) => row.calendarId === calendarId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((row) => structuredClone(row)),
    );
  }

  public upsert(subscription: Subscription): Promise<void> {
    const existing = [...this.rows.values()].find(
      (row) => row.calendarId === subscription.calendarId && row.endpoint === subscription.endpoint,
    );
    const row = existing === undefined ? subscription : { ...existing, keys: subscription.keys };
    this.rows.set(row.id, structuredClone(row));
    return Promise.resolve();
  }

  public remove(id: SubscriptionId): Promise<void> {
    this.rows.delete(id);
    return Promise.resolve();
  }
}
