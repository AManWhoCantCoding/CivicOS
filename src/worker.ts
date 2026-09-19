import { closeOutboxClient } from './modules/eventing/outbox';
import { createEventWorker } from './modules/eventing/worker';
import './modules/eventing/projection';
import './modules/incidents/projection';
import './modules/inspections/projection';
import './modules/platform/notifications';
import './modules/vehicles/projection';

const intervalMs = Number(process.env.EVENT_WORKER_INTERVAL_MS ?? 1000);
const worker = createEventWorker(intervalMs);

async function stop(): Promise<void> {
  worker.stop();
  await closeOutboxClient();
}

process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

void worker.tick();
