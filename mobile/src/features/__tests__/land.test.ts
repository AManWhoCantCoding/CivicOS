import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ApiError } from '../../api/client';
import {
  getPublicLandLookup,
  type LandApplicationSummary,
  type LandParcelSummary,
  type LandTimelineEvent,
  type PublicLandLookup,
} from '../../api/land';
import {
  buildLandScreenSnapshot,
  canReadInternalLand,
  landErrorMessage,
  landStateForError,
} from '../land/LandScreen';

const lookup: PublicLandLookup = {
  applicationCode: 'APP-001',
  parcelCode: 'PARCEL-001',
  mapSheetNumber: '12',
  parcelNumber: '34',
  status: 'completed',
  submittedAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T01:00:00.000Z',
  completedAt: '2026-09-30T02:00:00.000Z',
  simulated: true,
};

const application: LandApplicationSummary = {
  id: 'application-1',
  applicationCode: 'APP-001',
  changeType: 'transfer',
  status: 'completed',
  submittedAt: lookup.submittedAt,
  updatedAt: lookup.updatedAt,
  completedAt: lookup.completedAt,
};

const parcel: LandParcelSummary = {
  id: 'parcel-1',
  parcelCode: 'PARCEL-001',
  mapSheetNumber: '12',
  parcelNumber: '34',
  areaSqm: '120.00',
  status: 'active',
  updatedAt: lookup.updatedAt,
};

const timeline: LandTimelineEvent[] = [
  {
    eventType: 'LandChangeApplicationSubmitted',
    actor: { role: 'land_officer' },
    occurredAt: lookup.submittedAt,
  },
  {
    eventType: 'LandChangeApplicationCompleted',
    actor: null,
    occurredAt: lookup.completedAt ?? lookup.updatedAt,
  },
];

describe('mobile land read-only projection', () => {
  it('looks up one public key and preserves the simulated marker', async () => {
    const originalOnline = navigator.onLine;
    const globals = globalThis as typeof globalThis & {
      __CIVICOS_API_BASE_URL__?: string;
    };
    globals.__CIVICOS_API_BASE_URL__ = 'http://10.0.2.2:3000';
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ lookup, simulated: true }), {
        status: 200,
      }),
    );
    try {
      await expect(
        getPublicLandLookup('applicationCode', ' APP-001 '),
      ).resolves.toEqual(lookup);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/public/land/lookup?applicationCode=APP-001',
        ),
        expect.anything(),
      );
    } finally {
      fetchSpy.mockRestore();
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: originalOnline,
      });
      delete globals.__CIVICOS_API_BASE_URL__;
    }
  });

  it('renders only safe application, parcel, and timeline fields', () => {
    const snapshot = buildLandScreenSnapshot({
      lookup,
      application,
      parcel,
      timeline,
    });
    expect(snapshot.lookup?.simulatedLabel).toBe('Mô phỏng · simulated');
    expect(snapshot.application).toMatchObject({
      applicationCode: 'APP-001',
      status: 'completed',
    });
    expect(snapshot.parcel).toMatchObject({
      parcelCode: 'PARCEL-001',
      areaSqm: '120.00',
    });
    expect(snapshot.timeline).toEqual([
      {
        eventType: 'LandChangeApplicationSubmitted',
        actor: { value: 'land_officer', masked: false },
        occurredAt: lookup.submittedAt,
      },
      {
        eventType: 'LandChangeApplicationCompleted',
        actor: { value: undefined, masked: true },
        occurredAt: lookup.completedAt,
      },
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(
      /address|geometry|changePayload|payload|metadata|storageKey|evidence/i,
    );
    expect(snapshot.application?.maskedSubject.masked).toBe(true);
    expect(snapshot.parcel?.maskedSubject.masked).toBe(true);
  });

  it('maps forbidden, offline, error, and empty states without data', () => {
    expect(landStateForError(new ApiError(403, 'LAND_FORBIDDEN', null))).toBe(
      'forbidden',
    );
    expect(landStateForError(new ApiError(0, 'OFFLINE', null))).toBe('offline');
    expect(landStateForError(new ApiError(500, 'FAILED', null))).toBe('error');
    expect(landStateForError(new ApiError(404, 'NOT_FOUND', null))).toBe(
      'empty',
    );
    expect(
      landErrorMessage(new ApiError(403, 'LAND_FORBIDDEN', null)),
    ).toContain('quyền');
    expect(
      buildLandScreenSnapshot({
        lookup: null,
        application: null,
        parcel: null,
        timeline: [],
      }),
    ).toEqual({ lookup: null, application: null, parcel: null, timeline: [] });
  });

  it('does not authorize internal reads without a scoped land session', () => {
    expect(canReadInternalLand()).toBe(false);
    expect(
      canReadInternalLand({
        status: 'authenticated',
        user: { id: 'u1', roles: [] },
      }),
    ).toBe(false);
    expect(
      canReadInternalLand({
        status: 'authenticated',
        user: {
          id: 'u1',
          roles: ['land_officer'],
          organizationUnitId: 'ou-1',
        },
      }),
    ).toBe(true);
  });

  it('keeps the rendered land surface read-only for every role', () => {
    const screenSource = readFileSync(
      join(__dirname, '../land/LandScreen.tsx'),
      'utf8',
    );
    const navigationSource = readFileSync(
      join(__dirname, '../../navigation/AppNavigator.tsx'),
      'utf8',
    );
    for (const role of [
      'land_officer',
      'commune_leader',
      'commander',
      'field_officer',
      'citizen',
    ]) {
      expect(`${role}:${screenSource}`).not.toMatch(
        /Tạo hồ sơ|Thẩm tra|Đồng bộ|Phê duyệt|Từ chối|Phân công|upload|delete|write queue/i,
      );
    }
    expect(navigationSource).toContain("'Land'");
    expect(navigationSource).toContain('Đất đai');
  });

  it('applies the shared presentation baseline without new actions', () => {
    const screenSource = readFileSync(
      join(__dirname, '../land/LandScreen.tsx'),
      'utf8',
    );
    expect(screenSource).toContain('mobileBaseline');
    expect(screenSource).toContain('mobileBaseline.font.mono');
    expect(screenSource).toContain('minWidth: 44');
    expect(screenSource).toContain('Xem trên bản đồ');
    expect(screenSource).toContain('onOpenMap(parcel.id)');
    expect(screenSource).not.toMatch(/#000000|#000\b|gradient|neon|glow/i);
  });
});
