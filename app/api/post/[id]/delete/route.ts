import { getInsforgeServerClient } from "@/lib/insforge-server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { insforge, userId } = await getInsforgeServerClient();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: deleteError } = await insforge.database
      .from("scheduled_posts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete post" },
        { status: 500 },
      );
    }
    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
