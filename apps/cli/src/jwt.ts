interface JwtClaims {
  exp?: number;
  email?: string;
  sub?: string;
}

const parseJwtBase64Url = (input: string): string => {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

export const parseJwtClaims = (token: string): JwtClaims | null => {
  const parts = token.split(".");
  const payloadPart = parts.at(1);

  if (!payloadPart) {
    return null;
  }

  try {
    const payload = parseJwtBase64Url(payloadPart);
    const parsed = JSON.parse(payload) as unknown;

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const claims = parsed as Record<string, unknown>;

    return {
      email: typeof claims.email === "string" ? claims.email : undefined,
      exp: typeof claims.exp === "number" ? claims.exp : undefined,
      sub: typeof claims.sub === "string" ? claims.sub : undefined,
    };
  } catch {
    return null;
  }
};
