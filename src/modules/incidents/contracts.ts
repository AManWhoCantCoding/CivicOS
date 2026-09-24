import type { IdentityUser } from '@/modules/identity';

export type IncidentStatus =
  | 'received'
  | 'classified'
  | 'verifying'
  | 'transferred'
  | 'resolved'
  | 'closed';

export type IntakeReportStatus =
  'RECEIVED' | 'VERIFIED' | 'PROCESSED' | 'CLOSED' | 'REJECTED';

export type IntakeSourceChannel =
  'direct' | 'phone' | 'app' | 'district_transfer';

export type IntakeLegacyChannel = 'in_person' | 'telephone';

export type IntakeChannelInput = IntakeSourceChannel | IntakeLegacyChannel;

export type IntakeClassification = 'sufficient' | 'needs_verification';

/** Boundary intake input; legacy channel aliases map to canonical sourceChannel. */
export type IntakeReportInput = {
  channel?: IntakeChannelInput;
  sourceChannel?: IntakeChannelInput;
  receivedAt: string;
  content: string;
  sourceName?: string;
  sourceContact?: string;
  latitude?: number;
  longitude?: number;
  sensitiveRef?: string;
  idempotencyKey?: string;
};

export type IntakeCommandOptions = {
  idempotencyKey?: string;
};

/** Source-compatible direct incident payload without an IntakeReport link. */
export type IncidentInput = {
  description: string;
  category?: string;
  severity?: string;
  latitude?: number;
  longitude?: number;
};

export type IntakeVerifyInput = {
  classification: IntakeClassification;
  verificationNote?: string;
  verificationResult?: string;
};

export type IntakeProcessInput = {
  processedNote?: string;
  result?: string;
};

export type IntakeRejectInput = {
  reason: string;
};

export type IntakeCloseInput = {
  resultNote?: string;
};

export type IntakeTransferInput = {
  organizationId: string;
  reason?: string;
};

export type IntakeReportView = {
  id: string;
  sourceChannel: IntakeSourceChannel | null;
  status: string;
  classification: string | null;
  verificationNote: string | null;
  verificationResult: string | null;
  processedNote: string | null;
  content: string;
  receivedAt: string;
  latitude: number | null;
  longitude: number | null;
  incidentId: string | null;
  confirmedAt: string | null;
  transferToId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  sourceName: string | null;
  sourceContact: string | null;
  sensitiveRef: string | null;
  revealed: boolean;
  sla: {
    recordingDueAt: string;
    verificationDueAt: string;
    notificationDueAt: string;
    overdue: boolean;
    warning: boolean;
  };
};

export type IncidentActor = IdentityUser;
