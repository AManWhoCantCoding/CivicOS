-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "reason" TEXT,
    "payload" JSONB NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Approval_resourceType_resourceId_status_idx" ON "Approval"("resourceType", "resourceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_resourceType_resourceId_action_status_key" ON "Approval"("resourceType", "resourceId", "action", "status");
