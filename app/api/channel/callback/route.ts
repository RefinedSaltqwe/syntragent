import { ChannelTypeEnum } from "@/constants/channels";
import { encrypt } from "@/lib/encryption";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { getOAuthProvider } from "@/lib/social-oauth";
import { getPkceCookieName } from "@/lib/social-oauth/pkce";
import { verifyOAuthState } from "@/lib/social-oauth/state";
import { OAuthProvider } from "@/lib/social-oauth/types";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

/**
 * Handles OAuth provider callbacks after authorization.
 *
 * Flow:
 * 1. Provider redirects user back with code + state
 * 2. Verify and decode the signed OAuth state
 * 3. Validate authenticated user matches the state
 * 4. Retrieve PKCE verifier if required (Twitter/X)
 * 5. Exchange authorization code for access token
 * 6. Fetch the connected social profile
 * 7. Store encrypted tokens in the database
 * 8. Redirect user back to settings with success status
 *
 * Features:
 * - OAuth state validation (CSRF protection)
 * - PKCE support for Twitter/X
 * - Encrypted token storage
 * - Automatic channel upsert
 * - Handles provider and callback errors
 */
function buildRedirectUrl(
  appUrl: string,
  redirectTo: string,
  params: Record<string, string>,
) {
  const url = new URL(redirectTo, appUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  // 1. Read OAuth callback parameters
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const stateParams = searchParams.get("state");
  const providerError = searchParams.get("error");

  // State is required to validate the OAuth flow
  if (!stateParams) {
    return buildRedirectUrl(APP_URL, "/settings", {
      connected: "false",
      error: "missing_state",
    });
  }

  try {
    // 2. Verify and decode signed OAuth state
    const state = verifyOAuthState(stateParams);

    // Determine where user should be redirected after completion
    const redirectTo = state?.redirectTo || `${APP_URL}/settings`;

    // Retrieve PKCE verifier for providers that require it
    const pkceCookieName = getPkceCookieName(stateParams);

    // Twitter/X requires PKCE validation
    const codeVerifier =
      state.channelType === ChannelTypeEnum.TWITTER
        ? request.cookies.get(pkceCookieName)?.value
        : undefined;

    // Provider returned an authorization error
    if (providerError) {
      const response = buildRedirectUrl(APP_URL, redirectTo, {
        connected: "false",
        error: providerError,
      });

      response.cookies.delete(pkceCookieName);
      return response;
    }

    // Authorization code is required to continue
    if (!code) {
      const response = buildRedirectUrl(APP_URL, redirectTo, {
        connected: "false",
        error: "missing_code",
      });

      response.cookies.delete(pkceCookieName);
      return response;
    }

    // 3. Validate authenticated user
    const { insforge, userId } = await getInsforgeServerClient();

    // Ensure callback belongs to the same user who started OAuth
    if (!userId || userId !== state.userId) {
      const response = buildRedirectUrl(APP_URL, redirectTo, {
        connected: "false",
        error: "missing_user",
      });

      response.cookies.delete(pkceCookieName);
      return response;
    }

    // 4. Load provider implementation
    const provider = getOAuthProvider(state.channelType) as OAuthProvider;

    // Callback URL used during token exchange
    const redirectUri = `${APP_URL}/api/channel/callback`;

    // 5. Exchange authorization code for access token
    const token = await provider.exchangeCodeForToken({
      code,
      redirectUri,
      codeVerifier,
    });

    // console.log("INSTAGRAM TOKEN OBJECT", {
    //   accessToken: !!token.accessToken,
    //   refreshToken: !!token.refreshToken,
    //   expiresAt: token.expiresAt,
    // });

    // 6. Fetch connected account profile
    const profile = await provider.getProfile({
      accessToken: token.accessToken,
    });

    // Build channel record for database storage
    const payload = {
      user_id: state.userId,
      channel_type_id: state.channelTypeId,

      provider_account_id: profile.providerAccountId,
      handle: profile.handle,
      profile_image: profile.profileImage,

      // Encrypt sensitive OAuth tokens before storing
      access_token: encrypt(token.accessToken),
      refresh_token: token.refreshToken ? encrypt(token.refreshToken) : null,

      token_expires_at: token.expiresAt,

      is_connected: true,
      is_active: true,
    };

    // 7. Create or update connected channel
    const { error } = await insforge.database
      .from("user_channels")
      .upsert(payload, {
        onConflict: "user_id,channel_type_id",
      });

    if (error) {
      const response = buildRedirectUrl(APP_URL, redirectTo, {
        connected: "false",
        error: "failed_to_upsert_user_channel",
      });

      response.cookies.delete(pkceCookieName);
      return response;
    }

    // 8. Redirect user back to settings with success status
    const response = buildRedirectUrl(APP_URL, redirectTo, {
      connected: "true",
      channelType: state.channelType,
    });

    // Cleanup PKCE cookie after successful connection
    response.cookies.delete(pkceCookieName);

    return response;
  } catch (error) {
    // Handle unexpected OAuth callback failures
    console.error("OAuth callback error:", error);

    const response = buildRedirectUrl(APP_URL, "/settings", {
      connected: "false",
      error: "oauth_callback_failed",
    });

    const stateParams = new URL(request.url).searchParams.get("state");

    // Cleanup any PKCE data before redirecting
    if (stateParams) {
      const pkceCookieName = getPkceCookieName(stateParams);
      response.cookies.delete(pkceCookieName);
    }

    return response;
  }
}
