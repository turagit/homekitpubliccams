import { FrameScheduler } from '../src/frame/frame-scheduler';

describe('FrameScheduler', () => {
  it('sequential mode cycles through indices', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 4, mode: 'sequential' });
    expect(scheduler.nextIndex(3)).toBe(0);
    expect(scheduler.nextIndex(3)).toBe(1);
    expect(scheduler.nextIndex(3)).toBe(2);
    expect(scheduler.nextIndex(3)).toBe(0); // wraps
  });

  it('newest-first always returns 0', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 4, mode: 'newest-first' });
    expect(scheduler.nextIndex(5)).toBe(0);
    expect(scheduler.nextIndex(5)).toBe(0);
    expect(scheduler.nextIndex(5)).toBe(0);
  });

  it('shuffle returns valid indices', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 4, mode: 'shuffle' });
    for (let i = 0; i < 20; i++) {
      const idx = scheduler.nextIndex(5);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(5);
    }
  });

  it('returns -1 for empty list', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 4, mode: 'sequential' });
    expect(scheduler.nextIndex(0)).toBe(-1);
  });

  it('getFrameIntervalMs converts seconds to ms', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 10, mode: 'sequential' });
    expect(scheduler.getFrameIntervalMs()).toBe(10000);
  });

  it('getFrameIntervalMs enforces minimum of 1ms', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 0, mode: 'sequential' });
    expect(scheduler.getFrameIntervalMs()).toBe(1000);
  });

  it('reset restores cursor to 0', () => {
    const scheduler = new FrameScheduler({ frameIntervalSec: 4, mode: 'sequential' });
    scheduler.nextIndex(3);
    scheduler.nextIndex(3);
    scheduler.reset();
    expect(scheduler.nextIndex(3)).toBe(0);
  });
});
