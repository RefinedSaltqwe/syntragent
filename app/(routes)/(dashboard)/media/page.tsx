"use client";
import MediaList from "@/components/schedule/media-list";
import { Button } from "@/components/ui/button";
import { useHandleDialog } from "@/hooks/use-confirm-dialog";
import { deleteImages } from "@/lib/api/media";
import { ImageObject, ImagesResponse } from "@/types/post.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

type MediaProps = {
  ca: string;
};

const Media: React.FC<MediaProps> = () => {
  const queryClient = useQueryClient();
  const { handleDialog, proceed } = useHandleDialog();
  const [images, setImages] = useState<ImageObject[]>([]);
  const imgCount = images.length;
  const { data: fetchedImages = [] } = useQuery({
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

  const deleteImagesMutation = useMutation({
    mutationFn: deleteImages,

    onSuccess: async (_, variables) => {
      const deletedImagesCount = variables.ids.length;

      toast.success(
        `${deletedImagesCount} ${deletedImagesCount > 1 ? "images" : "image"} deleted successfully`,
      );

      await queryClient.invalidateQueries({
        queryKey: ["images"],
      });
      setImages([]);
    },

    onError: (error) => {
      console.error("Failed to delete images", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete images",
      );
    },
    onSettled() {
      handleDialog({
        open: false,
        title: "",
        description: "",
        proceed: false,
        pending: false,
      });
    },
  });

  const deleteImage = function () {
    handleDialog({
      open: true,
      title: `Delete ${imgCount} ${imgCount > 1 ? "images" : "image"}`,
      description: `Are you sure you want to delete ${imgCount > 1 ? "these images" : "this image"}?`,
    });
  };

  useEffect(() => {
    if (proceed) {
      deleteImagesMutation.mutate({
        ids: images.map((img) => img.key),
      });
      handleDialog({
        open: true,
        title: `Delete ${imgCount} ${imgCount > 1 ? "images" : "image"}`,
        description: `Are you sure you want to delete ${imgCount > 1 ? "these images" : "this image"}?`,
        pending: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proceed]);
  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto w-full h-full">
        <header className="flex items-center justify-between px-6 pt-4 pb-2">
          <div className="flex flex-row items-center align-middle">
            <h1 className="text-xl font-semibold">Media</h1>
            <button
              className="ml-6 text-[13px] font-medium cursor-pointer text-xl"
              onClick={() =>
                setImages((prev) => {
                  if (prev.length > 0) {
                    return [];
                  }
                  return fetchedImages;
                })
              }
            >
              {images.length > 0 ? "Unselect all" : "Select all"}
            </button>
          </div>
          <div className="flex items-center gap-4">
            {images.length > 0 && (
              <Button variant={"destructive"} onClick={deleteImage}>
                <Trash className="size-4" />
                Delete
              </Button>
            )}
            <Button>
              <Plus className="size-4" />
              Upload Images
            </Button>
          </div>
        </header>
        <div className="flex flex-col overflow-hidden bg-background">
          <div className="h-[calc(100vh-100px)]">
            <div className="flex-1 pt-4 h-full">
              <MediaList
                mode="manage"
                columns="grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                imageSize="aspect-square w-full"
                height="h-[90vh]"
                setImagesToBeDeleted={setImages}
                imagesToBeDeleted={images}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Media;
