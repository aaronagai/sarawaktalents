/* ── Supabase client singleton ───────────────────────────────────────
   Exposes window.stSupabase (or null in preview mode). Requires the
   supabase-js UMD bundle to be loaded first (see the <script> tag).
   -------------------------------------------------------------------- */
(function () {
    'use strict';

    if (!window.ST_CONFIGURED) {
        window.stSupabase = null;
        return;
    }
    if (!window.supabase || !window.supabase.createClient) {
        console.warn('[Sarawak Talents] supabase-js not loaded — running in preview mode.');
        window.stSupabase = null;
        return;
    }

    window.stSupabase = window.supabase.createClient(
        window.ST_CONFIG.SUPABASE_URL,
        window.ST_CONFIG.SUPABASE_ANON_KEY,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
    );
})();
