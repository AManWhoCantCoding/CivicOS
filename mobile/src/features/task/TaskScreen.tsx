import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ApiError, requestJson } from '../../api/client';
import { getTask, listTasks, type ForceItem } from '../../api/forces';
import {
  MaskedValue,
  OfflineBanner,
  StateMessage,
  mobileBaseline,
} from '../../components/States';
import {
  deepLinkFor,
  isVehicleObservationLink,
} from '../../navigation/deepLinks';
import { useSession } from '../../auth/SessionContext';
import {
  createQueueRetryRunner,
  syncFieldCommand,
  syncResidentActivity,
  type QueueRetryOutcome,
} from './activitySync';
import { addRestoredOnlineListener } from './connectivity';
import {
  nextInspectionVersion,
  readRejected,
  removeCommand,
  readQueue,
  type InspectionCommand,
} from './activityQueue';

export function canRecordResidentActivity(item: ForceItem | null): boolean {
  return (
    !!item &&
    item.assignmentSummary?.task === 'resident_followup' &&
    item.assignmentSummary.status === 'active' &&
    item.resourceType === 'SubjectManagementRecord' &&
    item.relatedInfo?.entityType === 'RESIDENT' &&
    item.relatedInfo.id === item.resourceId &&
    Number.isInteger(item.baseVersion) &&
    (item.baseVersion ?? -1) >= 0
  );
}

export function resetActivityDraft(
  setActivity: (value: string) => void,
  setActivityState: (value: string) => void,
) {
  setActivity('');
  setActivityState('');
}

/**
 * Maps a serialized queue-retry pass to user-visible feedback. Only a fully
 * synced pass replaces the "saved for retry" message; pending/rejected/idle/
 * error passes must keep the existing feedback untouched (undefined).
 */
export function queueRetryFeedback(
  outcome: QueueRetryOutcome,
): string | undefined {
  return outcome === 'synced' ? 'Đã đồng bộ thao tác đã lưu.' : undefined;
}

export function canFieldwork(item: ForceItem | null) {
  return (
    !!item &&
    item.resourceType === 'Inspection' &&
    item.assignmentSummary?.task === 'inspection_fieldwork' &&
    item.assignmentSummary.status === 'active' &&
    Number.isInteger(item.baseVersion) &&
    (item.baseVersion ?? -1) >= 0
  );
}

export function inspectionActions(
  item: ForceItem | null,
  detail: {
    permissions?: { canFieldwork?: boolean };
    inspection?: { id?: string; status?: string; version?: number };
  } | null,
) {
  if (
    !canFieldwork(item) ||
    detail?.permissions?.canFieldwork !== true ||
    detail.inspection?.id !== item?.resourceId
  )
    return { start: false, checklist: false, finding: false };
  const status = detail.inspection?.status;
  return {
    start: status === 'scheduled',
    checklist: status === 'in_progress',
    finding: status === 'in_progress',
  };
}

export function resetInspectionDraft(
  setResponses: (value: Record<string, string>) => void,
  setFindingKey: (value: string) => void,
  setFindingDescription: (value: string) => void,
  setFindingResult: (value: 'pass' | 'reminder' | 'needs_action') => void,
) {
  setResponses({});
  setFindingKey('');
  setFindingDescription('');
  setFindingResult('needs_action');
}

function newClientCommandId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type SurfaceState =
  'loading' | 'empty' | 'error' | 'forbidden' | 'masked' | 'offline' | 'ready';
