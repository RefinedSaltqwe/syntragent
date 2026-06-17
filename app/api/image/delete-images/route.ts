import { getInsforgeServerClient } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { keys } = await request.json();

    const { insforge, userId } = await getInsforgeServerClient();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Promise.all(
      keys.map((key: string) =>
        insforge.storage.from("syntragent").remove(key),
      ),
    );

    return NextResponse.json(
      {
        message: "Images deleted successfully",
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
      },
      {
        status: 500,
      },
    );
  }
}
