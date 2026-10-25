'use client';

import { useState } from 'react';

import { VehicleObservationForm } from './VehicleObservationForm';
import { VehicleObservationList } from './VehicleObservationList';
import { VehicleStatistics } from './VehicleStatistics';

export function VehicleObservationWorkspace() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <VehicleStatistics refreshKey={refreshKey} />
      <VehicleObservationForm
        onSaved={() => setRefreshKey((value) => value + 1)}
      />
      <VehicleObservationList refreshKey={refreshKey} />
    </div>
  );
}
