# DevStak Social Dashboard Upgrade

## Included
- Responsive social dashboard with current user avatar/profile identity.
- Platform active-user count, accepted connection count, incoming friend requests, and community-feed post count.
- Community feed with text posts, likes/unlikes, comments, and profile links.
- People-you-may-know list with friend-request actions.
- Incoming friend-request acceptance directly from dashboard.
- Basic member profile pages; post content is shown only to accepted connections.
- MongoDB `Post` model and authenticated API routes for posts, likes, comments, and discovery.

## Setup
1. Extract the archive.
2. Configure the existing `.env.local` values for MongoDB and authentication (plus Cloudinary if using avatar uploads).
3. Run `npm install`.
4. Run `npm run build`.
5. Run `npm run dev`.

Posts are visible to the author and their accepted connections. Platform user counts include active regular user accounts and exclude administrators. Profile picture uploads use the existing profile/avatar integration.

## Notes
- This update adds social-post functionality to the existing private messaging app; it does not add public self-registration.
- Review the app's privacy policy before expanding post visibility beyond accepted connections.
