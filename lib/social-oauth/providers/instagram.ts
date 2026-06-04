// lib/social-oauth/providers/instagram.ts
import { OAuthProvider, OAuthTokenResponse } from "../types";
import { ChannelTypeEnum } from "@/constants/channels";

export const instagramProvider: OAuthProvider = {
  type: ChannelTypeEnum.INSTAGRAM,

  getAuthorizationUrl: ({ state, redirectUri }) => {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: process.env.INSTAGRAM_SCOPES!,
      state,
    });

    return `${process.env.INSTAGRAM_AUTH_URL}?${params}`;
  },

  exchangeCodeForToken: async ({ code, redirectUri }) => {
    const response = await fetch(process.env.INSTAGRAM_TOKEN_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: null,
      expiresAt: null,
    };
  },

  getProfile: async ({ accessToken }) => {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`,
    );

    const data = await response.json();

    return {
      providerAccountId: data.id,
      handle: data.username,
      profileImage: null,
    };
  },

  getPublishingAccount: undefined,
  refreshToken: function (params: {
    refreshToken: string;
    redirectUri?: string;
  }): Promise<OAuthTokenResponse> {
    throw new Error("Function not implemented.");
  },
};
