import { ChannelTypeEnum } from "@/constants/channels";

export type ChannelType = {
  id: string;
  type: ChannelTypeEnum;
  name?: string;
  color: string;
  character_limit: number;
  connected: boolean;
  user_channel_id?: string | null;
  provider_metadata?: ProviderMetadata | null;
  handle?: string | null;
  profile_image?: string | null;
  profile_url?: string | null;
};

export type ProviderMetadata = {
  pageId?: string;
  instagramBusinessId?: string;
  organizationId?: string;
  openId?: string;
};
