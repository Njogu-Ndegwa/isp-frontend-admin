# Backend API Change Requests

This file tracks pending changes that need to be implemented on the backend API before the corresponding frontend features go live.

---

## [PENDING] Portal Settings — `show_plan_speed` field

**Date requested:** 2026-05-11  
**Priority:** Medium  
**Feature:** Allow ISP operators to hide the speed label on captive portal plan cards.

### What's needed

Add a new boolean column `show_plan_speed` to the `portal_settings` table (or equivalent model), defaulting to `true`.

### Database migration

```sql
ALTER TABLE portal_settings
  ADD COLUMN show_plan_speed BOOLEAN NOT NULL DEFAULT TRUE;
```

### API changes

#### `GET /portal/settings`

Include the new field in the response payload:

```json
{
  "settings": {
    ...
    "show_plan_speed": true
  }
}
```

#### `PUT /portal/settings`

Accept and persist the field when included in the request body:

```json
{
  "show_plan_speed": false
}
```

No validation beyond boolean type check required. Omitting the field should leave the existing value unchanged (standard partial-update behaviour).

#### `POST /portal/settings/reset`

Reset `show_plan_speed` to its default value of `true` when resetting all portal settings to defaults.

### Why

Some ISP operators prefer not to advertise raw speeds on the public captive portal — e.g. when speeds vary by location, when they want to avoid comparisons, or when the plan is sold on duration/data cap rather than speed. The toggle is already wired up in the admin UI; it is just awaiting this backend field.

### Frontend status

- `PortalSettings` type and `UpdatePortalSettingsRequest` type: ✅ updated
- Admin toggle in **Portal Customization → Features**: ✅ added
- `PortalPreview` conditionally hides speed row: ✅ done
- Demo mode default (`show_plan_speed: true`): ✅ seeded

---
