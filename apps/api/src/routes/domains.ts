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
import { isUniqueViolationError } from "../lib/db-errors";
import { syncProjectTenantEdgeConfig } from "../lib/edge-config";
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
type PersistedDomain = Awaited<ReturnType<typeof domainDao.create>>;

const toDomainStatus = (verified: boolean) =>
  mapDomainStatusFromContract(
    verified ? "Valid Configuration" : "Pending Verification"
  );

const getRedirectHostname = (hostname: string) => {
  if (!(autoWwwRedirect && !hostname.startsWith("www."))) {
    return null;
  }

  return hostname.split(".").length === 2 ? `www.${hostname}` : null;
};

const getDomainConflictMessage = (hostname: string) =>
  `Domain "${hostname}" already exists.`;

const getDomainHostnameError = (hostname: string | null) => {
  if (!hostname) {
    return "Domain hostname must be valid.";
  }

  if (hostname === rootDomain || hostname.endsWith(`.${rootDomain}`)) {
    return "Domain must be external to the blode.md zone.";
  }

  return null;
};

const getStoredVerification = (verified: boolean): DomainVerification => ({
  records: [],
  verified,
});

const removeProvisionedDomain = async (hostname: string) => {
  await removeProjectDomain(hostname, true);
  await deleteDomain(hostname).catch((error: unknown) => {
    logWarn("Failed to delete Vercel domain", error);
  });
};

const rollbackCreatedDomain = async (input: {
  domainId: string;
  provisionedHostnames: string[];
}) => {
  await Promise.allSettled(
    input.provisionedHostnames.map(async (hostname) => {
      try {
        await removeProvisionedDomain(hostname);
      } catch (error) {
        logWarn("Failed to roll back provisioned Vercel domain", error);
      }
    })
  );

  try {
    await domainDao.delete(input.domainId);
  } catch (error) {
    logWarn("Failed to roll back created domain record", error);
  }
};

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

const getVercelVerification = (
  domain: VercelProjectDomain
): DomainVerification =>
  mapVerification(domain) ?? getStoredVerification(Boolean(domain.verified));

const createDomainRecord = async (input: {
  hostname: string;
  pathPrefix: string | null;
  projectId: string;
  status: ReturnType<typeof mapDomainStatusFromContract>;
  verifiedAt: Date | null;
}) => {
  try {
    return await domainDao.create(input);
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return null;
    }

    throw error;
  }
};

