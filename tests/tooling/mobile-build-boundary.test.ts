import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');
const readJson = (file: string) =>
  JSON.parse(readFileSync(path.join(root, file), 'utf8')) as Record<
    string,
    unknown
  >;

function sourceFiles(directory: string): string[] {
  return readdirSync(path.join(root, directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() && entry.name !== 'node_modules'
      ? sourceFiles(relative)
      : /\.(js|jsx|ts|tsx)$/.test(entry.name)
        ? [relative]
        : [];
  });
}

describe('mobile build boundary', () => {
  it('keeps mobile out of the root TypeScript project', () => {
    const config = readJson('tsconfig.json');
    const include = Array.isArray(config.include) ? config.include : [];
    const exclude = Array.isArray(config.exclude) ? config.exclude : [];

    expect(exclude).toContain('mobile/**');
    expect(include.every((entry) => !String(entry).startsWith('mobile/'))).toBe(
      true,
    );
  });

  it('keeps the mobile compiler project independent and removes the global FormData shim', () => {
    const config = readJson('mobile/tsconfig.json');
    const globals = readFileSync(
      path.join(root, 'mobile/src/test-globals.d.ts'),
      'utf8',
    );

    expect(config.extends).not.toBe('../tsconfig.json');
    expect(JSON.stringify(config)).not.toContain('src/app');
    expect(globals).not.toMatch(/interface\s+FormData|declare\s+global/);
  });

  it('maps root wrappers to the three mobile package commands', () => {
    const rootScripts = readJson('package.json').scripts as Record<
      string,
      string
    >;
    const mobileScripts = readJson('mobile/package.json').scripts as Record<
      string,
      string
    >;

    expect(rootScripts['mobile:typecheck']).toBe(
      'npm --prefix mobile run typecheck',
    );
    expect(rootScripts['mobile:test']).toBe('npm --prefix mobile run test');
    expect(rootScripts['mobile:build']).toBe('npm --prefix mobile run build');
    expect(mobileScripts.typecheck).toBeTruthy();
    expect(mobileScripts.test).toBeTruthy();
    expect(mobileScripts.build).toBeTruthy();
  });

  it('keeps the mobile verifier profile ordered and selectable', () => {
    const verify = readJson('package.json').verify as Record<string, unknown>;
    const rootScripts = readJson('package.json').scripts as Record<
      string,
      string
    >;

    expect(verify.mobile).toEqual([
      'mobile:typecheck',
      'mobile:test',
      'mobile:build',
    ]);
    expect(Array.isArray(verify.fast) ? verify.fast : []).not.toContain(
      'mobile:build',
    );
    expect(Array.isArray(verify.full) ? verify.full : []).not.toContain(
      'mobile:build',
    );

    const check = (scope: string, only?: string) =>
      execFileSync(
        process.execPath,
        [
          'scripts/verify.mjs',
          '05-mobile-readonly-client',
          '--check',
          `--scope=${scope}`,
          ...(only ? [`--only=${only}`] : []),
        ],
        { cwd: root, encoding: 'utf8' },
      );

    expect(check('mobile')).toMatch(
      /mobile:typecheck[\s\S]*mobile:test[\s\S]*mobile:build[\s\S]*RESULT: đủ bước/,
    );
    expect(check('mobile', 'mobile:typecheck')).toMatch(
      /OK\s+mobile:typecheck[\s\S]*RESULT: đủ bước/,
    );
    expect(check('fast')).not.toContain('mobile:build');
    expect(check('full')).not.toContain('mobile:build');
    expect(rootScripts['mobile:build']).toContain('mobile run build');
  });

  it('keeps mobile source free of root and server-only imports', () => {
    const forbidden =
      /(?:from\s+|import\s*\(\s*)['"](?:next(?:\/|['"]|$)|@prisma\/|src\/app\/)/;
    const imports = sourceFiles('mobile').map((file) => ({
      file,
      source: readFileSync(path.join(root, file), 'utf8'),
    }));

    expect(imports.filter(({ source }) => forbidden.test(source))).toEqual([]);
    expect(
      imports.some(
        ({ file }) => file === path.join('mobile', 'src', 'test-globals.d.ts'),
      ),
    ).toBe(true);
  });
});
