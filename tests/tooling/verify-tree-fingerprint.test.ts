import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const artifactA = path.join(
  root,
  'mobile/android/app/build/__05d_probe__/probe.bin',
);
const artifactB = path.join(
  root,
  'mobile/android/build/__05d_probe__/probe2.bin',
);
const artifactGradle = path.join(
  root,
  'mobile/android/.gradle/__05d_probe__/probe-gradle.bin',
);
const artifactCxx = path.join(
  root,
  'mobile/android/app/.cxx/__05d_probe__/probe-cxx.bin',
);
const probeOutsideBuild = path.join(
  root,
  'mobile/android/__05d_probe__/probe-config.gradle',
);
const trackedConfig = path.join(root, 'tsconfig.json');
const verifySource = path.join(root, 'scripts/verify.mjs');
const selfSource = path.join(
  root,
  'tests/tooling/verify-tree-fingerprint.test.ts',
);

function runTree(): string {
// Gọi fingerprint production qua subprocess để assert runtime thật.
  return execFileSync(
    process.execPath,
    ['scripts/verify.mjs', '--tree'],
    { cwd: root, encoding: 'utf8' },
  ).trim();
}

function untracked(): string[] {
// Liệt kê untracked non-ignored để guard chống false-pass khi bị ignore.
  return execFileSync('git', ['ls-files', '-o', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}

function check(args: string[]): string {
// Liệt kê bước verifier mà không chạy check thật.
  return execFileSync(process.execPath, ['scripts/verify.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('verify tree fingerprint', () => {
  afterEach(() => {
    expect(existsSync(artifactA)).toBe(false);
    expect(existsSync(artifactB)).toBe(false);
    expect(existsSync(artifactGradle)).toBe(false);
    expect(existsSync(artifactCxx)).toBe(false);
    expect(existsSync(probeOutsideBuild)).toBe(false);
  });

  it('keeps Tree stable when generated artifacts appear and change', () => {
    const base = runTree();
    expect(base).toMatch(/^Tree: [0-9a-f]{8}$/);
    try {
      mkdirSync(path.dirname(artifactA), { recursive: true });
      mkdirSync(path.dirname(artifactB), { recursive: true });
      mkdirSync(path.dirname(artifactGradle), { recursive: true });
      mkdirSync(path.dirname(artifactCxx), { recursive: true });
      writeFileSync(artifactA, '05d-probe-a');
      writeFileSync(artifactB, '05d-probe-b');
      writeFileSync(artifactGradle, '05d-probe-gradle');
      writeFileSync(artifactCxx, '05d-probe-cxx');
      expect(untracked()).toContain(
        'mobile/android/app/build/__05d_probe__/probe.bin',
      );
      expect(untracked()).toContain(
        'mobile/android/build/__05d_probe__/probe2.bin',
      );
      expect(untracked()).toContain(
        'mobile/android/.gradle/__05d_probe__/probe-gradle.bin',
      );
      expect(untracked()).toContain(
        'mobile/android/app/.cxx/__05d_probe__/probe-cxx.bin',
      );
      expect(runTree()).toBe(base);
      writeFileSync(artifactA, '05d-probe-a-changed-bytes');
      writeFileSync(artifactB, '05d-probe-b-changed-bytes');
      writeFileSync(artifactGradle, '05d-probe-gradle-changed-bytes');
      writeFileSync(artifactCxx, '05d-probe-cxx-changed-bytes');
      expect(runTree()).toBe(base);
    } finally {
      rmSync(path.dirname(artifactA), {
        recursive: true,
        force: true,
      });
      rmSync(path.dirname(artifactB), {
        recursive: true,
        force: true,
      });
      rmSync(path.dirname(artifactGradle), {
        recursive: true,
        force: true,
      });
      rmSync(path.dirname(artifactCxx), {
        recursive: true,
        force: true,
      });
    }
    expect(runTree()).toBe(base);
  });

  it('changes Tree for untracked source outside build', () => {
    const base = runTree();
    expect(base).toMatch(/^Tree: [0-9a-f]{8}$/);
    try {
      mkdirSync(path.dirname(probeOutsideBuild), {
        recursive: true,
      });
      writeFileSync(probeOutsideBuild, '// 05d sensitivity probe\n');
      expect(untracked()).toContain(
        'mobile/android/__05d_probe__/probe-config.gradle',
      );
      expect(runTree()).not.toBe(base);
    } finally {
      rmSync(path.dirname(probeOutsideBuild), {
        recursive: true,
        force: true,
      });
    }
    expect(runTree()).toBe(base);
  });

  it('changes Tree for tracked config edit', () => {
    const original = readFileSync(trackedConfig, 'utf8');
    const base = runTree();
    expect(base).toMatch(/^Tree: [0-9a-f]{8}$/);
    try {
      writeFileSync(trackedConfig, `${original}// 05d probe\n`);
      expect(runTree()).not.toBe(base);
    } finally {
      writeFileSync(trackedConfig, original);
    }
    expect(readFileSync(trackedConfig, 'utf8')).toBe(original);
    expect(runTree()).toBe(base);
  });

  it('keeps verifier selection behavior via --check', () => {
    expect(
      check(['05a-mobile-build-boundary-fix', '--check', '--scope=mobile']),
    ).toMatch(/mobile:typecheck[\s\S]*mobile:test[\s\S]*mobile:build/);
    expect(
      check([
        '05a-mobile-build-boundary-fix',
        '--check',
        '--scope=mobile',
        '--only=mobile:typecheck',
      ]),
    ).toMatch(/OK\s+mobile:typecheck[\s\S]*RESULT: đủ bước/);
    expect(check(['05a-mobile-build-boundary-fix', '--check'])).toMatch(
      /RESULT: đủ bước/,
    );
    const source = readFileSync(verifySource, 'utf8');
    expect(source).toContain('shell: true');
    expect(source).toContain('NOT_RUN');
    expect(source).toContain('INCOMPLETE');
    expect(source).toContain('function runStep');
  });

  it('limits fingerprint change to generated build output', () => {
    const source = readFileSync(verifySource, 'utf8');
    expect(source).toContain(':!mobile/android/**/build/**');
    expect(source).toContain(':!mobile/android/**/.gradle/**');
    expect(source).toContain(':!mobile/android/**/.cxx/**');
    expect(source).toContain('isExcluded(f) || isGeneratedArtifact(f)');
    expect(source.split('isGeneratedArtifact')).toHaveLength(3);
    const imports = [
      ...readFileSync(selfSource, 'utf8').matchAll(
        /import\s+[\s\S]*?from\s+'([^']+)'/g,
      ),
    ].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    expect(
      imports.every((spec) => spec.startsWith('node:') || spec === 'vitest'),
    ).toBe(true);
  });
});
