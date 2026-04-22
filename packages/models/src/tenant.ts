export interface TenantAnalyticsGa4 {
  measurementId: string;
}

export interface TenantAnalyticsPosthog {
  projectKey: string;
  host?: string;
}

export interface TenantAnalytics {
  ga4?: TenantAnalyticsGa4;
  posthog?: TenantAnalyticsPosthog;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  description?: string;
  activeDeploymentId?: string;
  activeDeploymentManifestUrl?: string;
  analytics?: TenantAnalytics;
  primaryDomain: string;
  subdomain: string;
  customDomains: string[];
  pathPrefix?: string;
  docsPath?: string;
  status: "active" | "disabled";
}

export interface DomainRecord {
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "CAA";
  name: string;
  value: string;
  ttl?: string;
}

export interface DomainStatus {
  status:
    | "Valid Configuration"
    | "Pending Verification"
    | "Invalid Configuration";
  dnsRecords: DomainRecord[];
}
