import { ChannelTypeEnum } from "@/constants/channels";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { getOAuthProvider } from "@/lib/social-oauth";
import { createPkcePair, getPkceCookieName } from "@/lib/social-oauth/pkce";
import { createOAuthState } from "@/lib/social-oauth/state";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

/**
 * Initiates the OAuth connection flow for a social channel.
 *
 * Flow:
 * 1. Receives the channelTypeId from the client
 * 2. Validates the authenticated user
 * 3. Loads the selected channel type from the database
 * 4. Creates a signed OAuth state payload
 * 5. Creates PKCE credentials when required (Twitter/X)
 * 6. Generates the provider authorization URL
 * 7. Stores the PKCE verifier in a secure cookie
 * 8. Returns the authorization URL to the frontend
 *
 * Features:
 * - Supports multiple social providers
 * - Secure OAuth state validation
 * - PKCE support for OAuth providers that require it
 * - Prevents CSRF attacks
 * - Preserves user and channel context during redirects
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user and database client
    const { insforge, userId } = await getInsforgeServerClient();

    // Ensure user is authenticated
    if (!userId)
      return NextResponse.json({ error: "User not found" }, { status: 401 });

    // 2. Receive selected channel type from the client
    const { channelTypeId } = await request.json();

    if (!channelTypeId)
      return NextResponse.json(
        { error: "Channel type ID is required" },
        { status: 400 },
      );

    // 3. Load channel configuration from the database
    const { data: channelType, error } = await insforge.database
      .from("channel_types")
      .select("id, type")
      .eq("id", channelTypeId)
      .single();

    if (error || !channelType) {
      return NextResponse.json(
        { error: "Channel type not found" },
        { status: 404 },
      );
    }

    // URL users are redirected back to after connection succeeds
    const redirectTo = `${APP_URL}/settings`;

    // Get OAuth provider implementation
    const provider = getOAuthProvider(channelType.type as ChannelTypeEnum);

    // 4. Create signed OAuth state
    // Preserves user + channel context across redirects
    const state = createOAuthState({
      userId,
      channelTypeId: channelType.id,
      channelType: channelType.type,
      redirectTo,
    });

    // OAuth callback endpoint
    const callbackUrl = `${APP_URL}/api/channel/callback`;

    // 5. Create PKCE credentials for providers that require it
    // (currently Twitter/X)
    const pkce =
      channelType.type === ChannelTypeEnum.TWITTER ? createPkcePair() : null;

    // 6. Generate provider authorization URL
    const url = provider.getAuthorizationUrl({
      state,
      redirectUri: callbackUrl,
      codeChallenge: pkce?.codeChallenge,
      codeChallengeMethod: pkce?.codeChallengeMethod,
    });

    // 7. Return authorization URL to frontend
    const response = NextResponse.json({ url });

    // Store PKCE verifier securely for callback validation
    if (pkce) {
      response.cookies.set(getPkceCookieName(state), pkce.codeVerifier, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10, // 10 minutes
      });
    }

    // 8. Frontend redirects user to the provider
    return response;
  } catch (error) {
    console.error("Error connecting channel:", error);

    return NextResponse.json(
      { error: "Failed to connect channel" },
      { status: 500 },
    );
  }
}
