import type { IdentityUser } from '@/modules/identity';

export type IncidentStatus =
  | 'received'
  | 'classified'
  | 'verifying'
  | 'transferred'
  | 'resolved'
  | 'closed';

export type IntakeReportInput = {
  channel: 'in_person' | 'telephone' | 'manual_other';
  receivedAt: string;
  content: string;
  sourceName?: string;
  sourceContact?: string;
  latitude?: number;
  longitude?: number;
  sensitiveRef?: string;
  idempotencyKey?: string;
};

export type IncidentActor = IdentityUser;
