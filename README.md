# DevStak

A lightweight private messaging and file-sharing starter built entirely in Next.js (no separate Express backend).

## Included
- Next.js App Router, TypeScript, MongoDB/Mongoose
- Password-hash based credentials login with signed HTTP-only session cookie
- Secure first-admin provisioning script
- Admin dashboard and user creation API
- Six-digit connection codes and connection request API
- Direct/group messaging data models and protected message API
- Cloudinary server-side upload/deletion helpers and attachment API
- Responsive messaging UI with conversation search, message search, replies, soft-delete, and cursor-based message history
- No Socket.IO, no video uploads, no public registration

> This ZIP is a functional starter/MVP foundation, not a fully production-audited messaging product. Review the TODOs and complete the test checklist before inviting real users. Messaging uses ordinary HTTP requests, not realtime delivery. Socket.IO, online presence, typing indicators, read receipts, reactions, and attachment-to-message linking are not implemented in this build.

## Setup
1. Install Node.js 20+.
2. Extract the ZIP and run `npm install`.
3. Copy `.env.example` to `.env.local` and set MongoDB, a strong `AUTH_SECRET`, and Cloudinary credentials.
4. In MongoDB Atlas, allow access from your deployment environment and create a database user with least privilege.
5. Run `npm run admin:create` and enter the initial admin username and password. Never deploy with a default admin credential.
6. Run `npm run dev`, then open http://localhost:3000.
7. Deploy the app to Vercel and add the same environment variables in Project Settings.

## Security notes
- Passwords are hashed; plaintext passwords are never saved.
- Password show/hide is only an input convenience. Existing passwords cannot be retrieved; reset them instead.
- All sensitive API routes should be reviewed before production. Add a persistent rate limiter (e.g. managed platform/KV) before public exposure.
- Cloudinary upload size/type validation is enforced in the API. For larger uploads, consider a signed upload flow with strict upload presets.
- Direct conversations and group membership are checked server-side. Admin moderation access should be disclosed to users.
- This starter does not implement end-to-end encryption.
- Ensure your Cloudinary account's delivery settings match your privacy requirements. Public delivery URLs are not equivalent to access-controlled private files.

## Current API outline
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/POST /api/admin/users`
- `GET/POST /api/connections`
- `GET/POST /api/conversations`
- `GET/POST /api/conversations/[id]/messages`
- `POST /api/uploads`, `DELETE /api/uploads/[id]`
- `GET/POST /api/groups`

## Before production
- Add automated unit/integration tests for all role and membership boundaries.
- Add account disable/session revocation and admin edit/reset/deactivate endpoints.
- Add user-facing connection accept/reject controls and complete group administration UX.
- Add upload/deletion retry queue and reconciliation job for Cloudinary failures.
- Add cursor pagination, CSRF/origin checks appropriate to your auth setup, persistent rate limiting, audit logs, and monitoring.
- Run `npm run build` and test on a staging database before production.

## Messaging UI enhancements

The messaging experience includes a responsive inbox and conversation view, conversation/message search, cursor-based loading of older messages, replies, attachment sharing, and message actions. The messaging upgrade also supports:

- Editing your own text messages (saved to MongoDB with an edited timestamp).
- Emoji reactions (👍, ❤️, 😂, 😮, 😢, 🎉), with one reaction per emoji per user and toggle-to-remove behavior.
- Reaction counts and a highlighted state for reactions you have selected.
- Server-side conversation access checks for edit and reaction requests.

No Socket.IO dependency is added; this project remains a Next.js application using its existing API routes and database-backed message history.

## Profile pictures and chat sender identity

- Users can upload JPG, PNG, or WebP profile pictures from the Profile section (maximum 5 MB).
- Avatar files are stored in Cloudinary and the profile URL/asset ID are stored on the user record in MongoDB.
- Incoming group messages display the sender's name and profile image, with an initial fallback when no avatar is set.
- The avatar upload endpoint requires an authenticated session and validates file type and size.

Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` as usual.

## Profile customization update

The profile page now supports editing the display name and bio, uploading a profile photo and cover banner, and viewing the user's own post history beneath profile details. Profile edits are saved through `PATCH /api/profile`; photo/banner images are uploaded through `POST /api/profile/avatar` using the `kind` field (`avatar` or `banner`). Avatar images are limited to 5 MB and cover banners to 8 MB; both accept JPG, PNG, and WebP. Configure the existing MongoDB and Cloudinary environment variables before testing uploads.

The username and six-digit connection code remain read-only by design. Profile posts are loaded from the authenticated feed endpoint and filtered to the current user's posts.
