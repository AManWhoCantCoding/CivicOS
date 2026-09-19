import { VehicleObservationDetail } from '@/components/vehicles/VehicleObservationDetail';

export default async function VehicleObservationPage({
  params,
}: {
  params: Promise<{ observationId: string }>;
}) {
  return (
    <VehicleObservationDetail observationId={(await params).observationId} />
  );
}
