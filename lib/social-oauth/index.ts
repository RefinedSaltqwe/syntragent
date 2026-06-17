import { ChannelTypeEnum } from "@/constants/channels"; // Enum containing all supported social channel types
import { OAuthProvider, OAuthTokenResponse } from "./types"; // Shared OAuth provider and token response types
import { requestLongLivedToken } from "../providers/instagram"; // Instagram helper to exchange short-lived token for long-lived token

/**
 * OAuth Provider Registry
 *
 * Flow:
 * 1. User clicks "Connect Channel"
 * 2. getOAuthProvider() returns the provider implementation
 * 3. getAuthorizationUrl() redirects user to the provider
 * 4. User authorizes the application
 * 5. Provider redirects back with an authorization code
 * 6. exchangeCodeForToken() exchanges the code for an access token
 * 7. getProfile() fetches the user's profile information
 * 8. Channel is connected and stored in the database
 *
 * Features:
 * - Supports multiple social providers
 * - Handles OAuth authorization flow
 * - Supports PKCE providers (Twitter/X)
 * - Handles token refresh
 * - Fetches normalized profile data
 * - Provides a unified provider interface
 */

function getEnv(key: string) {
  // Get environment variable value
  const value = process.env[key];

  // Throw an error if the environment variable is missing
  if (!value) throw new Error(`${key} is missing.`);

  // Return the environment variable value
  return value;
}

function getConfig(type: ChannelTypeEnum) {
  // Build provider configuration from environment variables
  return {
    // OAuth authorization endpoint
    authUrl: getEnv(`${type}_AUTH_URL`),

    // OAuth token endpoint
    tokenUrl: getEnv(`${type}_TOKEN_URL`),

    // Endpoint for fetching user profile information
    profileUrl: getEnv(`${type}_PROFILE_URL`),

    // OAuth application client id
    clientId: getEnv(`${type}_CLIENT_ID`),

    // OAuth application client secret
    clientSecret: getEnv(`${type}_CLIENT_SECRET`),

    // Convert comma-separated scopes into an array
    scope: getEnv(`${type}_SCOPES`)
      .split(",") // Split scopes by comma
      .map((s) => s.trim()) // Remove extra spaces
      .filter(Boolean), // Remove empty values
  };
}

/**
 * Exchanges OAuth credentials with the provider's
 * token endpoint and returns token data.
 */
async function requestToken(type: ChannelTypeEnum, body: URLSearchParams) {
  // Get provider configuration
  const config = getConfig(type);

  // Default request headers
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  // Twitter requires Basic Authentication
  if (type === ChannelTypeEnum.TWITTER && config.clientSecret) {
    // Encode client id and secret into Base64
    const auth_header = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");

    // Add Authorization header
    headers.Authorization = `Basic ${auth_header}`;
  }

  // Send request to provider's token endpoint
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body,
  });

  // Parse response body
  const data = await response.json();

  // Throw error if token exchange failed
  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        `Token exchange failed: ${response.statusText}`,
    );
  }

  // Return token data
  return data;
}

