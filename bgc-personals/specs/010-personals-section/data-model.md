# Data Model: Personals Section

## Entities

### PersonalListing (Extension of Profile)
A `PersonalListing` is a `Profile` that has been flagged for inclusion in the personals directory.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key (FK to User) |
| is_personal | Boolean | Flag on Profile to include in directory |
| category_slug | String | primary categorical tag in user metadata |
| posted_at | DateTime | timestamp of the personal ad creation/update |
| snippet | String | (Derived) First 150 chars of profile bio |

### Category (Metadata)
Categories are defined in code or a config file, mapped to the `metadata_json` of users.

| Field | Type | Description |
|-------|------|-------------|
| name | String | Display name (e.g. "Trans-X") |
| slug | String | URL slug (e.g. "transx") |
| icon_path | String | Path to the 32x32 PNG icon |
| banner_path | String | Path to the themed header banner |

## Relationships
- **User (1) <-> (1) Profile**: Existing relationship.
- **Profile (1) -> (N) Category**: Via categorical tagging in metadata.
