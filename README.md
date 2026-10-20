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
- Responsive app shell and chat-oriented starter UI
- No Socket.IO, no video uploads, no public registration

> This ZIP is a functional starter/MVP foundation, not a fully production-audited messaging product. Review the TODOs and complete the test checklist before inviting real users. Messaging UI uses ordinary HTTP requests, not realtime delivery.

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
