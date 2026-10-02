# Nexus private file storage

Assignment and lesson uploads use stable `file:<id>` references in the application database. API reads mint Supabase signed URLs that expire after 15 minutes, after the corresponding assignment or lesson access check. New uploads and signed reads fail closed unless the `assignments` bucket is private.

## Required deployment configuration

1. In the Nexus Supabase project, set the existing `assignments` bucket to **Private**. This also disables anonymous access to older objects in that bucket; the API signs authorized reads for legacy public-URL records where file metadata exists.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the API deployment environment. `SUPABASE_SERVICE_KEY` is accepted as a server-only alias. Never expose either key through a `NEXT_PUBLIC_` variable or the web client.
3. Redeploy the API after configuring the bucket and environment variables. If the bucket is still public or the service key is missing, file upload and signed-link creation intentionally return an error instead of exposing a public link.

The code does not change Supabase bucket settings automatically. This avoids silently changing access to existing objects without an operator confirming the intended storage policy.
