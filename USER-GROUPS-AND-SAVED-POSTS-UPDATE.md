# User-side Groups and Saved Posts update

## Changes
- Reworked `/groups` into a searchable group directory with All / Active / Archived filters.
- Added member counts, group status, last-message preview/date when a group conversation has one, and responsive group cards.
- Group cards link active groups to the existing `/messages?group=<id>` route. Archived groups are visible but not directly openable from this directory.
- Added a Saved posts sidebar item and `/saved` page.
- Added save/unsave controls to feed posts, a `savedBy` field on the Post model, and an authenticated API route at `/api/posts/[id]/save`.

## Notes
- Saved posts are stored in MongoDB on the post document; existing posts work with an initially empty `savedBy` array.
- The user-side group directory only shows groups where the signed-in user is a member.
- This environment could not complete npm dependency installation, so `npm run build` could not be verified here. Run `npm install` and `npm run build` before deploying.
