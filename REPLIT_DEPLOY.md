# Replit deployment quick start

1. Go to Replit and create a new **Node.js** Repl from this folder.
2. Ensure Secrets are set (if using Supabase):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional `SUPABASE_ANON_KEY`
   - optional `REQUIRE_AUTH`
3. Click **Run**.
4. Replit should expose port `3000` from `.replit`.
5. For deployment, click **Deploy** in Replit.

If no Supabase secrets are set, the app runs in memory mode.
