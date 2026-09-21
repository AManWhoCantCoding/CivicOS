import { describe, expect, it } from 'vitest';

import { isInspectionResult } from '@/modules/inspections';
import {
  parseEstablishmentInput,
  parseEstablishmentPatch,
  parseInspectionCommand,
  parseScheduleInput,
  selectDueInspections,
  toApiError,
} from '@/modules/inspections/schemas';

describe('PS-E1-007 slices 7-8 projections and APIs', () => {
  it('validates establishment fields and coordinates on the server', () => {
    expect(
      parseEstablishmentInput({
        name: 'Nha nghi Hoa Sen',
        ownerName: 'Nguyen Van A',
        address: 'Thon 1, Nghia Tru',
        type: 'nha nghi',
      }),
    ).toMatchObject({ name: 'Nha nghi Hoa Sen', type: 'nha nghi' });
    expect(() =>
      parseEstablishmentInput({
        name: '',
        ownerName: 'A',
        address: 'B',
        type: 'nha nghi',
      }),
    ).toThrow('ESTABLISHMENT_FIELDS_REQUIRED');
    expect(() =>
      parseEstablishmentInput({
        name: 'N',
        ownerName: 'A',
        address: 'B',
        type: 'nha nghi',
        latitude: 20.9,
      }),
    ).toThrow('GEOPOINT_INCOMPLETE');
    expect(
      parseEstablishmentPatch({
        name: 'Ten moi',
        latitude: 20.9,
        longitude: 105.9,
      }),
    ).toMatchObject({ name: 'Ten moi' });
    expect(() => parseEstablishmentPatch({ name: '' })).toThrow(
      'ESTABLISHMENT_FIELDS_REQUIRED',
    );
  });

  it('validates schedule cadence and timestamp on the server', () => {
    expect(
      parseScheduleInput({
        establishmentId: 'est-1',
        scheduledAt: '2026-10-01T08:00:00.000Z',
        cadenceMonths: 6,
      }),
    ).toMatchObject({ establishmentId: 'est-1', cadenceMonths: 6 });
    expect(() =>
      parseScheduleInput({
        establishmentId: 'est-1',
        scheduledAt: 'not-a-date',
      }),
    ).toThrow('INVALID_SCHEDULE');
    expect(() =>
      parseScheduleInput({
        establishmentId: 'est-1',
        scheduledAt: '2026-10-01T08:00:00.000Z',
        cadenceMonths: 12,
      }),
    ).toThrow('INVALID_INSPECTION_CADENCE');
  });

  it('validates inspection commands without accepting legal conclusions', () => {
    expect(
      parseInspectionCommand({ command: 'complete', result: 'pass' }),
    ).toMatchObject({ command: 'complete' });
    expect(() =>
      parseInspectionCommand({ command: 'complete', result: 'sanction' }),
    ).toThrow('INVALID_INSPECTION_RESULT');
    expect(() => parseInspectionCommand({ command: 'unknown' })).toThrow(
      'UNKNOWN_COMMAND',
    );
    expect(isInspectionResult('sanction')).toBe(false);
    expect(isInspectionResult('violation')).toBe(false);
  });

  it('maps domain failures to typed API errors', () => {
    expect(toApiError(new Error('DUPLICATE_SCHEDULE'))).toEqual({
      code: 'DUPLICATE_SCHEDULE',
      message: 'DUPLICATE_SCHEDULE',
      status: 409,
    });
    expect(toApiError(new Error('STALE_OFFLINE_COMMAND'))).toMatchObject({
      status: 409,
    });
    expect(toApiError(new Error('FORBIDDEN'))).toMatchObject({ status: 403 });
    expect(toApiError(new Error('INSPECTION_NOT_FOUND'))).toMatchObject({
      status: 404,
    });
  });

  it('selects due and overdue inspections without legal conclusions', () => {
    const rows = selectDueInspections(
      [
        {
          id: 'past',
          scheduledAt: '2026-01-01T00:00:00.000Z',
          status: 'scheduled',
        },
        {
          id: 'future',
          scheduledAt: '2099-01-01T00:00:00.000Z',
          status: 'scheduled',
        },
        {
          id: 'done',
          scheduledAt: '2026-01-01T00:00:00.000Z',
          status: 'completed',
        },
      ],
      new Date('2026-06-01T00:00:00.000Z'),
    );
    expect(rows.map((row) => row.id)).toEqual(['past']);
    expect(rows[0]).toMatchObject({ scheduleState: 'overdue' });
    expect(rows[0]).not.toHaveProperty('verdict');
  });
});
