# Speckit.Specify Description: User Profile Expansion (Social Modernization)

## Feature Overview
Expand the User Profile system to include a comprehensive suite of social, lifestyle, and professional fields. This modernization effort aims to increase user engagement, facilitate community connections, and improve the discovery of like-minded individuals within the BGC Replica platform.

## Core Objectives
- **Modernized Identity**: Implement granular demographic and identity fields (Pronouns, Birthdate, Gender Identity).
- **Social Connective Tissue**: Add lifestyle intent fields (Relationship Status, Looking For) to help users find specific connections.
- **Robust Detail**: Introduce professional and educational background sections.
- **External Integration**: Provide dedicated slots for popular social media links.
- **Improved UX**: Transition the "Edit Profile" page to a multi-tabbed interface for better organization.

## Functional Requirements
- **FR-001**: Support for new identity fields: Display Name (string), Pronouns (dropdown), Birthdate (date), and Gender Identity (dropdown).
- **FR-002**: Lifestyle modules: Relationship Status (enum), Looking For (multi-select), and Habits (enum).
- **FR-003**: Professional/Education module: Occupation, Industry, Education Level, and University.
- **FR-004**: Social Links module: Validated input fields for Instagram, X, TikTok, and Personal Website.
- **FR-005**: Granular Privacy Controls: Per-field privacy settings (Public, Friends Only, Private).
- **FR-006**: Search Integration: Enable discovery filtering based on new categorical fields (e.g., filter by Relationship Status or Industry).

## Implementation Details
- **Frontend**: Update the `ProfileEdit` component using `shadcn/ui` Tabs and dynamic Form modules.
- **Backend**: Extend the `Profile` SQLAlchemy model in `backend/app/models/user.py` and update Pydantic schemas.
- **Migration**: Create an Alembic migration to add the new columns to the `profiles` table.

## Success Criteria
- **SC-001**: 100% of new fields are editable and persistent in the database.
- **SC-002**: Users can toggle field-level privacy with sub-200ms latency.
- **SC-003**: Average profile completion (fields filled) increases by 40% within 30 days of release.
- **SC-004**: Search filters successfully return results based on new social criteria.
