import { preflightDemoFoundation } from './clock';

const { target } = preflightDemoFoundation();

console.log(
  `Demo bootstrap preflight passed: ${target.displayUrl} (name=${target.dbName})`,
);
