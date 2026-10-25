import { spawnSync } from 'node:child_process';

const TASKS = Object.freeze({
  migrate: { command: 'npm', args: ['run', 'db:migrate'] },
  provisionStaff: { command: 'npm', args: ['run', 'provision:staff'] },
  reconcileFirstGrade: { command: process.execPath, args: ['scripts/reconcile-first-grade-class.mjs'] },
  smokeAi: { command: process.execPath, args: ['scripts/ai-production-smoke.mjs'] },
});

function run(taskName, env = process.env) {
  const task = TASKS[taskName];
  if (!task) throw new Error(`Unknown deployment task: ${taskName}`);
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- taskName is selected only by fixed local call sites, TASKS is immutable, and shell execution is disabled.
  const result = spawnSync(task.command, task.args, { env, stdio: 'inherit', shell: false, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Deployment task ${taskName} failed with status ${result.status}`);
  }
}

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Production-only migrations and account actions skipped.');
  process.exit(0);
}

// Gate production releases on a real provider response before touching the
// database. A missing key, unavailable model, or provider outage must not leave
// the current production API running against a newly migrated schema.
if (process.env.NEXUS_AI_SMOKE_ON_DEPLOY === 'YES') {
  run('smokeAi');
}

run('migrate');

if (process.env.NEXUS_STAFF_PROVISION_ON_DEPLOY === 'YES') {
  run('provisionStaff', {
    ...process.env,
    CONFIRM_NEXUS_STAFF_PROVISION: 'YES',
    DISABLE_TEACHER_ACCOUNTS: 'YES',
  });
}

if (process.env.NEXUS_CLASS_RECONCILE_ON_DEPLOY === 'YES') {
  run('reconcileFirstGrade');
}