function stateFor(reason: unknown): SurfaceState {
  return reason instanceof ApiError && reason.status === 403
    ? 'forbidden'
    : reason instanceof ApiError && reason.code === 'OFFLINE'
      ? 'offline'
      : 'error';
}
export function TaskScreen({
  onNavigate,
}: {
  onNavigate?: (link: ReturnType<typeof deepLinkFor>) => void;
}) {
  const [items, setItems] = useState<ForceItem[]>([]);
  const [selected, setSelected] = useState<ForceItem | null>(null);
  const [detailTarget, setDetailTarget] = useState<ForceItem | null>(null);
  const [detailState, setDetailState] = useState<SurfaceState | null>(null);
  const [state, setState] = useState<SurfaceState>('loading');
  const [activity, setActivity] = useState('');
  const [activityState, setActivityState] = useState('');
  const [, setQueueRevision] = useState(0);
  const [inspection, setInspection] = useState<{
    permissions?: { canFieldwork?: boolean };
    template?: Array<{ key: string; label?: string }>;
    inspection?: { id?: string; status?: string; version?: number };
  } | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [findingKey, setFindingKey] = useState('');
  const [findingDescription, setFindingDescription] = useState('');
  const [findingResult, setFindingResult] = useState<
    'pass' | 'reminder' | 'needs_action'
  >('needs_action');
  const [inspectionSubmitting, setInspectionSubmitting] = useState(false);
  const inspectionSubmittingRef = useRef(false);
  const { session } = useSession();
  const eligible = canRecordResidentActivity(selected);
  const inspectionEligible =
    canFieldwork(selected) && inspection?.permissions?.canFieldwork === true;
  const inspectionAction = inspectionActions(selected, inspection);
  let rejectedCommands: ReturnType<typeof readRejected> = [];
  let rejectedStorageUnavailable = false;
  try {
    if (
      session.status === 'authenticated' &&
      session.user?.id &&
      selected?.resourceId
    )
      rejectedCommands = readRejected(session.user.id).filter(
        (entry) => entry.resourceId === selected.resourceId,
      );
  } catch {
    // Keep the editable form intact if encrypted storage cannot be read.
    rejectedStorageUnavailable = true;
  }
  const restoreRejected = (entry: (typeof rejectedCommands)[number]) => {
    if (entry.commandType === 'resident.record_activity')
      setActivity(entry.payload.content);
    else if (
      entry.commandType === 'inspection.save_checklist' &&
      'responses' in entry.payload
    )
      setResponses(
        Object.fromEntries(
          entry.payload.responses.map(({ key, value }) => [key, value]),
        ),
      );
    else if (
      entry.commandType === 'inspection.finding' &&
      'checklistKey' in entry.payload
    ) {
      setFindingKey(entry.payload.checklistKey);
      setFindingDescription(entry.payload.description);
      if (['pass', 'reminder', 'needs_action'].includes(entry.payload.result))
        setFindingResult(
          entry.payload.result as 'pass' | 'reminder' | 'needs_action',
        );
    } else return;
    try {
      removeCommand(session.user!.id, entry.clientCommandId);
      setQueueRevision((revision) => revision + 1);
    } catch {
      setActivityState(
        'Khôi phục đã hiển thị nhưng chưa thể xóa bản lưu; nội dung vẫn được giữ.',
      );
    }
  };
  // One runner serializes all queue retries (session change and Android's
  // restored-online event) and coalesces triggers while a pass is in flight.
  const queueRetryRunnerRef = useRef<ReturnType<
    typeof createQueueRetryRunner
  > | null>(null);
  if (queueRetryRunnerRef.current === null)
    queueRetryRunnerRef.current = createQueueRetryRunner((outcome) => {
      setQueueRevision((revision) => revision + 1);
      const message = queueRetryFeedback(outcome);
      if (message) setActivityState(message);
    });
  useEffect(() => () => queueRetryRunnerRef.current?.stop(), []);
  useEffect(() => {
    if (session.status === 'authenticated' && session.user?.id)
      queueRetryRunnerRef.current!.retry(session.user.id);
  }, [session.status, session.user?.id]);
  const authenticatedUserId =
    session.status === 'authenticated' ? session.user?.id : undefined;
  useEffect(() => {
    if (!authenticatedUserId) return;
    return addRestoredOnlineListener(() =>
      queueRetryRunnerRef.current!.retry(authenticatedUserId),
    );
  }, [authenticatedUserId]);
  const submitActivity = async () => {
    if (
      !eligible ||
      !selected ||
      session.status !== 'authenticated' ||
      !session.user?.id
    )
      return;
    const content = activity.trim();
    if (!content || content.length > 500) {
      setActivityState('Nhập nội dung hoạt động (tối đa 500 ký tự).');
      return;
    }
    const command = {
      commandType: 'resident.record_activity' as const,
      resourceType: 'SubjectManagementRecord' as const,
      resourceId: selected.resourceId!,
      clientCommandId: newClientCommandId(),
      occurredAt: new Date().toISOString(),
      payloadVersion: 1 as const,
      baseVersion: selected.baseVersion!,
      payload: { activityType: 'followup', content },
    };
    try {
      const result = await syncResidentActivity(session.user.id, command);
      setActivityState(
        result === 'synced'
          ? 'Đã ghi nhận hoạt động.'
          : result === 'rejected'
            ? 'Không thể ghi nhận hoạt động. Hãy tải lại công việc.'
            : 'Đã lưu để gửi lại khi có kết nối.',
      );
      if (result !== 'rejected') setActivity('');
    } catch {
      setActivityState('Không thể lưu hoạt động trên thiết bị.');
    }
  };
  const submitInspection = async (
    commandType: InspectionCommand['commandType'],
    payload: InspectionCommand['payload'],
  ) => {
    if (
      !inspectionEligible ||
      !selected?.resourceId ||
      session.status !== 'authenticated' ||
      !session.user?.id ||
      selected.baseVersion === undefined ||
      inspectionSubmittingRef.current
    )
      return;
    if (
      commandType === 'inspection.finding' &&
      (!('checklistKey' in payload) ||
        !inspection?.template?.some(
          (item) => item.key === payload.checklistKey,
        ))
    ) {
      setActivityState('Choose a checklist item from this Inspection.');
      return;
    }
    inspectionSubmittingRef.current = true;
    setInspectionSubmitting(true);
    try {
      const pending = readQueue(session.user.id).filter(
        (entry) =>
          entry.resourceType === 'Inspection' &&
          entry.resourceId === selected.resourceId,
      );
      if (pending.length) {
        setActivityState(
          'Đang chờ đồng bộ thao tác trước; tải lại công việc sau khi hoàn tất.',
        );
        return;
      }
      const command: InspectionCommand = {
        commandType,
        resourceType: 'Inspection',
        resourceId: selected.resourceId,
        clientCommandId: newClientCommandId(),
        occurredAt: new Date().toISOString(),
        payloadVersion: 1,
        baseVersion: nextInspectionVersion(
          session.user.id,
          selected.resourceId,
          selected.baseVersion,
        ),
        payload,
      };
      const result = await syncFieldCommand(session.user.id, command);
      setActivityState(
        result === 'synced'
          ? 'Đã đồng bộ thao tác.'
          : result === 'pending'
            ? 'Đã lưu để gửi lại khi có kết nối.'
            : 'Thao tác bị từ chối hoặc phiên bản đã cũ; nội dung vẫn được giữ.',
      );
      if (result !== 'rejected') {
        if (commandType === 'inspection.save_checklist') setResponses({});
        if (commandType === 'inspection.finding') setFindingDescription('');
      }
      if (result === 'synced') {
        try {
          await load();
          const refreshed = await getTask(selected.id);
          const detail = await requestJson<{
            permissions?: { canFieldwork?: boolean };
            template?: Array<{ key: string; label?: string }>;
            inspection?: { id?: string; status?: string; version?: number };
          }>(`/api/inspections/${encodeURIComponent(selected.resourceId)}`);
          setSelected(refreshed);
          setInspection(
            detail.inspection?.id === refreshed.resourceId ? detail : null,
          );
        } catch {
          setActivityState(
            'Saved successfully, but refresh failed. Reopen the task to reload current Inspection status.',
          );
        }
      }
    } catch {
      setActivityState(
        'Could not save this Inspection action on the device. Your form values were kept; retry when storage is available.',
      );
    } finally {
      inspectionSubmittingRef.current = false;
      setInspectionSubmitting(false);
    }
  };
  const load = useCallback(async () => {
    try {
      setState('loading');
      const response = await listTasks();
      setItems(response.data);
      setState(
        response.data.length
          ? response.data.some((item) => !item.assignmentSummary)
            ? 'masked'
            : 'ready'
          : 'empty',
      );
    } catch (reason: unknown) {
      setState(stateFor(reason));
    }
  }, []);
  const select = async (item: ForceItem) => {
    resetActivityDraft(setActivity, setActivityState);
    resetInspectionDraft(
      setResponses,
      setFindingKey,
      setFindingDescription,
      setFindingResult,
    );
    setInspection(null);
    setDetailTarget(item);
    setDetailState('loading');
    setSelected(null);
    try {
      const task = await getTask(item.id);
      let detail: typeof inspection = null;
      if (canFieldwork(task) && task.resourceId) {
        detail = await requestJson<NonNullable<typeof inspection>>(
          `/api/inspections/${encodeURIComponent(task.resourceId)}`,
        );
        if (detail.inspection?.id !== task.resourceId)
          throw new Error('INSPECTION_DETAIL_MISMATCH');
      }
      setSelected(task);
      setInspection(detail);
      setDetailState(null);
    } catch (reason: unknown) {
      setDetailState(stateFor(reason));
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (state !== 'ready' && state !== 'masked' && !detailState)
    return (
      <View
        style={{
          padding: mobileBaseline.space.s4,
          backgroundColor: mobileBaseline.color.canvas,
        }}
      >
        {state === 'offline' && <OfflineBanner />}
        <StateMessage state={state} retry={() => void load()} />
      </View>
    );
  return (
    <View
      style={{
        padding: mobileBaseline.space.s4,
        gap: mobileBaseline.space.s3,
        backgroundColor: mobileBaseline.color.canvas,
      }}
    >
      {detailState === 'loading' && <StateMessage state="loading" />}
      {detailState === 'error' && (
        <StateMessage
          state="error"
          retry={() => detailTarget && void select(detailTarget)}
        />
      )}
      {detailState === 'forbidden' && <StateMessage state="forbidden" />}
      {detailState === 'offline' && (
        <>
          <OfflineBanner />
          <StateMessage
            state="offline"
            retry={() => detailTarget && void select(detailTarget)}
          />
        </>
      )}
      {detailState === 'masked' && <StateMessage state="masked" />}
      {selected ? (
        <View style={{ gap: 8 }}>
          <Pressable
            disabled={inspectionSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => {
              resetActivityDraft(setActivity, setActivityState);
              resetInspectionDraft(
                setResponses,
                setFindingKey,
                setFindingDescription,
                setFindingResult,
              );
              setInspection(null);
              setSelected(null);
            }}
            style={{ minHeight: 44, minWidth: 44, padding: 8 }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.accent,
              }}
            >
              ‹ Quay lại
            </Text>
          </Pressable>
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.title,
              color: mobileBaseline.color.text,
            }}
          >
            {selected.title}
          </Text>
          {rejectedStorageUnavailable && (
            <Text
              accessibilityRole="alert"
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.warning,
              }}
            >
              Không thể đọc bản nháp bị từ chối từ bộ nhớ mã hóa. Giá trị đang
              nhập vẫn được giữ; thử mở lại sau.
            </Text>
          )}
          <Text
            style={{
              fontFamily: mobileBaseline.font.sans,
              fontSize: mobileBaseline.size.label,
              color: mobileBaseline.color.textMuted,
            }}
          >
            {selected.status} ·{' '}
            <Text
              style={{
                fontFamily: mobileBaseline.font.mono,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.textMuted,
              }}
            >
              {selected.createdAt}
            </Text>
          </Text>
          {selected.assignmentSummary ? (
            <MaskedValue value={selected.assignmentSummary.task} />
          ) : (
            <StateMessage state="masked" />
          )}
          {eligible && (
            <View
              style={{
                gap: mobileBaseline.space.s2,
                padding: mobileBaseline.space.s3,
                backgroundColor: mobileBaseline.color.surface,
                borderColor: mobileBaseline.color.border,
                borderWidth: 1,
                borderRadius: mobileBaseline.radius.md,
              }}
            >
              {rejectedCommands
                .filter(
                  (entry) => entry.commandType === 'resident.record_activity',
                )
                .map((entry) => (
                  <View
                    key={entry.clientCommandId}
                    style={{
                      gap: mobileBaseline.space.s1,
                      padding: mobileBaseline.space.s2,
                      backgroundColor: mobileBaseline.color.surfaceMuted,
                      borderColor: mobileBaseline.color.border,
                      borderWidth: 1,
                      borderRadius: mobileBaseline.radius.sm,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: mobileBaseline.font.sans,
                        fontSize: mobileBaseline.size.label,
                        color: mobileBaseline.color.text,
                      }}
                    >
                      Hoạt động bị từ chối; khôi phục để chỉnh sửa và gửi lại.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => restoreRejected(entry)}
                      style={{
                        minHeight: mobileBaseline.controlMin,
                        padding: mobileBaseline.space.s2,
                        backgroundColor: mobileBaseline.color.surface,
                        borderColor: mobileBaseline.color.border,
                        borderWidth: 1,
                        borderRadius: mobileBaseline.radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: mobileBaseline.font.sans,
                          fontSize: mobileBaseline.size.label,
                          fontWeight: '600',
                          color: mobileBaseline.color.accent,
                        }}
                      >
                        Khôi phục bản nháp
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          removeCommand(
                            session.user!.id,
                            entry.clientCommandId,
                          );
                          setQueueRevision((revision) => revision + 1);
                        } catch {
                          setActivityState(
                            'Không thể xóa bản lưu trên thiết bị.',
                          );
                        }
                      }}
                      style={{
                        minHeight: mobileBaseline.controlMin,
                        padding: mobileBaseline.space.s2,
                        backgroundColor: mobileBaseline.color.surface,
                        borderColor: mobileBaseline.color.border,
                        borderWidth: 1,
                        borderRadius: mobileBaseline.radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: mobileBaseline.font.sans,
                          fontSize: mobileBaseline.size.label,
                          fontWeight: '500',
                          color: mobileBaseline.color.textMuted,
                        }}
                      >
                        Bỏ bản nháp
                      </Text>
                    </Pressable>
                  </View>
                ))}
              <TextInput
                accessibilityLabel="Nội dung hoạt động"
                value={activity}
                onChangeText={setActivity}
                maxLength={500}
                multiline
                placeholder="Ghi nội dung hoạt động"
                placeholderTextColor={mobileBaseline.color.textMuted}
                style={{
                  minHeight: 80,
                  padding: mobileBaseline.space.s2,
                  borderWidth: 1,
                  borderColor: mobileBaseline.color.border,
                  borderRadius: mobileBaseline.radius.md,
                  backgroundColor: mobileBaseline.color.surface,
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.text,
                }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => void submitActivity()}
                style={{
                  minHeight: mobileBaseline.controlMin,
                  padding: mobileBaseline.space.s2,
                  backgroundColor: mobileBaseline.color.surface,
                  borderColor: mobileBaseline.color.border,
                  borderWidth: 1,
                  borderRadius: mobileBaseline.radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    fontWeight: '600',
                    color: mobileBaseline.color.accent,
                  }}
                >
                  Ghi nhận hoạt động
                </Text>
              </Pressable>
              {!!activityState && (
                <Text
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  {activityState}
                </Text>
              )}
            </View>
          )}
          {inspectionEligible && selected && (
            <View
              style={{
                gap: mobileBaseline.space.s2,
                padding: mobileBaseline.space.s3,
                backgroundColor: mobileBaseline.color.surface,
                borderColor: mobileBaseline.color.border,
                borderWidth: 1,
                borderRadius: mobileBaseline.radius.md,
              }}
            >
              {rejectedCommands
                .filter((entry) => entry.resourceType === 'Inspection')
                .map((entry) => (
                  <View
                    key={entry.clientCommandId}
                    style={{
                      gap: mobileBaseline.space.s1,
                      padding: mobileBaseline.space.s2,
                      backgroundColor: mobileBaseline.color.surfaceMuted,
                      borderColor: mobileBaseline.color.border,
                      borderWidth: 1,
                      borderRadius: mobileBaseline.radius.sm,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: mobileBaseline.font.sans,
                        fontSize: mobileBaseline.size.label,
                        color: mobileBaseline.color.text,
                      }}
                    >
                      {entry.commandType === 'inspection.start'
                        ? 'Bắt đầu Inspection bị từ chối. Hãy tải lại và kiểm tra trạng thái hiện tại; thao tác này không thể khôi phục.'
                        : 'Thao tác Inspection bị từ chối; khôi phục để chỉnh sửa và gửi thành thao tác mới.'}
                    </Text>
                    {entry.commandType !== 'inspection.start' && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => restoreRejected(entry)}
                        style={{
                          minHeight: mobileBaseline.controlMin,
                          padding: mobileBaseline.space.s2,
                          backgroundColor: mobileBaseline.color.surface,
                          borderColor: mobileBaseline.color.border,
                          borderWidth: 1,
                          borderRadius: mobileBaseline.radius.sm,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: mobileBaseline.font.sans,
                            fontSize: mobileBaseline.size.label,
                            fontWeight: '600',
                            color: mobileBaseline.color.accent,
                          }}
                        >
                          Khôi phục giá trị
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        try {
                          removeCommand(
                            session.user!.id,
                            entry.clientCommandId,
                          );
                          setQueueRevision((revision) => revision + 1);
                        } catch {
                          setActivityState(
                            'Không thể xóa bản lưu trên thiết bị.',
                          );
                        }
                      }}
                      style={{
                        minHeight: mobileBaseline.controlMin,
                        padding: mobileBaseline.space.s2,
                        backgroundColor: mobileBaseline.color.surface,
                        borderColor: mobileBaseline.color.border,
                        borderWidth: 1,
                        borderRadius: mobileBaseline.radius.sm,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: mobileBaseline.font.sans,
                          fontSize: mobileBaseline.size.label,
                          fontWeight: '500',
                          color: mobileBaseline.color.textMuted,
                        }}
                      >
                        Bỏ bản lưu
                      </Text>
                    </Pressable>
                  </View>
                ))}
              {inspectionAction.start && (
                <Pressable
                  disabled={inspectionSubmitting}
                  accessibilityRole="button"
                  onPress={() => void submitInspection('inspection.start', {})}
                  style={{
                    minHeight: mobileBaseline.controlMin,
                    padding: mobileBaseline.space.s2,
                    backgroundColor: mobileBaseline.color.surface,
                    borderColor: mobileBaseline.color.border,
                    borderWidth: 1,
                    borderRadius: mobileBaseline.radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: mobileBaseline.font.sans,
                      fontSize: mobileBaseline.size.label,
                      fontWeight: '600',
                      color: mobileBaseline.color.accent,
                    }}
                  >
                    Start Inspection
                  </Text>
                </Pressable>
              )}
              {inspectionAction.checklist &&
                (inspection?.template ?? []).map((item) => (
                  <View
                    key={item.key}
                    style={{ gap: mobileBaseline.space.s1 }}
                  >
                    <Text
                      style={{
                        fontFamily: mobileBaseline.font.sans,
                        fontSize: mobileBaseline.size.label,
                        fontWeight: '500',
                        color: mobileBaseline.color.text,
                      }}
                    >
                      {item.label ?? item.key}
                    </Text>
                    <TextInput
                      accessibilityLabel={`Checklist ${item.key}`}
                      value={responses[item.key] ?? ''}
                      onChangeText={(value) =>
                        setResponses({ ...responses, [item.key]: value })
                      }
                      style={{
                        minHeight: mobileBaseline.controlMin,
                        borderWidth: 1,
                        borderColor: mobileBaseline.color.border,
                        padding: mobileBaseline.space.s2,
                        borderRadius: mobileBaseline.radius.sm,
                        backgroundColor: mobileBaseline.color.surface,
                        fontFamily: mobileBaseline.font.sans,
                        fontSize: mobileBaseline.size.label,
                        color: mobileBaseline.color.text,
                      }}
                    />
                  </View>
                ))}
              {inspectionAction.checklist && !!inspection?.template?.length && (
                <Pressable
                  disabled={inspectionSubmitting}
                  accessibilityRole="button"
                  onPress={() =>
                    void submitInspection('inspection.save_checklist', {
                      responses: (inspection.template ?? []).map(({ key }) => ({
                        key,
                        value: responses[key] ?? '',
                      })),
                    })
                  }
                  style={{
                    minHeight: mobileBaseline.controlMin,
                    padding: mobileBaseline.space.s2,
                    backgroundColor: mobileBaseline.color.surface,
                    borderColor: mobileBaseline.color.border,
                    borderWidth: 1,
                    borderRadius: mobileBaseline.radius.sm,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: mobileBaseline.font.sans,
                      fontSize: mobileBaseline.size.label,
                      fontWeight: '600',
                      color: mobileBaseline.color.accent,
                    }}
                  >
                    Save checklist
                  </Text>
                </Pressable>
              )}
              {inspectionAction.finding && !!inspection?.template?.length && (
                <>
                  {inspection.template.map((item) => (
                    <Pressable
                      disabled={inspectionSubmitting}
                      key={item.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: findingKey === item.key }}
                      onPress={() => setFindingKey(item.key)}
                      style={{
                        minHeight: mobileBaseline.controlMin,
                        padding: mobileBaseline.space.s2,
                        backgroundColor: mobileBaseline.color.surface,
                        borderColor:
                          findingKey === item.key
                            ? mobileBaseline.color.focus
                            : mobileBaseline.color.border,
                        borderWidth: 1,
                        borderRadius: mobileBaseline.radius.sm,
                        alignItems: 'center',
                        flexDirection: 'row',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: mobileBaseline.font.sans,
                          fontSize: mobileBaseline.size.label,
                          color: mobileBaseline.color.text,
                        }}
                      >
                        {findingKey === item.key ? '● ' : '○ '}
                        {item.label ?? item.key}
                      </Text>
                    </Pressable>
                  ))}
                  <TextInput
                    accessibilityLabel="Finding description"
                    value={findingDescription}
                    onChangeText={setFindingDescription}
                    placeholder="Finding description"
                    placeholderTextColor={mobileBaseline.color.textMuted}
                    style={{
                      minHeight: mobileBaseline.controlMin,
                      borderWidth: 1,
                      borderColor: mobileBaseline.color.border,
                      padding: mobileBaseline.space.s2,
                      borderRadius: mobileBaseline.radius.sm,
                      backgroundColor: mobileBaseline.color.surface,
                      fontFamily: mobileBaseline.font.sans,
                      fontSize: mobileBaseline.size.label,
                      color: mobileBaseline.color.text,
                    }}
                  />
                  <Pressable
                    disabled={inspectionSubmitting}
                    accessibilityRole="button"
                    onPress={() =>
                      setFindingResult(
                        findingResult === 'pass'
                          ? 'reminder'
                          : findingResult === 'reminder'
                            ? 'needs_action'
                            : 'pass',
                      )
                    }
                    style={{
                      minHeight: mobileBaseline.controlMin,
                      padding: mobileBaseline.space.s2,
                      backgroundColor: mobileBaseline.color.surface,
                      borderColor: mobileBaseline.color.border,
                      borderWidth: 1,
                      borderRadius: mobileBaseline.radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: mobileBaseline.font.sans,
                        fontSize: mobileBaseline.size.label,
                        fontWeight: '500',
                        color: mobileBaseline.color.text,
                      }}
                    >
                      Result: {findingResult}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={inspectionSubmitting}
                    accessibilityRole="button"
                    onPress={() =>
                      void submitInspection('inspection.finding', {
                        checklistKey: findingKey,
                        description: findingDescription,
                        result: findingResult,
                      })
                    }
                    style={{
                      minHeight: mobileBaseline.controlMin,
                      padding: mobileBaseline.space.s2,
                      backgroundColor: mobileBaseline.color.surface,
                      borderColor: mobileBaseline.color.border,
                      borderWidth: 1,
                      borderRadius: mobileBaseline.radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: mobileBaseline.font.sans,
                        fontSize: mobileBaseline.size.label,
                        fontWeight: '600',
                        color: mobileBaseline.color.accent,
                      }}
                    >
                      Record finding
                    </Text>
                  </Pressable>
                </>
              )}
              {!!activityState && (
                <Text
                  accessibilityRole="alert"
                  style={{
                    fontFamily: mobileBaseline.font.sans,
                    fontSize: mobileBaseline.size.label,
                    color: mobileBaseline.color.textMuted,
                  }}
                >
                  {activityState}
                </Text>
              )}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              const link = deepLinkFor(selected);
              if (link) onNavigate?.(link);
            }}
            style={{ minHeight: 44, minWidth: 44, padding: 8 }}
          >
            <Text
              style={{
                fontFamily: mobileBaseline.font.sans,
                fontSize: mobileBaseline.size.label,
                color: mobileBaseline.color.accent,
              }}
            >
              {isVehicleObservationLink(selected)
                ? 'Mở chi tiết'
                : 'Mở bản đồ/RelatedInfo'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {state === 'masked' && <StateMessage state="masked" />}
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => void select(item)}
              style={{
                minHeight: 44,
                minWidth: 44,
                padding: mobileBaseline.space.s3,
                gap: mobileBaseline.space.s1,
                backgroundColor: mobileBaseline.color.surface,
                borderColor: mobileBaseline.color.border,
                borderWidth: 1,
                borderRadius: mobileBaseline.radius.md,
              }}
            >
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.body,
                  lineHeight: mobileBaseline.size.bodyLine,
                  fontWeight: '600',
                  color: mobileBaseline.color.text,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontFamily: mobileBaseline.font.sans,
                  fontSize: mobileBaseline.size.label,
                  color: mobileBaseline.color.textMuted,
                }}
              >
                {item.status} · {item.dispatchId ?? 'Không có dispatch'}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}
