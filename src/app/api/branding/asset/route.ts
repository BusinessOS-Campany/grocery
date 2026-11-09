import { NextResponse } from "next/server";
import { downloadObject } from "@/shared/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const { data, contentType } = await downloadObject("store-assets", path);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}