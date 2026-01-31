# API Contracts: Personals Section

## Listings API

### GET `/api/personals/listings`
Fetch a paginated list of personals.

**Query Parameters:**
- `category`: string (optional) - Filter by category slug.
- `city`: string (optional) - Filter by city.
- `state`: string (optional) - Filter by state.
- `limit`: integer (default: 20)
- `cursor`: string (pagination)

**Response:** `PaginatedResponse[PersonalListing]`

---

### GET `/api/personals/categories`
Fetch the list of available navigation categories and their assets.

**Response:**
```json
[
  {
    "name": "Trans-X",
    "slug": "transx",
    "icon": "/assets/personals/icons/transX.png",
    "banner": "/assets/personals/banners/transxHeader.png"
  },
  ...
]
```
