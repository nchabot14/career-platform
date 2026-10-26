# Request Path: Entering nickchabot.com in a Browser

Assumptions: a new HTTPS connection over TCP, and a DNS lookup with no cached answer.

Items marked *check* aren't recorded in this repository. The Azure diagram is the site until 2026-10-26; the Railway diagram is the site since the cutover that day. The email and analytics paths are the same for both hosts. Updated 2026-10-26.

## Azure

```mermaid
flowchart LR
  subgraph HOME["Home network: devices and addresses from Ex01 (check)"]
    B["Browser on laptop<br/>Wi-Fi network interface<br/>DHCP gave: private IP, subnet,<br/>default gateway, DNS server"]
    AP["Access point<br/>Wi-Fi to wired"]
    SW["Switch<br/>delivers within the LAN"]
    R["Router = default gateway<br/>NAT: private → public address<br/>stateful firewall"]
    M["Modem / ONT"]
  end

  ISP["ISP network<br/>(details unknown)"]
  NET["Internet routers"]

  subgraph DNSX["DNS lookup: a separate exchange, not on the web path"]
    RES["Recursive resolver<br/>(router or ISP? check)"]
    CF["Cloudflare authoritative name servers<br/>gordon / margot.ns.cloudflare.com<br/>A nickchabot.com → VM public IP<br/>DNS only (grey cloud)"]
  end

  subgraph AZ["Azure, North Central US"]
    NSG["NSG vm-career-platformNSG<br/>allow 80, 443 from any<br/>allow 22 from laptop /32 only<br/>deny everything else"]
    subgraph VM["VM vm-career-platform · private IP 10.0.0.4"]
      NG["Nginx<br/>:80 → 301 to https<br/>:443 TLS ends here<br/>Let's Encrypt cert, Certbot timer"]
      A1["career-platform@8000<br/>Next.js on 127.0.0.1:8000"]
      A2["career-platform@8001<br/>Next.js on 127.0.0.1:8001"]
      DB[("SQLite file<br/>data/career_platform.db")]
    end
  end

  B -.->|"1 · DNS query, UDP 53<br/>client: laptop · server: resolver<br/>crosses the same LAN hardware"| RES
  RES -.->|"2 · asks the authoritative server"| CF
  CF -.->|"3 · answer: VM public IP"| B

  B -->|"4 · TCP to port 443, then TLS handshake<br/>client: browser · server: Nginx"| AP
  AP --> SW --> R
  R -->|"NAT rewrites source to home public IP"| M
  M --> ISP --> NET --> NSG
  NSG -->|"443 allowed"| NG
  NG -->|"5 · plain HTTP over loopback<br/>client: Nginx · server: app"| A1 & A2
  A1 & A2 -->|"6 · reads a local file, no network"| DB
  NG -.->|"7 · response returns the same path<br/>then CSS, JS, images as new requests"| B
```

## Railway

```mermaid
flowchart LR
  B["Browser<br/>same home hardware, NAT, ISP path as Azure"]

  subgraph DNSX["DNS lookup (separate)"]
    CF["Cloudflare authoritative DNS<br/>@ CNAME → l3la2mgf.up.railway.app<br/>flattened to an A record · DNS only<br/>www: proxied, redirect rule"]
  end

  WWW["Cloudflare edge for www<br/>:80 and :443 → 301 to https://nickchabot.com/<br/>never reaches a server of mine"]

  subgraph RW["Railway (PaaS), project fabulous-recreation"]
    EDGE["Railway edge proxy<br/>:80 → 301 to https<br/>:443 TLS ends here<br/>Railway-managed Let's Encrypt cert<br/>(not issued yet, see domain-and-https.md)"]
    APP["Web service career-platform<br/>Docker image, Next.js on :8080<br/>proxy.ts checks the DB before /"]
    PG[("Postgres service, PostgreSQL 18<br/>private network :5432<br/>DATABASE_URL reference")]
  end

  GH["GitHub main"] -->|"push → build → pre-deploy migrate → health check"| APP

  B -.->|"1 · DNS query, UDP 53"| CF
  B -->|"2 · TCP 443 + TLS<br/>client: browser · server: Railway edge"| EDGE
  B -.->|"www.nickchabot.com"| WWW
  EDGE -->|"3 · plain HTTP on Railway's network<br/>+ X-Forwarded-*, X-Real-IP"| APP
  APP -->|"4 · SQL over TCP 5432<br/>client: app · server: Postgres"| PG
  EDGE -.->|"5 · response, then asset requests"| B
```

