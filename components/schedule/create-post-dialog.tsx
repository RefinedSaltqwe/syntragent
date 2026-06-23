"use client";
import { ChannelTypeEnum, getChannelIcon } from "@/constants/channels";
import { CHANNEL_RULES, POST_STATUS, PostStatus } from "@/constants/post";
import { cn } from "@/lib/utils";
import { ChannelType } from "@/types/channel.type";
import { IdeaType } from "@/types/idea.type";
import { ImageObject } from "@/types/post.type";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parse, set } from "date-fns";
import { AlertTriangle, Image, Lightbulb, ScanEye, Wand2 } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ChannelAvatar from "../channel-avatar";
import ContentTextarea from "../content-textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { AIAssistant } from "./ai-assitant";
import IdeasList from "./ideas-list";
import PreviewPanel from "./preview";
import { ScheduleDatePicker } from "./schedule-date-picker";
import MediaList from "./media-list";
import { ActionTabType } from "@/types/common.type";

type PropsType = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date | null;
};

type PostType = {
  channelTypeId: string;
  content: string;
  images?: ImageObject[];
};

export type ChannelContent = {
  text: string;
  images: ImageObject[];
};

const rightTabs = [
  { id: "ideas" as ActionTabType, label: "Ideas", icon: Lightbulb },
  { id: "media" as ActionTabType, label: "Media", icon: Image },
  { id: "ai" as ActionTabType, label: "AI Assistant", icon: Wand2 },
  { id: "preview" as ActionTabType, label: "Preview", icon: ScanEye },
];

