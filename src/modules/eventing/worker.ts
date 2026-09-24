import { processOneOutboxMessage } from './outbox';
import { markOverdue } from '@/modules/platform';

export function createEventWorker(intervalMs = 1000) {
  let stopping = false;
  let tickInFlight = false;

  async function tick(): Promise<void> {
    if (stopping || tickInFlight) return;
    tickInFlight = true;
    try {
      await processOneOutboxMessage();
    } catch (error) {
      console.error('CivicOS worker tick failed', error);
    }
    try {
      await markOverdue();
    } catch (error) {
      console.error('CivicOS worker tick failed', error);
    } finally {
      tickInFlight = false;
    }
  }

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return {
    tick,
    stop() {
      stopping = true;
      clearInterval(timer);
    },
  };
}
