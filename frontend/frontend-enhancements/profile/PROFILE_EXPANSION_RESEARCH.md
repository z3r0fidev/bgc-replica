# User Profile Expansion Research & Analysis

**Date:** December 24, 2025
**Context:** BGC Replica Social Profile Modernization

## 1. Executive Summary
To transform BGC Replica from a directory-centric platform into a robust social network, the user profile must evolve beyond basic physical attributes. This research outlines the recommended fields to allow users to express their identity, lifestyle, and professional background, thereby facilitating deeper community connections and more accurate user discovery.

---

## 2. Core Profile Modules & Recommended Fields

### Module A: Identity & Demographics (The "Basics")
- **Display Name**: Custom name shown on the profile (different from the immutable `@username`).
- **Pronouns**: Dropdown for modern inclusivity (He/Him, She/Her, They/Them, Custom).
- **Birthdate**: Essential for age verification and calculation. *Option to show/hide exact year.*
- **Gender Identity**: Expanded options (Cis-male, Cis-female, Trans-feminine, Trans-masculine, Non-binary, Genderqueer).

### Module B: Lifestyle & Intent (The "Social" Connection)
- **Relationship Status**: Single, In a Relationship, Married, Open Relationship, Widowed.
- **Looking For**: Multi-select (Friendship, Networking, Long-term Dating, Casual Dating, Activity Partners).
- **Smoking/Drinking Habits**: Categorical (Never, Socially, Regularly, Quitting).
- **Dietary Preferences/Lifestyle**: Vegan, Keto, Fitness-centric, etc.
- **Pets**: Dog owner, Cat owner, etc.

### Module C: Professional & Education (The "Status")
- **Occupation**: Current job title.
- **Industry/Field**: Healthcare, Tech, Arts, Finance, etc.
- **Education Level**: High School, Associate, Bachelor's, Master's, Doctorate.
- **University/Alma Mater**: For finding classmates or alumni.

### Module D: Interests & Hobbies (The "Engagement")
- **Music**: Multi-select tags (Pop, Rap, Rock, Classical, Indie).
- **Film/TV**: Genres (Action, Sci-Fi, Documentary, Reality).
- **Sports/Activity**: (Gym, Hiking, Gaming, Travel, Cooking).
- **Languages Spoken**: For multicultural discovery.

### Module E: Social Presence & Web Links (The "External" Graph)
- **Social Media Links**: Instagram, Twitter/X, TikTok, Snapchat, LinkedIn.
- **Personal Website/Portfolio**: For creators and professionals.

### Module F: Niche-Specific Physical Details (Advanced)
- **Eye Color & Hair Color**: Standard descriptive fields.
- **Tattoos/Piercings**: Yes/No toggle + description field.
- **Star Sign (Zodiac)**: High engagement field for social platforms.

---

## 3. UX & Functional Recommendations

### 1. Tabbed "Edit Profile" Interface
- Organize fields into logical groups (e.g., "Identity", "Lifestyle", "Professional", "Social") to prevent form fatigue.

### 2. Field-Level Privacy
- Users should have the ability to set privacy levels per field (Public, Friends Only, Only Me).

### 3. Progressive Profile Completion
- Implement a "Profile Strength" meter to encourage users to fill out more fields in exchange for higher visibility in discovery results.

### 4. Dynamic Discovery Integration
- All added categorical fields (e.g., Industry, Interests) should be mapped to the search filter system implemented in Phase 8.

---

## 4. Database Impact Analysis
- **Migration**: Requires expanding the `profiles` table or creating a JSONB `additional_data` column for flexible growth.
- **Performance**: High-usage fields (Relationship Status, Looking For) should be indexed for search performance.
