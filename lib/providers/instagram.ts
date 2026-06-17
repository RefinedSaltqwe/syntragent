export async function requestLongLivedToken(secret: string, token: string) {
  const longLivedResponse = await fetch(
    `https://graph.instagram.com/access_token?${new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: secret,
      access_token: token,
    }).toString()}`,
  );

  const longLivedData = await longLivedResponse.json();

  // console.log("Instagram long-lived token response", longLivedData);

  if (!longLivedResponse.ok || !longLivedData.access_token) {
    throw new Error(
      `Instagram long-lived token exchange failed: ${JSON.stringify(
        longLivedData,
      )}`,
    );
  }

  const expiresAt =
    Number(longLivedData.expires_in) > 0
      ? new Date(Date.now() + Number(longLivedData.expires_in) * 1000)
      : null;

  return {
    longLivedToken: longLivedData.access_token,
    expiresAt,
  };
}

export async function refreshInstagramToken(accessToken: string) {
  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Failed to refresh Instagram token: ${JSON.stringify(data)}`,
    );
  }

  const seconds = Number(data.expires_in);

  const expiresAt = Date.now() + seconds * 1000;

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}
