

## Add cascade delete from auth.users to profiles

Currently when you delete a user from the auth system, their row in the `profiles` table is left behind as an orphan. This blocks re-signup with the same email because the `handle_new_user` trigger fails on the primary key conflict.

This plan adds a foreign key with `ON DELETE CASCADE` so deleting an auth user automatically removes their profile (and through the existing chain, their scanned jobs and job applications too).

### What will change

1. **Add cascade from `profiles.id` to `auth.users.id`**
   - Drop any existing implicit constraint on `profiles.id`.
   - Add `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`.
   - Result: deleting an auth user automatically deletes their profile row.

2. **Add cascade from `scanned_jobs.user_id` to `auth.users.id`**
   - Currently `scanned_jobs.user_id` references `profiles.id` (per the generated types) but with no cascade behavior enforced at the DB level for auth deletions.
   - Replace with `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`.
   - Result: deleting an auth user automatically removes all of their scanned jobs.

3. **Confirm cascade from `job_applications.job_id` to `scanned_jobs.id`**
   - The existing `job_applications_job_id_fkey` will be recreated with `ON DELETE CASCADE` if it isn't already.
   - Result: when a scanned job is deleted (including via the cascade above), its applications are deleted too.

### Resulting deletion chain

```text
DELETE auth.users(id)
   │
   ├─► profiles (cascades)
   │
   └─► scanned_jobs (cascades)
            │
            └─► job_applications (cascades)
```

### Technical details

- Implemented as a single SQL migration through the database migration tool.
- The migration uses `DROP CONSTRAINT IF EXISTS` followed by `ADD CONSTRAINT ... ON DELETE CASCADE` so it is idempotent and safe to re-run.
- No application code changes are required. RLS policies and the `handle_new_user` trigger continue to work unchanged.
- Existing data is preserved — only the foreign key behavior changes.

### Testing the signup flow afterwards

Once the migration runs you can simply:
1. Delete the user from the Auth users list.
2. Sign up again with the same email — the profile and any related rows will already be gone, so the trigger inserts cleanly.
3. Click the verification link in the email and confirm you land on `/dashboard` signed in.

