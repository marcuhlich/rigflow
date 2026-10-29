# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Report them privately through
[GitHub Security Advisories](https://github.com/marcuhlich/rigflow/security/advisories/new).
Please include steps to reproduce and the impact you expect.

You'll get an answer within a few days. Once a fix is available, the issue can be
disclosed together with credit to you, if you like.

## Scope

- The web app at rigflow.net, the Android app and the code in this repository
- Supabase edge functions in `supabase/functions`

Out of scope: denial of service, social engineering, and issues in third-party
services (Supabase, Vercel, PostHog) that aren't caused by RigFlow's configuration.

## Notes for self-hosters

- `VITE_*` environment variables are public by design. Never expose the Supabase
  service role key to the frontend.
- Data access is protected by Row Level Security in Postgres. Keep RLS enabled
  on every table and review policies when you add tables.
- Users with 2FA should be required to reach `aal2` in your RLS policies, not only
  in the client.
