import { getInsforgeServerClient } from "@/lib/insforge-server";
import { ImageObject } from "@/types/post.type";
import { NextResponse } from "next/server";

type StorageListResponse = {
  data: ImageObject[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  nextActions?: string;
};

export async function GET() {
  try {
    const { insforge, userId } = await getInsforgeServerClient();

    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await insforge.storage.from("syntragent").list();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 401,
        },
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageData = [...((data as any)?.data ?? [])];
    //Filter Images by ownership
    const filteredImages = imageData.filter((img) => {
      if (img.key.split("/")[1] === userId) {
        return img;
      }
    });
    // Sorting images in descending order
    const images = filteredImages.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    const result = data as unknown as StorageListResponse;

    return NextResponse.json({
      images,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching photos: ", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}
