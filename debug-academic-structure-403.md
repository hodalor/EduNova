# Debug Session: academic-structure-403

Status: [OPEN]

## Symptom
- Academic structure screens fail with `403` on structure load and on creating groups/classes.
- User sees `Unable to create level or class.`

## Expected
- Institution admins should be able to load and create academic groups, periods, and offerings consistently.

## Falsifiable Hypotheses
1. Frontend is calling the wrong academics base path or missing the required institution header.
2. Super-admin or institution-admin requests are reaching auth middleware with the wrong institution context and are rejected with `403`.
3. Academics routes are mounted under `/api/v1/...` while frontend is hitting `/api/...`, causing inconsistent middleware behavior.
4. The UI is sending payload fields that do not match backend expectations, but the error is surfacing as a generic `403`.
5. The current user role/session in the browser is stale or mismatched, so writes are blocked even though the page is visible.

## Plan
1. Instrument frontend request path for academics structure and create-group.
2. Instrument backend academics middleware/controller entry to capture role, institution, path, and payload.
3. Reproduce once and read debug logs.
4. Confirm the exact failing hypothesis.
5. Apply the minimal fix and verify.

## Evidence
- Pre-fix logs showed `403` on `GET /api/academics/structure` and `POST /api/academics/groups`.
- Debug logs captured `blockSuperAdminInstitutionAccess` rejecting super-admin requests before controller execution.
- Debug logs showed `req.institutionId` resolving to `platform` even when `x-institution-id` contained a real school id.
- After the auth/privacy fix, direct reproduction exposed a second issue: `404 Route not found: /api/academics/...`.
- Backend route mount confirmed academics lives under `/api/v1/academics`, while frontend API calls were using `/api/academics`.

## Hypothesis Status
- H1 frontend path or headers are wrong: confirmed in part; headers were sent, but route path was inconsistent.
- H2 institution context is mismatched in auth middleware: confirmed.
- H3 `/api` vs `/api/v1` route usage is inconsistent: confirmed.
- H4 payload mismatch: rejected by direct successful create tests.
- H5 stale browser session: not needed to explain the reproduced failure.

## Fix Applied
- Updated `resolveInstitution` so super-admin requests prefer the selected school scope from request headers/body/query instead of forcing `platform`.
- Updated `blockSuperAdminInstitutionAccess` so super admins can access institution endpoints when scoped to a real school, and get a clear message when unscoped.
- Updated frontend academics API paths to use `/v1/academics/...` consistently.

## Verification
- `GET /api/v1/academics/structure` with super-admin token plus `x-institution-id` now returns `200`.
- `POST /api/v1/academics/groups` with super-admin token plus `x-institution-id` now returns `201`.
- End-to-end chain now succeeds:
  - group/level create `201`
  - period/semester create `201`
  - offering/course create `201`
- Unscoped super-admin request now returns a clear `403` message: `Select a school scope before accessing institution data.`
