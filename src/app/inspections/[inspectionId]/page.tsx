import { InspectionDetail } from '@/components/inspections/InspectionDetail';

export default async function InspectionPage({
  params,
}: {
  params: Promise<{ inspectionId: string }>;
}) {
  return <InspectionDetail inspectionId={(await params).inspectionId} />;
}
