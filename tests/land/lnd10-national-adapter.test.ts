import { describe, expect, it, vi } from 'vitest';

import {
  MOCK_NATIONAL_LAND_FAILURE_CODE,
  MOCK_NATIONAL_LAND_REMOTE_REFERENCE,
  MockNationalLandAdapter,
  toNationalLandFailure,
  type NationalLandAdapter,
  type NationalLandRequest,
} from '@/modules/land/national-land-adapter';

function validRequest(): NationalLandRequest {
  return {
    requestKey: 'sync-key-001',
    applicationCode: 'APP-001',
    changeType: 'transfer',
    parcelCodes: ['PARCEL-001'],
    mode: 'mock',
  };
}

describe('LND-10 NationalLandAdapter mock follows locked contract', () => {
  it('AC-01: success fixture returns succeeded with remote reference and simulated=true', async () => {
    const adapter = new MockNationalLandAdapter({ outcome: 'success' });
    const response = await adapter.registerChange(validRequest());

    expect(response.status).toBe('succeeded');
    if (response.status !== 'succeeded') return;
    expect(response.remoteReference).toBe(MOCK_NATIONAL_LAND_REMOTE_REFERENCE);
    expect(response.remoteReference).not.toBeNull();
    expect(response.responsePayload).toEqual({
      accepted: true,
      simulated: true,
    });
  });

  it('AC-02: configured failure returns failed with failureCode and no network call', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network must not be called'));
    try {
      const adapter = new MockNationalLandAdapter({ outcome: 'failure' });
      const response = await adapter.registerChange(validRequest());

      expect(response.status).toBe('failed');
      if (response.status !== 'failed') return;
      expect(response.failureCode).toBe(MOCK_NATIONAL_LAND_FAILURE_CODE);
      expect(response.failureCode).not.toBeNull();
      expect(response.responsePayload).toEqual({
        accepted: false,
        simulated: true,
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('maps adapter exceptions to a failure result with zero network calls', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network must not be called'));
    try {
      const exploding: NationalLandAdapter = {
        registerChange: async () => {
          throw new Error('MOCK_BOOM');
        },
      };
      let response;
      try {
        response = await exploding.registerChange(validRequest());
      } catch (error) {
        response = toNationalLandFailure(error);
      }

      expect(response.status).toBe('failed');
      if (response.status !== 'failed') return;
      expect(response.failureCode).not.toBeNull();
      expect(response.responsePayload.simulated).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('maps invalid mock requests to failure without network calls', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network must not be called'));
    try {
      const adapter = new MockNationalLandAdapter({ outcome: 'success' });
      const response = await adapter.registerChange({
        ...validRequest(),
        requestKey: '',
      });

      expect(response.status).toBe('failed');
      if (response.status !== 'failed') return;
      expect(response.failureCode).not.toBeNull();
      expect(response.responsePayload.simulated).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('never calls network on success and ignores client-provided outcome', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('network must not be called'));
    try {
      const configuredFailure = new MockNationalLandAdapter({
        outcome: 'failure',
      });
      const tampered = {
        ...validRequest(),
        outcome: 'success',
        status: 'succeeded',
        simulated: false,
      } as unknown as NationalLandRequest;
      const failed = await configuredFailure.registerChange(tampered);
      expect(failed.status).toBe('failed');

      const configuredSuccess = new MockNationalLandAdapter({
        outcome: 'success',
      });
      const tamperedFailure = {
        ...validRequest(),
        outcome: 'failure',
        status: 'failed',
        failureCode: 'CLIENT_FORGED',
      } as unknown as NationalLandRequest;
      const succeeded = await configuredSuccess.registerChange(tamperedFailure);
      expect(succeeded.status).toBe('succeeded');
      if (succeeded.status !== 'succeeded') return;
      expect(succeeded.remoteReference).not.toBeNull();
      expect(succeeded.responsePayload.simulated).toBe(true);

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
