export type MarkerPopupRecord = {
  id: string;
  aggregateType: string;
  title: string;
  status: string;
};

export type ParcelPopupRecord = {
  id: string;
  parcelCode: string;
  status: string;
};

export function parcelDetailUrl(id: string): string | null {
  return id.trim() && id === id.trim()
    ? `/land/parcels/${encodeURIComponent(id)}`
    : null;
}

export function createParcelPopupContent(
  parcel: ParcelPopupRecord,
): HTMLElement {
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = parcel.parcelCode;
  const status = document.createElement('p');
  status.textContent = `Trạng thái: ${parcel.status}`;
  const simulated = document.createElement('p');
  simulated.textContent = 'Dữ liệu mô phỏng nội bộ';
  content.append(title, status, simulated);
  const href = parcelDetailUrl(parcel.id);
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = 'Xem chi tiết';
    content.append(link);
  }
  return content;
}

export function markerDetailUrl(
  marker: Pick<MarkerPopupRecord, 'id' | 'aggregateType'>,
): string | null {
  const [type, aggregateId, ...extra] = marker.id.split(':');
  if (
    extra.length ||
    !aggregateId ||
    aggregateId.trim() !== aggregateId ||
    (type !== 'Incident' && type !== 'Inspection') ||
    marker.aggregateType !== type
  )
    return null;
  return `${type === 'Incident' ? '/incidents/' : '/inspections/'}${encodeURIComponent(aggregateId)}`;
}

export function createMarkerPopupContent(
  marker: MarkerPopupRecord,
): HTMLElement {
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = marker.title;
  const status = document.createElement('p');
  status.textContent = `Trạng thái: ${marker.status}`;
  content.append(title, status);
  const href = markerDetailUrl(marker);
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = 'Xem chi tiết';
    content.append(link);
  }
  return content;
}
