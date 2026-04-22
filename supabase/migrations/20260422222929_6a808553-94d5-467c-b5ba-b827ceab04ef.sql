-- 1. Cascade from profiles.id to auth.users.id
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Cascade from scanned_jobs.user_id to auth.users.id
ALTER TABLE public.scanned_jobs
  DROP CONSTRAINT IF EXISTS scanned_jobs_user_id_fkey;

ALTER TABLE public.scanned_jobs
  ADD CONSTRAINT scanned_jobs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Cascade from job_applications.job_id to scanned_jobs.id
ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.scanned_jobs(id) ON DELETE CASCADE;