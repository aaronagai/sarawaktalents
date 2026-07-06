/* ── Sarawak Talents — frontend config ───────────────────────────────
   Supabase project keys. Both values are public/safe to commit
   (the publishable key only works alongside Row-Level Security, which
   the schema enables). Never put a secret/service_role key here.
   -------------------------------------------------------------------- */
window.ST_CONFIG = {
    SUPABASE_URL: 'https://zedeqvbsuljgxapkoihg.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_kQ6F4qros72pT5s6at-Qww_jF36UcIm'
};

window.ST_CONFIGURED = !!(window.ST_CONFIG.SUPABASE_URL && window.ST_CONFIG.SUPABASE_ANON_KEY);
