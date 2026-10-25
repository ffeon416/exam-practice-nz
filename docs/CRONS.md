# Crons

`vercel.json` only holds once-a-day schedules, because the Vercel Hobby plan
rejects a deploy if any cron runs more than once a day. The frequent jobs run
from an external scheduler (cron-job.org, free) instead. Every cron route
accepts GET or POST with `Authorization: Bearer $CRON_SECRET` and is
idempotent, so running one twice (external + Vercel) is harmless.

| Route | Schedule | Why that often |
| --- | --- | --- |
| `/api/cron/free-week` | every hour, minute 7 | Auto-cancel promise layer 1 + backstop, parent emails. **The promise depends on this one.** |
| `/api/cron/reminders` | every 10 minutes | The 7pm study reminder push, in each family's time zone |
| `/api/cron/forecast` | every hour, minute 15 | Each student's nightly snapshot, from 2am their time |

`vercel.json` also runs `/api/cron/free-week` once a day (03:07 UTC) as a last
backstop in case the external scheduler stops.

## Setting up cron-job.org

Quickest: make a free account, create an API key (Console → Settings), then
`CRONJOB_API_KEY=... CRON_SECRET=... node scripts/setup-cron-jobs.mjs` creates
all three jobs paused; re-run with `--enable` after the deploy. By hand:

1. Sign up at cron-job.org (free).
2. For each row above: **Create cronjob** → URL `https://studyace.co/api/cron/<name>`,
   set the schedule, then under **Advanced → Headers** add
   `Authorization` = `Bearer <CRON_SECRET from Vercel>`.
3. Turn on **Notify me when execution fails**, so a failing free-week job
   reaches an inbox.
4. Click **Test run** on each one: it should return 200 with a JSON report
   (401 means the header doesn't match `CRON_SECRET`).

## If the project moves to Vercel Pro

Add the three rows back to `vercel.json` (`7 * * * *`, `*/10 * * * *`,
`15 * * * *`) and keep cron-job.org running alongside as the backup.
