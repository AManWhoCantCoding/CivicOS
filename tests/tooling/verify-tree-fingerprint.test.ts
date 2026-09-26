import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
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
const checkpointProbe = path.join(
  root,
  'mobile/android/__05e_probe__/probe.cfg',
);
const trackedConfig = path.join(root, 'tsconfig.json');
const nativeConfigs = [
  'mobile/android/settings.gradle',
  'mobile/android/app/build.gradle',
  'mobile/android/gradle.properties',
].map((file) => path.join(root, file));
const verifySource = path.join(root, 'scripts/verify.mjs');
const selfSource = path.join(
  root,
  'tests/tooling/verify-tree-fingerprint.test.ts',
);

function runTree(): string {
  // Gọi fingerprint production qua subprocess để assert runtime thật.
  return execFileSync(process.execPath, ['scripts/verify.mjs', '--tree'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
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

function runVerifier(args: string[]) {
  return spawnSync(process.execPath, ['scripts/verify.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function gitLines(args: string[]): string[] {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .filter(Boolean);
}

function isGeneratedPath(file: string): boolean {
  const normalized = file.replace(/\\/g, '/');
  return (
    normalized.startsWith('mobile/android/') &&
    normalized
      .split('/')
      .some(
        (segment) =>
          segment === 'build' || segment === '.gradle' || segment === '.cxx',
      )
  );
}

function isExcludedPath(file: string): boolean {
  const normalized = file.replace(/\\/g, '/');
  const roots = ['.brain', '.scratch', '.codegraph', 'Lesson-learned.md'];
  return roots.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function inventory() {
  const tracked = new Set(gitLines(['ls-files']));
  const untracked = new Set(gitLines(['ls-files', '-o', '--exclude-standard']));
  const ignored = new Set(
    gitLines(['status', '--short', '--ignored', '--untracked-files=all'])
      .filter((line) => line.startsWith('!! '))
      .map((line) => line.slice(3)),
  );
  const changed = new Set(gitLines(['diff', '--name-only', 'HEAD']));
  const paths = [...new Set([...untracked, ...ignored, ...changed])];
  const records = new Map(
    paths.flatMap((file) => {
      if (file.endsWith('/')) return [];
      try {
        const absolute = path.join(root, file);
        const st = statSync(absolute);
        if (st.isDirectory()) return [];
        return [
          [
            file,
            {
              state: ignored.has(file)
                ? 'ignored'
                : tracked.has(file)
                  ? 'tracked'
                  : 'untracked',
              size: st.size,
              mtimeMs: st.mtimeMs,
            },
          ],
        ];
      } catch {
        return [];
      }
    }),
  );
  return { records, tracked, ignored };
}

function contentHash(file: string): string {
  try {
    return createHash('sha1')
      .update(readFileSync(path.join(root, file)))
      .digest('hex');
  } catch {
    return '(missing)';
  }
}

describe('verify tree fingerprint', () => {
  afterEach(() => {
    rmSync(path.dirname(artifactA), { recursive: true, force: true });
    rmSync(path.dirname(artifactB), { recursive: true, force: true });
    rmSync(path.dirname(artifactGradle), { recursive: true, force: true });
    rmSync(path.dirname(artifactCxx), { recursive: true, force: true });
    rmSync(path.dirname(probeOutsideBuild), { recursive: true, force: true });
    rmSync(path.dirname(checkpointProbe), { recursive: true, force: true });
    expect(existsSync(artifactA)).toBe(false);
    expect(existsSync(artifactB)).toBe(false);
    expect(existsSync(artifactGradle)).toBe(false);
    expect(existsSync(artifactCxx)).toBe(false);
    expect(existsSync(probeOutsideBuild)).toBe(false);
    expect(existsSync(checkpointProbe)).toBe(false);
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

  it('keeps Tree stable across the real native build lifecycle', () => {
    const before = inventory();
    const base = runTree();
    expect(base).toMatch(/^Tree: [0-9a-f]{8}$/);
    execFileSync(
      process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm',
      process.platform === 'win32'
        ? ['/d', '/s', '/c', 'npm run mobile:build']
        : ['run', 'mobile:build'],
      { cwd: root, encoding: 'utf8' },
    );
    const after = inventory();
    const afterTree = runTree();
    expect(afterTree).toMatch(/^Tree: [0-9a-f]{8}$/);
    process.stdout.write(`tree-before ${base} tree-after ${afterTree}\n`);
    const appeared = [...after.records.keys()].filter(
      (file) => !before.records.has(file),
    );
    const updated = [...after.records.keys()].filter((file) => {
      const previous = before.records.get(file);
      const current = after.records.get(file);
      return previous && current && previous.size !== current.size;
    });
    const mtimeOnly = [...after.records.keys()].filter((file) => {
      const previous = before.records.get(file);
      const current = after.records.get(file);
      return (
        previous &&
        current &&
        previous.size === current.size &&
        previous.mtimeMs !== current.mtimeMs
      );
    });
    const lifecycle = [
      ...appeared.map((file) => ({ file, state: 'appeared' })),
      ...updated.map((file) => ({ file, state: 'updated' })),
      ...mtimeOnly.map((file) => ({ file, state: 'mtimeOnly' })),
    ].sort((left, right) => {
      const leftKey = `${left.file}:${left.state}`;
      const rightKey = `${right.file}:${right.state}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
    process.stdout.write(
      `native-build-inventory ${JSON.stringify(
        lifecycle.map(({ file, state }) => ({
          path: file,
          state,
          ...(after.records.get(file) ?? {}),
          content: contentHash(file),
        })),
      )}\n`,
    );
    expect(lifecycle.length).toBeGreaterThan(0);
    for (const { file } of lifecycle) {
      const record = after.records.get(file);
      expect(record?.state === 'ignored' || isGeneratedPath(file)).toBe(true);
    }
    expect(afterTree).toBe(base);
  }, 180000);

  it('keeps profile Tree equal to standalone Tree across the real build', async () => {
    const probeDir = path.dirname(checkpointProbe);
    const probeRel = 'mobile/android/__05e_probe__/probe.cfg';
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(checkpointProbe, '05e checkpoint probe\n');
    expect(untracked()).toContain(probeRel);
    const before = inventory();
    const child = spawn(
      process.execPath,
      [
        'scripts/verify.mjs',
        '05e-verifier-tree-fingerprint-build-checkpoint',
        '--only=mobile:build',
      ],
      { cwd: root },
    );
    let output = '';
    child.stdout?.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('error', (err) => {
      output += String(err);
    });
    const ticker = setInterval(() => {
      try {
        writeFileSync(checkpointProbe, '05e checkpoint probe\n');
      } catch {
        return;
      }
    }, 500);
    let status: number | null = null;
    try {
      status = await new Promise<number | null>((resolve) => {
        const timer = setTimeout(() => {
          try {
            child.kill();
          } catch {
            return;
          }
          resolve(null);
        }, 150000);
        child.on('close', (code) => {
          clearTimeout(timer);
          resolve(code);
        });
        child.on('error', () => {
          clearTimeout(timer);
          resolve(null);
        });
      });
      process.stdout.write(`checkpoint-profile status=${String(status)}\n`);
      process.stdout.write(`${output}\n`);
      const match = output.match(/Tree ([0-9a-f]{8})/);
      expect(match).not.toBeNull();
      const profileTree = `Tree: ${match && match[1]}`;
      expect(profileTree).toMatch(/^Tree: [0-9a-f]{8}$/);
      process.stdout.write(`checkpoint-profile Tree: ${profileTree}\n`);
      const standalone = runTree();
      expect(standalone).toMatch(/^Tree: [0-9a-f]{8}$/);
      process.stdout.write(`checkpoint-standalone Tree: ${standalone}\n`);
      const after = inventory();
      const appeared = [...after.records.keys()].filter(
        (file) => !before.records.has(file),
      );
      const updated = [...after.records.keys()].filter((file) => {
        const previous = before.records.get(file);
        const current = after.records.get(file);
        return previous && current && previous.size !== current.size;
      });
      const mtimeOnly = [...after.records.keys()].filter((file) => {
        const previous = before.records.get(file);
        const current = after.records.get(file);
        return (
          previous &&
          current &&
          previous.size === current.size &&
          previous.mtimeMs !== current.mtimeMs
        );
      });
      const lifecycle = [
        ...appeared.map((file) => ({ file, state: 'appeared' })),
        ...updated.map((file) => ({ file, state: 'updated' })),
        ...mtimeOnly.map((file) => ({ file, state: 'mtimeOnly' })),
      ].sort((left, right) => {
        const leftKey = `${left.file}:${left.state}`;
        const rightKey = `${right.file}:${right.state}`;
        return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
      });
      process.stdout.write(
        `checkpoint-inventory ${JSON.stringify(
          lifecycle.map(({ file, state }) => ({
            path: file,
            state,
            ...(after.records.get(file) ?? {}),
            content: contentHash(file),
          })),
        )}\n`,
      );
      expect(lifecycle.length).toBeGreaterThan(0);
      const probeRecord = after.records.get(probeRel);
      expect(probeRecord?.state).toBe('untracked');
      expect(isGeneratedPath(probeRel)).toBe(false);
      expect(
        lifecycle.some(
          ({ file, state }) =>
            file === probeRel &&
            (state === 'mtimeOnly' || state === 'appeared'),
        ),
      ).toBe(true);
      for (const { file } of lifecycle) {
        if (file === probeRel) continue;
        const record = after.records.get(file);
        expect(
          record?.state === 'ignored' ||
            isExcludedPath(file) ||
            isGeneratedPath(file),
        ).toBe(true);
      }
      expect(standalone).toBe(profileTree);
    } finally {
      clearInterval(ticker);
      if (child.exitCode === null) {
        child.kill();
      }
      rmSync(probeDir, { recursive: true, force: true });
    }
  }, 180000);

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

  it('keeps Tree sensitive to native config content', () => {
    for (const probeDir of [
      path.dirname(artifactA),
      path.dirname(artifactB),
      path.dirname(artifactGradle),
      path.dirname(artifactCxx),
      path.dirname(probeOutsideBuild),
    ]) {
      rmSync(probeDir, { recursive: true, force: true });
    }
    for (const config of nativeConfigs) {
      const original = readFileSync(config, 'utf8');
      const base = runTree();
      expect(base).toMatch(/^Tree: [0-9a-f]{8}$/);
      try {
        writeFileSync(config, `${original}\n// fingerprint probe\n`);
        expect(runTree()).not.toBe(base);
      } finally {
        writeFileSync(config, original);
      }
      expect(readFileSync(config, 'utf8')).toBe(original);
      expect(runTree()).toBe(base);
    }
  });

  it('ignores generated mtime-only changes but keeps relevant content changes visible', () => {
    const base = runTree();
    try {
      mkdirSync(path.dirname(probeOutsideBuild), { recursive: true });
      writeFileSync(probeOutsideBuild, 'mtime-probe');
      const original = statSync(probeOutsideBuild).mtimeMs;
      const afterWrite = runTree();
      expect(afterWrite).not.toBe(base);
      utimesSync(probeOutsideBuild, new Date(), new Date(original + 10000));
      expect(runTree()).toBe(afterWrite);
      writeFileSync(probeOutsideBuild, 'mtime-probe-changed');
      expect(runTree()).not.toBe(afterWrite);
    } finally {
      rmSync(path.dirname(probeOutsideBuild), { recursive: true, force: true });
    }
    expect(runTree()).toBe(base);
  });

  it('ignores generated mtime-only and content changes', () => {
    const base = runTree();
    try {
      mkdirSync(path.dirname(artifactA), { recursive: true });
      writeFileSync(artifactA, 'mtime-probe');
      const original = statSync(artifactA).mtimeMs;
      utimesSync(artifactA, new Date(), new Date(original + 10000));
      expect(runTree()).toBe(base);
      writeFileSync(artifactA, 'mtime-probe-changed');
      expect(runTree()).toBe(base);
    } finally {
      rmSync(path.dirname(artifactA), { recursive: true, force: true });
    }
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
    expect(
      check(['05a-mobile-build-boundary-fix', '--check', '--scope=full']),
    ).toMatch(/RESULT: (đủ bước|\d+ bước thiếu)/);
    const failure = runVerifier([
      '05a-mobile-build-boundary-fix',
      '--only=typecheck',
      '--filter=--definitely-invalid',
    ]);
    expect(failure.status).toBe(1);
    expect(`${failure.stdout}${failure.stderr}`).toMatch(
      /FAIL\s+typecheck[\s\S]*RESULT: FAIL/,
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
    expect(source).toContain('tree = treeFingerprint();');
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
