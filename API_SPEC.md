# Coordinator API Specification

Version: 1.0.0  
Base URL (dev): `http://localhost:3001`

## Authentication

All endpoints except `/health` require authentication via GitHub OAuth.

**Header**: `Authorization: Bearer <github-token>`

## Endpoints

### Health Check

#### `GET /health`

Check API health and status.

**Auth Required**: No

**Response** `200 OK`:
```json
{
  "status": "ok",
  "timestamp": "2026-01-16T20:30:00Z",
  "version": "1.0.0"
}
```

---

### Get Current World

#### `GET /api/worlds/current`

Retrieve the currently deployed world configuration.

**Auth Required**: Yes

**Response** `200 OK`:
```json
{
  "worldName": "floating-isles",
  "displayName": "Floating Isles Adventure",
  "deployedAt": "2026-01-16T15:20:00Z",
  "commitSha": "a1b2c3d",
  "commitUrl": "https://github.com/ColeGendreau/Minecraft-1.0/commit/a1b2c3d",
  "spec": {
    "worldName": "floating-isles",
    "theme": "...",
    "generation": { ... },
    "rules": { ... }
  }
}
```

**Response** `404 Not Found`:
```json
{
  "error": "No world currently deployed"
}
```

---

### List Worlds

#### `GET /api/worlds`

List all world creation requests and deployed worlds.

**Auth Required**: Yes

**Query Parameters**:
- `status` (optional): Filter by status
  - Values: `pending`, `planned`, `building`, `pr_created`, `deployed`, `failed`
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response** `200 OK`:
```json
{
  "worlds": [
    {
      "id": "req_abc123",
      "worldName": "desert-survival",
      "displayName": "Desert Survival Challenge",
      "status": "deployed",
      "requestedBy": "ColeGendreau",
      "requestedAt": "2026-01-16T10:00:00Z",
      "deployedAt": "2026-01-16T10:15:00Z",
      "prUrl": "https://github.com/ColeGendreau/Minecraft-1.0/pull/42"
    },
    {
      "id": "req_def456",
      "worldName": null,
      "displayName": null,
      "status": "pending",
      "requestedBy": "ColeGendreau",
      "requestedAt": "2026-01-16T20:30:00Z",
      "deployedAt": null,
      "prUrl": null
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Create World Request

#### `POST /api/worlds`

Submit a new world creation request.

**Auth Required**: Yes

**Request Body**:
```json
{
  "description": "I want a challenging survival world with lots of mountains and caves. Make it hard difficulty with no keep inventory.",
  "difficulty": "hard",
  "gameMode": "survival",
  "size": "large"
}
```

**Fields**:
- `description` (required): Natural language description (10-2000 chars)
- `difficulty` (optional): `peaceful`, `easy`, `normal`, `hard`
- `gameMode` (optional): `survival`, `creative`, `adventure`
- `size` (optional): `small`, `medium`, `large` (hint for world generation)

**Response** `202 Accepted`:
```json
{
  "id": "req_xyz789",
  "status": "pending",
  "message": "World creation request submitted successfully",
  "estimatedTime": "2-3 minutes"
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "Invalid request",
  "details": {
    "description": "Description must be between 10 and 2000 characters"
  }
}
```

**Response** `429 Too Many Requests`:
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 5 requests per hour",
  "retryAfter": 1200
}
```

---

### Get World Request

#### `GET /api/worlds/:id`

Retrieve details of a specific world creation request.

**Auth Required**: Yes

**Path Parameters**:
- `id`: Request ID (e.g., `req_abc123`)

**Response** `200 OK` (Pending):
```json
{
  "id": "req_abc123",
  "status": "pending",
  "requestedBy": "ColeGendreau",
  "requestedAt": "2026-01-16T20:30:00Z",
  "updatedAt": "2026-01-16T20:30:05Z",
  "request": {
    "description": "I want a challenging survival world...",
    "difficulty": "hard",
    "gameMode": "survival",
    "size": "large"
  },
  "worldSpec": null,
  "prUrl": null,
  "error": null
}
```

**Response** `200 OK` (Planned):
```json
{
  "id": "req_abc123",
  "status": "planned",
  "requestedBy": "ColeGendreau",
  "requestedAt": "2026-01-16T20:30:00Z",
  "updatedAt": "2026-01-16T20:30:45Z",
  "request": { ... },
  "worldSpec": {
    "worldName": "mountain-caves",
    "displayName": "Mountain Caves Survival",
    "theme": "...",
    "generation": { ... },
    "rules": { ... }
  },
  "prUrl": null,
  "error": null
}
```

**Response** `200 OK` (PR Created):
```json
{
  "id": "req_abc123",
  "status": "pr_created",
  "requestedBy": "ColeGendreau",
  "requestedAt": "2026-01-16T20:30:00Z",
  "updatedAt": "2026-01-16T20:32:00Z",
  "request": { ... },
  "worldSpec": { ... },
  "prUrl": "https://github.com/ColeGendreau/Minecraft-1.0/pull/45",
  "commitSha": "f5e4d3c",
  "error": null
}
```

**Response** `200 OK` (Failed):
```json
{
  "id": "req_abc123",
  "status": "failed",
  "requestedBy": "ColeGendreau",
  "requestedAt": "2026-01-16T20:30:00Z",
  "updatedAt": "2026-01-16T20:31:00Z",
  "request": { ... },
  "worldSpec": { ... },
  "prUrl": null,
  "error": {
    "message": "AI planner failed to generate valid WorldSpec",
    "details": "Invalid JSON schema: generation.strategy is required"
  }
}
```

**Response** `404 Not Found`:
```json
{
  "error": "World request not found"
}
```

---

### Retry Failed Request

#### `POST /api/worlds/:id/retry`

Retry a failed world creation request.

**Auth Required**: Yes (must be original requester or admin)

**Path Parameters**:
- `id`: Request ID of failed request

**Response** `202 Accepted`:
```json
{
  "id": "req_abc123",
  "status": "pending",
  "message": "Request resubmitted for processing"
}
```

**Response** `400 Bad Request`:
```json
{
  "error": "Cannot retry request with status: deployed"
}
```

---

## Status Lifecycle

```
pending → planned → building → pr_created → deployed
           ↓          ↓           ↓
         failed     failed      failed
```

**Status Definitions**:
- `pending`: Request received, queued for AI planning
- `planned`: AI generated WorldSpec, queued for builder
- `building`: Builder generating artifacts
- `pr_created`: PR created, waiting for CI/CD deployment
- `deployed`: World is live in production
- `failed`: Error occurred, see error field

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Short error message",
  "details": "Detailed explanation (optional)",
  "code": "ERROR_CODE (optional)"
}
```

**Common HTTP Status Codes**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid auth token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily down

---

## Rate Limits

**Per User**:
- World creation: 5 requests per hour
- List/Get operations: 100 requests per minute

**Headers** (included in all responses):
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1705432800
```

---

## Webhooks (Future)

*Not implemented in Phase 2*

Future support for webhooks to notify external systems when:
- World request status changes
- New world is deployed
- Request fails

---

## Testing

**Mock Mode**: Set `MOCK_AI=true` to use stubbed AI responses for testing without API costs.

**Test Endpoint**: `GET /api/test/reset` - Reset database (dev only)




