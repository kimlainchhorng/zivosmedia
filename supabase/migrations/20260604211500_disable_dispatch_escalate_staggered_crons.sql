-- Disable staggered dispatch escalation cron jobs that hold Postgres workers
-- open with pg_sleep every minute. These jobs should be replaced by an
-- external scheduler or an Edge Function schedule that does not sleep inside
-- the database.
select cron.unschedule(jobid)
from cron.job
where jobname like 'dispatch-escalate-%';
