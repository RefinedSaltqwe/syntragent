export async function requestLongLivedToken(secret: string, token: string) {
  const longLivedResponse = await fetch(
    `https://graph.instagram.com/access_token?${new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: secret,
      access_token: token,
    }).toString()}`,
  );

  const longLivedData = await longLivedResponse.json();

  console.log("Instagram long-lived token response", longLivedData);

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
