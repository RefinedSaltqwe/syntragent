/* eslint-disable @next/next/no-img-element */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface InstagramPreviewProps {
  text: string;
  images?: string[];
  postType?: string;
  handle: string;
}

export function InstagramPreview({
  text,
  images,
  handle,
}: InstagramPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const initialized = useRef(false);
  const [carouselOrientation, setCarouselOrientation] = useState<
    "portrait" | "landscape"
  >("portrait");
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const CHAR_LIMIT = 80;

  useEffect(() => {
    if (!images?.length) return;

    const img = new window.Image();

    img.onload = () => {
      setCarouselOrientation(
        img.naturalHeight >= img.naturalWidth ? "portrait" : "landscape",
      );
    };

    img.src = images[0];
  }, [images]);

  useEffect(() => {
    if (!api || initialized.current) return;
    initialized.current = true;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const aspectRatio = carouselOrientation === "portrait" ? "4 / 5" : "16 / 9";

  return (
    <Card className="overflow-hidden border-none shadow-none">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 pt-0">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage src="./images/avatar.webp" />
              <AvatarFallback>LM</AvatarFallback>
            </Avatar>
            <span className="text-sm font-semibold">{handle}</span>
          </div>
          <MoreHorizontal className="size-5 text-muted-foreground" />
        </div>

        {/* Image Display - Using Shadcn Carousel */}
        <div
          className="relative bg-black/90 overflow-hidden"
          style={{ aspectRatio }}
        >
          {images && images.length > 0 ? (
            <Carousel setApi={setApi} className="absolute inset-0">
              <CarouselContent
                className={cn(
                  "h-full ml-0 align-middle",
                  carouselOrientation === "portrait"
                    ? "items-center"
                    : "items-start",
                )}
              >
                {images.map((image, index) => (
                  <CarouselItem key={index} className="basis-full pl-0 h-full">
                    <img
                      src={image}
                      alt={`Instagram post ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious
                    className="left-2 bg-white/80
                   hover:bg-white border-none size-7 [&>svg]:size-4"
                  />
                  <CarouselNext
                    className="right-2 bg-white/80
                   hover:bg-white border-none size-7 [&>svg]:size-4"
                  />
                </>
              )}
            </Carousel>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
              No image provided
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3">
          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Heart className="size-4" />
              <MessageCircle className="size-4 transform -rotate-90" />
              <Repeat2 className="size-4.5 " />
              <Send className="size-4" />
            </div>

            {/* Pagination dots - Centered absolute */}
            {images && images.length > 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`size-1.5 rounded-full transition-colors ${
                      i === current ? "bg-blue-500" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
            <Bookmark className="size-4.5" />
          </div>

          {/* Caption */}
          <div className="text-sm">
            <span className="font-semibold mr-2">{handle}</span>
            {!text ? (
              <span className="text-muted-foreground italic">Nothing yet…</span>
            ) : text.length > CHAR_LIMIT && !isExpanded ? (
              <>
                {text.slice(0, CHAR_LIMIT)}...{" "}
                <span
                  onClick={() => setIsExpanded(true)}
                  className="text-muted-foreground cursor-pointer"
                >
                  more
                </span>
              </>
            ) : (
              text
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
