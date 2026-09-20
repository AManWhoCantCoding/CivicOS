import { processOneOutboxMessage } from './outbox';
import { markOverdue } from '@/modules/platform';

export function createEventWorker(intervalMs = 1000) {
  let stopping = false;

  async function tick(): Promise<void> {
    if (stopping) return;
    try {
      await markOverdue();
      await processOneOutboxMessage();
    } catch (error) {
      console.error('CivicOS worker tick failed', error);
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
