import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type StoredEvidence = {
  storageKey: string;
  originalHash: string;
  sizeBytes: number;
};

export interface EvidenceStorageAdapter {
  store(input: {
    resourceId: string;
    fileName: string;
    bytes: Uint8Array;
  }): Promise<StoredEvidence>;
  read(storageKey: string): Promise<Uint8Array>;
}

export class LocalEvidenceStorage implements EvidenceStorageAdapter {
  constructor(
    private readonly root = path.join(process.cwd(), 'storage', 'evidence'),
  ) {}

  async store(input: {
    resourceId: string;
    fileName: string;
    bytes: Uint8Array;
  }): Promise<StoredEvidence> {
    const hash = createHash('sha256').update(input.bytes).digest('hex');
    const safeResourceId = input.resourceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = path.join(safeResourceId, `${hash}-${safeName}`);
    const absolutePath = path.join(this.root, storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes, { flag: 'wx' }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
      },
    );
    return {
      storageKey,
      originalHash: hash,
      sizeBytes: input.bytes.byteLength,
    };
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const { readFile } = await import('node:fs/promises');
    return new Uint8Array(await readFile(path.join(this.root, storageKey)));
  }
}
