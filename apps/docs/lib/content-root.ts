import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DOCS_CONFIG_FILE = "docs.json";

const EXTERNAL_DOCS_ROOTS: Record<string, string> = {
  allmd: path.join(os.homedir(), "Code/mblode/allmd/apps/docs"),
  "dnd-grid": path.join(os.homedir(), "Code/mblode/dnd-grid/apps/docs"),
  donebear: path.join(os.homedir(), "Code/donebear/donebear/apps/docs"),
  shareful: path.join(os.homedir(), "Code/shareful-ai/shareful-ai/apps/docs"),
  stratasync: path.join(os.homedir(), "Code/donebear/stratasync/apps/docs"),
};

const getTenantDocsPathCandidates = (slug: string): string[] =>
  [
    EXTERNAL_DOCS_ROOTS[slug],
    path.join(process.cwd(), "content", slug),
    path.join(process.cwd(), "apps/docs/content", slug),
  ].filter(Boolean) as string[];

export const getTenantDocsPath = (slug: string): string => {
  const candidates = getTenantDocsPathCandidates(slug);

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, DOCS_CONFIG_FILE))) {
      return candidate;
    }
  }

  return candidates[0] ?? path.join(process.cwd(), "apps/docs/content", slug);
};
