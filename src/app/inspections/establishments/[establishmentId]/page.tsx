import { EstablishmentDetail } from '@/components/inspections/EstablishmentDetail';

export default async function EstablishmentDetailPage({
  params,
}: {
  params: Promise<{ establishmentId: string }>;
}) {
  return (
    <EstablishmentDetail establishmentId={(await params).establishmentId} />
  );
}
