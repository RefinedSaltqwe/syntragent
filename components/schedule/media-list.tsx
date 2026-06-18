"use client";
import { ImageObject, ImagesResponse } from "@/types/post.type";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import React, { Dispatch, SetStateAction } from "react";
import { Skeleton } from "../ui/skeleton";
import { ChannelContent } from "./create-post-dialog";
import { cn } from "@/lib/utils";

type MediaListProps = {
  mode: "simple" | "complex";
  columns?: string;
  imageSize?: string;
  height?: string;
  imgs?: ImageObject[]; // Edit
  setImgs?: Dispatch<SetStateAction<ImageObject[]>>; // Edit
  selectedChannels?: string[]; // Create
  globalContent?: ChannelContent; // Create
  setGlobalContent?: Dispatch<SetStateAction<ChannelContent>>; //Create
  channelContent?: Record<string, ChannelContent>; //Create
  setChannelContent?: Dispatch<SetStateAction<Record<string, ChannelContent>>>; //Create
};

const MediaList: React.FC<MediaListProps> = ({
  mode,
  columns = "grid-cols-3",
  imageSize = "size-24",
  height = "h-130",
  selectedChannels,
  globalContent,
  setGlobalContent,
  channelContent,
  setChannelContent,
  imgs,
  setImgs,
}) => {
  const { data: images = [], isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: async () => {
      const response = await fetch("/api/image");

      if (!response.ok) {
        throw new Error("Fetch failed");
      }

      const result: ImagesResponse = await response.json();
      return result.images as ImageObject[];
    },
  });

  function handleSetImages(url: string, key: string) {
    const image: ImageObject = { url, key };

    // For Managing Images (Delete)
    if (setImgs && mode == "simple") {
      setImgs((prev) => {
        const exists = prev.some((img) => img.key === key);

        if (exists) {
          return prev.filter((image) => image.key != key);
        }

        return [...prev, image];
      });
    }

    // For Create Post
    if (
      selectedChannels &&
      setChannelContent &&
      setGlobalContent &&
      mode === "complex"
    ) {
      //With selected channels
      if (selectedChannels.length > 0) {
        setChannelContent((prev) => {
          const next = { ...prev };

          // Check every channel if image exist already
          selectedChannels.forEach((channelId) => {
            const current = next[channelId] ?? {
              text: "",
              images: [],
            };

            const exists = current.images.some((img) => img.key === key);

            // Push image if it doesnt exist
            if (!exists) {
              next[channelId] = {
                ...current,
                images: [...current.images, image],
              };
            } else {
              //Remove image from array if it exists
              next[channelId] = {
                ...current,
                images: current.images.filter((image) => image.key != key),
              };
            }
          });

          return next;
        });
      } else {
        setGlobalContent((prev) => {
          const exists = prev.images.some((img) => img.key === key);

          if (exists) {
            return {
              ...prev,
              images: prev.images.filter((image) => image.key != key),
            };
          }

          return {
            ...prev,
            images: [...prev.images, image],
          };
        });
      }
    }
  }

  return (
    <div className="space-y-3 flex flex-col">
      {selectedChannels && (
        <div className="px-6 flex itms-center justify-between gap-3">
          <h5 className="font-medium text-base">Media</h5>
        </div>
      )}

      <div className={cn("overflow-y-auto", height)}>
        {isLoading ? (
          <div className={cn("px-6 grid gap-3", columns)}>
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn(
                  "shrink-0 relative rounded-lg overflow-hidden border col-span-1",
                  imageSize,
                )}
              />
            ))}
          </div>
        ) : images.length > 0 ? (
          <div className={cn("px-6 grid gap-3", columns)}>
            {images.map((image, index) => (
              <div
                key={image.key || index}
                className={cn(
                  "shrink-0 relative rounded-lg overflow-hidden border col-span-1 cursor-pointer",
                  selectedChannels && selectedChannels.length === 0
                    ? globalContent &&
                      globalContent.images.some((img) => img.key === image.key)
                      ? "border-destructive border-4"
                      : ""
                    : selectedChannels &&
                        selectedChannels.some(
                          (channelId) =>
                            channelContent &&
                            channelContent[channelId]?.images.some(
                              (img) => img.key === image.key,
                            ),
                        )
                      ? "border-primary border-4"
                      : "",
                  imgs &&
                    imgs.some((img) => img.key === image.key) &&
                    "border-primary border-4",
                  imgs &&
                    imgs.some((img) => img.key === image.key) &&
                    "border-primary border-4",
                  imageSize,
                )}
                onClick={() => handleSetImages(image.url, image.key)}
              >
                <Image
                  src={image.url}
                  alt={`Uploaded ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 flex itms-center justify-between gap-3">
            <span>No media</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default MediaList;
