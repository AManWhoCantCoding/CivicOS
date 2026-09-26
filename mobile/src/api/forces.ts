import { requestJson } from './client';
import type { RelatedInfoEntityType } from '../features/related-info/types';

export type ForceLink = {
  incidentId?: string;
  resourceId?: string;
  coordinates?: { lat: number; lng: number };
  relatedInfo?: { entityType: RelatedInfoEntityType; id: string };
  assignmentSummary?: { assignmentId: string; task: string; status: string };
};
export type ForceItem = ForceLink & {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  dispatchId?: string;
};
export type ForceList = {
  data: ForceItem[];
  total: number;
  page: number;
  pageSize: number;
};
export const forcePaths = {
  alarms: '/api/forces/alarms',
  dispatches: '/api/forces/dispatches',
  tasks: '/api/forces/tasks',
  task: (id: string) => `/api/forces/tasks/${encodeURIComponent(id)}`,
  tasksByDispatch: (id: string) =>
    `/api/forces/tasksbydispatchid?dispatchId=${encodeURIComponent(id)}`,
};
export function getAlarms() {
  return requestJson<{ alarms: ForceItem[] }>(forcePaths.alarms);
}
export function listDispatches(query = '') {
  return requestJson<ForceList>(`${forcePaths.dispatches}${query}`);
}
export function getDispatch(id: string) {
  return requestJson<ForceItem>(
    `${forcePaths.dispatches}/${encodeURIComponent(id)}`,
  );
}
export function listTasks(query = '') {
  return requestJson<ForceList>(`${forcePaths.tasks}${query}`);
}
export function getTask(id: string) {
  return requestJson<ForceItem>(forcePaths.task(id));
}
export function listTasksByDispatch(id: string) {
  return requestJson<ForceList>(forcePaths.tasksByDispatch(id));
}
