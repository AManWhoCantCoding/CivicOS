import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_SECRET_PATH = path.join(
  process.cwd(),
  '.scratch',
  'CIVICOS-PHASE3-COMMANDER-BOOTSTRAP-20261020',
  'commander.dpapi',
);

const POWERSHELL = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
  if ($env:OS -ne 'Windows_NT') { exit 1 }
  switch ([string]$payload.operation) {
    'store' {
      if ([IO.File]::Exists([string]$payload.path)) {
        [Console]::Out.Write('REFUSED')
        exit 2
      }
      $secure = ConvertTo-SecureString -String ([string]$payload.secret) -AsPlainText -Force
      $encrypted = ConvertFrom-SecureString -SecureString $secure
      $stream = [IO.File]::Open([string]$payload.path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
      try {
        $writer = New-Object System.IO.StreamWriter($stream, [Text.UTF8Encoding]::new($false))
        $writer.Write($encrypted)
      } finally {
        if ($writer) { $writer.Dispose() } else { $stream.Dispose() }
      }
      [Console]::Out.Write('STORED')
    }
    'read' {
      if (-not [IO.File]::Exists([string]$payload.path)) {
        [Console]::Out.Write('NOT_FOUND')
        exit 0
      }
      $encrypted = [IO.File]::ReadAllText([string]$payload.path)
      $secure = ConvertTo-SecureString -String $encrypted
      $secret = [Net.NetworkCredential]::new('', $secure).Password
      [Console]::Out.Write('SECRET:' + $secret)
    }
    default { exit 1 }
  }
} catch {
  [Console]::Out.Write('FAILED')
  exit 1
}
`;

const ENCODED_POWERSHELL = Buffer.from(POWERSHELL, 'utf16le').toString(
  'base64',
);

function secretPath(filePath: string): string {
  const scratchRoot = path.resolve(process.cwd(), '.scratch');
  const resolved = path.resolve(filePath);
  const relative = path.relative(scratchRoot, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('PILOT01_SECRET_STORE_PATH_REFUSED');
  }
  let current = scratchRoot;
  for (const component of ['', ...relative.split(path.sep)]) {
    if (component) current = path.join(current, component);
    let isSymbolicLink: boolean;
    try {
      isSymbolicLink = lstatSync(current).isSymbolicLink();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw new Error('PILOT01_SECRET_STORE_PATH_REFUSED');
    }
    if (isSymbolicLink) {
      throw new Error('PILOT01_SECRET_STORE_PATH_REFUSED');
    }
  }
  return resolved;
}

function runPowerShell(payload: Record<string, string>) {
  if (process.platform !== 'win32') {
    throw new Error('PILOT01_SECRET_STORE_UNAVAILABLE');
  }
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      ENCODED_POWERSHELL,
    ],
    {
      input: JSON.stringify(payload),
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30_000,
    },
  );
  if (result.error || result.signal || result.status === null) {
    throw new Error('PILOT01_SECRET_STORE_FAILED');
  }
  return { status: result.status, output: result.stdout.trim() };
}

export function readPilot01CommanderSecret(
  filePath = DEFAULT_SECRET_PATH,
): string | null {
  const resolved = secretPath(filePath);
  if (!existsSync(resolved)) return null;
  const result = runPowerShell({ operation: 'read', path: resolved });
  if (result.status !== 0) throw new Error('PILOT01_SECRET_STORE_FAILED');
  if (result.output === 'NOT_FOUND') return null;
  if (!result.output.startsWith('SECRET:')) {
    throw new Error('PILOT01_SECRET_STORE_FAILED');
  }
  const secret = result.output.slice('SECRET:'.length);
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    throw new Error('PILOT01_SECRET_STORE_FAILED');
  }
  return secret;
}

export function storePilot01CommanderSecret(
  secret: string,
  filePath = DEFAULT_SECRET_PATH,
): void {
  if (!/^[a-f0-9]{64}$/.test(secret)) {
    throw new Error('PILOT01_SECRET_INVALID');
  }
  const resolved = secretPath(filePath);
  if (existsSync(resolved)) throw new Error('PILOT01_SECRET_STORE_REFUSED');
  mkdirSync(path.dirname(resolved), { recursive: true });
  const result = runPowerShell({ operation: 'store', path: resolved, secret });
  if (result.status === 2 && result.output === 'REFUSED') {
    throw new Error('PILOT01_SECRET_STORE_REFUSED');
  }
  if (result.status !== 0 || result.output !== 'STORED') {
    throw new Error('PILOT01_SECRET_STORE_FAILED');
  }
}
