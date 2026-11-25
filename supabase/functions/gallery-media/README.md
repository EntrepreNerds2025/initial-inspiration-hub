Deploy only AFTER approval and migration verification:

`supabase functions deploy gallery-media --project-ref pozmyqfosfaeheiqwioh --no-verify-jwt`

The gateway JWT check is disabled because public directory and password-session resolution intentionally have no Supabase user JWT. All privileged actions verify the caller's token via Auth.getUser and database is_gallery_admin, then service-only database routines recheck the actor's role. Never disable these checks. No custom service key is required: Supabase supplies its server-only environment. CORS is restricted to the existing domain and local 5174 development origins.

No scheduled worker or paid image transformation. Admin cleanup processes at most 100 obsolete previews per call. Abandoned reservations become eligible after an hour. Full-resolution photos never reach this function.
