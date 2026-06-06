import { createHash, randomBytes } from "crypto";

/**
 * Generates a PKCE verifier/challenge pair for OAuth providers
 * that require PKCE (Twitter/X).
 *
 * Flow:
 * 1. Generate a random code verifier
 * 2. Hash the verifier using SHA256
 * 3. Create a code challenge from the hash
 * 4. Return verifier + challenge for the OAuth flow
 *
 * Features:
 * - PKCE security protection
 * - Prevents authorization code interception attacks
 * - Used by Twitter/X OAuth 2.0
 */
export function createPkcePair() {
  // 1. Generate a random verifier
  const codeVerifier = randomBytes(32).toString("base64url");

  // 2. Create SHA256 hash
  // 3. Convert hash into OAuth code challenge
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // 4. Return PKCE values used during OAuth
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

/**
 * Creates a unique cookie name for storing the PKCE verifier.
 *
 * Flow:
 * 1. Hash the OAuth state
 * 2. Generate a deterministic cookie name
 * 3. Use the cookie to store the PKCE verifier
 * 4. Retrieve it later during the callback
 *
 * Features:
 * - Unique per OAuth request
 * - Supports multiple concurrent OAuth flows
 * - Prevents cookie collisions
 */
export function getPkceCookieName(state: string) {
  // 1. Create a stable hash from the OAuth state
  const digest = createHash("sha256").update(state).digest("hex");

  // 2. Generate unique cookie name
  // 3. Store verifier during connect flow
  // 4. Retrieve verifier during callback
  return `oauth_pkce_${digest}`;
}
