import type {
  CalendarId,
  CalendarReader,
  PushMessageFactory,
  PushSender,
  SendTestNotification,
  SendTestNotificationOutput,
  SubscriptionReader,
  SubscriptionWriter,
} from '@b-calendar/contracts';

export class SendTestNotificationUseCase implements SendTestNotification {
  public constructor(
    private readonly calendars: CalendarReader,
    private readonly subscriptionReader: SubscriptionReader,
    private readonly subscriptionWriter: SubscriptionWriter,
    private readonly push: PushSender,
    private readonly messages: PushMessageFactory,
  ) {}

  public async execute(input: {
    readonly calendarId: CalendarId;
  }): Promise<SendTestNotificationOutput> {
    const calendar = await this.calendars.getById(input.calendarId);
    const message = this.messages.test(calendar);
    let sent = 0;
    let failed = 0;
    for (const subscription of await this.subscriptionReader.listByCalendar(calendar.id)) {
      const outcome = await this.push.send(subscription, message);
      if (outcome === 'sent') {
        sent += 1;
        continue;
      }
      failed += 1;
      if (outcome === 'gone') {
        await this.subscriptionWriter.remove(subscription.id);
      }
    }
    return { sent, failed };
  }
}
