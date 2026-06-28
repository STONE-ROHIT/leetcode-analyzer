# verdict — LeetCode submission analyzer

Paste a LeetCode problem number and your code. No login, no signup. Get back:
correctness (verified against the problem's public examples where possible,
not just an LLM guess), complexity vs. the problem's actual constraints,
code quality notes, the core pattern/technique, and Socratic hints (not
answers) when something's wrong or a better approach exists.

## Folder structure

```
leetcode-analyzer/
├── apps/
│   ├── server/                  Express + TypeScript API
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts        Drizzle schema - single problems cache table
│   │   │   │   ├── client.ts        Neon Postgres client
│   │   │   │   └── problemRepo.ts   Shared lookup + lazy-enrichment logic
│   │   │   ├── services/
│   │   │   │   ├── leetcode.ts      Bulk listing + per-problem detail fetch/extraction
│   │   │   │   ├── judge0.ts        Self-hosted Judge0 execution client
│   │   │   │   └── groq.ts          LLM analysis pipeline + two-stage hints
│   │   │   ├── lib/
│   │   │   │   ├── rateLimiter.ts   Per-IP limits (no auth = this is the cost guardrail)
│   │   │   │   └── harness/         Converts a LeetCode signature into a runnable program
│   │   │   │       ├── parse.ts         LeetCode literal text -> JS values
│   │   │   │       ├── generatePython.ts
│   │   │   │       ├── generateCpp.ts
│   │   │   │       ├── generateJava.ts
│   │   │   │       └── index.ts         Capability check + dispatcher
│   │   │   ├── routes/
│   │   │   │   ├── problems.ts      GET /api/problems/:number
│   │   │   │   └── analyze.ts       POST /api/analyze, POST /api/analyze/hint
│   │   │   ├── scripts/
│   │   │   │   ├── seedProblems.ts          Bulk-populate all problem metadata
│   │   │   │   └── verifyLeetcodeDetail.ts  Run this FIRST - see Verification below
│   │   │   ├── types/index.ts
│   │   │   └── index.ts             Server entry point
│   │   ├── drizzle.config.ts
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/                  React + Vite frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── ProblemForm.tsx
│       │   │   ├── AnalysisResult.tsx
│       │   │   ├── HintPanel.tsx
│       │   │   └── LoadingState.tsx
│       │   ├── lib/api.ts
│       │   ├── types/index.ts
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── judge0/                      Self-hosted Judge0 deployment (run on a separate VM)
│   ├── docker-compose.yml
│   └── judge0.conf
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

## Architecture, in one paragraph

No accounts. A request hits `POST /api/analyze` with a problem number,
language, and code. The server looks up (and lazily caches) that problem's
constraints/signature/examples from LeetCode's public GraphQL endpoint - never
storing the full problem description, only the structural pieces needed.
If the problem's parameter types are in the supported set, a per-language
driver program is generated and run against the problem's own public example
test cases on a self-hosted Judge0 instance - real execution, not a guess.
That result (or its absence, with a reason) gets handed to Groq along with
the code and problem context, which returns structured JSON: correctness,
acceptance-likelihood vs. the stated constraints, complexity, code quality,
pattern, and - only on request - a Socratic optimization hint.

## Prerequisites

- Node.js >= 20, pnpm (`npm install -g pnpm` if you don't have it)
- A free Neon Postgres database: https://neon.tech
- A free Groq API key: https://console.groq.com (API Keys page, no card required)
- A VM to self-host Judge0 - see **Deploying Judge0** below before doing anything else, since the analyze pipeline depends on it

## Setup

All commands below assume you're in the repo root (`leetcode-analyzer/`) unless a `cd` is shown.

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure the server
cd apps/server
cp .env.example .env
# edit .env: set DATABASE_URL, GROQ_API_KEY, JUDGE0_BASE_URL, JUDGE0_AUTH_TOKEN
cd ../..

# 3. Push the schema to your database
pnpm db:push

# 4. Seed problem metadata (takes a few minutes - ~3000 problems, paced to be polite to LeetCode's API)
pnpm seed

# 5. VERIFY before trusting anything else - see "Verification" section below
cd apps/server
pnpm exec tsx src/scripts/verifyLeetcodeDetail.ts two-sum
cd ../..

# 6. Run the server (separate terminal)
pnpm dev:server

# 7. Run the client (separate terminal)
pnpm dev:client
```

The client runs at `http://localhost:5173`, the server at `http://localhost:4000`.
If you change the server port/origin, also set `VITE_API_BASE_URL` in
`apps/client/.env` (create it if needed) and `CLIENT_ORIGIN` in `apps/server/.env`.

