# Data Model: User Profile Expansion

## Entities

### ExtendedProfile (SQLAlchemy: `Profile` extension)

Represents the robust social identity of a user.

| Field | Type | Validation | Privacy Support | Searchable |
|-------|------|------------|-----------------|------------|
| `display_name` | String(255) | Min 2 chars | No (Public) | Yes |
| `pronouns` | String(50) | Enum selection | Yes | No |
| `birthdate` | Date | Must be > 18y | Yes (Partial) | Yes (Age) |
| `gender_identity` | Enum | Standardized set | Yes | Yes |
| `relationship_status`| Enum | Standardized set | Yes | Yes |
| `looking_for` | ARRAY(Enum) | Multi-select | Yes | Yes |
| `occupation` | String(255) | Max 255 chars | Yes | No |
| `industry` | Enum | Standardized set | Yes | Yes |
| `education_level` | Enum | Standardized set | Yes | No |
| `university` | String(255) | Max 255 chars | Yes | No |
| `social_links` | JSONB | URL format validation | Yes | No |
| `privacy_settings` | JSONB | Map of field -> level | N/A | No |

### Privacy Map (JSON Schema)

```json
{
  "type": "object",
  "properties": {
    "field_name": {
      "type": "string",
      "enum": ["PUBLIC", "FRIENDS_ONLY", "PRIVATE"]
    }
  }
}
```

---

## State & Transitions

### Profile Completion State
- **INCOMPLETE**: Basic fields missing.
- **BASIC**: Identity fields present.
- **SOCIAL**: Identity + Lifestyle fields present.
- **ROBUST**: 90%+ of all fields filled.

*Note: Completion state determines visibility in "Featured" discovery results.*

---

## Validation Rules

1. **Birthdate**: System must calculate age dynamically. If privacy is "PARTIAL", only show calculated age, not exact date.
2. **Social Links**: Must start with `https://` and match platform-specific regex (e.g., `instagram.com/.*`).
3. **Multi-select**: `looking_for` must contain at least 1 item if not NULL.
