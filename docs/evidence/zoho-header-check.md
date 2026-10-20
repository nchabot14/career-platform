# Zoho Mail Header Check

## Test

Test date: October 20, 2026, 10:55 AM PDT.

I sent "Test 02: outbound" from `nick@nickchabot.com` in Zoho Mail to my Gmail address, then opened the original message in Gmail to read the headers.
The goal was to confirm that mail sent through Zoho passes SPF, DKIM, and DMARC for `nickchabot.com`.

## Result

The results come from the `Authentication-Results: mx.google.com` header, which is Gmail's verdict when it received the message.

| Check | Result | Domain | Evidence |
|---|---|---|---|
| SPF | pass | nickchabot.com | `smtp.mailfrom=nick@nickchabot.com`. The sending IP `165.173.180.52` (`sender6-of-o52.zoho.com`) is allowed by the SPF record through `include:zohomail.com`. |
| DKIM | pass | nickchabot.com | `header.i=@nickchabot.com header.s=zmail`. Zoho signed with `d=nickchabot.com; s=zmail`, and Gmail checked it against the `zmail._domainkey` record. |
| DMARC | pass | nickchabot.com | `dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=nickchabot.com` |

## Why DMARC passed

DMARC passes when SPF or DKIM passes for the same domain as the visible From address.
Both did here:

- From address: `nick@nickchabot.com`
- SPF domain: the Return-Path is `nick@nickchabot.com`, so it is the same domain.
- DKIM domain: the signature has `d=nickchabot.com`, so it is the same domain.

Either one alone would have been enough.
`dis=NONE` means Gmail took no action against the message. That would be true even if DMARC had failed, because the policy is `p=none`.

The ARC headers signed by `zohomail.com` and `google.com` are a record of the checks each mail server ran as the message passed through. They are not the domain's own authentication. Zoho's `i=1` record also shows SPF, DKIM, and DMARC passing for `nickchabot.com`.

This also confirms that the DKIM key published in DNS matches the key Zoho signs with.

## Headers

These are the message headers as Gmail showed them, with my personal Gmail address redacted. The message body is left out.

