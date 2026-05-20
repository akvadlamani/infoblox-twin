# Infoblox Twin

A continuously updated, queryable digital twin of enterprise infrastructure for security and risk leaders. Twin fuses DNS, flow, identity, cloud, EDR, and OT signals — the ones your network already generates — into one living picture of every device, every relationship, and every threat path.

## Stack

- Vite 5 + React 18 + TypeScript strict
- React Three Fiber + drei (3D)
- Tailwind CSS (dark only)
- Zustand (state)
- Tabler icons

## Run

```bash
pnpm install   # or npm install
pnpm dev       # → http://localhost:5173
```

Sign in with **admin / admin**.

## Views

1. **Overview** — landing 3D scene with the CISO intel brief ("overnight brief"), today's exposure, crown jewels, and tracked Infoblox actors.
2. **Blast Radius** — click any asset, see inbound paths, blast radius, exposure dollars, recommended controls.
3. **Breach Replay** — replay an Infoblox-tracked actor (Vigorish Viper, VexTrio Viper, Savvy Seahorse, Decoy Dog) hop-by-hop, with the active MITRE technique pinned above the scene.
4. **Patch Risk** — open CVEs scored against how your network actually behaves, not the CVSS sticker. Recommendations: patch now / schedule / accept.
5. **Compliance** — PCI, HIPAA, GDPR, SOX zones auto-classified from tags and behavior; drift surfaced for every asset touching a zone but not classified inside it.
6. **Agent IEZ** — sandbox Twin verdicts on IBIQ agent proposals before they touch production.
7. **Board CRQ** — annualized loss expectancy (Gartner G00835632 MDP); controls toggle recomputes ALE in real time.

A **Settings** page (gear icon) lists every discovery source. "Connect" launches a per-vendor onboarding wizard modeled on the real public API — credentials, scopes, code samples, and a simulated test-connection trace.

## Connectors (mock-mode wizards)

Each connector matches what you would actually configure in production:

| Connector | Auth method | What the wizard walks you through |
|---|---|---|
| **AWS Organization** | Cross-account IAM role | CloudFormation snippet, external ID, account ID, role ARN, region multi-select, `sts:AssumeRole` + sample API trace |
| **Microsoft Azure + Entra ID** | Entra app · client credentials | App registration permissions JSON, tenant ID, client ID/secret, subscriptions, Resource Graph + Graph API trace |
| **Microsoft Defender for Endpoint** | Entra app · client credentials | Required `WindowsDefenderATP` application permissions, commercial / GCC / GCC-High base URLs |
| **Okta Workforce Identity** | API token | Token-creation steps, `curl` test, domain + token fields, system-log + rate-limit trace |
| **CrowdStrike Falcon** | OAuth2 client credentials | Required Falcon scopes, US-1 / US-2 / EU-1 / GovCloud cloud picker, `/oauth2/token` + sample trace |
| **Infoblox CSP** | CSP API key | Single API key flow, US/EU region, BloxOne TD + TIDE + SOC Insights endpoints |
| **ServiceNow CMDB** | OAuth 2.0 or basic | Instance URL, OAuth client setup, `cmdb_ci` + `cmdb_rel_ci` API trace |

A `MOCK MODE` badge is present on every step. No credentials are transmitted in this build.

## Asset shapes

Different asset types render as distinct 3D primitives:

| Type | Shape |
|---|---|
| Database | cylinder with disc rings |
| Server | tall rack box with slits |
| Workstation | monitor on a base |
| Laptop | hinged base + screen |
| Mobile | thin tall box |
| Application | octahedron |
| Cloud workload / SaaS | bubbled cloud silhouette |
| Network device | wide flat box |
| Security appliance | shield extrude |
| OT controller (PLC, SCADA) | diamond cone |
| IoT / printer | dodecahedron / boxy frame |
| Endpoint pool | central sphere + satellites |

## Mock data

All data in `src/data/mock/`. The `TwinDataClient` interface (`src/lib/data-clients/`) abstracts it; `VITE_TWIN_DATA_SOURCE` selects mock vs live (live is stubbed in v1).

Acme Corp: 51 assets across 8 segments, 94 relationships, 6 crown jewels, 4 real Infoblox-tracked actors.
