import { CliError, EXIT_CODES } from "./errors.js";

interface OAuthTokenConfig {
  tokenUrl: string;
  clientId: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

const postTokenRequest = async (
  url: string,
  body: URLSearchParams
): Promise<OAuthTokenResponse> => {
  const response = await fetch(url, {
    body: body.toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new CliError(
      `OAuth token request failed (${response.status}): ${text}`,
      EXIT_CODES.AUTH_REQUIRED
    );
  }

  return (await response.json()) as OAuthTokenResponse;
};

export const exchangeAuthorizationCode = (
  config: OAuthTokenConfig,
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<OAuthTokenResponse> => {
  const body = new URLSearchParams({
    client_id: config.clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  return postTokenRequest(config.tokenUrl, body);
};

export const refreshAccessToken = (
  config: OAuthTokenConfig,
  refreshToken: string
): Promise<OAuthTokenResponse> => {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return postTokenRequest(config.tokenUrl, body);
};