const CreatePostDialog = ({ open, onOpenChange, selectedDate }: PropsType) => {
  const queryClient = useQueryClient();
  const [globalContent, setGlobalContent] = useState<ChannelContent>({
    text: "",
    images: [],
  });
  const [channelContent, setChannelContent] = useState<
    Record<string, ChannelContent>
  >({});

  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedRightTab, setSelectedRightTab] =
    useState<ActionTabType | null>(null);
  const [activePreview, setActivePreview] = useState<string>("");
  const [activeAccordion, setActiveAccordion] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(
    selectedDate ?? new Date(),
  );

  useEffect(() => {
    if (selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDate(selectedDate);
    }
  }, [selectedDate]);

  const [timeSlot, setTimeSlot] = useState<string>("");

  const { data, isPending } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channel");
      const data = await res.json();
      return data;
    },
  });

  const channelsData = data?.channels;
  const hasConnectedChannel = data?.connectedCount > 0;

  const channels = useMemo(() => {
    if (isPending) {
      return [];
    }
    return (channelsData || []).map((channel: ChannelType) => ({
      ...channel,
      icon: getChannelIcon(channel.type),
    })) as ChannelType[];
  }, [isPending, channelsData]);

  useEffect(() => {
    if (channels.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChannelContent((prev) => {
      if (Object.keys(prev).length > 0) {
        return prev;
      }

      const initialContent: Record<string, ChannelContent> = {};

      channels.forEach((channel) => {
        initialContent[channel.id] = {
          text: "",
          images: [],
        };
      });

      return initialContent;
    });
  }, [channels]);

  const connectedChannels = channels.filter((channel) => channel.connected);
  const selectedChannelsList = channels.filter((channel) =>
    selectedChannels.includes(channel.id),
  );
  const previewChannel = channels.find((c) => c.id === activePreview) ?? null;
  const previewContent = channelContent?.[activePreview] ?? {
    text: "",
    images: [],
  };

  const createPostMutation = useMutation({
    mutationFn: async ({
      posts,
      scheduledAt,
      status,
    }: {
      posts: PostType[];
      scheduledAt: string;
      status?: PostStatus;
    }) => {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posts,
          scheduledAt,
          status,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create posts");
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success(
        `${data.posts.length} post(s) ${variables.status === POST_STATUS.DRAFT ? "saved to draft" : "scheduled"} successfully`,
      );
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "posts",
      });
      handleOpenChange(false);
    },
    onError: (error: unknown) => {
      console.log("failed to create post", error);
      toast.error("Failed to save post");
    },
  });

  const handleSelectRightTab = (tab: ActionTabType) => {
    setSelectedRightTab((prev) => (prev === tab ? null : tab));
  };

  const handleSelectAll = () => {
    setSelectedChannels((prev) => {
      if (prev.length === connectedChannels.length) {
        setActivePreview("");
        return [];
      }

      setChannelContent((prev) => {
        const update = { ...prev };
        connectedChannels.forEach((channel) => {
          if (!update[channel.id]?.text && globalContent.text) {
            const limit = Number(channel.character_limit);

            update[channel.id] = {
              text: globalContent.text.slice(0, limit),
              images: [...globalContent.images],
            };
          } else if (!update[channel.id]) {
            update[channel.id] = { text: "", images: [] };
          }
        });
        return update;
      });
      return connectedChannels.map((channel) => channel.id);
    });
  };

  const handleGlobalContentChange = (text: string, images?: ImageObject[]) => {
    setGlobalContent((prev) => ({
      ...prev,
      text,
      images: images || prev.images,
    }));
  };

  const handleAccordionChange = (value: string) => {
    setActiveAccordion(value);
    setActivePreview(value);
  };

  const handleTextChange = (
    channelId: string,
    text: string,
    character_limit: number,
  ) => {
    const limit = Number(character_limit);
    if (text.length <= limit) {
      setChannelContent((prev) => ({
        ...prev,
        [channelId]: {
          ...prev[channelId],
          text,
        },
      }));
    }
  };

  const toggleChannel = (channelId: string, character_limit: number) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId) && activePreview === channelId)
        setActivePreview("");
      const isSelected = prev.includes(channelId);

      const newChannels = isSelected
        ? prev.filter((id) => id != channelId)
        : [...prev, channelId];

      if (!isSelected) {
        if (
          (globalContent.text || globalContent.images.length > 0) &&
          !channelContent[channelId]?.text &&
          !channelContent[channelId]?.images?.length
        ) {
          const limit = Number(character_limit);

          setChannelContent((prev) => ({
            ...prev,
            [channelId]: {
              text: globalContent.text.slice(0, limit),
              images: [...globalContent.images],
            },
          }));
        }
      } else {
        setChannelContent((prev) => ({
          ...prev,
          [channelId]: { text: "", images: [] },
        }));
      }
      return newChannels;
    });

    if (!selectedChannels.includes(channelId)) {
      setActiveAccordion(channelId);
      setActivePreview(channelId);
    }
  };

  const handleIdeaSelect = (idea: IdeaType) => {
    if (!hasConnectedChannel) {
      toast.error("Connect at least one channel to add idea");
      return;
    }
    if (selectedChannels.length === 0) {
      setGlobalContent({
        text: idea.title + "\n\n" + idea.description,
        images: idea.images || [],
      });
      return;
    }
    setChannelContent((prev) => {
      return {
        ...prev,
        [activeAccordion]: {
          text: idea.title + "\n\n" + idea.description,
          images: idea.images || [],
        },
      };
    });
  };

  const handleCreatePost = (status?: PostStatus) => {
    if (selectedChannels.length === 0) {
      toast.error("Select at least one channel");
      return;
    }
    const postToCreate = selectedChannelsList.map((channel) => {
      const content = channelContent[channel.id] ?? { text: "", images: [] };
      return {
        channelTypeId: channel.id,
        channelType: channel.type,
        content: content.text,
        images: content.images,
      };
    });
    if (postToCreate.some((post) => !post.content)) {
      toast.error("Each selected channel must have content");
      return;
    }

    // Check for channel's rules max-image and if image is required
    for (const post of postToCreate) {
      const rules = CHANNEL_RULES[post.channelType];
      if (!rules) continue;

      const imageCount = post.images?.length ?? 0;

      if (rules.requiresImage && imageCount === 0) {
        toast.error(
          `${post.channelType} posts must include at least one image`,
        );
        return;
      }

      if (imageCount > rules.maxImages) {
        toast.error("Too many images", {
          description: `${post.channelType} supports up to ${rules.maxImages} images.`,
        });
        return;
      }
    }

    const parsedTime = parse(timeSlot, "h:mm a", new Date());
    const scheduleAt = set(date || new Date(), {
      hours: parsedTime.getHours(),
      minutes: parsedTime.getMinutes(),
      seconds: 0,
      milliseconds: 0,
    });

    createPostMutation.mutate({
      posts: postToCreate.map(({ channelTypeId, content, images }) => ({
        channelTypeId,
        content,
        images,
      })),
      scheduledAt: scheduleAt.toISOString(),
      status,
    });
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    setGlobalContent({ text: "", images: [] });
    setChannelContent({});
    setActiveAccordion("");
    setActivePreview("");
    setSelectedRightTab(null);
    setDate(new Date());
    setTimeSlot("");
    setSelectedChannels([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "sm:w-full sm:min-w-175 gap-0 px-0 pt-0 pb-0",
          selectedRightTab && "sm:max-w-237.5",
        )}
      >
        <div>
          <DialogHeader className="px-8 py-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-semibold">Create Post</DialogTitle>
              <div className="flex items-center gap-px">
                {rightTabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={selectedRightTab === tab.id ? "default" : "ghost"}
                    className={cn(!selectedRightTab && "size-8")}
                    onClick={() => handleSelectRightTab(tab.id)}
                  >
                    <tab.icon className="size-4" />
                    <span className={cn(!selectedRightTab && "hidden")}>
                      {" "}
                      {tab.label}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </DialogHeader>

          <div className="w-full flex flex-1 min-w-0 overflow-hidden h-145">
            {/* Left — channel list */}
            <div className="flex flex-1 flex-col min-w-0 w-75 pb-5">
              <div className="channel--selector py-5  px-8">
                {channels?.length > 0 && !isPending && (
                  <button
                    className="mb-4 text-[13px] font-medium cursor-pointer"
                    onClick={handleSelectAll}
                  >
                    {selectedChannels.length === connectedChannels.length
                      ? "Unselect all"
                      : "Select all"}
                  </button>
                )}
                <div className="flex flex-wrap gap-4">
                  {isPending
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className="size-12.5 rounded-xl"
                        />
                      ))
                    : channels?.map((channel) => {
                        const selected = selectedChannels.includes(channel.id);
                        const isConnected = channel.connected;
                        return (
                          <Tooltip key={channel.id}>
                            <TooltipTrigger asChild>
                              <button
                                key={channel.id}
                                style={
                                  {
                                    "--channel-color": channel.color,
                                  } as React.CSSProperties
                                }
                                className={cn(
                                  "relative shrink-0 rounded-xl p-0 transition-all",
                                  !isConnected
                                    ? "cursor-not-allowed grayscale!"
                                    : "cursor-pointer",
                                  selected
                                    ? "ring-2 ring-(--channel-color) ring-offset-1"
                                    : "",
                                )}
                                onClick={() => {
                                  if (!isConnected) {
                                    toast.error(
                                      "Please connect the channel first",
                                    );
                                    return;
                                  }

                                  toggleChannel(
                                    channel.id,
                                    channel.character_limit,
                                  );
                                }}
                              >
                                <ChannelAvatar
                                  className=""
                                  type={channel.type}
                                  color={channel.color}
                                  profileImage={channel.profile_image}
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Preview {channel.name}
                              {!isConnected && (
                                <span className="text-primary">
                                  {" "}
                                  → Connect Channel
                                </span>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                </div>
              </div>

              <div
                className="channel--content relative 
                                        flex flex-col px-8 min-h-75 
                                        h-full overflow-y-auto"
              >
                {selectedChannels.length === 0 ? (
                  <div className="border rounded-xl p-4">
                    <ContentTextarea
                      value={globalContent?.text || ""}
                      images={globalContent?.images || []}
                      placeholder="Write your main content here..
        . It will be copied to channels when you select them"
                      minHeight={250}
                      showAIAssistant={true}
                      disabled={!hasConnectedChannel}
                      contentClass="text-sm placeholder:opacity-50 pt-0!"
                      onChange={(text) => handleGlobalContentChange(text)}
                      onImagesChange={(images) =>
                        handleGlobalContentChange(globalContent.text, images)
                      }
                      onAIAssistantClick={() => {
                        setSelectedRightTab((prev) => {
                          if (prev) {
                            return null;
                          }

                          return "ai";
                        });
                      }}
                    />
                  </div>
                ) : (
                  <Accordion
                    type="single"
                    collapsible
                    value={activeAccordion}
                    className="w-full space-y-3"
                    onValueChange={(val) => {
                      handleAccordionChange(val);
                    }}
                  >
                    {selectedChannelsList?.map((channel) => {
                      const content = channelContent[channel.id] || {
                        text: "",
                        images: [],
                      };
                      const isExpanded = activeAccordion === channel.id;
                      const icon = getChannelIcon(channel.type);
                      return (
                        <AccordionItem
                          key={channel.id}
                          value={channel.id}
                          className="border rounded-xl"
                        >
                          {!isExpanded && (
                            <AccordionTrigger
                              className="w-full px-3 cursor-pointer [&>svg]:hidden! hover:bg-muted
hover:no-underline! justify-start gap-3 
"
                            >
                              <span>
                                <HugeiconsIcon
                                  icon={icon}
                                  className={cn(
                                    "shrink-0 text-white! size-5! p-0.75 rounded-sm",
                                  )}
                                  style={{ background: channel.color }}
                                />
                              </span>
                              {content.text ? (
                                <p
                                  className="text-sm text-muted-foreground/80 
truncate flex-1 text-left max-w-100"
                                >
                                  {content.text}
                                </p>
                              ) : (
                                <p className="text-sm tex-muted">
                                  What would you like to share
                                </p>
                              )}
                            </AccordionTrigger>
                          )}

                          <AccordionContent className="overflow-visible">
                            <div className="flex pt-3 px-3 gap-3">
                              {isExpanded && (
                                <span>
                                  <HugeiconsIcon
                                    icon={icon}
                                    className={cn(
                                      "shrink-0 text-white! size-5! p-0.75 rounded-sm",
                                    )}
                                    style={{ background: channel.color }}
                                  />
                                </span>
                              )}

                              <div className="flex-1">
                                {!content?.text && (
                                  <div
                                    className="w-full flex items-center gap-2 rounded-md
bg-[#ffefd0] px-3 py-1 text-xs text-amber-700
dark:bg-amber-950/40
dark:text-amber-400"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <p>
                                      Please include at least some text or an
                                      attachment.
                                    </p>
                                  </div>
                                )}

                                <ContentTextarea
                                  value={content?.text || ""}
                                  images={content?.images || []}
                                  placeholder="Start writing or get inspired by AI"
                                  minHeight={260}
                                  contentClass="text-sm placeholder:opacity-50 pt-0"
                                  showAIAssistant={true}
                                  disabled={!channel.connected}
                                  onAIAssistantClick={() => {
                                    setSelectedRightTab((prev) => {
                                      if (prev) {
                                        return null;
                                      }

                                      return "ai";
                                    });
                                  }}
                                  onChange={(text) =>
                                    handleTextChange(
                                      channel.id,
                                      text,
                                      channel.character_limit,
                                    )
                                  }
                                  onImagesChange={(images) => {
                                    setChannelContent((prev) => ({
                                      ...prev,
                                      [channel.id]: {
                                        ...content,
                                        images,
                                      },
                                    }));
                                  }}
                                  renderToolbarRight={
                                    <div className="flex items-center gap-3">
                                      <span
                                        className={cn(
                                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                          (content?.text?.length || 0) >=
                                            Number(channel.character_limit) *
                                              0.9
                                            ? "bg-orange-100 text-orange-600"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {content?.text?.length || 0} /{" "}
                                        {channel.character_limit}
                                      </span>
                                    </div>
                                  }
                                />
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </div>

            {/* Right — channel preview */}
            {selectedRightTab && (
              <div
                className="w-87.5 flex flex-col shrink-0 border-l border-border
            bg-muted/30 h-full
            "
              >
                <div className="py-4 flex-1 flex flex-col h-full">
                  {selectedRightTab === "ai" && (
                    <div className="px-6">
                      <AIAssistant
                        content={
                          channelContent[activeAccordion]?.text ||
                          globalContent?.text ||
                          ""
                        }
                        channelId={activeAccordion}
                        onGenerate={(content: string) => {
                          if (globalContent?.text) {
                            setGlobalContent((prev) => ({
                              ...prev,
                              text: content,
                            }));
                          }
                          setChannelContent((prev) => ({
                            ...prev,
                            [activeAccordion]: {
                              ...prev[activeAccordion],
                              text: content,
                            },
                          }));
                        }}
                      />
                    </div>
                  )}

                  {selectedRightTab === "ideas" && (
                    <IdeasList onSelect={handleIdeaSelect} />
                  )}

                  {selectedRightTab === "media" && (
                    <MediaList
                      mode="complex"
                      selectedChannels={selectedChannels}
                      globalContent={globalContent}
                      setGlobalContent={setGlobalContent}
                      channelContent={channelContent}
                      setChannelContent={setChannelContent}
                    />
                  )}

                  {selectedRightTab === "preview" && (
                    <PreviewPanel
                      channel={previewChannel}
                      content={previewContent}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-8 pt-5 pb-4 m-0!">
          {hasConnectedChannel ? (
            <div
              className="w-full flex items-center justify-between
                        gap-2
                        "
            >
              <Button
                size="lg"
                variant="ghost"
                disabled={createPostMutation.isPending}
                onClick={() => handleCreatePost(POST_STATUS.DRAFT)}
              >
                {createPostMutation.isPending &&
                  createPostMutation.variables.status === POST_STATUS.DRAFT && (
                    <Spinner />
                  )}
                Save Draft
              </Button>
              <ButtonGroup className="p-0!">
                <ScheduleDatePicker
                  date={date}
                  setDate={setDate}
                  time={timeSlot}
                  setTime={setTimeSlot}
                  renderButton={(isDatePassed, isTimeNotAvailable) => (
                    <Button
                      size="lg"
                      className="border py-4.5 px-4"
                      disabled={
                        createPostMutation.isPending ||
                        !date ||
                        !timeSlot ||
                        isDatePassed ||
                        isTimeNotAvailable
                      }
                      onClick={() => {
                        if (isDatePassed || isTimeNotAvailable) {
                          toast.error("Please select a valid date and time");
                          return;
                        }
                        handleCreatePost();
                      }}
                    >
                      {createPostMutation.isPending &&
                        createPostMutation.variables.status === undefined && (
                          <Spinner />
                        )}
                      Schedule Post
                    </Button>
                  )}
                />
              </ButtonGroup>
            </div>
          ) : (
            <Button size="lg" asChild>
              <Link href="/settings"> Connect Channel to Post</Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
