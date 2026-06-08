import { ChannelTypeEnum } from "@/constants/channels";
import { OAuthProvider, OAuthTokenResponse } from "./types";
import { requestLongLivedToken } from "../providers/instagram";

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
  const value = process.env[key];
  if (!value) throw new Error(`${key} is missing.`);
  return value;
}

function getConfig(type: ChannelTypeEnum) {
  return {
    authUrl: getEnv(`${type}_AUTH_URL`),
    tokenUrl: getEnv(`${type}_TOKEN_URL`),
    profileUrl: getEnv(`${type}_PROFILE_URL`),
    clientId: getEnv(`${type}_CLIENT_ID`),
    clientSecret: getEnv(`${type}_CLIENT_SECRET`),
    scope: getEnv(`${type}_SCOPES`)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/**
 * Exchanges OAuth credentials with the provider's
 * token endpoint and returns token data.
 */

async function requestToken(type: ChannelTypeEnum, body: URLSearchParams) {
  const config = getConfig(type);
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (type === ChannelTypeEnum.TWITTER && config.clientSecret) {
    const auth_header = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");
    headers.Authorization = `Basic ${auth_header}`;
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers,
    body,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        `Token exchange failed: ${response.statusText}`,
    );
  }

  return data;
}

function createProvider(
  type: ChannelTypeEnum,
  opts: { pkce?: boolean } = {},
): OAuthProvider {
  return {
    type,
    getAuthorizationUrl: ({
      state,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
    }) => {
      const config = getConfig(type);
      // Build authorization URL with query parameters
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope:
          type === ChannelTypeEnum.INSTAGRAM
            ? config.scope.join(",")
            : config.scope.join(" "),
        state,
      });
      if (opts.pkce && codeChallenge && codeChallengeMethod) {
        params.append("code_challenge", codeChallenge);
        params.append("code_challenge_method", codeChallengeMethod);
      }
      return `${config.authUrl}?${params.toString()}`;
    },
    // Exchange authorization code for access token
    exchangeCodeForToken: async ({
      code,
      redirectUri,
      codeVerifier,
    }): Promise<OAuthTokenResponse> => {
      const config = getConfig(type);

      const params = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
      });

      if (!opts.pkce) {
        params.append("client_secret", config.clientSecret);
      }

      if (codeVerifier) {
        params.append("code_verifier", codeVerifier);
      }

      const data = await requestToken(type, params);

      if (type === ChannelTypeEnum.INSTAGRAM) {
        const { longLivedToken, expiresAt } = await requestLongLivedToken(
          config.clientSecret,
          data.access_token,
        );

        return {
          accessToken: longLivedToken,
          refreshToken: null,
          expiresAt,
        };
      }

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
      const config = getConfig(type);
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
      });

      if (config.clientSecret) {
        params.append("client_secret", config.clientSecret);
      }
      if (redirectUri) {
        params.append("redirect_uri", redirectUri);
      }

      const data = await requestToken(type, params);

      const seconds = Number(data.expires_in);
      const expiresAt =
        seconds > 0
          ? new Date(Date.now() + seconds * 1000).toISOString()
          : null;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      };
    },
    getProfile: async ({ accessToken }) => {
      const config = getConfig(type);

      /**
       * Instagram Login API uses a dedicated profile endpoint
       * and returns username directly from Instagram.
       */
      if (type === ChannelTypeEnum.INSTAGRAM) {
        // Fetch user profile from the provider
        const response = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`,
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            `Failed to fetch Instagram profile: ${JSON.stringify(data)}`,
          );
        }
        const profileData = data?.data ?? data?.user ?? data;

        const profileImage =
          profileData?.thread_profile_picture ??
          profileData?.profile_image_url ??
          profileData?.avatar_url ??
          profileData?.profile_image ??
          profileData?.picture?.data?.url ??
          profileData?.picture?.url ??
          profileData?.picture ??
          null;

        return {
          providerAccountId: data.id,
          handle: data.username,
          profileImage,
        };
      }

      // Default provider logic
      const response = await fetch(config.profileUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${JSON.stringify(data)}`);
      }

      const profileData = data?.data ?? data?.user ?? data;

      const providerAccountId =
        profileData?.id ?? profileData?.sub ?? profileData?.user_id ?? null;

      const handle =
        profileData?.username ??
        profileData?.screen_name ??
        profileData?.handle ??
        profileData?.name ??
        null;

      const profileImage =
        profileData?.thread_profile_picture ??
        profileData?.profile_image_url ??
        profileData?.avatar_url ??
        profileData?.profile_image ??
        profileData?.picture?.data?.url ??
        profileData?.picture?.url ??
        profileData?.picture ??
        null;

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
  [ChannelTypeEnum.TWITTER]: createProvider(ChannelTypeEnum.TWITTER, {
    pkce: true,
  }),
  [ChannelTypeEnum.LINKEDIN]: createProvider(ChannelTypeEnum.LINKEDIN),
  [ChannelTypeEnum.INSTAGRAM]: createProvider(ChannelTypeEnum.INSTAGRAM),
  [ChannelTypeEnum.FACEBOOK]: createProvider(ChannelTypeEnum.FACEBOOK),
  [ChannelTypeEnum.THREADS]: createProvider(ChannelTypeEnum.THREADS),
  [ChannelTypeEnum.BLUESKY]: createProvider(ChannelTypeEnum.BLUESKY),
  [ChannelTypeEnum.YOUTUBE]: createProvider(ChannelTypeEnum.YOUTUBE),
  [ChannelTypeEnum.TIKTOK]: createProvider(ChannelTypeEnum.TIKTOK),
};

/**
 * Returns the OAuth provider implementation
 * for the requested channel type.
 */
export function getOAuthProvider(type: ChannelTypeEnum) {
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
  console.log("refreshing token", type, refreshToken, redirectUri);
  const provider = getOAuthProvider(type);
  if (!provider.refreshToken) {
    throw new Error("Refresh token not supported for this provider");
  }
  const result = await provider.refreshToken({ refreshToken, redirectUri });
  return result;
}
