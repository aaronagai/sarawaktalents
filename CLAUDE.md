# Working on Sarawak Talents

This is a plain HTML/CSS/JS static site (no framework). The compiled Tailwind
stylesheet is committed, so **run `npm run build:css` after changing any Tailwind
classes** and commit the updated `tailwind.css`.

## Branches & deploying — IMPORTANT

- **`main`** auto-deploys to **production**: https://sarawaktalents.com — do NOT
  push directly to `main`.
- **`staging`** auto-deploys to a **preview site**:
  https://sarawaktalents-staging.pages.dev — this is where work-in-progress goes
  to be reviewed before it ships.

**Default rule: do all work on the `staging` branch and push to `staging`.**
Never push to `main` unless the user explicitly says "ship it" / "push to
production". Going live on `sarawaktalents.com` is a deliberate step the owner
takes by merging `staging` → `main`, not something to do automatically.

So the everyday flow is:

```
edit → npm run build:css (if Tailwind classes changed) → commit
     → push to `staging` → check https://sarawaktalents-staging.pages.dev
     → owner reviews, then merges staging → main to go live
```
