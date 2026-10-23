-- Clean up accounts made by Stripe TEST-mode checkouts (local funnel testing).
-- NOT a migration: run by hand, step by step, in the Supabase SQL editor.
--
-- Test accounts are flagged is_test = true automatically (checkout livemode =
-- false), and their Clerk users carry publicMetadata.test = true. Delete the
-- Clerk users separately (Clerk dashboard → Users, or the Clerk API) — this
-- file only touches the database.

-- 1. LOOK FIRST. Check this list is only test accounts.
select user_id, email, role, tier, subscription_status, created_at
from profiles where is_test = true order by created_at;

select id, parent_user_id, first_name, kid_user_id, created_at
from child_profiles where is_test = true order by created_at;

-- 2. Then, only if step 1 looked right, uncomment and run:
-- delete from trial_history where is_test = true;
-- delete from meta_events where user_id in (select user_id from profiles where is_test = true);
-- delete from profiles where user_id in (select kid_user_id from child_profiles where is_test = true and kid_user_id is not null);
-- delete from child_profiles where is_test = true;
-- delete from profiles where is_test = true;   -- cascades the user's own rows (attempts, topic scores, ...)
