import { IntakeReportDetail } from '@/components/incidents/IntakeReportDetail';

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  return <IntakeReportDetail reportId={reportId} />;
}
