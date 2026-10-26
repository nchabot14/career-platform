# Project 1 Submission

| | |
|---|---|
| Repository | <https://github.com/nchabot14/career-platform> |
| Live HTTPS URL | <https://nickchabot.com>. **Certificate not issued yet** (see 4); the same deployment is at <https://career-platform-production-0e0b.up.railway.app> |
| Final commit | *Filled in at submission* |
| Status checked | 2026-10-26 |

Items marked **pending** or **unverified** haven't been checked yet. They
aren't filled in with expected results.

## 1. README, spec and plans

- [README](../README.md)
- Original application spec:
  [2026-10-01-career-platform-design.md](superpowers/specs/2026-10-01-career-platform-design.md)
- Plans: [application](superpowers/plans/2026-10-01-career-platform.md),
  [Azure VM migration](superpowers/plans/2026-09-24-azure-vm-migration.md),
  [operating the VM](superpowers/plans/2026-10-01-operate-the-vm.md),
  [Railway and PostgreSQL migration](superpowers/plans/2026-10-08-railway-postgres-migration.md)
- Profile, database reads, empty table, failure and recovery:
  [database-outage.md](evidence/database-outage.md). Checked on a local
  production build; **the live-site outage check is pending**.

## 2. Architecture diagrams

- [request-path.md](request-path.md): Azure and Railway request paths,
  email (Zoho) and analytics (GA4) paths, and what changed between hosts.

## 3. Migration, data comparison, cutover and rollback

- [Migration plan](superpowers/plans/2026-10-08-railway-postgres-migration.md)
  and [pull request #11](https://github.com/nchabot14/career-platform/pull/11)
- [Migration record](railway-migration.md):
  [timeline](railway-migration.md#timeline),
  [what changed in the code](railway-migration.md#what-changed-in-the-code),
  [table-by-table comparison](railway-migration.md#how-the-data-moved),
  [reads, writes and updates](railway-migration.md#proving-it-works),
  [cutover and checks](railway-migration.md#cutover-and-checks-after-it),
  [who manages what](railway-migration.md#who-manages-what),
  [rollback](railway-migration.md#rollback)
- README [Rollback](../README.md#rollback) for code, data and hosting
- **Pending:** naming the real change made to the original data
  ([note](railway-migration.md#how-the-data-moved))

## 4. Azure HTTP and restart, final DNS and HTTPS

- Azure: [operating the VM](superpowers/plans/2026-10-01-operate-the-vm.md)
  (nginx, the two app copies under systemd, NSG rules, and the
  [restart check](superpowers/plans/2026-10-01-operate-the-vm.md#restart-check-after-your-reboot)),
  [VM details and SSH](evidence/ex03.md),
  [how the Azure site was secured](how-this-site-is-secured.md) (Ex04, my own explanation)
- Final DNS and HTTPS: [domain-and-https.md](evidence/domain-and-https.md).
  `www` redirects pass. **HTTPS at the bare domain fails**: Railway hasn't
  issued the certificate
  ([investigation](evidence/domain-and-https.md#investigation-railway-certificate-not-issued)).

## 5. Reviewed change and its Railway deployment

- [reviewed-change.md](evidence/reviewed-change.md): commit `07f8801` →
  Railway deployment `d63fdb05` → LinkedIn button on the live site.
  Seen at the Railway address; **unverified at nickchabot.com** until the
  certificate is issued.

## 6. Zoho email

- [ex06.md](evidence/ex06.md): receiving, replying, sending, and the
  [mail DNS records explained](evidence/ex06.md#dns-records-for-mail)
- [zoho-header-check.md](evidence/zoho-header-check.md): SPF, DKIM and DMARC
  from the received headers
- [dns-before-zoho.md](evidence/dns-before-zoho.md): DNS before any mail
  record
- [Before-MX message](evidence/ex06.md#1-email-tests): sent before any mail
  record existed, delivered 33 minutes late once MX was published

## 7. GA4

- [GA4 in ex06.md](evidence/ex06.md#3-ga4): how browser activity reaches
  GA4, and why the click matters. First check on a local run, 2026-10-20:
  [event counts](evidence/ex06-ga4-events.png),
  [click details](evidence/ex06-ga4-click-values.png)
- [Privacy page](https://career-platform-production-0e0b.up.railway.app/privacy)
- [Live site check](evidence/ex06.md#live-site-check), 2026-10-26: page
  views and an outbound click (LinkedIn) in GA4 Realtime from the deployed
  site. Screenshots: [events](evidence/ga4-live-events.png),
  [click](evidence/ga4-live-click.png). Done at the Railway address,
  since nickchabot.com has no certificate yet.

## 8. Failures, decisions, reflection, costs and limitations

- README: [investigated failures](../README.md#investigated-failures),
  [decisions](../README.md#decisions),
  [remaining limitations](../README.md#remaining-limitations),
  [services, costs and cleanup](../README.md#services-costs-and-cleanup),
  [reflection](../README.md#reflection) (**to be written**)
- Failure records: [ex03.md](evidence/ex03.md) (application and database),
  [ex05.md](evidence/ex05.md) (DNS/TLS, supplied simulation),
  [Railway certificate](evidence/domain-and-https.md#investigation-railway-certificate-not-issued)
  (TLS, real, open)
- [Railway recommendation and cost notes](railway-migration.md#recommendation)
