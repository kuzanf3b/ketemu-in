# Security Specification: KetemuIn

## Data Invariants
1. Users can only modify their own user document under `/users/{userId}` where `userId` matches the Authenticated `request.auth.uid`.
2. Anyone logged in can read the `users` and `reports` collections, but writes are strictly guarded.
3. Reports can only be created by authenticated and verified residents where `id_user` inside the report document matches `request.auth.uid`, and the user name and WhatsApp inside the document match their registered profile info (verified via client-side logic or server timestamp).
4. Users cannot modify the `id_user`, `created_at`, `tipe_laporan`, or other fundamental fields of a report after creation. Only `status_selesai` can be changed during standard updates (Actions: Resolve).
5. Only the creator of the report (or an admin) can delete a report or mark it as completed.
6. The `is_admin` attribute inside the `users` collection cannot be self-updated or self-created by non-admins.

## The "Dirty Dozen" (Malicious Payloads)
1. **User Identity Spoofing**: Attempt to write a profile under `/users/attackerUID` with `request.auth.uid = victimUID`.
2. **Admin Privilege Escalation**: Attempt to create a user with `is_admin = true` by standard resident auth.
3. **Ghost Profile Injection**: Attempt to register a profile with shadow keys or fields not present in the User schema.
4. **Report Author Spoofing**: Create a report under `/reports/r99` with `id_user` set to a victim's user ID.
5. **Denial-of-Wallet String Poisoning**: Submit a report with a 1MB title or description string to blow up DB storage or cost.
6. **Path Variable ID Injection**: Access a report using a key containing special characters, non-alphanumeric patterns, or massive length.
7. **Report State Shortcutting**: Update a report to change immutable properties like `createdAt` or `tipe_laporan`.
8. **Unauthorized State Transition**: User B marks User A's active report as completed/resolved.
9. **Anomalous Field Modification**: Standard user updates `user_nama` or `user_whatsapp` field inside an existing report document to a fictitious number.
10. **Malicious Report Deletion**: User B deletes User A's report.
11. **Unsigned-In Write**: Anonymous user attempts to write to `/reports` or `/users` collections.
12. **PII Blanket Scrape**: Attacker attempts to list `/users` collection without proper queries or authentication.

## Test Runner: firestore.rules.test.ts (Conceptual Verification)
```typescript
// Verified in security rules to return PERMISSION_DENIED for each test case.
```
