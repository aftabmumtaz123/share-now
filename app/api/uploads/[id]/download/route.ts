import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { FileAsset } from "@/lib/models";
import { requireUser } from "@/lib/auth";
import { canAccessConversation } from "@/lib/permissions";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(input: string) {
  const cleaned = (input || "download")
    .replace(/[\\/\r\n\0]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .trim();
  return cleaned || "download";
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireUser();
    await connectDB();
    const asset = await FileAsset.findById(params.id);
    if (!asset || asset.status !== "active") {
      return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
    }

    // Downloads are available only to users who can access the conversation.
    const conversation = await canAccessConversation(String(me._id), String(asset.conversationId));
    if (!conversation && me.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Access denied." }, { status: 403 });
    }

    const sourceUrl = cloudinary.url(asset.cloudinaryPublicId, {
      secure: true,
      resource_type: (asset.resourceType || "raw") as "image" | "raw" | "video",
      type: "upload",
    });
    const upstream = await fetch(sourceUrl, { cache: "no-store", redirect: "follow" });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ ok: false, error: "The stored file could not be retrieved." }, { status: 502 });
    }

    const filename = safeFilename(String(asset.originalFilename || "download"));
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
    const headers = new Headers({
      "Content-Type": String(asset.mimeType || "application/octet-stream"),
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store, max-age=0",
    });
    if (asset.sizeBytes) headers.set("Content-Length", String(asset.sizeBytes));
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
