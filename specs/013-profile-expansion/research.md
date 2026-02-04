# Implementation Research: User Profile Expansion

## Summary
This document outlines the technical decisions and best practices for expanding the BGC Replica profile system into a robust social hub.

---

## 1. Schema Strategy: Hybrid Columns vs JSONB

**Decision**: Implement searchable categorical fields as indexed columns; store unstructured/social links in JSONB.

- **Rationale**: 
    - **Performance**: FR-007 requires global search integration. Querying indexed columns is significantly faster than JSONB containment checks for large datasets.
    - **Flexibility**: Social media links and minor metadata change frequently. JSONB allows adding "LinkedIn" or "Threads" later without a migration.
- **Indexed Columns**: `display_name`, `relationship_status`, `industry`, `looking_for` (Array), `gender_identity`.
- **JSONB Metadata**: `social_links`, `hobbies_json`, `education_details`.

---

## 2. Granular Privacy Logic

**Decision**: Store a per-field privacy map in a `privacy_settings` JSONB column.

- **Rationale**: Allows users to hide their "Industry" while keeping "Relationship Status" public.
- **Structure**: 
  ```json
  {
    "birthdate": "PRIVATE",
    "relationship_status": "PUBLIC",
    "occupation": "FRIENDS_ONLY"
  }
  ```
- **Implementation**: The `ProfileService` in the backend will accept the `current_user` and the `target_profile`, applying a masking filter based on the privacy map and friendship status before serialization.

---

## 3. Frontend Architecture (Multi-Tab Forms)

**Decision**: Modular `shadcn/ui` Tabs with individual form schemas.

- **Rationale**: 
    - **Form Fatigue**: Breaking 40+ fields into 4 tabs (Identity, Lifestyle, Professional, Social) improves completion rates.
    - **Performance**: Each tab will handle its own state and validation, preventing unnecessary re-renders of the entire profile form.
- **Validation**: Use `Zod` for strict URL validation on social links and date validation for birthdates.

---

## 4. Industry Standard Enums

**Standardized Sets**:
- **Relationship**: Single, In a Relationship, Married, Open, Complicated, Widowed.
- **Looking For**: Friendship, Networking, Dating, Activity Partners, Casual.
- **Education**: High School, Associate, Bachelor, Master, Doctorate, Vocational.
- **Privacy Levels**: PUBLIC, FRIENDS_ONLY, PRIVATE.

---

## 5. Alternatives Considered

- **Pure JSONB Profile**: Rejected because search performance for connection intents (FR-007) would degrade as the user base grows.
- **Single Flat Table**: Rejected because it creates "sparse" rows with many NULL values and requires a migration for every new social network link added.
