import type {
  Calendar,
  CalendarDetails,
  CalendarDetailsResponseDto,
  CalendarDto,
  CalendarVersionDto,
  CalendarVersionSummary,
  DoorCountdown,
  DoorCountdownDto,
  DoorPreview,
  DoorPreviewDto,
  OpenDoorContent,
  OpenDoorContentDto,
  OpenDoorOutput,
  OpenDoorResponseDto,
  RecipientCalendar,
  RecipientCalendarResponseDto,
  RecipientDoor,
  RecipientDoorDto,
} from '@b-calendar/contracts';
import type { HttpDtoMapper } from './shared.ports.js';

export class IsoHttpDtoMapper implements HttpDtoMapper {
  public calendar(calendar: Calendar): CalendarDto {
    return { ...calendar, createdAt: calendar.createdAt.toISOString() };
  }

  public calendarDetails(details: CalendarDetails): CalendarDetailsResponseDto {
    return {
      calendar: this.calendar(details.calendar),
      doors: details.doors.map((door) => this.doorPreview(door)),
      unpublishedChanges: details.unpublishedChanges,
      versions: details.versions.map((version) => this.calendarVersion(version)),
      subscriberCount: details.subscriberCount,
    };
  }

  public calendarVersion(version: CalendarVersionSummary): CalendarVersionDto {
    return { ...version, publishedAt: version.publishedAt.toISOString() };
  }

  public recipientCalendar(calendar: RecipientCalendar): RecipientCalendarResponseDto {
    return {
      ...calendar,
      now: calendar.now.toISOString(),
      doors: calendar.doors.map((door) => this.recipientDoor(door)),
    };
  }

  public openDoor(output: OpenDoorOutput): OpenDoorResponseDto {
    return {
      number: output.number,
      opensAt: output.opensAt.toISOString(),
      content: this.content(output.content),
    };
  }

  public doorPreview(door: DoorPreview): DoorPreviewDto {
    return {
      id: door.id,
      number: door.number,
      opensAt: door.opensAt.toISOString(),
      opensOn: door.opensOn,
      openTime: door.openTime,
      featured: door.featured,
      content: { ...door.content, countdown: this.countdown(door.content.countdown) },
      link: door.link,
      notification: door.notification,
      notifiedAt: door.notifiedAt?.toISOString() ?? null,
      firstOpenedAt: door.firstOpenedAt?.toISOString() ?? null,
    };
  }

  private recipientDoor(door: RecipientDoor): RecipientDoorDto {
    if (door.state === 'opened') {
      return { ...door, opensAt: door.opensAt.toISOString(), content: this.content(door.content) };
    }
    return {
      state: door.state,
      number: door.number,
      opensAt: door.opensAt.toISOString(),
      featured: door.featured,
    };
  }

  private content(content: OpenDoorContent): OpenDoorContentDto {
    return { ...content, countdown: this.countdown(content.countdown) };
  }

  private countdown(countdown: DoorCountdown | null): DoorCountdownDto | null {
    return countdown === null ? null : { to: countdown.to.toISOString(), label: countdown.label };
  }
}
