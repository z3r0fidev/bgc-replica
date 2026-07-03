import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?from=%2Fshare-target", request.url)
    );
  }

  try {
    const form = await request.formData();
    const title = (form.get("title") as string | null) || "";
    const text = (form.get("text") as string | null) || "";
    const url = (form.get("url") as string | null) || "";
    const file = form.get("file") as File | null;

    const content = [title, text, url].filter(Boolean).join("\n\n");

    let imageUrl: string | undefined;
    if (file && file.size > 0) {
      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadRes = await fetch(`${API_URL}/api/gallery/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });

      if (uploadRes.ok) {
        const uploaded = await uploadRes.json();
        imageUrl = uploaded.url;
      }
    }

    if (content || imageUrl) {
      await fetch(`${API_URL}/api/feed/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content || "Shared via PWA",
          image_url: imageUrl,
        }),
      });
    }
  } catch (e) {
    console.error("Share target error:", e);
  }

  return NextResponse.redirect(new URL("/feed", request.url));
}