## Email (Zoho Mail, either host)

```mermaid
flowchart LR
  EXT["Outside mailbox<br/>(Gmail)"]
  CFD["Cloudflare DNS<br/>MX, SPF, DKIM, DMARC records"]
  subgraph ZOHO["Zoho Mail (US data center)"]
    ZIN["mx.zoho.com / mx2 / mx3<br/>SMTP :25, receives"]
    BOX[("Mailbox<br/>nick@nickchabot.com")]
    ZOUT["Zoho outgoing SMTP<br/>signs with DKIM d=nickchabot.com"]
  end
  ME["Me in a browser<br/>Zoho webmail, HTTPS :443"]

  EXT -.->|"1 · looks up MX for nickchabot.com"| CFD
  EXT -->|"2 · SMTP :25 with STARTTLS"| ZIN --> BOX
  ME -->|"3 · read and reply over HTTPS"| BOX
  BOX --> ZOUT
  ZOUT -->|"4 · SMTP :25 to the recipient's MX"| EXT
  EXT -.->|"5 · receiver checks SPF, DKIM, DMARC<br/>against the TXT records"| CFD
```

The web host isn't on this path: mail goes to Zoho whether the site runs on Azure or Railway. The site's contact form is separate: it saves messages in the database and would alert me through Resend, which isn't configured.

## Analytics (GA4, either host)

```mermaid
flowchart LR
  B["Visitor's browser"]
  SITE["nickchabot.com<br/>(Railway, or Azure before)"]
  GTM["www.googletagmanager.com<br/>gtag.js, HTTPS :443"]
  GA["google-analytics.com/g/collect<br/>HTTPS :443"]
  PROP["GA4 property<br/>Realtime, DebugView, reports"]

  SITE -->|"1 · HTML with the tag<br/>(needs NEXT_PUBLIC_GA_MEASUREMENT_ID at build)"| B
  B -->|"2 · loads gtag.js"| GTM
  B -->|"3 · page_view, click events<br/>consent mode: cookieless until accepted"| GA --> PROP
```

The site's server never sends analytics; the visitor's browser talks to Google directly. On Railway the measurement ID was set on 2026-10-26, and live collection was checked that day ([ex06.md](evidence/ex06.md#live-site-check)).

## What changes between the hosts

| | Azure | Railway |
|---|---|---|
| DNS answer | A record → the VM's public IP | CNAME, flattened to the A record of Railway's edge |
| Firewall | NSG rules that I manage | Railway decides what's exposed |
| Where TLS ends | Nginx on my VM; I run Certbot | Railway's edge; Railway manages the certificate |
| How the app is reached | Loopback `127.0.0.1:8000` and `:8001` | Port 8080 behind Railway's proxy, so redirects use `NEXT_PUBLIC_SITE_URL` and rate limiting uses `X-Real-IP` |
| Database | A local SQLite file, with no network hop | A separate Postgres service, reached through `DATABASE_URL` |

## Sources

- `docs/how-this-site-is-secured.md`: where TLS ends, open ports, certificate, renewal
- `docs/superpowers/plans/2026-10-01-operate-the-vm.md`: Nginx, the @8000/@8001 services, private IP, NSG rules
- `docs/evidence/dns-before-zoho.md`: Cloudflare name servers and the DNS-only A records
- `docs/evidence/ex03.md`: VM region and size
- `docs/superpowers/plans/2026-10-08-railway-postgres-migration.md`: Railway edge, Postgres service, `www` redirect
- `docs/evidence/domain-and-https.md`: current DNS records and HTTPS checks
- `docs/evidence/ex06.md`: mail records and the GA4 path