```
Delivered-To: personal Gmail redacted
Received: by 2002:a05:7208:3793:b0:10f:e0c9:2dbd with SMTP id it19csp7831196rbb; Tue, 20 Oct 2026 10:55:54 -0700 (PDT)
X-Received: by 2002:a05:6a20:d043:b0:3e2:7166:eb7 with SMTP id adf61e73a8af0-3e2716611f0mr2215735637.38.1792518953853; Tue, 20 Oct 2026 10:55:53 -0700 (PDT)
ARC-Seal: i=2; a=rsa-sha256; t=1792518953; cv=pass; d=google.com; s=arc-20260327; b=NwE0Q5qsVaOmx6sm67RwyRCIBDQJ20yz6BHZu06NxaUWcIM3WYteVKaKlAVlSaYzww 8R/aavLzFbAqcuhmrVD9FvbhAgZgrWITNlAfuG6ZeJHoeR29lw4Y/XYgfp6R4p0kqxy+ v23ZV0e/9M5sP8XSwPm+e64Dhe+QdKM0gzMkb3TV0eyQ/OG4Vr/ONxJiEFaIy74kflub M8YCXEq6GCe/SfLS7mbV8ICfZUIZ+TrD2G1IJIVE7zJqqSeVCA0uNR0mgiK278kd2K8U TIi0zPHXTwNFd7jcJ6yCYhcN0D9ZG8+YQqY9lIiyvBcq0PCPH0sFIQDItYwhX4bDw6bW pcoQ==
ARC-Message-Signature: i=2; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20260327; h=user-agent:importance:mime-version:subject:message-id:to:from:date :dkim-signature; bh=o2u6uXX2hwtS8DGWwxIoT4/92JrcQYKZDTPz8f0p9kY=; fh=aAcu6p3j1RuP6oC2b50ZCvONtfLj00CBO4TWLe97czw=; b=h+mRJlBBRAeXk/Pgl1AI7ZP2uzrPQxCb68LEkUXf3BIyd4Bm/AXtfYM8P/jvOtabbJ TGqmGvsHdzteMAN0G0RAWVe4zK/EuU6yrMDXfJYjRjhQY2HWrEtVXuoumTJ+WWWmu1dn 4uTwjiv/Y9VfVQXJjbSYx65xxAf33yLZ9gCrLQJ6bvBbtLXSZtSgFmaLXbeYFggA0boA 2dPWS9uTvcAkgC/9VZ77IbVsmupkeVzVQz4Gbgd7N+bB1tQU55qiH7AjDY3zvd8q5Fr3 mZ8KfoELTfYfwScisnHrjY01MizksT42FoShsrPHxV60FePnMXMOs9ea7jjY4ZDCVZ7W 1+7w==; dara=google.com
ARC-Authentication-Results: i=2; mx.google.com; dkim=pass header.i=@nickchabot.com header.s=zmail header.b=oGZD7bug; arc=pass (i=1 spf=pass spfdomain=nickchabot.com dkim=pass dkdomain=nickchabot.com dmarc=pass fromdomain=nickchabot.com>); spf=pass (google.com: domain of nick@nickchabot.com designates 165.173.180.52 as permitted sender) smtp.mailfrom=nick@nickchabot.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=nickchabot.com
Return-Path: <nick@nickchabot.com>
Received: from sender6-of-o52.zoho.com (sender6-of-o52.zoho.com. [165.173.180.52]) by mx.google.com with ESMTPS id 41be03b00d2f7-cd6a871d1besi179364a12.266.2026.10.20.10.55.53 for <personal Gmail redacted> (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384 bits=256/256); Tue, 20 Oct 2026 10:55:53 -0700 (PDT)
Received-SPF: pass (google.com: domain of nick@nickchabot.com designates 165.173.180.52 as permitted sender) client-ip=165.173.180.52;
Authentication-Results: mx.google.com; dkim=pass header.i=@nickchabot.com header.s=zmail header.b=oGZD7bug; arc=pass (i=1 spf=pass spfdomain=nickchabot.com dkim=pass dkdomain=nickchabot.com dmarc=pass fromdomain=nickchabot.com>); spf=pass (google.com: domain of nick@nickchabot.com designates 165.173.180.52 as permitted sender) smtp.mailfrom=nick@nickchabot.com; dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=nickchabot.com
ARC-Seal: i=1; a=rsa-sha256; t=1792518952; cv=none; d=zohomail.com; s=zohoarc; b=KW/GVBClYhcfUNCBXKwC5xDOp+t2ifbaKEMG9/YEYcdim6+yrTUQrFo97cv0O+MtotJiUxfwx1R7bFvfN6z1XBpzwPPjeGu/7Sn7cjZq1IMDfL1llD/lZDQM1BUh2Y+x0o4TktPfMCm/EIz3B2XBX7u7qpCoFs5e0hkYHEUrLlI=
ARC-Message-Signature: i=1; a=rsa-sha256; c=relaxed/relaxed; d=zohomail.com; s=zohoarc; t=1792518952; h=Content-Type:Date:Date:From:From:MIME-Version:Message-ID:Subject:Subject:To:To:Message-Id:Reply-To:Cc; bh=o2u6uXX2hwtS8DGWwxIoT4/92JrcQYKZDTPz8f0p9kY=; b=AhMcu+uLZQxIPi/m/z4x7PR6KWJ8CT92iXCz/eVUI4RVCP1rdO7MHXL+/xTsFYN42ok3YCOCSfDfkFBwp+ZBgrZutDsljUkKgOGW2tLMwLTx6Lsy+TrR7g8Z2uujH7Z9jWCyYz398/X+kzK448ZRTvspV6pU8d89u/WoESpBLAI=
ARC-Authentication-Results: i=1; mx.zohomail.com; dkim=pass
  header.i=nickchabot.com; spf=pass
  smtp.mailfrom=nick@nickchabot.com; dmarc=pass header.from=<nick@nickchabot.com>
DKIM-Signature: v=1; a=rsa-sha256; q=dns/txt; c=relaxed/relaxed; t=1792518952; s=zmail; d=nickchabot.com; i=nick@nickchabot.com; h=Date:Date:From:From:To:To:Message-Id:Message-Id:Subject:Subject:MIME-Version:Content-Type:Reply-To:Cc; bh=o2u6uXX2hwtS8DGWwxIoT4/92JrcQYKZDTPz8f0p9kY=; b=oGZD7bugdryrkI+CLH6JZt+2Utv4QcLgWTVhhFmqiRxrH6MYhLZgEzQtG6gEShbG QaoLe1uHJH9Naeg8N6K2LJTX6DYzG6BY6Vh2fEj/lgGyga5eL3FZpTyZUm6qcHdCqp6 trZ6WcibLiMYvt+T0xT8yM3gvxR8qzb3d7El/hzE=
Received: from mail.zoho.com by mx.zohomail.com with SMTP id 1792518950674723.4884666125414; Tue, 20 Oct 2026 10:55:50 -0700 (PDT)
Date: Tue, 20 Oct 2026 10:55:50 -0700
From: Nick Chabot <nick@nickchabot.com>
To: <personal Gmail redacted>
Message-Id: <1a15a748f02.24726274883934.5719706566247298726@nickchabot.com>
Subject: Test 02: outbound
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="----=_Part_2038215_944602736.1792518950658"
Importance: Medium
User-Agent: Zoho Mail
X-Mailer: Zoho Mail
```