function createProvider(
  type: ChannelTypeEnum,
  opts: { pkce?: boolean } = {},
): OAuthProvider {
  return {
    // Provider type
    type,

    // Build authorization URL
    getAuthorizationUrl: ({
      state,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
    }) => {
      // Get provider configuration
      const config = getConfig(type);

      // Build authorization query parameters
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",

        // Instagram uses comma-separated scopes
        // Other providers use space-separated scopes
        scope:
          type === ChannelTypeEnum.INSTAGRAM
            ? config.scope.join(",")
            : config.scope.join(" "),

        // CSRF protection state value
        state,
      });

      // Append PKCE parameters when enabled
      if (opts.pkce && codeChallenge && codeChallengeMethod) {
        params.append("code_challenge", codeChallenge);
        params.append("code_challenge_method", codeChallengeMethod);
      }

      // Return complete authorization URL
      return `${config.authUrl}?${params.toString()}`;
    },

    // Exchange authorization code for access token
    exchangeCodeForToken: async ({
      code,
      redirectUri,
      codeVerifier,
    }): Promise<OAuthTokenResponse> => {
      // Get provider configuration
      const config = getConfig(type);

      // Create token exchange payload
      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
      });

      // Non-PKCE providers require client secret
      if (!opts.pkce) {
        params.append("client_secret", config.clientSecret);
      }

      // PKCE providers require code verifier
      if (codeVerifier) {
        params.append("code_verifier", codeVerifier);
      }

      // Request access token
      const data = await requestToken(type, params);

      // Instagram requires conversion to a long-lived token
      if (type === ChannelTypeEnum.INSTAGRAM) {
        // Exchange short-lived token for long-lived token
        const { longLivedToken, expiresAt } = await requestLongLivedToken(
          config.clientSecret,
          data.access_token,
        );

        // console.log("Instagram short-lived token", {
        //   accessToken: data.access_token,
        //   userId: data.user_id,
        //   permissions: data.permissions,
        //   longLivedToken: longLivedToken,
        // });

        // Return normalized token response
        return {
          accessToken: longLivedToken,
          refreshToken: null,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
        };
      }

      // Return normalized token response
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt:
          Number(data.expires_in) > 0
            ? new Date(
                Date.now() + Number(data.expires_in) * 1000,
              ).toISOString()
            : null,
      };
    },

    // Refresh an expired access token using the refresh token
    refreshToken: async ({ refreshToken, redirectUri }) => {
      // Get provider configuration
      const config = getConfig(type);

      // Create refresh token payload
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
      });

      // Add client secret if required
      if (config.clientSecret) {
        params.append("client_secret", config.clientSecret);
      }

      // Add redirect uri if required
      if (redirectUri) {
        params.append("redirect_uri", redirectUri);
      }

      // Request a new access token
      const data = await requestToken(type, params);

      // Calculate token expiration date
      const seconds = Number(data.expires_in);

      const expiresAt =
        seconds > 0
          ? new Date(Date.now() + seconds * 1000).toISOString()
          : null;

      // Return normalized token response
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      };
    },

    // Fetch the connected user's profile
    getProfile: async ({ accessToken }) => {
      // Get provider configuration
      const config = getConfig(type);

      // Debug token information
      console.log("GET PROFILE TOKEN", {
        exists: !!accessToken,
        token: accessToken?.slice(0, 20),
      });

      /**
       * Instagram Login API uses a dedicated profile endpoint
       * and returns username directly from Instagram.
       */
      if (type === ChannelTypeEnum.INSTAGRAM) {
        // Fetch Instagram profile
        const response = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`,
        );

        // Parse response
        const data = await response.json();

        // Throw error if request failed
        if (!response.ok) {
          throw new Error(
            `Failed to fetch Instagram profile: ${JSON.stringify(data)}`,
          );
        }

        // Normalize profile structure
        const profileData = data?.data ?? data?.user ?? data;

        // Try multiple profile image fields
        const profileImage =
          profileData?.thread_profile_picture ??
          profileData?.profile_image_url ??
          profileData?.avatar_url ??
          profileData?.profile_image ??
          profileData?.picture?.data?.url ??
          profileData?.picture?.url ??
          profileData?.picture ??
          null;

        // Return normalized profile
        return {
          providerAccountId: data.id,
          handle: data.username,
          profileImage,
        };
      }

      // Default profile request for all other providers
      const response = await fetch(config.profileUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      // Parse response
      const data = await response.json();

      // Throw error if request failed
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${JSON.stringify(data)}`);
      }

      // Normalize profile structure
      const profileData = data?.data ?? data?.user ?? data;

      // Try multiple possible id fields
      const providerAccountId =
        profileData?.id ?? profileData?.sub ?? profileData?.user_id ?? null;

      // Try multiple possible username fields
      const handle =
        profileData?.username ??
        profileData?.screen_name ??
        profileData?.handle ??
        profileData?.name ??
        null;

      // Try multiple possible profile image fields
      const profileImage =
        profileData?.thread_profile_picture ??
        profileData?.profile_image_url ??
        profileData?.avatar_url ??
        profileData?.profile_image ??
        profileData?.picture?.data?.url ??
        profileData?.picture?.url ??
        profileData?.picture ??
        null;

      // Return normalized profile
      return {
        providerAccountId,
        handle,
        profileImage,
      };
    },
  } satisfies OAuthProvider;
}

/**
 * Registered OAuth providers available in Syntragent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PROVIDERS: Record<ChannelTypeEnum, any> = {
  // Twitter/X provider with PKCE support enabled
  [ChannelTypeEnum.TWITTER]: createProvider(ChannelTypeEnum.TWITTER, {
    pkce: true,
  }),

  // LinkedIn provider
  [ChannelTypeEnum.LINKEDIN]: createProvider(ChannelTypeEnum.LINKEDIN),

  // Instagram provider
  [ChannelTypeEnum.INSTAGRAM]: createProvider(ChannelTypeEnum.INSTAGRAM),

  // Facebook provider
  [ChannelTypeEnum.FACEBOOK]: createProvider(ChannelTypeEnum.FACEBOOK),

  // Threads provider
  [ChannelTypeEnum.THREADS]: createProvider(ChannelTypeEnum.THREADS),

  // Bluesky provider
  [ChannelTypeEnum.BLUESKY]: createProvider(ChannelTypeEnum.BLUESKY),

  // YouTube provider
  [ChannelTypeEnum.YOUTUBE]: createProvider(ChannelTypeEnum.YOUTUBE),

  // TikTok provider
  [ChannelTypeEnum.TIKTOK]: createProvider(ChannelTypeEnum.TIKTOK),
};

/**
 * Returns the OAuth provider implementation
 * for the requested channel type.
 */
export function getOAuthProvider(type: ChannelTypeEnum) {
  // Return provider instance by channel type
  return PROVIDERS[type];
}

/**
 * Refreshes an access token using the provider's
 * refresh token implementation.
 */
export async function refreshOauthToken(
  type: ChannelTypeEnum,
  refreshToken: string,
  redirectUri: string,
) {
  // Debug refresh request
  console.log("refreshing token", type, refreshToken, redirectUri);

  // Get provider implementation
  const provider = getOAuthProvider(type);

  // Ensure provider supports refresh tokens
  if (!provider.refreshToken) {
    throw new Error("Refresh token not supported for this provider");
  }

  // Refresh access token
  const result = await provider.refreshToken({
    refreshToken,
    redirectUri,
  });

  // Return refreshed token data
  return result;
}
