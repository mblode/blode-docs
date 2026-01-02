# Vercel multi-tenant domains

This project follows the Vercel multi-tenant best practices for wildcard subdomains and
custom domains, with `neue.com` serving the marketing site, `dashboard.neue.com` hosting
the app shell, and docs resolving at `projectSlug.neue.com` (plus optional custom domains).

## Wildcard subdomains (*.neue.com)

1. Point `neue.com` to Vercel nameservers:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
2. In the Vercel project, add:
   - Apex domain: `neue.com`
   - Wildcard domain: `*.neue.com`

This allows every project slug to resolve as `projectSlug.neue.com`.

## Custom domains (tenant.com)

Custom domains are provisioned through the API:

- `POST /projects/:projectId/domains`
  - Creates the domain and returns verification records if needed.
- `GET /projects/:projectId/domains/:domainId/verification`
  - Fetches current verification records.
- `POST /projects/:projectId/domains/:domainId/verify`
  - Triggers manual verification on Vercel.

Custom domains must be external to `neue.com` because platform subdomains are
reserved for project routing.

Make sure Vercel credentials are present:

```
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=
VERCEL_TEAM_SLUG=
```

## Redirects and canonicalization

To avoid duplicate content across subdomains and custom domains:

- `PREFER_CUSTOM_DOMAIN=true` will redirect from subdomains to the first custom domain.
- `REDIRECT_PRIMARY_DOMAIN=true` enforces the tenant primary domain.
- `VERCEL_AUTO_WWW_REDIRECT=true` creates a `www.` redirect for apex domains.

## Cleanup

When a tenant domain is removed, the API route
`DELETE /projects/:projectId/domains/:domainId` will:

1. Remove the domain from the Vercel project.
2. Delete the domain from the Vercel account (best effort).
3. Remove the domain from the database.

## Local development

Add local hosts entries for subdomain testing:

```
127.0.0.1 docs.localhost
127.0.0.1 tenant1.localhost
```
