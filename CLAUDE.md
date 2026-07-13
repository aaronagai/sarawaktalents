# Working on Sarawak Talents

This is a plain HTML/CSS/JS static site (no framework). The compiled Tailwind
stylesheet is committed, so **run `npm run build:css` after changing any Tailwind
classes** and commit the updated `tailwind.css`.

## Branches & deploying — IMPORTANT, follow this exactly

- **`staging`** branch auto-deploys (~15s) to the **preview site**:
  https://sarawaktalents.pages.dev — this is where all work-in-progress goes.
- **`main`** branch auto-deploys to **production**: https://sarawaktalents.com

### Default behaviour: auto-push every change to `staging`

Do all work on the `staging` branch. **After you finish a change the user asked
for, automatically commit it and push to `staging`** — don't wait to be asked,
and don't ask "should I push?". The point is that every change shows up on the
preview site so it can be reviewed. Before pushing, if you changed any Tailwind
classes, run `npm run build:css` and include the updated `tailwind.css` in the
commit.

So the normal loop is:

```
make the change → (build:css if Tailwind classes changed) → commit
     → push to `staging` → it appears on https://sarawaktalents.pages.dev
```

### Shipping to production: ONLY on an explicit "ship it"

**Never push to `main` or otherwise touch production on your own.** Only put
changes live when the user explicitly says something like "ship it", "ship to
production", "push to main", or "go live". Until then, `main` and
`sarawaktalents.com` must not change.

`main` is a protected branch: direct pushes are blocked and a Pull Request with
one approval is required. So when the user says to ship, open a PR from `staging`
to `main` rather than pushing:

```
gh pr create --base main --head staging --fill
```

Then the other teammate reviews and merges it (don't approve/merge your own PR to
production). After it's merged, confirm to the user it's live on
sarawaktalents.com.
