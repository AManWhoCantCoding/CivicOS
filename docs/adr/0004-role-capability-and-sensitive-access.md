---
status: accepted
---

# Role capability policy with AssignmentTask compatibility and sensitive access

Effective capability is granted only when the union of a user's multi-role base capabilities contains the action and the resource belongs to the user's OrganizationUnit. For resource actions that require explicit responsibility, an active AssignmentTask compatible with those roles must cover the exact resource. The sole assignment-free compatibility seam is that `commander` and `superior_commander` retain their defined command-scope read, Assignment management and corresponding Approval actions inside their own unit; this is not a general Role bypass, and cross-unit access is always denied. `system_operator` holds no business-data capability even with a valid session, while business roles may read sensitive identity (`read_sensitive`) once resource and scope authorization pass. Incompatible tasks are rejected with `INCOMPATIBLE_TASK` before any Assignment row or domain event is created, revoked assignments grant nothing, and the compatibility adapter (`canAccess`/`assertAccess`/`requireRole`) keeps current module guards running without migrating per-module rights or rewriting User, Assignment, or event history.
