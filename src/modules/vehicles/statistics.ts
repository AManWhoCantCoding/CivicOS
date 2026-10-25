const statisticsTimeZone = 'Asia/Ho_Chi_Minh';

export type VehicleStatisticsObservation = {
  observedAt: Date;
  latitude: number;
  longitude: number;
};

export type VehicleStatistics = {
  monthlyFrequency: { month: string; count: number }[];
  locationFrequency: { cellId: string; count: number }[];
};

function localMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: statisticsTimeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find(({ type }) => type === 'year')?.value;
  const month = parts.find(({ type }) => type === 'month')?.value;
  if (!year || !month) throw new Error('INVALID_OBSERVATION_DATE');
  return `${year}-${month}`;
}

export function aggregateVehicleStatistics(
  observations: VehicleStatisticsObservation[],
): VehicleStatistics {
  const months = new Map<string, number>();
  const cells = new Map<string, number>();

  for (const observation of observations) {
    const month = localMonth(observation.observedAt);
    const latitudeIndex = Math.floor(observation.latitude * 1000);
    const longitudeIndex = Math.floor(observation.longitude * 1000);
    const cellId = `${latitudeIndex}:${longitudeIndex}`;
    months.set(month, (months.get(month) ?? 0) + 1);
    cells.set(cellId, (cells.get(cellId) ?? 0) + 1);
  }

  return {
    monthlyFrequency: [...months]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([month, count]) => ({ month, count })),
    locationFrequency: [...cells]
      .sort(
        ([leftId, leftCount], [rightId, rightCount]) =>
          rightCount - leftCount || leftId.localeCompare(rightId),
      )
      .map(([cellId, count]) => ({ cellId, count })),
  };
}
