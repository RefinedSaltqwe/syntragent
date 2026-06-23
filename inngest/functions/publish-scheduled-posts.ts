/* eslint-disable @typescript-eslint/no-explicit-any */
import { getInsforgeAdminClient } from "@/lib/insforge-server";
import { inngest } from "../client";
import { ImageObject, PostType } from "@/types/post.type";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshOauthToken } from "@/lib/social-oauth";
import { ChannelTypeEnum } from "@/constants/channels";
import { refreshInstagramToken } from "@/lib/providers/instagram";

type DuePost = {
  id: string;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

//Checks for posts that are queued and ready for publishing
//Sends the posts to publishScheduledPost triggers: { event: "post/publish.requested" },
export const publishScheduledPostsCron = inngest.createFunction(
  {
    id: "publish-scheduled-posts-cron",
    name: "Publish Scheduled Posts",

    /**
     * Runs every 2 minute.
     *
     * Inngest Cloud wakes up and calls:
     *
     * POST /api/inngest
     *
     * Your browser is NOT involved.
     */
    triggers: [
      {
        cron: "*/2 * * * *",
      },
    ],
  },

  async ({ step, logger }) => {
    /**
     * step.run()
     *
     * Creates a named, durable step.
     *
     * Benefits:
     * - visible in Inngest dashboard
     * - retryable
     * - resumable
     * - state persisted by Inngest
     */
    const duePosts = await step.run("load-due-scheduled-posts", async () => {
      const insforge = getInsforgeAdminClient();

      /**
       * Current time.
       */
      const now = new Date().toISOString();

      /**
       * Find all queued posts that should already
       * be published.
       *
       * Example:
       *
       * status = queue
       * scheduled_at <= now
       */
      const { data, error } = await insforge.database
        .from("scheduled_posts")
        .select("id, status, scheduled_at")
        .eq("status", "queue")
        .lte("scheduled_at", now)
        .order("scheduled_at", { ascending: true });

      logger.info("Load due scheduled posts", {
        count: data?.length,
      });

      if (error) {
        logger.error(error);
        throw error;
      }

      if (!data?.length) {
        return [];
      }

      // Change all status to publishing
      const postsToPublish: DuePost[] = [];

      for (const post of data ?? []) {
        const { data: updatedPost, error } = await insforge.database
          .from("scheduled_posts")
          .update({
            status: "publishing",
          })
          .eq("id", post.id)
          .eq("status", "queue")
          .select("id")
          .single();

        if (error) {
          logger.error(error);
          continue;
        }

        // Only this worker successfully claimed it
        if (updatedPost) {
          postsToPublish.push(post);
        }
      }

      return postsToPublish;
    });

    /**
     * Nothing to publish.
     */
    if (duePosts.length === 0) {
      return { queued: 0 };
    }

    logger.info("Send out the post for publish", {
      count: duePosts.length,
    });

    /**
     * Sends events into Inngest's event queue.
     *
     * This does NOT publish posts immediately.
     *
     * It creates events:
     *
     * post/publish.requested
     *   └── postId: abc123
     *
     * Inngest then finds functions that listen
     * to this event and executes them.
     */
    await step.sendEvent(
      "send-out-post-for-publish",
      duePosts.map((post) => ({
        name: "post/publish.requested",
        data: {
          postId: post.id,
        },
      })),
    );

    return {
      message: "sent out posts for publishing",
      queued: duePosts.length,
    };
  },
);

// Publishes posts that are due
export const publishScheduledPost = inngest.createFunction(
  {
    id: "publish-scheduled-post",
    name: "Publish Scheduled Post",

    /**
     * This function listens for:
     *
     * post/publish.requested
     *
     * Whenever the event is sent,
     * Inngest automatically executes
     * this function.
     */
    triggers: {
      event: "post/publish.requested",
    },
  },
  async ({ event, step, logger }) => {
    /**
     * Load the post and channel information
     * from the database.
     *
     * event.data.postId
     * comes from step.sendEvent().
     */
    const post = await step.run("load-post", async () => {
      // load post from database
      const insforge = getInsforgeAdminClient();
      const { data, error } = await insforge.database
        .from("scheduled_posts")
        .select("*, user_channels(*, channel_types(id, type, name))")
        .eq("id", event.data.postId)
        .eq("status", "publishing")
        .single();

      logger.info("Load post", { data });
      if (error) {
        logger.error(error);
        throw error;
      }

      return data as PostType;
    });

    /**
     * Safety checks.
     *
     * If the post was deleted or channel
     * no longer exists, stop execution.
     */

    if (!post) {
      logger.error("Post not found", { postId: event.data.postId });
      return { skipped: true, reason: "post_not_found" };
    }

    const userChannel = post.user_channels;

    const instagramAccountId = post.user_channels?.provider_account_id;
    if (!userChannel)
      return { skipped: true, reason: "user_channel_not_found" };

    const channelType = userChannel.channel_types;
    if (!channelType)
      return { skipped: true, reason: "channel_type_not_found" };

    const providerType = post.user_channels?.channel_types?.type;
    /**
     * Decrypt tokens because tokens
     * are stored encrypted in the database.
     */
    const accessToken = decrypt(post.user_channels?.access_token);
    const refreshToken = decrypt(post.user_channels?.refresh_token);
    const tokenExpiresAt = post.user_channels?.token_expires_at
      ? new Date(post.user_channels.token_expires_at).getTime()
      : null;
    const callbackUrl = `${APP_URL}/api/channel/callback`;
    /**
     * Determine if token should be refreshed
     * before publishing.
     *
     * Instagram:
     * refresh if expiring within 7 days.
     *
     * Others:
     * refresh if already expired.
     */
    const shouldRefreshBeforePublish =
      providerType === ChannelTypeEnum.INSTAGRAM
        ? tokenExpiresAt !== null &&
          tokenExpiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000
        : Boolean(refreshToken) &&
          tokenExpiresAt !== null &&
          tokenExpiresAt <= Date.now();

    console.log(
      "refresh",
      refreshOauthToken,
      "shouldbe",
      shouldRefreshBeforePublish,
    );

    if (!providerType || !accessToken) {
      logger.error("Missing provider type or access token", {
        providerType,
        accessToken,
      });
      return { skipped: true, reason: "missing_provider_or_token" };
    }

    let currentAccessToken = accessToken;

    /**
     * Refresh Instagram token if needed.
     *
     * Flow:
     *
     * Database
     *     ↓
     * decrypt token
     *     ↓
     * refreshInstagramToken()
     *     ↓
     * saveRefreshedToken()
     *     ↓
     * publish with new token
     */
    if (
      providerType === ChannelTypeEnum.INSTAGRAM &&
      tokenExpiresAt !== null &&
      tokenExpiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000
    ) {
      const result = await step.run("refresh-instagram-token", async () => {
        const data = await refreshInstagramToken(currentAccessToken);

        await saveRefreshedToken(
          post.user_channels!.id,
          data.accessToken,
          "", // Instagram has no refresh token
          data.expiresAt,
        );

        return data;
      });

      currentAccessToken = result.accessToken;
    }

    // Everything else
    else if (shouldRefreshBeforePublish && refreshToken) {
      const result = await step.run("refresh-token", async () => {
        const data = await refreshOauthToken(
          providerType as ChannelTypeEnum,
          refreshToken,
          callbackUrl,
        );

        await saveRefreshedToken(
          post.user_channels!.id,
          data.accessToken,
          data.refreshToken ?? refreshToken,
          data.expiresAt,
        );

        return data;
      });

      currentAccessToken = result.accessToken;
    }

    let publishedUrl: string | null = null;

    try {
      /**
       * Publish to the appropriate provider.
       *
       * Twitter
       * LinkedIn
       * Instagram
       *
       * Only one branch runs depending
       * on channel type.
       */
      publishedUrl = await step.run("publish-to-ptrovider", async () => {
        if (providerType === ChannelTypeEnum.TWITTER) {
          return publishToTwitter({
            accessToken: currentAccessToken,
            content: post.content,
            handle: post.user_channels?.handle,
            images: post.images,
            logger,
          });
        }
        if (providerType === ChannelTypeEnum.LINKEDIN) {
          return publishToLinkedIn({
            accessToken: currentAccessToken,
            text: post.content,
            authorId: post.user_channels?.provider_account_id,
            images: post.images,
            logger,
          });
        }
        if (providerType === ChannelTypeEnum.INSTAGRAM) {
          return publishToInstagram({
            accessToken: currentAccessToken,
            instagramAccountId: instagramAccountId!,
            caption: post.content,
            images: post.images,
            logger,
          });
        }

        throw new Error(`Unsupported provider type: ${providerType}`);
      });
      /**
       * Mark database record as published.
       *
       * queue
       *   ↓
       * published
       */
      await step.run("mark-post-published", async () => {
        await markPostPublished(post.id, publishedUrl);
      });

      return { published: true, provider: providerType };
    } catch (error) {
      logger.error("Failed to publish post", { error });
      const message = error instanceof Error ? error.message : "Unknown error";
      await markPostFailed(post.id, message);
      throw error;
    }
  },
);
//? INSTAGRAM
async function publishToInstagram({
  accessToken,
  instagramAccountId,
  caption,
  images,
  logger,
}: {
  accessToken: string;
  instagramAccountId: string;
  caption: string;
  images?: ImageObject[];
  logger: any;
}) {
  if (!images?.length) {
    throw new Error("Instagram requires at least one image");
  }

  let creationId: string;

  // Single image
  if (images.length === 1) {
    const mediaRes = await fetch(
      `https://graph.instagram.com/v24.0/${instagramAccountId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: images[0].url,
          caption,
        }),
      },
    );

    const media = await mediaRes.json();

    logger.info("Instagram media response", media);

    if (!media.id) {
      throw new Error(JSON.stringify(media));
    }

    creationId = media.id;
  }
  // Carousel
  else {
    logger.info("Posting Carousel", {
      imageCount: images.length,
    });

    const children = await Promise.all(
      images.map(async (image) => {
        const childRes = await fetch(
          `https://graph.instagram.com/v24.0/${instagramAccountId}/media`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image_url: image.url,
              is_carousel_item: true,
            }),
          },
        );

        const child = await childRes.json();

        logger.debug?.("Instagram child response", child);

        if (!child.id) {
          throw new Error(JSON.stringify(child));
        }

        return child.id;
      }),
    );

    logger.info("Created carousel children", {
      count: children.length,
    });

    const carouselRes = await fetch(
      `https://graph.instagram.com/v24.0/${instagramAccountId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: children.join(","),
          caption,
        }),
      },
    );

    const carousel = await carouselRes.json();

    logger.info("Instagram carousel response", carousel);

    if (!carousel.id) {
      throw new Error(JSON.stringify(carousel));
    }

    creationId = carousel.id;
  }

  // Instagram sometimes needs a few seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Publish
  const publishRes = await fetch(
    `https://graph.instagram.com/v24.0/${instagramAccountId}/media_publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: creationId,
      }),
    },
  );

  const publish = await publishRes.json();

  logger.info("Instagram publish response", publish);

  if (!publish.id) {
    throw new Error(JSON.stringify(publish));
  }

  // Get permalink
  const permalinkRes = await fetch(
    `https://graph.instagram.com/v24.0/${publish.id}?fields=permalink`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const permalink = await permalinkRes.json();

  logger.info("Instagram permalink response", permalink);

  return permalink.permalink ?? publish.id;
}
//? TWITTER
async function publishToTwitter({
  accessToken,
  content,
  handle,
  images,
  logger,
}: {
  accessToken: string;
  content: string;
  handle?: string | null;
  images?: ImageObject[];
  logger: any;
}) {
  let mediaIds: string[] = [];

  if (images?.length) {
    try {
      mediaIds = await uploadImagesToTwitter({
        accessToken,
        images,
        logger,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "TWITTER_CREDITS_DEPLETED"
      ) {
        logger.warn(
          "Twitter media upload skipped because API credits are exhausted",
        );
        mediaIds = [];
      } else {
        throw error;
      }
    }
  }

  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: content,
      ...(mediaIds.length
        ? {
            media: {
              media_ids: mediaIds,
            },
          }
        : {}),
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Failed to publish to Twitter: ${response.status} ${responseText}`,
    );
  }

  const data = JSON.parse(responseText);

  const postId = data?.data?.id;

  if (!postId) {
    throw new Error("Failed to get post ID from Twitter response");
  }

  return handle
    ? `https://x.com/${handle}/status/${postId}`
    : `https://x.com/i/web/status/${postId}`;
}

async function uploadImagesToTwitter({
  accessToken,
  images,
  logger,
}: {
  accessToken: string;
  images: ImageObject[];
  logger: any;
}) {
  const mediaIds: string[] = [];

  for (const image of images) {
    const fileResponse = await fetch(image.url);
    if (!fileResponse.ok) throw new Error("Failed to fetch image");

    const bytes = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers
      .get("content-type")
      ?.split(";")[0]
      .trim();

    const pathname = new URL(image.url).pathname.toLowerCase();

    const mediaType =
      contentType &&
      contentType != "binary/octet-stream" &&
      contentType != "application/octet-stream"
        ? contentType
        : pathname.endsWith(".png")
          ? "image/png"
          : pathname.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg";

    const formData = new FormData();
    const blob = new Blob([bytes], { type: mediaType });
    formData.append("media", blob);
    formData.append("media_category", "tweet_image");
    formData.append("media_type", mediaType);

    const uploadRes = await fetch("https://api.x.com/2/media/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const response = await uploadRes.text();
    logger.info("Twitter media upload response", { response });
    let data: any = null;
    try {
      data = JSON.parse(response);
    } catch (e: unknown) {
      console.error(e);
      logger.error("Failed to parse Twitter media upload response", {
        response,
      });
      data = null;
    }

    if (!uploadRes.ok) {
      const errorData = JSON.parse(response);

      if (errorData.title === "CreditsDepleted") {
        throw new Error("TWITTER_CREDITS_DEPLETED");
      }

      throw new Error(`Failed to upload media to Twitter: ${response}`);
    }

    const mediaId = data?.data?.id || data?.data?.media_key;
    if (!mediaId)
      throw new Error("Failed to get media ID from Twitter response");
    mediaIds.push(mediaId);
  }
  return mediaIds;
}
//? LINKEDIN
async function publishToLinkedIn({
  accessToken,
  text,
  authorId,
  images,
  logger,
}: {
  accessToken: string;
  text: string;
  authorId?: string | null;
  images?: { url: string; key: string }[];
  logger: any;
}) {
  if (!authorId) throw new Error("Missing LinkedIn provider account id.");
  const imageUrn = images?.[0]?.url
    ? await uploadLinkedInImage({
        accessToken,
        authorId,
        imageUrl: images[0].url,
      })
    : null;
  const body: Record<string, unknown> = {
    author: `urn:li:person:${authorId}`,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (imageUrn) {
    body.content = {
      media: {
        id: imageUrn,
      },
    };
  }
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "Linkedin-Version": "202604",
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let data: any = null;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    logger.error("Failed to parse LinkedIn response", { responseText });
  }

  if (!response.ok) {
    throw new Error(data?.message || "Failed to publish to LinkedIn.");
  }
  const restliId = response.headers.get("x-restli-id") || data?.id || null;
  return restliId
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(restliId)}`
    : null;
}

async function uploadLinkedInImage({
  accessToken,
  authorId,
  imageUrl,
}: {
  accessToken: string;
  authorId: string;
  imageUrl: string;
}) {
  const initResponse = await fetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": "202604",
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: `urn:li:person:${authorId}`,
        },
      }),
    },
  );
  const initResponseText = await initResponse.text();
  let initData: {
    message?: string;
    value?: { uploadUrl?: string; image?: string };
  } | null = null;
  try {
    initData = initResponseText ? JSON.parse(initResponseText) : null;
  } catch {
    throw new Error("Failed to parse LinkedIn image initialization response.");
  }

  if (!initResponse.ok) {
    throw new Error(
      initData?.message || "Failed to initialize LinkedIn image upload.",
    );
  }
  const uploadUrl = initData?.value?.uploadUrl;
  const imageUrn = initData?.value?.image;
  if (!uploadUrl || !imageUrn) {
    throw new Error(
      "LinkedIn image upload initialization did not return an upload URL.",
    );
  }
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image for LinkedIn upload.");
  }
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const imageBuffer = await imageResponse.arrayBuffer();
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: imageBuffer,
  });
  if (!uploadResponse.ok) {
    throw new Error("Failed to upload image to LinkedIn.");
  }

  return imageUrn as string;
}

async function saveRefreshedToken(
  userChannelId: string | undefined,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
) {
  if (!userChannelId) {
    throw new Error("User channel ID is missing");
  }
  const insforge = getInsforgeAdminClient();
  const { error } = await insforge.database
    .from("user_channels")
    .update({
      access_token: encrypt(accessToken),
      refresh_token: encrypt(refreshToken),
      token_expires_at: expiresAt ?? null,
    })
    .eq("id", userChannelId);

  if (error) throw error;
}

async function markPostPublished(postId: string, published_url: string | null) {
  const insforge = getInsforgeAdminClient();
  const { error } = await insforge.database
    .from("scheduled_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_url: published_url,
    })
    .eq("id", postId);
  if (error) throw error;
}

async function markPostFailed(postId: string, errorMessage: string) {
  const insforge = getInsforgeAdminClient();
  const { error } = await insforge.database
    .from("scheduled_posts")
    .update({
      status: "failed",
      error_message: errorMessage,
    })
    .eq("id", postId);

  if (error) throw error;
}

function formatLinkedInText(text: string): string {
  return (
    text
      // normalize smart quotes to straight quotes
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/(\d+\.)\s{2}/g, "\n\n$1 ")
      // trim
      .trim()
      .slice(0, 3000)
  );
}
