import { OpensAtDoorNumberCalculator } from '@b-calendar/domain';
import { T0, TestData, hoursAfter } from '@b-calendar/contracts/test-kit';
import { describe, expect, it } from 'vitest';

describe('OpensAtDoorNumberCalculator', () => {
  const calculator = new OpensAtDoorNumberCalculator();
  const data = new TestData();

  it('numbers doors 1 … n by when they open', () => {
    const [a, b, c] = [data.doorId(), data.doorId(), data.doorId()];

    const ordered = calculator.ordered([
      { id: a, opensAt: hoursAfter(T0, 48), addedAt: T0 },
      { id: b, opensAt: T0, addedAt: T0 },
      { id: c, opensAt: hoursAfter(T0, 24), addedAt: T0 },
    ]);

    expect(ordered.map((door) => door.id)).toEqual([b, c, a]);
  });

  it('orders doors that open together by when they were added, then by id', () => {
    const [early, late] = [data.doorId(), data.doorId()];
    const x = '00000000-0000-0000-0000-00000000000a' as typeof early;
    const y = '00000000-0000-0000-0000-00000000000b' as typeof early;

    const byAdded = calculator.ordered([
      { id: late, opensAt: T0, addedAt: hoursAfter(T0, 1) },
      { id: early, opensAt: T0, addedAt: T0 },
    ]);
    const byId = calculator.ordered([
      { id: y, opensAt: T0, addedAt: T0 },
      { id: x, opensAt: T0, addedAt: T0 },
    ]);

    expect(byAdded.map((door) => door.id)).toEqual([early, late]);
    expect(byId.map((door) => door.id)).toEqual([x, y]);
  });

  it('keeps the input as it was', () => {
    const doors = [
      { id: data.doorId(), opensAt: hoursAfter(T0, 1), addedAt: T0 },
      { id: data.doorId(), opensAt: T0, addedAt: T0 },
    ];
    const before = [...doors];

    calculator.ordered(doors);

    expect(doors).toEqual(before);
  });
});
