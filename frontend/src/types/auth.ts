/** An authenticated user, as returned by the backend. */
export type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  /** Lifetime count of AI actions this user has spent. */
  ai_usage_count: number;
  /** Size of the free AI-action pool (informational). */
  ai_limit: number;
  /** Free AI actions left, or `null` when the user is unlimited (superadmin). */
  ai_remaining: number | null;
  created_at: string;
};

/** The auth endpoints' response: a token plus the signed-in user. */
export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};
