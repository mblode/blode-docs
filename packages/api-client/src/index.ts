import type {
  ApiKey,
  ApiKeyCreateInput,
  ApiKeyCreateResponse,
  Deployment,
  Domain,
  DomainCreateInput,
  DomainCreateResponse,
  DomainVerification,
  Project,
  ProjectUpdateInput,
  Tenant,
  TenantResolution,
} from "@repo/contracts";
import {
  ApiKeyCreateSchema,
  ApiKeyCreateResponseSchema,
  ApiKeySchema,
  DeploymentSchema,
  DomainCreateResponseSchema,
  DomainCreateSchema,
  DomainSchema,
  DomainVerificationSchema,
  ProjectSchema,
  ProjectUpdateSchema,
  TenantResolutionSchema,
  TenantSchema,
} from "@repo/contracts";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const parseJson = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
};

const request = async <T extends z.ZodTypeAny>(
  path: string,
  schema: T,
  options: RequestOptions = {}
): Promise<z.infer<T>> => {
  const url = new URL(path, API_BASE);
  const response = await fetch(url.toString(), {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await parseJson(response);

  if (!response.ok) {
    throw new ApiError("Request failed", response.status, data);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError("Invalid response payload", 500, parsed.error.flatten());
  }

  return parsed.data;
};

export const listTenants = async (): Promise<Tenant[]> =>
  await request("/tenants", z.array(TenantSchema));

export const getTenant = async (slug: string): Promise<Tenant> =>
  await request(`/tenants/${slug}`, TenantSchema);

export const resolveTenant = async (
  host: string,
  path: string
): Promise<TenantResolution> => {
  const params = new URLSearchParams({ host, path });
  return await request(
    `/tenants/resolve?${params.toString()}`,
    TenantResolutionSchema
  );
};

export const getProject = async (projectId: string): Promise<Project> =>
  await request(`/projects/${projectId}`, ProjectSchema);

export const updateProject = async (
  projectId: string,
  input: ProjectUpdateInput
): Promise<Project> => {
  const parsed = ProjectUpdateSchema.parse(input);
  return await request(`/projects/${projectId}`, ProjectSchema, {
    body: parsed,
    method: "PATCH",
  });
};

export const listDomains = async (projectId: string): Promise<Domain[]> =>
  await request(`/projects/${projectId}/domains`, z.array(DomainSchema));

export const createDomain = async (
  projectId: string,
  input: Omit<DomainCreateInput, "projectId">
): Promise<DomainCreateResponse> => {
  const parsed = DomainCreateSchema.omit({ projectId: true }).parse(input);
  return await request(
    `/projects/${projectId}/domains`,
    DomainCreateResponseSchema,
    {
      body: parsed,
      method: "POST",
    }
  );
};

export const getDomainVerification = async (
  projectId: string,
  domainId: string
): Promise<DomainVerification> =>
  await request(
    `/projects/${projectId}/domains/${domainId}/verification`,
    DomainVerificationSchema
  );

export const verifyDomain = async (
  projectId: string,
  domainId: string
): Promise<DomainVerification> =>
  await request(
    `/projects/${projectId}/domains/${domainId}/verify`,
    DomainVerificationSchema,
    { method: "POST" }
  );

export const listDeployments = async (
  projectId: string
): Promise<Deployment[]> =>
  await request(
    `/projects/${projectId}/deployments`,
    z.array(DeploymentSchema)
  );

export const listApiKeys = async (projectId: string): Promise<ApiKey[]> =>
  await request(`/projects/${projectId}/api-keys`, z.array(ApiKeySchema));

export const createApiKey = async (
  projectId: string,
  input: Omit<ApiKeyCreateInput, "projectId">
): Promise<ApiKeyCreateResponse> => {
  const parsed = ApiKeyCreateSchema.omit({ projectId: true }).parse(input);
  return await request(
    `/projects/${projectId}/api-keys`,
    ApiKeyCreateResponseSchema,
    {
      body: parsed,
      method: "POST",
    }
  );
};
