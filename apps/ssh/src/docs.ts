export interface DocPage {
  title: string;
  slug: string;
  description?: string;
}

export interface TenantDocs {
  name: string;
  pages: DocPage[];
}

// Fetch using Host header trick so the docs server resolves the correct tenant
// without requiring public subdomain DNS to be set up for internal use.
const fetchFromDocs = async (
  docsAppUrl: string,
  rootDomain: string,
  tenant: string,
  path: string
): Promise<Response | null> => {
  try {
    const url = new URL(path, docsAppUrl);
    const response = await fetch(url.toString(), {
      headers: {
        Host: `${tenant}.${rootDomain}`,
      },
    });
    if (!response.ok) return null;
    return response;
  } catch {
    return null;
  }
};

// Parse llms.txt into a list of pages.
// Format: - [Title](url): description
const parseLlmsTxt = (text: string): DocPage[] => {
  const pages: DocPage[] = [];
  const linkRegex = /^- \[([^\]]+)\]\(([^)]+)\)(?:: (.+))?$/gm;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(text)) !== null) {
    const [, title = "", href = "", description] = match;
    const slug = extractSlug(href);
    if (slug !== null) {
      pages.push({ description, slug, title });
    }
  }
  return pages;
};

const extractSlug = (href: string): string | null => {
  try {
    const { pathname } = new URL(href);
    // Strip leading slash and .md extension
    const path = pathname.replace(/^\//, "").replace(/\.md$/, "");
    return path || "index";
  } catch {
    return null;
  }
};

export const fetchTenantDocs = async (
  docsAppUrl: string,
  rootDomain: string,
  tenant: string
): Promise<TenantDocs | null> => {
  const response = await fetchFromDocs(
    docsAppUrl,
    rootDomain,
    tenant,
    "/llms.txt"
  );
  if (!response) return null;

  const text = await response.text();
  const nameMatch = /^# (.+)$/m.exec(text);
  const name = nameMatch?.[1] ?? tenant;
  const pages = parseLlmsTxt(text);

  return { name, pages };
};

export const fetchTenantPage = async (
  docsAppUrl: string,
  rootDomain: string,
  tenant: string,
  slug: string
): Promise<string | null> => {
  const path = slug === "index" || slug === "" ? "/.md" : `/${slug}.md`;
  const response = await fetchFromDocs(docsAppUrl, rootDomain, tenant, path);
  if (!response) return null;
  return response.text();
};

export const fetchTenantFullDocs = async (
  docsAppUrl: string,
  rootDomain: string,
  tenant: string
): Promise<string | null> => {
  const response = await fetchFromDocs(
    docsAppUrl,
    rootDomain,
    tenant,
    "/llms-full.txt"
  );
  if (!response) return null;
  return response.text();
};
