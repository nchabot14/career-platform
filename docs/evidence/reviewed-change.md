# A Reviewed Change Through Railway

Requirement 5: one change, reviewed and checked locally, pushed, deployed by
Railway, and seen on the live site.

## The change

**Commit `07f8801`**, "feat: add a LinkedIn button to the homepage",
2026-10-26 09:24 UTC. It adds a LinkedIn button that opens my profile in a
new tab.

| File | Change |
|---|---|
| `lib/site-owner.ts` | Adds the LinkedIn URL |
| `components/public/contact-links.tsx` | Renders the button, with `target="_blank"` and `rel="noopener noreferrer"` and a screen-reader note that it opens a new tab |
| `tests/unit/public-page.test.tsx` | A test that the button is there, points at the profile, and opens safely in a new tab |

## Review and local checks before pushing

- Claude Code wrote the change at my request, with the LinkedIn URL I gave
  it. I reviewed the diff and asked for the commit, push and merge.
- The new test caught a bug in the first version: the accessible name came
  out as "LinkedIn(opens in new tab)", with no space. The space moved outside
  the hidden span, and the test passed.
- Full unit test run passed locally.
- Pushed on branch `feat/railway-postgres`, which Railway was deploying at
  the time. CI passed on the pull request (#11).

## Deployment

```
$ railway deployment list --service career-platform
d63fdb05  2026-10-26 09:24:33 UTC  07f8801  feat/railway-postgres  feat: add a LinkedIn button to the homepage
```

Railway built the image from the `Dockerfile`, ran `node scripts/migrate.mjs`
before switching traffic, and the deploy passed `/api/health`. From push to
live took about 1.5 minutes. PR #11 merged to `main` at 09:35 UTC; Railway
has deployed `main` since (the current deployment, `1d5d47c2` for
`f2c9e54`, still contains the change).

## Seen on the live site

Checked 2026-10-26 at 18:25 UTC:

```
$ curl -s https://career-platform-production-0e0b.up.railway.app/ | grep -o 'href="https://www.linkedin.com/in/[^"]*" target="_blank" rel="noopener noreferrer"'
href="https://www.linkedin.com/in/nicholas-chabot-309527348/" target="_blank" rel="noopener noreferrer"
```

**Not yet seen at nickchabot.com.** The domain reaches the same deployment
(`curl -k https://nickchabot.com/` returns this page), but without a valid
certificate a browser won't load it. Repeat the check at
`https://nickchabot.com` once the certificate is issued
([domain-and-https.md](domain-and-https.md)).

## Undoing it

See the README's [Rollback](../../README.md#rollback) section. For this change:
roll back to the previous deployment in Railway, or `git revert 07f8801` and
push. It has no database change, so the data needs nothing.
