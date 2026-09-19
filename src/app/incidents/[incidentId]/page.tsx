import { IncidentDetail } from '@/components/incidents/IncidentDetail';

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;
  return <IncidentDetail incidentId={incidentId} />;
}
