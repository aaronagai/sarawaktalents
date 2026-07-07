# Sarawak Talents — Backend setup (Supabase)

This is the one-time setup only you can do (it needs your own accounts). It
takes ~15 minutes. When you finish, send me the two values in **Step 6** and
I'll wire up the frontend (auth, onboarding, live directory).

---

## 1. Create the Supabase project
1. Go to https://supabase.com → sign in → **New project**.
2. Name it `sarawak-talents`, pick a region close to Malaysia (e.g. Singapore),
   set a database password (save it somewhere safe).
3. Wait ~2 min for it to provision.

## 2. Run the schema
1. In the project: **SQL Editor → New query**.
2. Open `supabase/schema.sql` (in this repo), copy the whole file, paste, **Run**.
3. You should see "Success. No rows returned."

## 3. Turn on Google sign-in
1. **Authentication → Providers → Google → Enable.**
2. It shows a **Callback URL** — copy it.
3. In [Google Cloud Console](https://console.cloud.google.com/): create/select a
   project → **APIs & Services → Credentials → Create Credentials → OAuth client
   ID → Web application**.
   - Authorised redirect URI: paste the Supabase callback URL from step 2.
   - (You may need to fill the OAuth consent screen first — "External", add your
     email as a test user.)
4. Copy the **Client ID** and **Client secret** back into Supabase's Google
   provider settings → **Save**.

## 4. Add your site URLs
**Authentication → URL Configuration:**
- **Site URL:** your live site, e.g. `https://<username>.github.io/sarawaktalents/`
- **Redirect URLs:** add both:
  - `https://<username>.github.io/sarawaktalents/`
  - `http://localhost:8765/` (so we can test locally)

## 5. Make yourself an admin + create a test invite
1. Sign in to the site once with Google *after I've wired auth* — OR just create
   your auth user now via **Authentication → Users → Add user** (email = your
   Google email).
2. Copy your **User UID** from **Authentication → Users**.
3. In **SQL Editor**, run (replace the UID):
   ```sql
   insert into public.admins (user_id) values ('YOUR-USER-UID');
   insert into public.invites (code, note) values ('SARAWAK-001', 'test invite');
   ```

## 6. Send me these two values
**Project Settings → API:**
- **Project URL**  → `https://xxxxxxxx.supabase.co`
- **anon public key**  → a long `eyJ...` string

Both are **safe to put in frontend code** — that's what they're designed for.

> ⚠️ **Never** send or commit the **`service_role`** key (also on that page).
> It bypasses all security. Frontend only ever uses the **anon** key.

---

Once I have the URL + anon key, I'll add them to a `config.js`, load
`supabase-js`, and build the Google sign-in, invite gate, onboarding form, and
switch the directory over to live data.

---

## 7. Deploy profile share previews (WhatsApp / social cards)

Profile **Copy link** uses a Supabase Edge Function so WhatsApp, iMessage, and
other apps show a personalised preview card (`@username`, badge, photo, “Find me
on SarawakTalents.com”).

One-time deploy (needs [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
cd /path/to/sarawaktalents
supabase login
supabase link --project-ref zedeqvbsuljgxapkoihg
supabase functions deploy share --no-verify-jwt
supabase functions deploy share-image --no-verify-jwt
```

Test:

- Preview image: `https://zedeqvbsuljgxapkoihg.supabase.co/functions/v1/share-image?u=heinekenl`
- Share HTML (for crawlers): `https://zedeqvbsuljgxapkoihg.supabase.co/functions/v1/share?u=heinekenl`

Humans hitting the share URL are redirected to the normal profile page.

The card text uses SF Pro Rounded Regular, served from the public `assets`
storage bucket at `fonts/sf-pro-rounded-regular-latin.otf`. To regenerate it
(e.g. to add glyphs), subset the system font and upload to that same path:

```bash
python3 -m fontTools.subset /Library/Fonts/SF-Pro-Rounded-Regular.otf \
  --unicodes="U+0020-00FF,U+2013,U+2014,U+2018-201D,U+2026" \
  --output-file=sf-pro-rounded-regular-latin.otf
```

### Profile URLs on sarawaktalents.com (`/profile/?u=`)

WhatsApp needs crawler-specific HTML for `https://sarawaktalents.com/profile/?u=…`.
GitHub Pages alone cannot do that (same static file for every `?u=`). Deploy the
Cloudflare Worker in `workers/` — see `workers/README.md`:

```bash
npx wrangler login
npx wrangler deploy
```

Requires `sarawaktalents.com` on Cloudflare with proxy (orange cloud) enabled.
