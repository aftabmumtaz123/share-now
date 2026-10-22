# Social feed image upload and UI recommendations

## Implemented
- Post composer accepts an image plus optional text, with preview and remove controls.
- Server validates image MIME type and 8 MB maximum size before uploading to Cloudinary.
- Post records store the secure image URL and Cloudinary public ID.
- Feed renders uploaded post images responsively.
- Post text is optional when an image is attached.

## Required environment
Ensure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are configured on the server.

## Recommended front-page information architecture
- Keep the Home feed focused: compact welcome/profile row, post composer, feed, and a narrow right rail for friend requests and people you may know.
- Move platform-wide and personal statistics out of the main feed into a dedicated **Insights** page, with tabs for Overview, Connections, Requests, Posts, and Engagement. Keep only one or two compact counters on Home if desired.
- Use a consistent top bar with search, notifications, messages, and profile menu; on mobile, collapse navigation to a compact header and bottom navigation.
- Make feed cards prioritize author avatar/name, timestamp, content/media, then like/comment actions.
- Use a 2-column desktop layout (feed + right rail), a single-column tablet/mobile layout, and ensure image media never causes horizontal overflow.

## Verification
Run `npm run build`, then test image-only and text-plus-image posts, invalid file types, files over 8 MB, and missing Cloudinary configuration. Existing posts without images remain supported.