## Deploying Judge0 (do this before step 5 above)

Judge0 needs `privileged: true` containers for its sandboxing - most free
PaaS tiers (Render, Railway, Fly free tier) won't run this reliably. The
genuinely free, persistent option is an Oracle Cloud **Always Free** VM.

1. Create an Oracle Cloud account (free, no auto-charge after trial)
2. Create a VM: Compute -> Instances -> Create Instance -> choose an "Always
   Free" eligible shape (Ampere A1, 4 OCPU / 24GB is the standard always-free
   allotment - Judge0 doesn't need anywhere near this, but it's free)
3. Open port 2358 in the VM's security list / network security group (Networking -> Virtual Cloud Networks -> your VCN -> Security Lists -> Add Ingress Rule -> 0.0.0.0/0, TCP, port 2358 - or restrict the source CIDR to your server's IP if it's static)
4. SSH into the VM, install Docker:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   # log out and back in for the group change to apply
   ```
5. Copy this repo's `judge0/` folder onto the VM (`scp -r judge0/ user@vm-ip:~/`)
6. On the VM, inside the `judge0/` folder:
   ```bash
   # Generate real secrets and edit judge0.conf with them - see the
   # CHANGE_ME markers at the top of the file
   openssl rand -hex 24   # run 3x for REDIS_PASSWORD, POSTGRES_PASSWORD, AUTHN_TOKEN
   nano judge0.conf
   docker compose up -d
   docker compose ps      # wait for all 4 services to show healthy
   curl http://localhost:2358/system_info
   ```
7. Back in `apps/server/.env`: set `JUDGE0_BASE_URL=http://<vm-public-ip>:2358`
   and `JUDGE0_AUTH_TOKEN` to the same value you put in `AUTHN_TOKEN`.

Without the auth token, anyone who finds your VM's IP can run arbitrary code
on it for free - don't skip step 6's token.

## Verification - do this before trusting the pipeline end-to-end

This project depends on three things that can't be fully verified without
hitting them live, and they're flagged everywhere in the code as well:

1. **`scripts/verifyLeetcodeDetail.ts`** - confirms the unofficial LeetCode
   GraphQL fields (`metaData`, extracted constraints, extracted examples)
   are shaped as expected for a real problem. Run this first, on a few
   different problems (try `two-sum`, `reverse-linked-list`,
   `maximum-depth-of-binary-tree` to cover array/ListNode/TreeNode cases).
2. **Judge0's response format** - confirmed working in this build (the
   harness generators were tested end-to-end: generated Python/C++/Java
   programs were actually compiled and run locally against Two Sum,
   Reverse Linked List, and Maximum Depth of Binary Tree, in all three
   languages, with output matching expected results). What's *not* verified
   is Judge0's exact behavior on your specific self-hosted instance - run a
   real submission through `/api/analyze` once Judge0 is up and sanity-check
   the `execution` field in the response.
3. **Groq's model behavior** - the prompts are designed and the JSON contract
   is enforced, but real prompt quality (is the complexity reasoning
   actually good? are hints genuinely Socratic and not give-aways?) needs
   your judgment on real submissions, not just mine. The model ID
   (`openai/gpt-oss-120b`) was confirmed current as of this build, but Groq
   has changed its model lineup multiple times in the past year - if it
   404s, check `GET https://api.groq.com/openai/v1/models` or
   `console.groq.com/docs/deprecations`.

## Scope boundaries - set deliberately, not bugs

- **Execution coverage**: the harness generator supports primitives, 1D/2D
  arrays, strings, `ListNode`, and `TreeNode` parameter/return types - this
  covers the large majority of array, string, DP, graph, tree, and
  linked-list problems. Design/OOP problems (e.g. `LRUCache`, anything with
  multiple methods under test), custom node types, and interactive problems
  are **not** covered - those problems fall back to LLM-only reasoning
  automatically (`execution.available: false`, with a reason). This was a
  deliberate scope decision: a fully general harness compiler for every
  LeetCode problem type is a much larger project, not something to fake.
- **No problem catalog**: the app never stores or displays LeetCode's full
  problem descriptions - only the constraints line and example
  input/output literals needed for analysis. There's no "browse all
  problems" page, intentionally, since that would start to look like
  redistributing their content.
- **Cost**: Neon and Groq free tiers cover this at personal/demo scale.
  Groq's free tier is rate-limited (not unlimited), which is the whole
  reason `lib/rateLimiter.ts` exists on a login-free public endpoint - don't
  remove it.
