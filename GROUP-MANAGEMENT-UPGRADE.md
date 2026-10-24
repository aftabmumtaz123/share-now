# DevStak Group Management Upgrade

## Included

- Redesigned `/admin/groups` overview with search, status filtering, group cards, member counts, and a dedicated create-group form.
- Clickable **Manage group** action for each existing group.
- New `/admin/groups/[id]` page with Members, Settings, and Activity tabs.
- Searchable current-member list and registered-user picker to add one or more members.
- Member removal with confirmation.
- Promote/demote moderators. Existing groups without a `moderators` field remain compatible; Mongoose supplies an empty list when no moderators are assigned.
- Edit group name, description, and image; archive/restore groups; and permanently delete groups with confirmation. Group image uploads use the existing Cloudinary configuration.
- Membership changes are synchronized to the associated group conversation's participant list.
- Persistent group activity records for creation, settings changes, archive/restore, member additions/removals, moderator role changes, and deletion.
- Server-side admin checks and input validation on all new admin endpoints.
- Permanent group deletion removes its associated conversation messages, conversation file records, conversations, and Cloudinary assets. If Cloudinary cleanup fails, the group is retained and deletion returns an error so the administrator can retry.
- Responsive desktop and mobile styling.

## New admin endpoints

- `GET /api/admin/groups/[id]`
- `PATCH /api/admin/groups/[id]`
- `DELETE /api/admin/groups/[id]`
- `POST /api/admin/groups/[id]/members` with `{ "userIds": ["..."] }`
- `DELETE /api/admin/groups/[id]/members` with `{ "userId": "..." }`
- `PATCH /api/admin/groups/[id]/members` with `{ "userId": "...", "role": "member" | "moderator" }`

All endpoints require an authenticated administrator session. No new environment variables or manual migration are required; the optional `moderators` field is backward-compatible. MongoDB creates the `GroupActivity` collection on first use.

## Verify locally

1. Install dependencies with `npm install`.
2. Run `npm run build`.
3. Sign in as an administrator and open **Groups**.
4. Open an existing group, add a registered user, remove a member, promote/demote a moderator, edit settings, archive/restore, and test group image upload, and test deletion with a group that has uploaded files. Open Activity to verify that administrative actions are recorded.
5. Verify member access and group conversations from a normal user account after membership changes.

Permanent deletion is destructive. Test with a non-production group first.