const maybeVerifyProvisionedDomain = async (
  hostname: string,
  domainResponse: VercelProjectDomain
) => {
  let verification = mapVerification(domainResponse);
  let status = toDomainStatus(Boolean(domainResponse.verified));
  let verifiedAt = domainResponse.verified ? new Date() : null;

  if (!domainResponse.verified) {
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

  return { status, verification, verifiedAt };
};

const addRedirectDomainIfNeeded = async (
  hostname: string,
  redirectHostname: string | null,
  provisionedHostnames: string[]
) => {
  if (!redirectHostname) {
    return;
  }

  await addProjectDomain(redirectHostname, hostname)
    .then(() => {
      provisionedHostnames.push(redirectHostname);
    })
    .catch(() => null);
};

const provisionDomainRecord = async (
  record: PersistedDomain,
  hostname: string,
  redirectHostname: string | null
) => {
  if (!isVercelEnabled()) {
    return { record, verification: undefined };
  }

  const provisionedHostnames: string[] = [];
  try {
    const domainResponse = await addProjectDomain(hostname);
    provisionedHostnames.push(hostname);

    const { status, verification, verifiedAt } =
      await maybeVerifyProvisionedDomain(hostname, domainResponse);

    await addRedirectDomainIfNeeded(
      hostname,
      redirectHostname,
      provisionedHostnames
    );

    const updatedRecord = await domainDao.update(record.id, {
      status,
      verifiedAt,
    });

    return { record: updatedRecord, verification };
  } catch (error) {
    await rollbackCreatedDomain({
      domainId: record.id,
      provisionedHostnames,
    });
    logError("Failed to provision Vercel domain", error);
    return null;
  }
};

const syncTenantEdgeConfigAfterDomainChange = async (
  projectId: string,
  reason: "create" | "delete" | "verification fetch" | "verify",
  options?: { removedHosts?: string[] }
) => {
  try {
    await syncProjectTenantEdgeConfig(projectId, options);
  } catch (error) {
    logWarn(`Failed to sync tenant Edge Config after domain ${reason}`, error);
  }
};

const markDomainVerified = async (
  domainId: string,
  projectId: string,
  syncReason: "verification fetch" | "verify"
) => {
  await domainDao.update(domainId, {
    status: toDomainStatus(true),
    verifiedAt: new Date(),
  });
  await syncTenantEdgeConfigAfterDomainChange(projectId, syncReason);
};

const restoreDeletedDomain = async (domain: PersistedDomain) => {
  try {
    await domainDao.create({
      hostname: domain.hostname,
      pathPrefix: domain.pathPrefix,
      projectId: domain.projectId,
      status: domain.status,
      verifiedAt: domain.verifiedAt,
    });
  } catch (error) {
    logWarn("Failed to restore domain record after Vercel error", error);
  }
};

const removeHostedDomain = async (domain: PersistedDomain) => {
  const redirectHostname = getRedirectHostname(domain.hostname);

  try {
    await removeProvisionedDomain(domain.hostname);
    if (redirectHostname) {
      await removeProvisionedDomain(redirectHostname).catch((error) => {
        logWarn("Failed to remove Vercel redirect domain", error);
      });
    }

    return true;
  } catch (error) {
    await restoreDeletedDomain(domain);
    logError("Failed to remove Vercel domain", error);
    return false;
  }
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
  async (c) => {
    const { projectId } = c.req.valid("param");
    if (!(await authorizeProjectRequest(c, projectId))) {
      return unauthorized(c, "Invalid credentials.");
    }
    const body = c.req.valid("json");
    const hostname = normalizeHostnameInput(body.hostname);
    const hostnameError = getDomainHostnameError(hostname);
    if (hostnameError) {
      return badRequest(c, hostnameError);
    }
    if (!hostname) {
      return badRequest(c, "Domain hostname must be valid.");
    }
    const normalizedHostname = hostname;

    const existingDomain = await domainDao.getByHostname(normalizedHostname);
    if (existingDomain) {
      return badRequest(c, getDomainConflictMessage(normalizedHostname));
    }

    const status = mapDomainStatusFromContract("Pending Verification");
    const verifiedAt: Date | null = null;
    const pathPrefix = normalizePathPrefix(body.pathPrefix);
    const redirectHostname = getRedirectHostname(normalizedHostname);

    const createdRecord = await createDomainRecord({
      hostname: normalizedHostname,
      pathPrefix,
      projectId,
      status,
      verifiedAt,
    });
    if (!createdRecord) {
      return badRequest(c, getDomainConflictMessage(normalizedHostname));
    }

    const provisionedDomain = await provisionDomainRecord(
      createdRecord,
      normalizedHostname,
      redirectHostname
    );
    if (!provisionedDomain) {
      return badGateway(c, "Unable to provision domain");
    }

    await syncTenantEdgeConfigAfterDomainChange(projectId, "create");

    return c.json(
      {
        domain: mapDomain(provisionedDomain.record),
        verification: provisionedDomain.verification,
      },
      201
    );
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
        getStoredVerification(domain.status === validConfiguredDomainStatus),
        200
      );
    }

    try {
      const domainResponse = await getProjectDomain(domain.hostname);
      const verification = getVercelVerification(domainResponse);
      if (verification.verified && !domain.verifiedAt) {
        await markDomainVerified(domain.id, projectId, "verification fetch");
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
        getStoredVerification(domain.status === validConfiguredDomainStatus),
        200
      );
    }

    try {
      const domainResponse = await verifyProjectDomain(domain.hostname);
      const verification = getVercelVerification(domainResponse);
      if (verification.verified) {
        await markDomainVerified(domain.id, projectId, "verify");
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

    const redirectHostname = getRedirectHostname(domain.hostname);
    const deletedDomain = await domainDao.delete(domain.id);

    if (isVercelEnabled() && !(await removeHostedDomain(deletedDomain))) {
      return badGateway(c, "Unable to remove domain");
    }

    await syncTenantEdgeConfigAfterDomainChange(projectId, "delete", {
      removedHosts: [
        domain.hostname,
        ...(redirectHostname ? [redirectHostname] : []),
      ],
    });

    return noContent();
  }
);
