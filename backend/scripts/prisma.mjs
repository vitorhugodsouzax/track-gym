import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: true });
if (process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.+)@(.+)$/);
  if (match && !/%[0-9A-Fa-f]{2}/.test(match[3])) process.env.DATABASE_URL = `${match[1]}${match[2]}:${encodeURIComponent(match[3])}@${match[4]}`;
}
const args = process.argv.slice(2);
const command = args[0] === 'seed'
  ? [path.resolve(process.cwd(), '../node_modules/tsx/dist/cli.mjs'), 'prisma/seed.ts']
  : [path.resolve(process.cwd(), 'node_modules/prisma/build/index.js'), ...args];
const result = spawnSync(process.execPath, command, { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
