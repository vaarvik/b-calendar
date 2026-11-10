import type { DoorScheduleCalculator } from '@b-calendar/contracts';

/** Wall-clock time in an IANA time zone to an instant, with the runtime's Intl time zone data. */
export class ZonedDoorScheduleCalculator implements DoorScheduleCalculator {
  private readonly formats = new Map<string, Intl.DateTimeFormat>();

  public opensAt(opensOn: string, time: string, timeZone: string): Date {
    // Both are validated by the contracts' schemas: YYYY-MM-DD and HH:MM.
    const [year, month, day] = opensOn.split('-').map(Number) as [number, number, number];
    const [hour, minute] = time.split(':').map(Number) as [number, number];
    const wall = Date.UTC(year, month - 1, day, hour, minute);
    const firstOffset = this.offset(wall, timeZone);
    const secondOffset = this.offset(wall - firstOffset, timeZone);
    // Different offsets: the guess crossed a daylight saving change; the second one is right.
    return new Date(wall - secondOffset);
  }

  /** How far ahead of UTC the zone's clocks are at `instant`, in ms. */
  private offset(instant: number, timeZone: string): number {
    // en-US numeric parts come as month, day, year, hour, minute, second.
    const [month, day, year, hour, minute, second] = this.format(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => Number(part.value)) as [number, number, number, number, number, number];
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return asUtc - Math.floor(instant / 1000) * 1000;
  }

  private format(timeZone: string): Intl.DateTimeFormat {
    const cached = this.formats.get(timeZone);
    if (cached !== undefined) {
      return cached;
    }
    const format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    this.formats.set(timeZone, format);
    return format;
  }
}
