import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pwaUrl = searchParams.get("url");

  if (!pwaUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Example: web+bgclive://profile/123
  // Decoded %s becomes the full string
  try {
    const url = new URL(pwaUrl.replace("web+bgclive://", "https://app/"));
    const path = url.pathname; // /profile/123

    if (path.startsWith("/profile/")) {
      const id = path.split("/")[2];
      return NextResponse.redirect(new URL(`/users/${id}`, request.url));
    }

    if (path.startsWith("/thread/")) {
      const id = path.split("/")[2];
      return NextResponse.redirect(new URL(`/forums/thread/${id}`, request.url));
    }
  } catch (e) {
    console.error("PWA Handler Error:", e);
  }

  return NextResponse.redirect(new URL("/", request.url));
}
