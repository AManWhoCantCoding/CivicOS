import {
  closeOutboxClient,
  createEventWorker,
  registerEventHistoryProjection,
} from '@/modules/eventing';
import { registerIncidentProjections } from '@/modules/incidents';
import { registerInspectionProjections } from '@/modules/inspections';
import { registerNotificationConsumers } from '@/modules/platform';
import { registerVehicleProjections } from '@/modules/vehicles';

registerEventHistoryProjection();
registerIncidentProjections();
registerInspectionProjections();
registerNotificationConsumers();
registerVehicleProjections();

const intervalMs = Number(process.env.EVENT_WORKER_INTERVAL_MS ?? 1000);
const worker = createEventWorker(intervalMs);

async function stop(): Promise<void> {
  worker.stop();
  await closeOutboxClient();
}

process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

void worker.tick();
