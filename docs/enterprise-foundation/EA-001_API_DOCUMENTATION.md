# EA-001 Enterprise Asset Registry — API Documentation

Base path: `/api/enterprise-assets`. All responses are JSON. All mutating endpoints accept an optional `actor` field (string) recorded on the audit trail; see [ADR-001](./ADR-001-enterprise-asset-registry.md#7-actor-is-caller-supplied-not-authenticated) for why this is caller-supplied, not authenticated. See the ADR for the full rationale behind every design choice referenced below.

## Asset types (seeded, V1)

| code | prefix | label |
|---|---|---|
| `ENTERPRISE` | `ENT` | Enterprise |
| `PRODUCT` | `PROD` | Product |
| `OPERATING_SYSTEM` | `OS` | Operating System |
| `SHARED_SERVICE` | `SVC` | Shared Service |
| `CAPABILITY` | `CAP` | Capability |
| `WORKSPACE` | `WS` | Workspace |
| `TEAM` | `TEAM` | Team |
| `AUTOMATION` | `AUTO` | Automation |
| `KNOWLEDGE_ASSET` | `KA` | Knowledge Asset |

Global IDs are `MO-<PREFIX>-<6-digit sequence>`, e.g. `MO-PROD-000001`. Permanent once assigned; never reused or reissued.

---

### `POST /api/enterprise-assets` — Create Asset

Body:
```json
{
  "asset_type_code": "PRODUCT",
  "name": "ELBOLD",
  "description": "Event marketplace, Vendor OS, and Customer Event OS.",
  "status": "active",
  "lifecycle_stage": "live",
  "owner": "Founder",
  "country": "GB",
  "business_domain": "events",
  "metadata": { "any": "json" },
  "actor": "founder"
}
```
Only `asset_type_code` and `name` are required. `status` defaults to `active`, `lifecycle_stage` defaults to `concept`, `metadata` defaults to `{}`.

- `201` — `{ "success": true, "data": <Asset> }`
- `400` — invalid payload or unknown `asset_type_code` — `{ "error": "..." }`

### `GET /api/enterprise-assets` — List Assets

Query params (all optional): `assetType`, `status`, `lifecycleStage`, `owner`, `businessDomain`, `country`, `includeArchived` (`true`/`false`, default `false`), `page` (default 1), `pageSize` (default 20, max 100), `sortBy` (`created_at` | `updated_at` | `name` | `global_id`, default `created_at`), `sortDir` (`asc` | `desc`, default `desc`).

- `200` — `{ "success": true, "data": [<Asset>, ...], "page": 1, "pageSize": 20, "total": 42 }`
- `400` — invalid query param

### `GET /api/enterprise-assets/search` — Search Assets

Same query params as List, plus required `q` (free-text search across name + description).

- `200` — same shape as List
- `400` — `q` missing, or any other invalid query param

### `GET /api/enterprise-assets/{globalId}` — Get Asset

- `200` — `{ "success": true, "data": <Asset> }`
- `404` — no asset with that global ID

### `PATCH /api/enterprise-assets/{globalId}` — Update Asset

Body: any subset of `name`, `description`, `status`, `lifecycle_stage`, `owner`, `country`, `business_domain`, `metadata`, plus optional `actor`. At least one updatable field is required. **`metadata` is replaced wholesale, not deep-merged** — send the full desired object.

- `200` — `{ "success": true, "data": <Asset> }`
- `400` — invalid payload, or no fields provided
- `404` — asset not found
- `500` — asset is archived (must be restored first) — error message explains this

### `POST /api/enterprise-assets/{globalId}/archive` — Archive Asset (soft delete)

Body (optional): `{ "actor": "founder" }`. Idempotent — archiving an already-archived asset returns it unchanged, no duplicate audit record.

- `200` — `{ "success": true, "data": <Asset> }` (`status: "archived"`, `archived_at` set)
- `404` — asset not found

### `POST /api/enterprise-assets/{globalId}/restore` — Restore Asset

Body (optional): `{ "actor": "founder" }`. Idempotent — restoring a non-archived asset returns it unchanged.

- `200` — `{ "success": true, "data": <Asset> }` (`status: "active"`, `archived_at: null`)
- `404` — asset not found

### `POST /api/enterprise-assets/{globalId}/relationships` — Create Relationship

The asset in the URL is always the relationship's **source**. Body:
```json
{ "target_global_id": "MO-SVC-000001", "relationship_type": "depends_on", "metadata": {}, "actor": "founder" }
```
`relationship_type` is an open vocabulary (not a closed enum) — see ADR-001's open items. Creating the same (source, target, relationship_type) triple twice updates its metadata rather than erroring (idempotent upsert) — and only the *first* call produces a `RelationshipCreated` audit record and event; a repeat call that merely updates metadata does not add a second one.

- `201` — `{ "success": true, "data": <Relationship> }`
- `400` — invalid payload, malformed global ID, or source === target
- `404` — source or target asset not found

### `GET /api/enterprise-assets/{globalId}/relationships` — List Relationships

Returns every relationship where the asset is either source or target.

- `200` — `{ "success": true, "data": [<Relationship>, ...] }`
- `404` — asset not found

### `POST /api/enterprise-assets/validate` — Validate Asset

Same body shape as Create, but never persists anything — for pre-flight validation. Also confirms `asset_type_code` exists.

- `200` — `{ "valid": true, "errors": [] }` or `{ "valid": false, "errors": ["..."] }`

---

## Limits

Enforced at both the API layer (`validation.ts`, returns a clean `400`) and the database layer (`CHECK` constraints, defense-in-depth for anything calling the RPC functions directly):

| Field | Limit |
|---|---|
| `name` | 1–200 characters, not blank |
| `description` | ≤ 2000 characters |
| `owner`, `business_domain` | ≤ 500 characters |
| `country` | exactly 2 uppercase letters (ISO 3166-1 alpha-2) |
| `relationship_type` | 1–100 characters, not blank |
| `metadata` (on either an asset or a relationship) | JSON object, ≤ 64KB serialized |

## Shapes

**Asset**
```ts
{
  id: string              // internal UUID
  global_id: string       // permanent, e.g. "MO-PROD-000001"
  asset_type_code: string
  name: string
  description: string | null
  status: 'active' | 'inactive' | 'archived'
  lifecycle_stage: 'concept' | 'building' | 'pilot' | 'live' | 'growing' | 'scaling' | 'deprecated' | 'retired'
  owner: string | null
  country: string | null       // ISO 3166-1 alpha-2, e.g. "GB"
  business_domain: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  archived_at: string | null
  created_by: string
  updated_by: string
}
```

**Relationship**
```ts
{
  id: string
  source_asset_id: string   // internal UUID, not global_id
  target_asset_id: string
  relationship_type: string
  metadata: Record<string, unknown>
  created_at: string
  created_by: string
}
```

## Audit and Events

Every mutation writes to `enterprise_asset_audit_log` (`action`, `actor`, `before`, `after`, `occurred_at`) — actions: `AssetCreated`, `AssetUpdated`, `AssetArchived`, `AssetRestored`, `RelationshipCreated`, `LifecycleChanged`. A `lifecycle_stage` change inside an `Update` call produces **both** an `AssetUpdated` record and a separate `LifecycleChanged` record.

Domain events land in `enterprise_asset_events` (`event_type`, `asset_id`, `payload`, `occurred_at`, `consumed_at`) for `AssetCreated`, `AssetUpdated`, `AssetArchived`, `RelationshipCreated`, `LifecycleChanged` — **not** `AssetRestored` (not in the spec's event list; see ADR-001 decision 4). Both tables have no API surface yet (no "List Audit" / "List Events" endpoint was requested); they are queryable directly for now.
