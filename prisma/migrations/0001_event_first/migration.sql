-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "organizationUnitId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "assigneeUserId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorRole" TEXT,
    "actorName" TEXT,
    "organizationId" TEXT,
    "correlationId" TEXT,
    "causationId" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "EventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimToken" TEXT,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deadLetterAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectionCheckpoint" (
    "name" TEXT NOT NULL,
    "lastRecordedAt" TIMESTAMP(3),
    "processedEventIds" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectionCheckpoint_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "ProjectionRecord" (
    "id" TEXT NOT NULL,
    "projectionName" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "reason" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "metadata" JSONB NOT NULL,
    "immutable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaInstance" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "overdueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assigneeUserId" TEXT,
    "overdueEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "sourceEventId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineCommand" (
    "id" TEXT NOT NULL,
    "clientCommandId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "commandType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "baseVersion" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "response" JSONB,
    "error" TEXT,
    "lastAttemptAt" TIMESTAMP(3),

    CONSTRAINT "OfflineCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeReport" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceContact" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "sensitiveRef" TEXT,
    "sensitiveRefIndex" TEXT,
    "createdById" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "intakeReportId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "category" TEXT,
    "severity" TEXT,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "licenseRef" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "establishmentType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "result" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "checklistResponses" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionFinding" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "checklistKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "evidenceIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnforcementRecommendation" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "findingIds" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "submittedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnforcementRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspiciousVehicleEntry" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuspiciousVehicleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleObservation" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "observedById" TEXT NOT NULL,
    "clientCommandId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "evidenceIds" JSONB NOT NULL DEFAULT '[]',
    "matchedRegistryId" TEXT,
    "matchConfirmedAt" TIMESTAMP(3),
    "matchConfirmedById" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVerification" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "evidenceIds" JSONB NOT NULL DEFAULT '[]',
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Assignment_resourceType_resourceId_status_idx" ON "Assignment"("resourceType", "resourceId", "status");

-- CreateIndex
CREATE INDEX "Assignment_assigneeUserId_status_idx" ON "Assignment"("assigneeUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventRecord_eventId_key" ON "EventRecord"("eventId");

-- CreateIndex
CREATE INDEX "EventRecord_aggregateType_aggregateId_aggregateVersion_idx" ON "EventRecord"("aggregateType", "aggregateId", "aggregateVersion");

-- CreateIndex
CREATE INDEX "EventRecord_eventType_occurredAt_idx" ON "EventRecord"("eventType", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventRecord_aggregateType_aggregateId_aggregateVersion_key" ON "EventRecord"("aggregateType", "aggregateId", "aggregateVersion");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_eventId_key" ON "OutboxMessage"("eventId");

-- CreateIndex
CREATE INDEX "OutboxMessage_status_availableAt_idx" ON "OutboxMessage"("status", "availableAt");

-- CreateIndex
CREATE INDEX "ProjectionRecord_projectionName_updatedAt_idx" ON "ProjectionRecord"("projectionName", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectionRecord_projectionName_aggregateType_aggregateId_key" ON "ProjectionRecord"("projectionName", "aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_occurredAt_idx" ON "AuditEvent"("resourceType", "resourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_occurredAt_idx" ON "AuditEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "Evidence_resourceType_resourceId_idx" ON "Evidence"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_resourceType_resourceId_originalHash_key" ON "Evidence"("resourceType", "resourceId", "originalHash");

-- CreateIndex
CREATE UNIQUE INDEX "SlaInstance_overdueEventId_key" ON "SlaInstance"("overdueEventId");

-- CreateIndex
CREATE INDEX "SlaInstance_status_dueAt_idx" ON "SlaInstance"("status", "dueAt");

-- CreateIndex
CREATE INDEX "SlaInstance_resourceType_resourceId_idx" ON "SlaInstance"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SlaInstance_resourceType_resourceId_kind_key" ON "SlaInstance"("resourceType", "resourceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_sourceEventId_key" ON "Notification"("sourceEventId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineCommand_clientCommandId_key" ON "OfflineCommand"("clientCommandId");

-- CreateIndex
CREATE INDEX "OfflineCommand_actorId_status_idx" ON "OfflineCommand"("actorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeReport_idempotencyKey_key" ON "IntakeReport"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeReport_incidentId_key" ON "IntakeReport"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_intakeReportId_key" ON "Incident"("intakeReportId");

-- CreateIndex
CREATE INDEX "Incident_status_updatedAt_idx" ON "Incident"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Incident_category_severity_idx" ON "Incident"("category", "severity");

-- CreateIndex
CREATE INDEX "Establishment_type_active_idx" ON "Establishment"("type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_establishmentType_version_key" ON "ChecklistTemplate"("establishmentType", "version");

-- CreateIndex
CREATE INDEX "Inspection_establishmentId_scheduledAt_idx" ON "Inspection"("establishmentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Inspection_status_scheduledAt_idx" ON "Inspection"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_establishmentId_scheduledAt_key" ON "Inspection"("establishmentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "InspectionFinding_inspectionId_idx" ON "InspectionFinding"("inspectionId");

-- CreateIndex
CREATE INDEX "EnforcementRecommendation_inspectionId_status_idx" ON "EnforcementRecommendation"("inspectionId", "status");

-- CreateIndex
CREATE INDEX "SuspiciousVehicleEntry_plate_status_validFrom_validUntil_idx" ON "SuspiciousVehicleEntry"("plate", "status", "validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleObservation_clientCommandId_key" ON "VehicleObservation"("clientCommandId");

-- CreateIndex
CREATE INDEX "VehicleObservation_plate_observedAt_idx" ON "VehicleObservation"("plate", "observedAt");

-- CreateIndex
CREATE INDEX "VehicleObservation_status_observedAt_idx" ON "VehicleObservation"("status", "observedAt");

-- CreateIndex
CREATE INDEX "VehicleVerification_observationId_verifiedAt_idx" ON "VehicleVerification"("observationId", "verifiedAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventRecord"("eventId") ON DELETE CASCADE ON UPDATE CASCADE;
