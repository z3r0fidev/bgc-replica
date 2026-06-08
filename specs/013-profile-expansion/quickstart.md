# Quickstart: User Profile Expansion

## 1. Database Migration
```bash
cd backend
# Generate migration
alembic revision --autogenerate -m "expand profile schema"
# Apply migration
alembic upgrade head
```

## 2. Seed Test Data
Run the updated seed script to populate the new social fields for existing test personas.
```bash
cd backend
python scripts/seed_expanded_profiles.py --social
```

## 3. Implementation Verification

### Backend (Integration)
Run the new social profile integration tests:
```bash
cd backend
pytest tests/test_profiles_expansion.py
```

### Frontend (UI)
1.  **Tabbed Form**: Navigate to `/profile/edit`. Verify the 4 tabs: Identity, Lifestyle, Professional, Social.
2.  **Validation**: Try entering an invalid URL in the Social tab; verify the error message appears.
3.  **Privacy**: Change "Occupation" privacy to "Private". Logout and view the profile as an anonymous user; verify the occupation is hidden.
4.  **Discovery**: Navigate to the Search/Discovery page. Filter by "Looking For: Networking"; verify matching profiles appear.

## 4. Key Components
- `ExtendedProfileForm`: The main multi-tab wrapper.
- `PrivacyToggle`: Reusable component for per-field visibility settings.
- `SocialLinkInput`: Input component with iconic branding and URL validation.
