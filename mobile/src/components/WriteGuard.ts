export type WriteResult = {
  allowed: false;
  reason: 'MAP_OFFLINE_WRITE_BLOCKED' | 'READ_ONLY_MVP';
};

function isResidentActivity(body: unknown): boolean {
  if (typeof body !== 'string') return false;
  try {
    const command = JSON.parse(body) as Record<string, unknown>;
    const payload = command.payload as Record<string, unknown> | undefined;
    return (
      Object.keys(command).sort().join(',') ===
        'baseVersion,clientCommandId,commandType,occurredAt,payload,payloadVersion,resourceId,resourceType' &&
      command.commandType === 'resident.record_activity' &&
      command.resourceType === 'SubjectManagementRecord' &&
      typeof command.resourceId === 'string' &&
      command.resourceId.length > 0 &&
      typeof command.clientCommandId === 'string' &&
      typeof command.occurredAt === 'string' &&
      command.payloadVersion === 1 &&
      Number.isInteger(command.baseVersion) &&
      Number(command.baseVersion) >= 0 &&
      !!payload &&
      Object.keys(payload).every((key) =>
        ['activityType', 'content', 'evaluation'].includes(key),
      ) &&
      typeof payload.activityType === 'string' &&
      typeof payload.content === 'string' &&
      payload.content.length <= 500 &&
      (payload.evaluation === undefined ||
        typeof payload.evaluation === 'string')
    );
  } catch {
    return false;
  }
}

function isInspectionCommand(body: unknown): boolean {
  if (typeof body !== 'string') return false;
  try {
    const command = JSON.parse(body) as Record<string, unknown>;
    const payload = command.payload as Record<string, unknown> | undefined;
    const common =
      Object.keys(command).sort().join(',') ===
        'baseVersion,clientCommandId,commandType,occurredAt,payload,payloadVersion,resourceId,resourceType' &&
      command.resourceType === 'Inspection' &&
      typeof command.resourceId === 'string' &&
      command.resourceId.length > 0 &&
      typeof command.clientCommandId === 'string' &&
      command.clientCommandId.length > 0 &&
      typeof command.occurredAt === 'string' &&
      Number.isFinite(Date.parse(command.occurredAt)) &&
      command.payloadVersion === 1 &&
      Number.isInteger(command.baseVersion) &&
      Number(command.baseVersion) >= 0 &&
      !!payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload);
    if (!common || !payload) return false;
    if (command.commandType === 'inspection.start')
      return Object.keys(payload).length === 0;
    if (command.commandType === 'inspection.save_checklist')
      return (
        Object.keys(payload).join(',') === 'responses' &&
        Array.isArray(payload.responses) &&
        payload.responses.every(
          (entry) =>
            entry &&
            typeof entry === 'object' &&
            Object.keys(entry).sort().join(',') === 'key,value' &&
            typeof entry.key === 'string' &&
            typeof entry.value === 'string',
        )
      );
    if (command.commandType === 'inspection.finding') {
      const keys = Object.keys(payload).sort().join(',');
      return (
        [
          'checklistKey,description,result',
          'category,checklistKey,description,result',
          'checklistKey,description,result,severity',
          'category,checklistKey,description,result,severity',
        ].includes(keys) &&
        ['checklistKey', 'description'].every(
          (key) => typeof payload[key] === 'string',
        ) &&
        ['pass', 'reminder', 'needs_action'].includes(String(payload.result)) &&
        (payload.severity === undefined ||
          typeof payload.severity === 'string') &&
        (payload.category === undefined || typeof payload.category === 'string')
      );
    }
    return false;
  } catch {
    return false;
  }
}

export function assertReadOnly(
  method: string,
  offline: boolean,
  path = '',
  body?: BodyInit | null,
): WriteResult | null {
  const verb = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(verb)) return null;
  if (path === '/api/auth/session' && ['POST', 'DELETE'].includes(verb))
    return null;
  if (
    verb === 'POST' &&
    path === '/api/sync' &&
    (isResidentActivity(body) || isInspectionCommand(body))
  )
    return null;
  return {
    allowed: false,
    reason: offline ? 'MAP_OFFLINE_WRITE_BLOCKED' : 'READ_ONLY_MVP',
  };
}
