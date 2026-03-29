/**
 * Seed script for blodemd.
 * Creates a seed user, projects, and generates an API key for each.
 *
 * Usage:
 *   DATABASE_URL=... tsx packages/db/seed.ts
 */
import { createHash, randomBytes } from "node:crypto";

import { ApiKeyDao, ProjectDao, UserDao } from "./src/index.js";

const API_KEY_PREFIX = "ndk_";
const API_KEY_PREFIX_LENGTH = 8;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const createApiKeyToken = () => {
  const prefix = `${API_KEY_PREFIX}${randomBytes(API_KEY_PREFIX_LENGTH / 2).toString("hex")}`;
  const secret = randomBytes(24).toString("hex");
  const token = `${prefix}.${secret}`;
  return { prefix, token, tokenHash: hashToken(token) };
};

const SEED_USER = {
  authId: "seed-user-00000000-0000-0000-0000-000000000000",
  email: "seed@blode.md",
  name: "Seed User",
};

const PROJECTS = [
  {
    description: "Real-time sync library for local-first applications",
    name: "StrataSync",
    slug: "stratasync",
  },
  {
    description: "Task management CLI and app",
    name: "DoneBear",
    slug: "donebear",
  },
  {
    description: "Universal Markdown toolkit",
    name: "AllMD",
    slug: "allmd",
  },
  {
    description: "Share anything, beautifully",
    name: "Shareful",
    slug: "shareful",
  },
  {
    description: "Drag-and-drop grid layout library",
    name: "DnD Grid",
    slug: "dnd-grid",
  },
  {
    description: "Build a Mintlify-style documentation platform on Vercel.",
    name: "Atlas",
    slug: "atlas",
  },
  {
    description:
      "An opinionated shadcn/ui component registry built with good taste, care, and craft.",
    name: "Blode",
    slug: "blode",
  },
  {
    description: "Ship product docs with a tenant-aware runtime.",
    name: "Orbit",
    slug: "orbit",
  },
] as const;

const userDao = new UserDao();
const projectDao = new ProjectDao();
const apiKeyDao = new ApiKeyDao();

console.log("Seeding blodemd...\n");

const user = await userDao.upsertByAuthId(SEED_USER);
console.log(`  [user] ${user.email} (id: ${user.id})\n`);

for (const proj of PROJECTS) {
  const existing = await projectDao.getBySlugUnique(proj.slug);
  if (existing) {
    console.log(`  [skip] ${proj.slug} — already exists (id: ${existing.id})`);
    continue;
  }

  const project = await projectDao.create({
    deploymentName: proj.slug,
    description: proj.description,
    name: proj.name,
    slug: proj.slug,
    userId: user.id,
  });

  const { prefix, token, tokenHash } = createApiKeyToken();
  await apiKeyDao.create({
    name: "default",
    prefix,
    projectId: project.id,
    tokenHash,
    userId: user.id,
  });

  console.log(`  [ok]   ${proj.slug}`);
  console.log(`         id:      ${project.id}`);
  console.log(`         api-key: ${token}`);
  console.log(`         url:     https://${proj.slug}.blode.md\n`);
}

console.log(
  "Done. Add each api-key as BLODEMD_API_KEY in the repo's GitHub secrets."
);
process.exit(0);
