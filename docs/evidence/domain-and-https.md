# Domain, DNS and HTTPS

The domain `nickchabot.com` is registered and served by Cloudflare DNS (name
servers `gordon.ns.cloudflare.com` and `margot.ns.cloudflare.com`). The bare
domain points at Railway; `www` redirects to it.

> **Status on 2026-10-26: HTTPS for the bare domain is not working.** Railway
> hasn't issued the certificate for `nickchabot.com` (see
> [the investigation](#investigation-railway-certificate-not-issued)), so
> browsers show a certificate error at `https://nickchabot.com`. The site
> itself is up at
> <https://career-platform-production-0e0b.up.railway.app>, and the `www`
> redirects work.

## DNS records

From `cf dns records list --zone nickchabot.com` on 2026-10-26 at 18:20 UTC.
The DKIM key and the Railway verification token are shortened.

| Type | Name | Content | Proxy | Purpose |
|---|---|---|---|---|
| CNAME | `nickchabot.com` | `l3la2mgf.up.railway.app` | DNS only | The site. Cloudflare flattens a CNAME at the apex into A records, so visitors get Railway's edge address and connect to Railway directly. DNS only, so TLS is between the browser and Railway. |
| TXT | `_railway-verify.nickchabot.com` | `railway-verify=69a956ca…` | DNS only | Proves to Railway that I control the domain. |
| A | `www.nickchabot.com` | `20.25.246.180` (the Azure VM) | Proxied | Only there so Cloudflare answers for `www`. A Cloudflare redirect rule sends every `www` request to `https://nickchabot.com/` with a 301, so traffic never reaches the address. It keeps working after the VM is shut down. |
| MX | `nickchabot.com` | `mx.zoho.com` (10), `mx2.zoho.com` (20), `mx3.zoho.com` (50) | DNS only | Where other servers deliver mail for `@nickchabot.com`. A lower number is tried first. |
| TXT | `nickchabot.com` | `v=spf1 include:zohomail.com ~all` | DNS only | SPF: the servers allowed to send mail as `nickchabot.com`. |
| TXT | `zmail._domainkey.nickchabot.com` | `v=DKIM1; k=rsa; p=MIGfMA0G…` | DNS only | DKIM: the public key that checks Zoho's signature on outgoing mail. |
| TXT | `_dmarc.nickchabot.com` | `v=DMARC1; p=none; rua=mailto:nick@nickchabot.com` | DNS only | DMARC: what receivers do when SPF and DKIM don't line up with the From domain, and where they send reports. |
| TXT | `nickchabot.com` | `zoho-verification=zb33686578.zmverify.zoho.com` | DNS only | Proves domain ownership to Zoho. |

The mail records are explained in
[ex06.md](ex06.md#dns-records-for-mail). The records before any change are in
[dns-before-zoho.md](dns-before-zoho.md).

## History

| Date (UTC) | Change |
|---|---|
| 2026-10-01 | `A` records for `@` and `www` to the Azure VM, DNS only. |
| 2026-10-08 | Certbot certificate for `nickchabot.com` and `www.nickchabot.com` on the VM ([how-this-site-is-secured.md](../how-this-site-is-secured.md)). |
| 2026-10-20 | Zoho verification, MX, SPF, DKIM and DMARC added. `www` switched to proxied, with the redirect rule. |
| 2026-10-26 08:55 | Cutover: `@` changed to a CNAME at Railway, DNS only. Domain added in Railway. |
| 2026-10-26 18:08 | Domain removed and re-added in Railway, to get a new certificate. New target `l3la2mgf.up.railway.app`; `@` updated to it at 18:09. |

## Verification

Run from the laptop on 2026-10-26 at 18:21 UTC.

```
$ dig +short nickchabot.com
69.46.46.89
$ dig +short l3la2mgf.up.railway.app
69.46.46.89                        # the same address: the flattened CNAME reaches Railway
$ dig +short www.nickchabot.com
104.21.88.188
172.67.152.45                      # Cloudflare's addresses, because www is proxied

$ curl -sI http://www.nickchabot.com/
HTTP/1.1 301 Moved Permanently
Location: https://nickchabot.com/
Server: cloudflare
$ curl -sI https://www.nickchabot.com/
HTTP/2 301
location: https://nickchabot.com/
server: cloudflare
$ curl -sI http://nickchabot.com/
HTTP/1.1 301 Moved Permanently
location: https://nickchabot.com/

$ curl -sS -o /dev/null https://nickchabot.com/
curl: (60) SSL: no alternative certificate subject name matches target host name 'nickchabot.com'
$ curl -sS -o /dev/null -w "%{http_code}\n" -k https://nickchabot.com/
200
```

| Check | Result |
|---|---|
| `http://www` → `https://nickchabot.com/` | **Pass**: 301 from Cloudflare |
| `https://www` → `https://nickchabot.com/` | **Pass**: 301 from Cloudflare. Cloudflare's certificate for `nickchabot.com` (Let's Encrypt YE1, valid to 2026-12-30) |
| `http://nickchabot.com` → HTTPS | **Pass**: 301 from Railway |
| `https://nickchabot.com` with a valid certificate | **Fail**: Railway serves its own `*.up.railway.app` certificate |
| Railway routes `nickchabot.com` to the app | **Pass**: with certificate checks off (`-k`), the homepage returns 200 |

## Certificates

**Railway (the bare domain), when it's issued.** Railway requests a
Let's Encrypt certificate for `nickchabot.com` once the domain verifies, ends
TLS at its edge, and renews the certificate itself. Nothing runs on my side.
Not issued yet, so there is no validity period to record. *Unverified until
the padlock check passes.*

What the edge serves today:

```
$ openssl s_client -connect nickchabot.com:443 -servername nickchabot.com | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
subject=CN=*.up.railway.app
issuer=C=US, O=Let's Encrypt, CN=YE2
notBefore=Sep 27 03:01:43 2026 GMT
notAfter=Dec 26 03:01:42 2026 GMT
X509v3 Subject Alternative Name:
    DNS:*.up.railway.app, DNS:up.railway.app
```

**Cloudflare (`www`).** Because `www` is proxied, Cloudflare ends TLS for it
with its own certificate for `nickchabot.com` (Let's Encrypt YE1,
2026-10-01 to 2026-12-30), and renews it automatically.

**Azure (before the cutover).** Certbot on the VM, for `nickchabot.com` and
`www.nickchabot.com`, valid 2026-10-08 to 2027-01-06, renewed by a systemd
timer. Details and my own explanation are in
[how-this-site-is-secured.md](../how-this-site-is-secured.md).

## Investigation: Railway certificate not issued

A real network/TLS failure from the cutover, still open.

**Symptom.** After the cutover on 2026-10-26, `https://nickchabot.com` shows
a certificate error. `curl` reports that no certificate name matches
`nickchabot.com`.

**Checks.**

1. DNS: `dig` gives Railway's address for both `nickchabot.com` and the
   Railway target, so visitors reach Railway. Not a DNS problem.
2. Routing: `curl -k https://nickchabot.com/` returns 200 with the
   homepage, so Railway knows the domain and sends it to the app. Not an
   application problem.
3. Certificate: `openssl s_client` shows Railway's fallback
   `*.up.railway.app` certificate, so no certificate for `nickchabot.com`
   exists yet.
4. Railway's status: `railway domain status nickchabot.com` shows
   `Verified: yes`, `Certificate status: ISSUE_FAILED`,
   `Let's Encrypt rate limit reached`, `retryable: false`.

**First diagnosis (morning).** Railway's first certificate attempts, at about
08:55 UTC, ran before the DNS change had spread and failed validation. I
concluded that repeated failures had hit Let's Encrypt's limit on failed
validations, and that Railway had marked the failure as not retryable.

**Repairs tried.**

| Time (UTC) | Action | Result |
|---|---|---|
| 08:55–09:44 | `railway domain certificate retry` several times | Refused: rate limit reached |
| 09:44 | Stopped all retries overnight, so they couldn't add to the limit | — |
| 18:06 | One retry | Refused: "Certificate retry is not available for this failure" |
| 18:08 | Removed and re-added the domain in Railway; updated `@` to the new target | The new domain failed with the same rate-limit error within one second of being created (`Created 18:08:27.949`) |

Let's Encrypt's failed-validation limit resets within hours, and a domain
created one second earlier can't have failed validation five times. That
didn't fit my first diagnosis.

**Revised diagnosis.** Railway's status page has an open incident, "TLS
certificate issuance returning rate limit error". Its update at 17:44 UTC on
2026-10-26 says: "We have diagnosed the issue causing this and are in touch
with LetsEncrypt. We will update once we fix." So the rate-limit error comes
from a problem on Railway's side affecting certificate issuance generally,
not from limits my domain used up. My early failed attempts may have
contributed, but they don't explain a new domain failing in one second.
What I got wrong at first: I trusted the error message's wording ("rate
limit reached") and assumed the cause was mine, without checking the
provider's status page. That's now my first check when a managed service
fails.

**Next step.** Wait for Railway to resolve the incident, then retry the
certificate once (`railway domain certificate retry nickchabot.com`),
repeat the checks above, and check the padlock in a browser. No support
request is needed, since Railway is already working on it. *Unresolved as
of 2026-10-26 19:00 UTC.*

**After Railway's fix.** Around 20:25 UTC Railway's status page said a fix
was deployed and certificates were being issued again. This domain didn't
recover: it still showed `ISSUE_FAILED` with the rate-limit error and now
`Certificate retryable: false`. Manual retries at 20:25 and 22:33 UTC were
both refused ("Certificate retry is not available for this failure"), and
the dashboard has no retry button. So the certificate is stuck in the
failed state the incident left it in, which only Railway can clear.

**Support ticket.** I filed a Railway support ticket on 2026-10-26 (after
22:33 UTC) asking them to clear the failed state or start a new certificate
request, rather than removing and re-adding the domain again. Re-adding
would change the target, need a Cloudflare change, and use another Let's
Encrypt attempt that might fail the same way. If support hasn't answered
within about a day, re-adding the domain is the fallback. *Waiting on
Railway as of 2026-10-26.*

**Rollback available.** The VM still has a valid certificate for both names
until 2027-01-06. Changing `@` back to an `A` record for the VM, DNS only,
restores HTTPS at the cost of serving the VM's older data (see
[railway-migration.md](../railway-migration.md#rollback)). I chose not to,
since the course requires the domain to reach Railway.
