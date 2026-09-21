-- Shared platform field capabilities: additive hardening indexes for actor evidence scans, assignee SLA scans, and offline queue reconciliation. Safe to re-apply.
CREATE INDEX IF NOT EXISTS "Evidence_actorId_receivedAt_idx" ON "Evidence"("actorId", "receivedAt");
CREATE INDEX IF NOT EXISTS "SlaInstance_assigneeUserId_status_idx" ON "SlaInstance"("assigneeUserId", "status");
CREATE INDEX IF NOT EXISTS "OfflineCommand_resourceType_resourceId_status_idx" ON "OfflineCommand"("resourceType", "resourceId", "status");
