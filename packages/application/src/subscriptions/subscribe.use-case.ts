import { PushEndpointSchema } from '@b-calendar/contracts';
import type {
  CalendarAccessAuthenticator,
  Clock,
  IdGenerator,
  InputValidator,
  Subscribe,
  SubscribeInput,
  SubscriptionWriter,
} from '@b-calendar/contracts';

export class SubscribeUseCase implements Subscribe {
  public constructor(
    private readonly access: CalendarAccessAuthenticator,
    private readonly subscriptions: SubscriptionWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly validator: InputValidator,
  ) {}

  public async execute(input: SubscribeInput): Promise<void> {
    const { calendar } = await this.access.authenticate(input);
    const endpoint = this.validator.validate(PushEndpointSchema, input.endpoint);
    await this.subscriptions.upsert({
      ...endpoint,
      id: this.ids.subscriptionId(),
      calendarId: calendar.id,
      createdAt: this.clock.now(),
    });
  }
}
