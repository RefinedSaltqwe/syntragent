import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Meta Data Deletion Request:", body);

    // Meta sends a signed_request in production
    // You can decode and process it later

    const confirmationCode = crypto.randomUUID();

    return NextResponse.json({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to process deletion request",
      },
      { status: 500 },
    );
  }
}
