# DNS Records Before Zoho Mail

## Snapshot

Snapshot date: October 20, 2026, 10:34 AM PDT.

This is the full list of DNS records for `nickchabot.com` in Cloudflare, taken before adding any Zoho Mail records.
It is the baseline to compare against, and to roll back to if the Zoho setup breaks the site.

Zone state at the time of the snapshot:

- Zone: `nickchabot.com` (ID `e4faf96b904dd0e27f151d7725ecea40`)
- Status: `active`
- Nameservers: `gordon.ns.cloudflare.com`, `margot.ns.cloudflare.com`

## Command

```
$ cf dns records list --zone nickchabot.com --per-page 100
```

The zone has 2 records, so they all fit on one page.

## Records

| Type | Name | Content | Proxy | TTL |
|---|---|---|---|---|
| A | nickchabot.com | 20.25.246.180 | DNS only | Auto |
| A | www.nickchabot.com | 20.25.246.180 | DNS only | Auto |

Both A records point at the Azure VM.
There are no MX, TXT (SPF, DKIM, DMARC), or CNAME records yet, so the domain cannot receive or send mail.

## Raw output

```json
[
  {
    "id": "ae5caee1d2c2ce228941f1fe9447e5fa",
    "type": "A",
    "name": "nickchabot.com",
    "content": "20.25.246.180",
    "proxied": false,
    "ttl": 1,
    "comment": null,
    "tags": [],
    "created_on": "2026-10-01T21:42:27.026806Z",
    "modified_on": "2026-10-01T21:42:27.026806Z"
  },
  {
    "id": "a20b0343f479691ae1215960831ece9c",
    "type": "A",
    "name": "www.nickchabot.com",
    "content": "20.25.246.180",
    "proxied": false,
    "ttl": 1,
    "comment": null,
    "tags": [],
    "created_on": "2026-10-01T21:41:27.655962Z",
    "modified_on": "2026-10-01T21:41:27.655962Z"
  }
]
```

The raw output above keeps only the fields that identify each record. A TTL of `1` means Auto in Cloudflare.
