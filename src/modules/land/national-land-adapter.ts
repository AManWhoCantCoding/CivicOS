// LND-10 mock boundary for the national land database (integration-contracts).
// Local-only adapter: fixture selection comes from test/server configuration,
// never from the client request. No real endpoint or network call.

export type NationalLandRequest = {
  requestKey: string;
  applicationCode: string;
  changeType: string;
  parcelCodes: string[];
  mode: 'mock';
};

export type NationalLandSuccessResponse = {
  status: 'succeeded';
  remoteReference: string;
  responsePayload: { accepted: true; simulated: true };
};

export type NationalLandFailureResponse = {
  status: 'failed';
  failureCode: string;
  responsePayload: { accepted: false; simulated: true };
};

export type NationalLandResponse =
  NationalLandSuccessResponse | NationalLandFailureResponse;

export interface NationalLandAdapter {
  registerChange(request: NationalLandRequest): Promise<NationalLandResponse>;
}

export type MockNationalLandOutcome = 'success' | 'failure';

export type MockNationalLandAdapterOptions = {
  outcome: MockNationalLandOutcome;
};

export const MOCK_NATIONAL_LAND_REMOTE_REFERENCE = 'MOCK-REMOTE-001';
export const MOCK_NATIONAL_LAND_FAILURE_CODE = 'MOCK_VALIDATION_FAILED';

// Normalize any adapter exception to a failure fixture (no network, simulated).
export function toNationalLandFailure(
  _error?: unknown,
): NationalLandFailureResponse {
  void _error;
  return {
    status: 'failed',
    failureCode: MOCK_NATIONAL_LAND_FAILURE_CODE,
    responsePayload: { accepted: false, simulated: true },
  };
}

function assertValidRequest(request: NationalLandRequest): void {
  if (!request || typeof request !== 'object')
    throw new Error('INVALID_REQUEST');
  if (!request.requestKey?.trim()) throw new Error('INVALID_REQUEST');
  if (!request.applicationCode?.trim()) throw new Error('INVALID_REQUEST');
  if (!request.changeType?.trim()) throw new Error('INVALID_REQUEST');
  if (!Array.isArray(request.parcelCodes) || request.parcelCodes.length < 1)
    throw new Error('INVALID_REQUEST');
  for (const code of request.parcelCodes) {
    if (typeof code !== 'string' || !code.trim())
      throw new Error('INVALID_REQUEST');
  }
  if (request.mode !== 'mock') throw new Error('INVALID_REQUEST');
}

// Mock/local NationalLandAdapter driven by server/test configuration.
// The client request never carries the simulated outcome; extra fields on the
// request object are ignored.
export class MockNationalLandAdapter implements NationalLandAdapter {
  constructor(private readonly options: MockNationalLandAdapterOptions) {}

  async registerChange(
    request: NationalLandRequest,
  ): Promise<NationalLandResponse> {
    try {
      assertValidRequest(request);
      if (this.options.outcome === 'failure') {
        return toNationalLandFailure(new Error('MOCK_FAILURE_FIXTURE'));
      }
      return {
        status: 'succeeded',
        remoteReference: MOCK_NATIONAL_LAND_REMOTE_REFERENCE,
        responsePayload: { accepted: true, simulated: true },
      };
    } catch (error) {
      return toNationalLandFailure(error);
    }
  }
}
