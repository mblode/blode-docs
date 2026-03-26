#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

type Command = "dev" | "init" | "push" | "validate" | undefined;

interface CliOptions {
  apiKey?: string;
  apiUrl?: string;
  branch?: string;
  commitMessage?: string;
  project?: string;
}

interface DeploymentResponse {
  fileCount?: number;
  id: string;
  manifestUrl?: string;
}

const CONTENT_CONFIG_FILES = [
  "blode-docs.json",
  "site.json",
  "config.json",
  "docs.json",
];
const TEXT_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mdx": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
};
const [rawCommand, ...args] = process.argv.slice(2);
const command = rawCommand as Command;

const printHelp = (): void => {
  console.log(
    [
      "blode-docs CLI",
      "",
      "Commands:",
      "  init [dir]      Scaffold a content folder",
      "  validate [dir]  Validate site.json or config.json",
      "  push [dir]      Publish docs content",
      "  dev             Start the docs dev server (see instructions)",
      "",
      "Push flags:",
      "  --project <slug>",
      "  --api-url <url>",
      "  --api-key <token>",
      "  --branch <name>",
      "  --commit-message <message>",
      "",
      "Push env:",
      "  BLODE_DOCS_PROJECT",
      "  BLODE_DOCS_API_URL",
      "  BLODE_DOCS_API_KEY",
      "  BLODE_DOCS_BRANCH",
      "  BLODE_DOCS_COMMIT_MESSAGE",
      "",
    ].join("\n")
  );
};

const ensureFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content);
  }
};

const isMissingFileError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  Reflect.get(error, "code") === "ENOENT";

const runInit = async (target: string): Promise<void> => {
  const root = path.resolve(process.cwd(), target);
  await fs.mkdir(root, { recursive: true });

  const siteJson = {
    collections: [
      {
        id: "docs",
        navigation: {
          groups: [{ group: "Getting Started", pages: ["index"] }],
        },
        type: "docs",
      },
    ],
    name: "My Site",
  };

  await ensureFile(
    path.join(root, "site.json"),
    `${JSON.stringify(siteJson, null, 2)}\n`
  );
  await ensureFile(
    path.join(root, "index.mdx"),
    "---\ntitle: Welcome\n---\n\nStart writing your docs here.\n"
  );

  console.log(`Docs scaffolded in ${root}`);
};

