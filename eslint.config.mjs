import eslintConfigPrettier from 'eslint-config-prettier';
import nextTs from 'eslint-config-next/typescript';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [...nextVitals, ...nextTs, eslintConfigPrettier];

export default eslintConfig;
