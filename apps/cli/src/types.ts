export interface DeploymentResponse {
  fileCount?: number;
  id: string;
  manifestUrl?: string;
}

export interface StoredSessionUser {
  id: string;
  email: string | null;
}

export interface StoredAuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  user: StoredSessionUser | null;
  createdAt: string;
}

export interface AuthFileData {
  version: 1;
  session?: StoredAuthSession;
}

export interface ResolvedAuthToken {
  token: string;
  source: "stored";
  expiresAt: string | null;
  user: StoredSessionUser | null;
}

export interface SupabaseConfig {
  url: string;
}
