# Production readiness — 2026-10-18

Status: release preparation implemented; **production approval remains blocked** by the staging checks below. No cluster, production database, GitHub workflow or external account was modified during local verification.

## Implemented

- Fixed the unclosed `teleport` in ShipmentView. `npm run check` checks JavaScript syntax and compiles templates in views, components and layouts. `npm run verify` runs those checks, frontend tests and the existing CSS build.
- Pull requests validate frontend and isolated backend tests. Image jobs depend on validation; the GitOps update requires all selected image groups to succeed. Pushes build images but **do not auto-promote**: GitOps updates require a manual workflow dispatch with `promote=true` in the `production` environment after staging approval. Configure required reviewers on that GitHub environment before using promotion. Root Maven changes invalidate backend builds. Manual service names are validated. Image manifests continue using commit SHA tags.
- ArgoCD's existing `k8s/02-services` path now contains a Kustomize application base with startup, readiness and liveness probes, backend network policies, the existing ingress and production profiles. Backend readiness uses `/actuator/health/readiness`; frontend readiness uses `/`.
- Production frontend and gateway have two replicas. Gateway HPA permits two to four. The `k8s` Minikube wrapper retains local image tags and one frontend/gateway replica. This does not make databases, brokers or every backend highly available.
- Production profiles validate schema and Flyway history, disable SQL logging and hide detailed health output. Existing application manifests no longer override schema validation with `ddl-auto=update`. Restore a staging database and resolve migration discrepancies before enabling these profiles on a live database. Never run Flyway repair or baseline merely to bypass failed validation.
- Views and their subcomponents load on demand through Vue async components. Concurrent loads share one promise; failed loads can retry. Initial and post-login preload readiness waits for the destination module/render, not dashboard data. The existing 1.5 second minimum remains.
- Dashboard mount loads only the selected role panel instead of initiating every role's requests.
- Both local and Docker entry points use `frontend/server.js`. Versioned static assets use immutable cache; bare imports revalidate with ETags; HTML remains no-store. Text responses negotiate gzip, including SPA fallbacks. HTTP tests check the actual compressed body and 304/HEAD behavior.
- Legacy restore scripts now require an explicit staging drill confirmation and use SQLCMDPASSWORD rather than hardcoded password arguments. Their syntax was checked; no restore was executed. Keep backups private and retain an independent copy until recovery is verified.

## Verification performed

- 62 application JavaScript files and 37 templates passed syntax/compilation checks.
- 66 frontend tests passed, including loopback HTTP tests, lazy loading, login timing and release gate failure cases.
- The Maven reactor's isolated tests completed successfully: 124 tests, zero failures/errors, one skipped SQL Server migration test. Infrastructure-dependent `*ApplicationTests` were excluded. This is not full SQL Server integration verification.
- The full Maven reactor also packaged successfully after the tests, without re-running tests during packaging.
- Both Kustomize paths rendered. The rendered output was checked for 14 application deployments, probe paths, expected frontend/gateway replicas, backend policies and a single application ingress. Workflow YAML parsed successfully and both image jobs depend on validation. GitHub-hosted execution has not been exercised.
- In-browser `/login` loaded, the initial preloader dismissed, and navigation to `/tracking` loaded its view without captured console errors. `/calculator` also rendered, but its routing/pricing requests failed because a usable gateway was unavailable in the local QA setup. Pricing behavior was not validated. No real account was used; authenticated E2E remains pending.
- A local smoke benchmark sent 40 GET requests to `/login` and the app script with concurrency four: zero errors, p50 6.71 ms and p95 57.27 ms. These numbers describe the local HTTP server only, not database APIs, browser rendering, target capacity or a controlled before/after comparison.
- The current static module graph is approximately 0.56 MB before gzip and 0.12 MB gzipped, excluding Vue, CDN assets, CSS and the selected route module. Source bytes are not LCP, INP or FPS measurements.

## Required staging work before release

1. Supply the staging origin, isolated database/namespace, expected concurrent users, shipment volume and response-time/error budgets. Do not infer production capacity from the local smoke benchmark.
2. Restore a representative backup into an isolated staging database. Verify backup integrity, run migrations/validation and run `DBCC CHECKDB`. Compare shipment/payment/COD counts and totals with the backup reference. Measure recovery duration. Do not restore over production.
3. Run infrastructure-dependent `*ApplicationTests` against disposable infrastructure, and enable the SQL Server migration test using its documented test environment. The isolated CI gate deliberately does not claim these tests passed.
4. Complete authenticated browser E2E for staff/customer login, Google sign-in, shipment creation/pricing/cancellation, payment/COD, tracking, chat/reconnect, account switching and denied access to another customer's data. Check desktop/mobile and light/dark modes.
5. Replace the remaining dashboard `ShipmentService.getAll()` data path with scoped, server-side aggregates and paginated rows. Preserve region/station rules and accounting totals; do not simply truncate rows or substitute a paged sample for global statistics. Several current dashboard station rankings depend on address-text heuristics and estimated capacity, so define the authoritative business mapping before treating these as production metrics.
6. Record a controlled before/after browser trace on the same device, data and network settings: overlay timing, transferred bytes, requests, long tasks and frame stalls. Include a lower-end device. Measure backend p95/error rate, DB queries/pool usage and memory under the agreed load.
7. Confirm actual ingress/CNI enforcement, metrics scraping, WebSocket upgrade/reconnect and failure behavior when Redis or a broker is unavailable. Exercise application rollback by SHA against the migrated schema before a limited rollout. Do not reverse schema changes or discard outbox/payment records as part of an image rollback.

## Commands

```sh
npm ci --prefix frontend
npm run verify --prefix frontend
mvn --batch-mode --no-transfer-progress verify '-Dtest=!*ApplicationTests' '-Dsurefire.failIfNoSpecifiedTests=false'
kubectl kustomize k8s/02-services
kubectl kustomize k8s
```

Run the following only against an explicitly chosen staging origin. Set `WAYBILL_BENCHMARK_TOKEN` in the process environment for authenticated GET routes; the script does not log credentials or response bodies. Select p95 and error-rate limits from the agreed release budget.

```sh
node scripts/benchmark-http.cjs --base-url=https://YOUR-STAGING-ORIGIN --paths=/login --requests=50 --concurrency=5 --p95-ms=1000 --max-error-rate=0.01
```

The example limits above are sample operator inputs, not proven capacity targets. The benchmark exits nonzero when its limits are exceeded. It exercises HTTP only and cannot replace browser E2E or recovery testing.
