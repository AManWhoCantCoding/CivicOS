import eslintConfigPrettier from 'eslint-config-prettier';
import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';

// Quality gate scope: ignore virtualenv, dependency, build output, cache, test artifacts and agent evidence.
const qualityGateIgnores = {
  ignores: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'coverage/**',
    'playwright/.venv/**',
    '**/.venv/**',
    'playwright/.pytest_cache/**',
    '**/.pytest_cache/**',
    'playwright/test-results/**',
    'test-results/**',
    'playwright-report/**',
    '**/*.egg-info/**',
    'storage/**',
    '.brain/**',
    '**/__pycache__/**',
  ],
};

const eslintConfig = [
  qualityGateIgnores,
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
];

export default eslintConfig;
