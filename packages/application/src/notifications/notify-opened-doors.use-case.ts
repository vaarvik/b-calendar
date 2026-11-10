import type {
  CalendarReader,
  Clock,
  Door,
  DoorReader,
  DoorWriter,
  Logger,
  NotificationDecider,
  NotifyOpenedDoors,
  NotifyOpenedDoorsOutput,
  PushMessageFactory,
  PushSender,
  SubscriptionReader,
  SubscriptionWriter,
} from '@b-calendar/contracts';

export class NotifyOpenedDoorsUseCase implements NotifyOpenedDoors {
  public constructor(
    private readonly doorReader: DoorReader,
    private readonly doorWriter: DoorWriter,
    private readonly calendars: CalendarReader,
    private readonly subscriptionReader: SubscriptionReader,
    private readonly subscriptionWriter: SubscriptionWriter,
    private readonly push: PushSender,
    private readonly decider: NotificationDecider,
    private readonly messages: PushMessageFactory,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  public async execute(): Promise<NotifyOpenedDoorsOutput> {
    const now = this.clock.now();
    let notified = 0;
    let skipped = 0;
    for (const door of await this.doorReader.listUnnotified(now)) {
      const decision = this.decider.decide(door, now);
      if (decision === 'wait') {
        continue;
      }
      // Marked first: at most one notification per door, even if sending crashes.
      await this.doorWriter.save({ ...door, notifiedAt: now });
      if (decision === 'skip') {
        skipped += 1;
        this.logger.info('Skipped a late door notification', { doorId: door.id });
        continue;
      }
      await this.send(door);
      notified += 1;
    }
    return { notified, skipped };
  }

  private async send(door: Door): Promise<void> {
    const calendar = await this.calendars.getById(door.calendarId);
    const message = this.messages.door(calendar, door);
    for (const subscription of await this.subscriptionReader.listByCalendar(calendar.id)) {
      const outcome = await this.push.send(subscription, message);
      if (outcome === 'gone') {
        await this.subscriptionWriter.remove(subscription.id);
      } else if (outcome === 'failed') {
        this.logger.warn('A door notification failed', {
          doorId: door.id,
          subscriptionId: subscription.id,
        });
      }
    }
  }
}
