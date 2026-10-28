import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Pilot01LandReviewResult = {
  role: 'land_officer';
  organizationUnitId: string;
  assignment: 'created' | 'reused';
  listStatus: number;
  parcelCount: number;
  parcelCode: string;
  detailStatus: number;
};

// DB-CONSOLIDATION SLICE (D-78 Task 4): the land review preparation runtime is
// retired. It fails closed before any DPAPI secret read, Commander bootstrap,
// secret-store write or API request against the legacy Pilot 01 sandbox at
// port 3100.
export async function preparePilot01LandReviewAccount(): Promise<Pilot01LandReviewResult> {
  throw new Error('PILOT01_SANDBOX_RUNTIME_RETIRED');
}

// DB-CONSOLIDATION SLICE (D-78 Task 4): the CLI runtime entrypoint is retired.
// It fails closed before loading the legacy .scratch runtime.env, running the
// bootstrap runtime, or touching any API/secret-store activity.
export async function runPilot01LandReviewCli(): Promise<Pilot01LandReviewResult> {
  throw new Error('PILOT01_SANDBOX_RUNTIME_RETIRED');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void runPilot01LandReviewCli()
    .then((result) => {
      console.log(
        `Pilot 01 land review: role=${result.role} unit=${result.organizationUnitId} list=${result.listStatus} count=${result.parcelCount} parcel=${result.parcelCode} detail=${result.detailStatus}`,
      );
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error && /^[A-Z][A-Z0-9_]*$/.test(error.message)
          ? error.message
          : 'PILOT01_LAND_REVIEW_PREPARATION_FAILED';
      console.error(message);
      process.exitCode = 1;
    });
}