const validateConfigFile = async (root: string): Promise<string> => {
  for (const candidate of CONTENT_CONFIG_FILES) {
    try {
      const raw = await fs.readFile(path.join(root, candidate), "utf8");
      JSON.parse(raw);
      return candidate;
    } catch (error) {
      if (isMissingFileError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("site.json, config.json, or docs.json not found.");
};

const runValidate = async (target: string): Promise<void> => {
  const root = path.resolve(process.cwd(), target);

  try {
    const configFile = await validateConfigFile(root);
    console.log(`${configFile} is valid JSON.`);
  } catch (error: unknown) {
    console.error("site.json or config.json validation failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
};

const runDev = (): void => {
  console.log("Run `npm run dev --filter=docs` from the repo root.");
  console.log("Then open http://localhost:3001 to view the docs site.");
};

const parseOptions = (
  values: string[]
): { options: CliOptions; rest: string[] } => {
  const options: CliOptions = {};
  const rest: string[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value) {
      continue;
    }
    const nextValue = values[index + 1];

    switch (value) {
      case "--api-key": {
        options.apiKey = nextValue;
        index += 1;
        break;
      }
      case "--api-url": {
        options.apiUrl = nextValue;
        index += 1;
        break;
      }
      case "--branch": {
        options.branch = nextValue;
        index += 1;
        break;
      }
      case "--commit-message": {
        options.commitMessage = nextValue;
        index += 1;
        break;
      }
      case "--project": {
        options.project = nextValue;
        index += 1;
        break;
      }
      default: {
        rest.push(value);
      }
    }
  }

  return { options, rest };
};

const readGitValue = (gitArgs: string[]) => {
  const result = spawnSync("git", gitArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0) {
    return;
  }

  const value = result.stdout.trim();
  return value || undefined;
};

const normalizeRelativePath = (root: string, filePath: string) =>
  path.relative(root, filePath).split(path.sep).join("/");

const shouldSkipEntry = (name: string) =>
  name.startsWith(".") || name === "node_modules";

const collectFiles = async (root: string): Promise<string[]> => {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue;
    }

    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  // oxlint-disable-next-line eslint-plugin-unicorn/no-array-sort
  return [...files].sort((left, right) => left.localeCompare(right));
};

const getContentType = (filePath: string) =>
  TEXT_CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
  "application/octet-stream";

const readJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const requestJson = async <T>(
  url: string,
  init: RequestInit,
  message: string
): Promise<T> => {
  const response = await fetch(url, init);
  const data = await readJson(response);
  if (!response.ok) {
    const detail =
      typeof data === "string" ? data : JSON.stringify(data ?? {}, null, 2);
    throw new Error(`${message}: ${response.status} ${detail}`);
  }

  return data as T;
};

const runPush = async (target: string, options: CliOptions): Promise<void> => {
  const root = path.resolve(process.cwd(), target);
  await validateConfigFile(root);

  const project = options.project ?? process.env.BLODE_DOCS_PROJECT;
  const apiUrl =
    options.apiUrl ??
    process.env.BLODE_DOCS_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:4000";
  const apiKey = options.apiKey ?? process.env.BLODE_DOCS_API_KEY;
  const branch =
    options.branch ??
    process.env.BLODE_DOCS_BRANCH ??
    process.env.GITHUB_REF_NAME ??
    readGitValue(["rev-parse", "--abbrev-ref", "HEAD"]) ??
    "main";
  const commitMessage =
    options.commitMessage ??
    process.env.BLODE_DOCS_COMMIT_MESSAGE ??
    readGitValue(["log", "-1", "--pretty=%s"]);

  if (!project) {
    throw new Error(
      "Missing project slug. Pass --project or BLODE_DOCS_PROJECT."
    );
  }
  if (!apiKey) {
    throw new Error("Missing API key. Pass --api-key or BLODE_DOCS_API_KEY.");
  }

  const files = await collectFiles(root);
  if (!files.length) {
    throw new Error("No files found to publish.");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const deployment = await requestJson<DeploymentResponse>(
    new URL(`/projects/slug/${project}/deployments`, apiUrl).toString(),
    {
      body: JSON.stringify({
        branch,
        commitMessage,
      }),
      headers,
      method: "POST",
    },
    "Failed to create deployment"
  );

  console.log(`Uploading ${files.length} files for ${project}...`);
  for (const [index, filePath] of files.entries()) {
    const relativePath = normalizeRelativePath(root, filePath);
    const content = await fs.readFile(filePath);

    await requestJson(
      new URL(
        `/projects/slug/${project}/deployments/${deployment.id}/files`,
        apiUrl
      ).toString(),
      {
        body: JSON.stringify({
          contentBase64: content.toString("base64"),
          contentType: getContentType(filePath),
          path: relativePath,
        }),
        headers,
        method: "POST",
      },
      `Failed to upload ${relativePath}`
    );

    if ((index + 1) % 25 === 0 || index === files.length - 1) {
      console.log(`Uploaded ${index + 1}/${files.length}`);
    }
  }

  const finalized = await requestJson<DeploymentResponse>(
    new URL(
      `/projects/slug/${project}/deployments/${deployment.id}/finalize`,
      apiUrl
    ).toString(),
    {
      body: JSON.stringify({ promote: true }),
      headers,
      method: "POST",
    },
    "Failed to finalize deployment"
  );

  console.log(`Published deployment ${finalized.id}.`);
  if (finalized.manifestUrl) {
    console.log(`Manifest: ${finalized.manifestUrl}`);
  }
  if (typeof finalized.fileCount === "number") {
    console.log(`Files: ${finalized.fileCount}`);
  }
};

const main = async (): Promise<void> => {
  switch (command) {
    case "init": {
      await runInit(args[0] ?? "docs");
      break;
    }
    case "validate": {
      await runValidate(args[0] ?? "docs");
      break;
    }
    case "push": {
      const { options, rest } = parseOptions(args);
      await runPush(rest[0] ?? "docs", options);
      break;
    }
    case "dev": {
      runDev();
      break;
    }
    default: {
      printHelp();
      break;
    }
  }
};

try {
  await main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
