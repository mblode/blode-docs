import { NextResponse } from "next/server";

import { marketingUrl } from "@/lib/marketing-site";

/**
 * RFC 9116 security contact. The apex `/security` page invites reports, so
 * the discovery file has to exist too. `Expires` is a year out; bump it when
 * the contact changes, not on every deploy.
 */
const body = [
  `Contact: mailto:m@blode.co`,
  `Expires: 2027-09-06T00:00:00.000Z`,
  `Preferred-Languages: en`,
  `Canonical: ${marketingUrl("/.well-known/security.txt")}`,
  `Policy: ${marketingUrl("/security")}`,
  "",
].join("\n");

export const GET = () =>
  new NextResponse(body, {
    headers: {
      "CDN-Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
