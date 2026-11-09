# NexusHQ decisions

Decisions made while building, with the reason. Later phases should follow these unless a new entry supersedes them.

## D001. Separate API process, not Next.js route handlers

The web app renders. Fastify owns authorization, WebSockets, webhooks, and the public API. Putting those in Next route handlers would split the trust boundary across serverless functions and make long-lived collaboration sockets awkward. One API process is easier to audit: every endpoint lives under `apps/api` and uses the same authz preHandler.

## D002. PostgreSQL is the system of record; local fallback is embedded Postgres

The product needs stored generated `tsvector` columns, `bytea` for Yjs, transactional idempotency for Stripe, and row-level immutability rules for the audit log. Prisma cannot express that schema faithfully on SQLite (no enums was solvable; generated tsvector, bytea behavior, and rules are not).

Quick local dev when Docker is unavailable uses PGlite in socket mode so Prisma still speaks Postgres. `docker compose` remains the default because it also provides Redis. SQLite was rejected here rather than shipped as a second, lossy schema.

## D003. String unions in the database, Zod at the edge

Roles, plans, task status, and channel type are strings in Postgres and closed unions in `packages/shared`. Adding a status does not require an enum migration. Invalid values never enter the database because every route parses input with Zod first.

## D004. Organization id is part of the query, not just the middleware

Middleware rejects non-members, but each service method also takes `orgId` and puts it in the `where` clause. A handler bug should return an empty result, not another tenant's row. Cross-tenant tests call real routes to prove this.

## D005. 404 for foreign resources, 403 for missing permission inside the org

If the caller is not in the organization that owns the row, the response is 404. If they are a member without the permission, the response is 403. This avoids confirming that a guessed id exists in another tenant.

## D006. Cookie sessions for the browser, bearer keys for the public API

Access JWT in an httpOnly cookie (`nhq_session`, 15 minutes) plus a rotating refresh cookie (`nhq_refresh`, 30 days). CSRF uses the double-submit cookie `nhq_csrf` plus an Origin allowlist. API keys are `Authorization: Bearer nhq_live_...` and do not use cookies, so they are not subject to CSRF. Keys store only a SHA-256 hash and a non-secret prefix for display.

## D007. Refresh token families

Each login creates a `familyId`. Rotation keeps the family and revokes the presented token. Presenting a revoked token revokes the whole family. That cuts off a stolen token once the legitimate client rotates.

## D008. Guest access is an explicit grant

Members see all public workspace content. Guests see a project, document, or channel only when a `ResourceGrant` or `ChannelMember` row exists. Task visibility for a guest follows the project grant. Task edit for a guest is limited to tasks assigned to them. Private channels are invisible without membership, including to regular members.

## D009. Yjs for documents, REST for everything else

Document body state is a Yjs update log stored as one encoded state vector. Clients speak a small JSON WebSocket protocol, not a public CRDT port, so the server can authorize each update. Titles, tree position, comments, and versions stay on REST. Chat messages are stored through REST and then broadcast, so mentions, validation, and search cannot be bypassed by a socket frame.

## D010. Full-text in Postgres, semantic rerank on permitted rows

`SearchDocument` holds plain text. A generated `tsvector` answers the lexical query inside the caller's `orgId`. Embeddings rerank that candidate set. Chunks whose source fails a second permission check are removed before the prompt is built. The assistant is not given a tool that can query the database itself.

## D011. Fixed-width embeddings

Vectors are 64 numbers stored as JSON. The mock embedder is a deterministic hashing embedder. OpenAI `text-embedding-3-small` is used only when configured, and the result is reduced to 64 dimensions. This keeps local tests and production rows in one shape without requiring pgvector. At larger scale the next step is pgvector and an HNSW index; that is recorded as a follow-up, not a half-built option.

## D012. AI providers behind one interface

`AI_PROVIDER=openai|anthropic|mock`. Prompts are markdown files with a version in the path. Tests and local dev default to `mock`, which only restates supplied context. Missing API keys do not silently switch a production `openai` setting to mock; the process fails at startup if the selected provider is not configured. `mock` is always configured.

## D013. Plan limits are application checks, Stripe is the commercial source

Free, Pro, and Team limits live in `packages/shared` so the API and the UI show the same numbers. Stripe price ids map to Pro and Team. Webhooks are the only writer of paid plan state. The webhook handler is signature-verified and idempotent on event id. If Stripe env vars are absent, billing endpoints return `503 BILLING_NOT_CONFIGURED` and the rest of the product works on the Free plan.

## D014. Outgoing webhooks are queued and signed

The request path inserts a `WebhookDelivery` and enqueues a job. The worker signs the body and retries on a fixed schedule. Handlers do not call customer URLs inline.

## D015. Local mail spool when SMTP is unset

The worker's mailer is a real implementation with two transports. SMTP when `SMTP_URL` is set. Otherwise it writes `.eml` files under `var/mail`. Invites work in local dev by reading that file.

## D016. Uploads on local disk

Files go to `var/uploads/{orgId}/{id}`. Downloads are an authenticated API route that checks org membership and channel or document access. S3-compatible storage is a later swap behind the same `BlobStore` interface. The local store is complete: size limits, mime allowlist, and path traversal checks.

## D017. Platform admin is a user flag

`User.isPlatformAdmin` gates `/v1/admin/*`. It is not an organization role. Seed creates one admin. Organization owners cannot grant it.

## D018. Audit log immutability at the database

Postgres rules reject updates and deletes on `AuditLog`. The Prisma client is not given an update path in the audit service. Activity feed is a separate, user-facing table and is not the compliance record.

## D019. Web UI visual system

Familjen Grotesk for the interface, Source Serif 4 for long-form text. Spruce (`#12352F`) is the structural color. Copper (`#9A4516` / `#F0A36A`) is reserved for the primary action and focus. The landing page's signature element is a single doc–task–chat strip, not a card grid. Dark mode is a class on the document element. Components in `packages/ui` expose the same tokens the app uses.

## D020. Test database is Postgres

Unit tests that need no I/O run anywhere. Route tests and Playwright use `DATABASE_URL`. CI provides Postgres and Redis services. The mock AI provider is mandatory in tests.

## D021. Coverage scope

The 85% line-coverage gate applies to `packages/shared/src` and `apps/api/src`, excluding the generated Prisma client and the OpenAPI static document. UI components are covered by Playwright on the critical paths rather than by a jsdom percentage that would reward render snapshots.

## D023. Zod 4

`fastify-type-provider-zod` validates with the Zod 4 core. Shared schemas and the API both depend on Zod 4 so the runtime parser and the TypeScript inference use the same objects.

## D024. Invite links in non-production responses

The invitation email always contains the accept URL. Outside production, the create-invitation response also includes `acceptUrl` so local development and tests can complete the flow without reading the mail spool. Production responses omit it.

## D025. Audit deletes only during organization removal

An `AuditLog` trigger raises on update and delete. Deleting an organization sets `nexushq.allow_audit_delete` for that transaction so the cascade can remove the tenant’s audit rows with the rest of the tenant. Application code has no general update or delete for the audit log.

## D022. No feature flags in code comments as TODOs

Flags that exist at launch (`ai.actions`, `docs.realtime`, `chat.threads`) are rows in `FeatureFlag`, defaulting to on, and are readable from `/v1/flags`. Unfinished ideas go in BUILD_LOG follow-ups, not in dead branches.
