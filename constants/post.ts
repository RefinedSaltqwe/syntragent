import { ChannelTypeEnum } from "./channels";

export const POST_STATUS = {
  DRAFT: "draft",
  QUEUE: "queue",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export const POST_STATUSES = Object.values(POST_STATUS);

export const IMAGE_SIZE_MB = 8;

export const MAX_IMAGES = {
  INSTAGRAM: 20,
  FACEBOOK: 1000,
};

export const CHANNEL_RULES: Partial<
  Record<
    ChannelTypeEnum,
    {
      maxImages: number;
      requiresImage: boolean;
    }
  >
> = {
  [ChannelTypeEnum.INSTAGRAM]: {
    maxImages: 20,
    requiresImage: true,
  },
  [ChannelTypeEnum.FACEBOOK]: {
    maxImages: 1000,
    requiresImage: false,
  },
};
