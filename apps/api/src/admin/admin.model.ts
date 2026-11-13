import type {
  AddDoor,
  CreateCalendar,
  EditDoor,
  GetCalendarDetails,
  ListCalendars,
  LogIn,
  PublishCalendar,
  RemoveDoor,
  RotateCalendarKey,
  SendTestNotification,
  UpdateCalendar,
} from '@b-calendar/contracts';

/** Everything the admin can do over HTTP. */
export interface AdminUseCases {
  readonly logIn: LogIn;
  readonly listCalendars: ListCalendars;
  readonly createCalendar: CreateCalendar;
  readonly getCalendarDetails: GetCalendarDetails;
  readonly updateCalendar: UpdateCalendar;
  readonly publishCalendar: PublishCalendar;
  readonly rotateCalendarKey: RotateCalendarKey;
  readonly addDoor: AddDoor;
  readonly editDoor: EditDoor;
  readonly removeDoor: RemoveDoor;
  readonly sendTestNotification: SendTestNotification;
}
