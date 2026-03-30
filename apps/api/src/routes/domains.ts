import type { DomainVerification } from "@repo/contracts";
import { DomainCreateSchema } from "@repo/contracts";
import { mapDomainStatusFromContract } from "@repo/db";
import { Hono } from "hono";
import { z } from "zod";

import {
  autoWwwRedirect,
  rootDomain,
  validConfiguredDomainStatus,
} from "../lib/config";
import { domainDao } from "../lib/db";
import { logError, logWarn } from "../lib/logger";
import { normalizeHostnameInput, normalizePathPrefix } from "../lib/normalize";
import { authorizeProjectRequest } from "../lib/project-auth";
import {
  badGateway,
  badRequest,
  noContent,
  notFound,
  unauthorized,
} from "../lib/responses";
import { validateJson, validateParams } from "../lib/validators";
import {
  addProjectDomain,
  deleteDomain,
  getProjectDomain,
  isVercelEnabled,
  removeProjectDomain,
  verifyProjectDomain,
} from "../lib/vercel";
import type { VercelProjectDomain } from "../lib/vercel";
import { mapDomain } from "../mappers/records";

const projectIdParamsSchema = z.object({ projectId: z.string().uuid() });
const domainParamsSchema = projectIdParamsSchema.extend({
  domainId: z.string().uuid(),
});
const domainCreateBodySchema = DomainCreateSchema.omit({ projectId: true });

const domainRecordTypes = new Set([
  "A",
  "AAAA",
  "CNAME",
  "TXT",
  "MX",
  "NS",
  "CAA",
]);

const toDomainStatus = (verified: boolean) =>
  mapDomainStatusFromContract(
    verified ? "Valid Configuration" : "Pending Verification"
  );

type VerificationRecord = NonNullable<
  VercelProjectDomain["verification"]
>[number];

const mapVerification = (domain: VercelProjectDomain | null) => {
  if (!domain) {
    return;
  }
  const records =
    domain.verification?.map((record: VerificationRecord) => ({
      name: record.domain,
      type: (domainRecordTypes.has(record.type) ? record.type : "TXT") as
        | "A"
        | "AAAA"
        | "CNAME"
        | "TXT"
        | "MX"
        | "NS"
        | "CAA",
      value: record.value,
    })) ?? [];

  return {
    records,
    verified: Boolean(domain.verified),
  };
};

export const domains = new Hono();

domains.get(
  "/:projectId/domains",
  validateParams(projectIdParamsSchema),
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const records = await domainDao.listByProject(projectId);
    return c.json(records.map(mapDomain), 200);
  }
);

domains.post(
  "/:projectId/domains",
  validateParams(projectIdParamsSchema),
  validateJson(domainCreateBodySchema),
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: Refactor this handler by extracting domain provisioning logic into separate functions
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const body = c.req.valid("json");
    const hostname = normalizeHostnameInput(body.hostname);
    if (!hostname) {
      return badRequest(c, "Domain hostname is required.");
    }
    if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) {
      return badRequest(c, "Domain must be external to the blode.md zone.");
    }

    let verification: DomainVerification | undefined;
    let status = mapDomainStatusFromContract("Pending Verification");
    let verifiedAt: Date | null = null;
    const pathPrefix = normalizePathPrefix(body.pathPrefix);

    if (isVercelEnabled()) {
      try {
        const domainResponse = await addProjectDomain(hostname);
        verification = mapVerification(domainResponse);
        const isVerified = Boolean(domainResponse.verified);
        status = toDomainStatus(isVerified);
        verifiedAt = isVerified ? new Date() : null;

        if (!isVerified) {
          const verifyResponse = await verifyProjectDomain(hostname).catch(
            () => null
          );
          if (verifyResponse) {
            verification = mapVerification(verifyResponse);
            const verifiedNow = Boolean(verifyResponse.verified);
            status = toDomainStatus(verifiedNow);
            verifiedAt = verifiedNow ? new Date() : null;
          }
        }

        if (autoWwwRedirect && !hostname.startsWith("www.")) {
          const parts = hostname.split(".");
          if (parts.length === 2) {
            await addProjectDomain(`www.${hostname}`, hostname).catch(
              () => null
            );
          }
        }
      } catch (error) {
        logError("Failed to provision Vercel domain", error);
        return badGateway(c, "Unable to provision domain");
      }
    }

    const record = await domainDao.create({
      hostname,
      pathPrefix,
      projectId,
      status,
      verifiedAt,
    });

    return c.json({ domain: mapDomain(record), verification }, 201);
  }
);

domains.get(
  "/:projectId/domains/:domainId/verification",
  validateParams(domainParamsSchema),
  async (c) => {
    const { domainId, projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const domain = await domainDao.getById(domainId);
    if (!domain || domain.projectId !== projectId) {
      return notFound(c);
    }

    if (!isVercelEnabled()) {
      return c.json(
        {
          records: [],
          verified: domain.status === validConfiguredDomainStatus,
        },
        200
      );
    }

    try {
      const domainResponse = await getProjectDomain(domain.hostname);
      const verification = mapVerification(domainResponse) ?? {
        records: [],
        verified: Boolean(domainResponse.verified),
      };
      if (verification.verified && !domain.verifiedAt) {
        await domainDao.update(domain.id, {
          status: toDomainStatus(true),
          verifiedAt: new Date(),
        });
      }
      return c.json(verification, 200);
    } catch (error) {
      logError("Failed to fetch domain verification", error);
      return badGateway(c, "Unable to fetch domain verification");
    }
  }
);

domains.post(
  "/:projectId/domains/:domainId/verify",
  validateParams(domainParamsSchema),
  async (c) => {
    const { domainId, projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const domain = await domainDao.getById(domainId);
    if (!domain || domain.projectId !== projectId) {
      return notFound(c);
    }

    if (!isVercelEnabled()) {
      return c.json(
        {
          records: [],
          verified: domain.status === validConfiguredDomainStatus,
        },
        200
      );
    }

    try {
      const domainResponse = await verifyProjectDomain(domain.hostname);
      const verification = mapVerification(domainResponse) ?? {
        records: [],
        verified: Boolean(domainResponse.verified),
      };
      if (verification.verified) {
        await domainDao.update(domain.id, {
          status: toDomainStatus(true),
          verifiedAt: new Date(),
        });
      }
      return c.json(verification, 200);
    } catch (error) {
      logError("Failed to verify domain", error);
      return badGateway(c, "Unable to verify domain");
    }
  }
);

domains.delete(
  "/:projectId/domains/:domainId",
  validateParams(domainParamsSchema),
  async (c) => {
    const { domainId, projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const domain = await domainDao.getById(domainId);
    if (!domain || domain.projectId !== projectId) {
      return notFound(c);
    }

    if (isVercelEnabled()) {
      try {
        await removeProjectDomain(domain.hostname, true);
        await deleteDomain(domain.hostname).catch((error: unknown) => {
          logWarn("Failed to delete Vercel domain", error);
        });
      } catch (error) {
        logError("Failed to remove Vercel domain", error);
        return badGateway(c, "Unable to remove domain");
      }
    }

    await domainDao.delete(domain.id);
    return noContent();
  }
);
