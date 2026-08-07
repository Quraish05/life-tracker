/**
 * The size of the free AI-action pool, for static/marketing copy (e.g. the
 * landing page pricing card) that can't read the backend's runtime value.
 *
 * MUST match the backend's `AI_FREE_LIMIT` (see backend/app/core/config.py
 * `ai_free_limit`). Authenticated UI (quota badge, profile, chat) reads the
 * real limit from the API via `user.ai_limit` and should NOT use this constant.
 */
export const AI_FREE_LIMIT = 5;
