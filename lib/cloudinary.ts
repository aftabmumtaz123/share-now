import { v2 as cloudinary } from "cloudinary";
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
export { cloudinary };
export async function deleteCloudinaryAsset(publicId: string, resourceType: string) {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType as "image" | "raw" | "video", invalidate: true });
  return result.result === "ok" || result.result === "not found";
}
