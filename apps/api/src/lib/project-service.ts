import type { ApiKeyRecord, ProjectRecord } from "@repo/db";
import { apiKeys, apiKeySelect, db, projectSelect, projects } from "@repo/db";

import { createApiKeyToken } from "./api-key-auth";

const assertRecord = <RecordType>(
  record: RecordType | undefined,
  message: string
): RecordType => {
  if (!record) {
    throw new Error(message);
  }

  return record;
};

export const createProjectWithDefaultApiKey = async (input: {
  description?: string;
  name: string;
  slug: string;
  userId: string;
}): Promise<{ apiKey: ApiKeyRecord; project: ProjectRecord; token: string }> =>
  await db.transaction(async (transaction) => {
    const [projectRecord] = await transaction
      .insert(projects)
      .values({
        deploymentName: input.slug,
        description: input.description,
        name: input.name,
        slug: input.slug,
        userId: input.userId,
      })
      .returning(projectSelect);

    const project = assertRecord(projectRecord, "Failed to create project.");
    const { prefix, token, tokenHash } = createApiKeyToken();

    const [apiKeyRecord] = await transaction
      .insert(apiKeys)
      .values({
        name: "Default",
        prefix,
        projectId: project.id,
        tokenHash,
        userId: input.userId,
      })
      .returning(apiKeySelect);

    const apiKey = assertRecord(apiKeyRecord, "Failed to create API key.");

    return {
      apiKey,
      project,
      token,
    };
  });
