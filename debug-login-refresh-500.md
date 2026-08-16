[OPEN] Debug Session: login-refresh-500

- Symptom: User cannot log in. Terminal shows `POST /api/auth/refresh 500`.
- Scope: frontend auth bootstrap and backend refresh-token flow.
- Goal: collect runtime evidence for the refresh failure before changing business logic.

## Hypotheses

1. Refresh token user lookup fails after the super-admin auth refactor.
2. Persisted frontend tokens are stale and trigger refresh against an invalid session.
3. Redis refresh session exists, but the referenced user no longer resolves cleanly from DB.
4. Backend refresh flow throws while building the auth profile or institution payload.
5. Login succeeds, but the follow-up refresh request fails during app initialization.

## Evidence Log

- Pending instrumentation.
