-- PS-E1-009: manually confirmed parking watch; additive persistence only.
CREATE TABLE IF NOT EXISTS "VehicleParkingWatch" (
  "id" TEXT NOT NULL,
  "observationId" TEXT NOT NULL,
  "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleParkingWatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleParkingWatch_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "VehicleObservation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleParkingWatch_observationId_key" ON "VehicleParkingWatch"("observationId");
CREATE INDEX IF NOT EXISTS "VehicleParkingWatch_status_confirmedAt_idx" ON "VehicleParkingWatch"("status", "confirmedAt");
