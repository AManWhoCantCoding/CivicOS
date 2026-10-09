import { describe, expect, it } from 'vitest';

import {
  assertChecklistComplete,
  assertChecklistEvidence,
  assertInspectionTransition,
  parseEstablishmentInput,
  parseInspectionCommand,
  parseScheduleInput,
} from '@/modules/inspections';

describe('PS-E1-007 regression contracts', () => {
  it('keeps the six-month cadence and rejects unauthorized shorter input at the boundary', () => {
    expect(
      parseScheduleInput({
        establishmentId: 'e1',
        scheduledAt: '2026-01-01T00:00:00Z',
      }),
    ).toMatchObject({ cadenceMonths: 6 });
    expect(() =>
      parseScheduleInput({
        establishmentId: 'e1',
        scheduledAt: '2026-01-01T00:00:00Z',
        cadenceMonths: 0,
      }),
    ).toThrow('INVALID_INSPECTION_CADENCE');
  });

  it('locks lifecycle transitions and required evidence before completion', () => {
    expect(() => assertInspectionTransition('scheduled', 'completed')).toThrow(
      'INVALID_INSPECTION_TRANSITION',
    );
    expect(() =>
      assertChecklistComplete([{ key: 'license', required: true }], []),
    ).toThrow('CHECKLIST_ITEM_REQUIRED:license');
    expect(() =>
      assertChecklistEvidence(
        [{ key: 'photo', evidenceRequired: true }],
        [{ key: 'photo', value: 'fail' }],
        [{ checklistKey: 'photo', evidenceIds: [] }],
      ),
    ).toThrow('CHECKLIST_EVIDENCE_REQUIRED:photo');
  });

  it('parses an independent transfer command', () => {
    expect(
      parseInspectionCommand({
        command: 'transfer',
        recommendationId: 'r1',
        organizationId: 'district',
      }),
    ).toEqual({
      command: 'transfer',
      recommendationId: 'r1',
      organizationId: 'district',
    });
  });

  it('keeps establishment risk and status at the server boundary', () => {
    expect(
      parseEstablishmentInput({
        name: 'Bar an toàn',
        ownerName: 'Chủ cơ sở',
        address: 'Địa chỉ',
        type: 'bar',
        risk: 'high',
      }),
    ).toMatchObject({ risk: 'high', status: 'active' });
    expect(() =>
      parseEstablishmentInput({
        name: 'Bar lỗi',
        ownerName: 'Chủ cơ sở',
        address: 'Địa chỉ',
        type: 'bar',
        risk: 'critical',
      }),
    ).toThrow('INVALID_ESTABLISHMENT_RISK');
  });

  it('accepts the canonical recommendation command name without changing state semantics', () => {
    expect(
      parseInspectionCommand({
        command: 'submit_recommendation',
        findingIds: ['f1'],
        action: 'Theo dõi',
        reason: 'Cần xử lý',
      }),
    ).toEqual({
      command: 'submit_recommendation',
      findingIds: ['f1'],
      action: 'Theo dõi',
      reason: 'Cần xử lý',
    });
  });

  it('keeps finding classification and evidence identifiers at the command boundary', () => {
    expect(
      parseInspectionCommand({
        command: 'finding',
        checklistKey: 'safety',
        description: 'Thiếu hồ sơ',
        result: 'needs_action',
        severity: 'high',
        category: 'license',
        evidenceIds: ['evidence-1'],
      }),
    ).toMatchObject({
      command: 'finding',
      severity: 'high',
      category: 'license',
      evidenceIds: ['evidence-1'],
    });
  });

  it('does not demand evidence for an optional item with an empty response', () => {
    for (const value of ['', '   ']) {
      expect(() =>
        assertChecklistEvidence(
          [{ key: 'photo', evidenceRequired: true }],
          [{ key: 'photo', value }],
          [{ checklistKey: 'photo', evidenceIds: [] }],
        ),
      ).not.toThrow();
    }
  });
});
