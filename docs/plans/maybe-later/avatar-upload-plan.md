# Avatar Upload Plan

## Current status

Status: **maybe later**.

Reason: profile pages currently support editing a raw `avatar_url`, and the site header renders that URL, but the planned Supabase Storage upload flow and dedicated avatar uploader component are not implemented. The active product direction moved first toward generic workspace-file storage and thumbnails, so this avatar-specific plan is parked until profile media becomes a priority.

1. Create a Supabase Storage bucket for avatars.
- Recommended bucket name: `avatars`
- Prefer storing one stable object per user, for example:
  - `avatars/{userId}/avatar`
- Keep the bucket public only if profile avatars are acceptable as public assets.
- If you want stricter privacy, use a private bucket and signed URLs instead.

2. Add Storage policies in Supabase.
- Authenticated users can upload only into their own folder.
- Authenticated users can update/delete only their own avatar object.
- If the bucket is public:
  - allow public read
- If the bucket is private:
  - do not allow public read
  - plan to generate signed URLs in app code

3. Decide what to store in `public.profiles.avatar_url`.
- Recommended: store the storage object path, not a transient URL.
- Example:
  - `9986c93b-1658-4fec-8a43-a0335531d834/avatar`
- This keeps the app flexible if you switch between public URLs and signed URLs later.

4. Add server-side avatar URL resolution.
- Extend [src/lib/auth.ts](/K:/_proj-26/ai/codex/qs/src/lib/auth.ts) so it can turn the stored avatar path into a usable image URL.
- If the bucket is public:
  - build a public URL from the storage path
- If the bucket is private:
  - generate a signed URL on the server
- Keep [src/types/auth.ts](/K:/_proj-26/ai/codex/qs/src/types/auth.ts) using `avatarUrl` for rendering, while retaining the stored path internally where needed.

5. Add a browser-side upload helper.
- Create a small helper such as:
  - `src/lib/supabase/storage-client.ts`
- Use the existing browser Supabase client to upload files directly from the client.
- Prefer `upsert: true` so the avatar can be replaced at a stable path.

6. Add a profile avatar uploader component.
- Create a component such as:
  - `src/components/profile/avatar-upload-field.tsx`
- Responsibilities:
  - file picker
  - client-side validation
  - upload progress / pending state
  - upload error message
  - image preview after successful upload
- Validate:
  - image MIME types only
  - reasonable max size, for example 2–5 MB

7. Integrate the uploader into the profile page.
- Extend [src/components/profile/profile-form-card.tsx](/K:/_proj-26/ai/codex/qs/src/components/profile/profile-form-card.tsx)
- Replace raw `avatar_url` text input with:
  - avatar preview
  - upload control
  - optional “Remove avatar” action
- Keep the profile form responsible for the rest of the profile fields.

8. Update the profile save flow.
- Extend [src/app/[locale]/(app)/profile-actions.ts](/K:/_proj-26/ai/codex/qs/src/app/[locale]/(app)/profile-actions.ts)
- Accept the uploaded storage path from the form submission and persist it into `profiles.avatar_url`.
- Continue using the existing localized success/error redirect flow.

9. Handle avatar replacement cleanly.
- Recommended approach:
  - always upload to a stable path like `{userId}/avatar`
  - use `upsert: true`
- This avoids old orphaned avatar files and simplifies header rendering.
- If you later need cache-busting:
  - append a timestamp query string when rendering
  - or store an `updated_at` based version hint

10. Add avatar removal.
- Provide a “Remove avatar” action on the profile page.
- On removal:
  - delete the storage object
  - set `profiles.avatar_url` to `null`
- Make sure the header falls back to initials when no image exists.

11. Reuse the avatar in the existing UI.
- [src/components/site-header.tsx](/K:/_proj-26/ai/codex/qs/src/components/site-header.tsx) already supports `Avatar src`
- Once `avatarUrl` is resolved from storage, the header will automatically display the uploaded image.
- Optionally show the larger avatar preview on the profile page too.

12. Add localized strings for avatar UI.
- Extend [src/lib/i18n/dictionaries.ts](/K:/_proj-26/ai/codex/qs/src/lib/i18n/dictionaries.ts)
- Add labels/messages for:
  - upload avatar
  - remove avatar
  - invalid file type
  - file too large
  - upload failed
  - upload in progress

13. Add tests.
- Unit/behavior level:
  - validate that non-image files are rejected
  - validate profile form handles uploaded avatar path
- E2E level:
  - signed-in user uploads avatar
  - avatar appears in profile view
  - avatar appears in header
  - avatar removal falls back to initials
- For CI, keep binary upload tests moderate in size and use the dedicated Supabase test project.

14. Decide on image optimization later.
- First version can store the original file directly.
- Later improvements:
  - image resize before upload
  - crop UI
  - background processing for thumbnails
- Do not block the first implementation on these enhancements.

15. Recommended implementation order in this repo.
1. Create bucket and Storage policies in Supabase.
2. Add localized avatar UI copy.
3. Add client upload helper and uploader component.
4. Replace the profile page avatar URL text field with the uploader.
5. Save the storage path into `profiles.avatar_url`.
6. Resolve avatar URL in [src/lib/auth.ts](/K:/_proj-26/ai/codex/qs/src/lib/auth.ts).
7. Verify header rendering.
8. Add removal flow.
9. Add Playwright coverage.

16. Recommended default for this project.
- Use a public `avatars` bucket initially.
- Store the storage path in `profiles.avatar_url`.
- Upload from the client with `upsert: true`.
- Resolve to a public URL when building the authenticated user object.
- Add private-bucket/signed-URL support only if product requirements actually need it.
