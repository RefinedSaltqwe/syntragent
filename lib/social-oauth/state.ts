import { ChannelTypeEnum } from "@/constants/channels";
import { createHmac, timingSafeEqual } from "crypto";

const OAUTH_STATE_SECRET = process.env.CHANNEL_OAUTH_STATE_SECRET!;

if (!OAUTH_STATE_SECRET) {
  throw new Error("CHANNEL_OAUTH_STATE_SECRET is not defined");
}

/**
 * Creates and verifies OAuth state during social account connections.
 *
 * Flow:
 * 1. User clicks "Connect Instagram/Facebook/Threads"
 * 2. createOAuthState() generates a signed state payload
 * 3. State is sent to the OAuth provider
 * 4. Provider redirects back with code + state
 * 5. verifyOAuthState() validates the state
 * 6. OAuth flow continues safely
 *
 * Features:
 * - Prevents CSRF attacks
 * - Prevents state tampering
 * - Prevents expired/replayed OAuth requests
 * - Preserves user and channel context during redirects
 */
export type OAuthStatePayload = {
  userId: string;
  channelTypeId: string;
  channelType: ChannelTypeEnum;
  redirectTo?: string;
  exp: number;
};

/**
 * Creates a signed OAuth state payload that is
 * sent to the provider and returned on callback.
 */
export function createOAuthState(
  payload: Omit<OAuthStatePayload, "exp"> & {
    expiresInMs?: number;
  },
) {
  // Add expiration timestamp (default: 10 minutes)
  const statePayload: OAuthStatePayload = {
    ...payload,
    exp: Date.now() + (payload.expiresInMs ?? 10 * 60 * 1000),
  };

  // Encode payload into a URL-safe string
  const encodedState = Buffer.from(JSON.stringify(statePayload)).toString(
    "base64url",
  );

  // Sign payload to prevent tampering
  const signature = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(encodedState)
    .digest("base64url");

  // Return: encodedPayload.signature
  return `${encodedState}.${signature}`;
}

/**
 * Verifies the OAuth state signature and expiration
 * before allowing the account connection to continue.
 */
export function verifyOAuthState(state: string): OAuthStatePayload {
  // Split encoded payload and signature
  const [encodedState, signature] = state.split(".");

  // Validate state format
  if (!encodedState || !signature) {
    throw new Error("Invalid state format");
  }

  // Recreate expected signature
  const expectedSignature = createHmac("sha256", OAUTH_STATE_SECRET)
    .update(encodedState)
    .digest("base64url");

  // Securely compare signatures
  const isValid = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );

  // Reject tampered states
  if (!isValid) {
    throw new Error("Invalid state signature");
  }

  // Decode payload
  const statePayload = JSON.parse(
    Buffer.from(encodedState, "base64url").toString("utf-8"),
  );

  // Reject expired OAuth states
  if (!statePayload.exp || statePayload.exp < Date.now()) {
    throw new Error("OAuth state expired");
  }

  return statePayload;
}
