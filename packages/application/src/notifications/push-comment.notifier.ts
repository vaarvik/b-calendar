import type {
  Calendar,
  CommentNotifier,
  Door,
  DoorComment,
  Logger,
  PushMessageFactory,
  PushSender,
  SubscriptionReader,
  SubscriptionWriter,
} from '@b-calendar/contracts';

/** Pushes a comment to the calendar's subscribed phones, the writer's own left out. */
export class PushCommentNotifier implements CommentNotifier {
  public constructor(
    private readonly subscriptionReader: SubscriptionReader,
    private readonly subscriptionWriter: SubscriptionWriter,
    private readonly push: PushSender,
    private readonly messages: PushMessageFactory,
    private readonly logger: Logger,
  ) {}

  public async notify(
    calendar: Calendar,
    door: Door,
    comment: DoorComment,
    except: string | null,
  ): Promise<void> {
    const message = this.messages.comment(calendar, door, comment);
    for (const subscription of await this.subscriptionReader.listByCalendar(calendar.id)) {
      if (subscription.endpoint === except) {
        continue;
      }
      const outcome = await this.push.send(subscription, message);
      if (outcome === 'gone') {
        await this.subscriptionWriter.remove(subscription.id);
      } else if (outcome === 'failed') {
        this.logger.warn('A comment notification failed', {
          commentId: comment.id,
          subscriptionId: subscription.id,
        });
      }
    }
  }
}
