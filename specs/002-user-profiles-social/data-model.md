# Data Model: User Profiles & Social Graph

## Extended Profile Models (SQLAlchemy)

### Profile
Extends the core `User` model with detailed attributes.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Reference to User.id |
| bio | Text | | User biography |
| height | String | | e.g., "5'10\"" |
| weight | Integer | | Weight in lbs |
| ethnicity | String | | Demographic category |
| body_type | String | | Physical build |
| roles | JSONB | | e.g., ["Mentor", "Socialite"] |
| interests | JSONB | | Array of interest tags |
| location_city | String | index | City name |
| location_state | String | index | State/Province |
| location_lat | Float | | Latitude |
| location_lng | Float | | Longitude |
| privacy_level | String | default="PUBLIC"| PUBLIC, FRIENDS, PRIVATE |
| last_active | DateTime | | For online status |

### Media
Represents photos and videos in the user's gallery.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| user_id | UUID | ForeignKey | Reference to User.id |
| url | String | | Public URL from Supabase Storage |
| storage_path | String | | Internal path in bucket |
| type | String | | IMAGE, VIDEO |
| is_primary | Boolean | default=False | Used for main avatar |
| created_at | DateTime | | Upload timestamp |

### Relationship (Social Graph)
Tracks connections between users.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| id | UUID | primary_key | Unique identifier |
| from_user_id | UUID | ForeignKey | Requester / Owner |
| to_user_id | UUID | ForeignKey | Recipient / Target |
| type | String | | FRIEND, FAVORITE, BLOCKED |
| status | String | | PENDING, ACCEPTED, REJECTED |
| created_at | DateTime | | Interaction timestamp |

### ProfileRating
Legacy 1-10 star rating system.

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| from_user_id | UUID | primary_key | Rater |
| to_user_id | UUID | primary_key | Rated user |
| score | Integer | check(1..10) | Numeric rating |
| created_at | DateTime | | Timestamp |

## Redis Indexing Schema

- **User Location Index**: `geo:users` (Geo Set) -> `GEOADD geo:users <lng> <lat> <user_id>`
- **User Age Index**: `index:user:age` (Sorted Set) -> `ZADD index:user:age <age> <user_id>`
- **Active Users**: `set:users:online` (Set) -> Member: `user_id` (TTL based)
- **Profile Cache**: `cache:profile:<user_id>` (Hash) -> Stores JSON representation
