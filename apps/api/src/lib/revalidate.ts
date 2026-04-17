import { readTrimmedEnv } from "./env";

const docsAppUrl =
  readTrimmedEnv("DOCS_REVALIDATE_URL") ?? readTrimmedEnv("DOCS_APP_URL");
const revalidateSecret = readTrimmedEnv("REVALIDATE_SECRET");

export const revalidateProject = async (projectSlug: string) => {
  if (!(docsAppUrl && revalidateSecret)) {
    return;
  }

  const url = new URL("/api/revalidate", docsAppUrl);
  const response = await fetch(url, {
    body: JSON.stringify({
      paths: [`/sites/${projectSlug}`],
      secret: revalidateSecret,
      tags: [`project:${projectSlug}`, "tenants"],
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Revalidation failed: ${response.status}`);
  }
};
