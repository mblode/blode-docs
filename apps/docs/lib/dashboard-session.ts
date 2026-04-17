import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
} from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

export interface DashboardSession {
  accessToken: string;
  authId: string;
  userEmail: string;
  userName: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET ?? "";

let cachedSecret: Uint8Array | null = null;
const getHmacKey = (): Uint8Array | null => {
  if (!supabaseJwtSecret) {
    return null;
  }
  if (!cachedSecret) {
    cachedSecret = new TextEncoder().encode(supabaseJwtSecret);
  }
  return cachedSecret;
};

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const getJwks = () => {
  if (!supabaseUrl) {
    return null;
  }
  if (!cachedJwks) {
    cachedJwks = createRemoteJWKSet(
      new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`)
    );
  }
  return cachedJwks;
};

const getIssuer = (): string | undefined =>
  supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/auth/v1` : undefined;

const verifyAccessToken = (token: string) => {
  const header = decodeProtectedHeader(token);
  const options = {
    audience: "authenticated",
    clockTolerance: "5s",
    issuer: getIssuer(),
  };
  if (header.alg === "HS256") {
    const secret = getHmacKey();
    if (!secret) {
      throw new Error("SUPABASE_JWT_SECRET required for HS256 tokens.");
    }
    return jwtVerify(token, secret, { ...options, algorithms: ["HS256"] });
  }
  const jwks = getJwks();
  if (!jwks) {
    throw new Error("SUPABASE_URL required for asymmetric token verification.");
  }
  return jwtVerify(token, jwks, options);
};

// Supabase's auth-helpers cookie name is derived from the project ref. We
// match the default pattern the browser client writes: `sb-<ref>-auth-token`.
const getProjectRef = (): string | null => {
  if (!supabaseUrl) {
    return null;
  }
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\./);
  return match?.[1] ?? null;
};

interface StoredSupabaseSession {
  access_token?: unknown;
  user?: {
    email?: unknown;
    user_metadata?: { full_name?: unknown; name?: unknown };
  };
}

const parseCookieValue = (value: string): StoredSupabaseSession | null => {
  // Supabase SSR stores either a JSON string or an array; both are URL-encoded.
  try {
    const decoded = value.startsWith("base64-")
      ? Buffer.from(value.slice(7), "base64").toString("utf8")
      : decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed)) {
      const [sessionBlob] = parsed;
      return typeof sessionBlob === "object"
        ? (sessionBlob as StoredSupabaseSession)
        : null;
    }
    return parsed as StoredSupabaseSession;
  } catch {
    return null;
  }
};

const readChunkedCookie = async (
  baseName: string
): Promise<StoredSupabaseSession | null> => {
  const store = await cookies();
  const direct = store.get(baseName)?.value;
  if (direct) {
    return parseCookieValue(direct);
  }

  // Supabase splits large cookies into baseName.0, baseName.1, ...
  const chunks: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const chunk = store.get(`${baseName}.${i}`)?.value;
    if (!chunk) {
      break;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  return parseCookieValue(chunks.join(""));
};

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const getDashboardSession = cache(
  async (): Promise<DashboardSession | null> => {
    const ref = getProjectRef();
    if (!ref) {
      return null;
    }

    const stored = await readChunkedCookie(`sb-${ref}-auth-token`);
    const accessToken = asString(stored?.access_token);
    if (!accessToken) {
      return null;
    }

    let authId: string;
    try {
      const { payload } = await verifyAccessToken(accessToken);
      const sub = asString(payload.sub);
      if (!sub) {
        return null;
      }
      authId = sub;
    } catch (error) {
      if (!(error instanceof joseErrors.JOSEError)) {
        throw error;
      }
      return null;
    }

    const userEmail = asString(stored?.user?.email) ?? "";
    const metadata = stored?.user?.user_metadata;
    const userName =
      asString(metadata?.full_name) ?? asString(metadata?.name) ?? userEmail;

    return { accessToken, authId, userEmail, userName };
  }
);
