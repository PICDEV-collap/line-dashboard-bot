---
name: professional-project-planner
description: >-
  Standardized, professional end-to-end software planning and development workflow.
  Guides requirement discovery, architecture specification, directory scaffolding,
  strict Test-Driven Development (TDD), security reviews, and structured delivery verification.
---

# Professional Project Planner

## Overview
The `professional-project-planner` skill enforces high-engineering-standard methodologies for building, refactoring, and scaling software projects. It transforms ambiguous requirements into structured architecture specifications, breaks goals down into phased milestones, enforces a strict Test-Driven Development (TDD) cycle, conducts rigorous multi-layer security audits, and delivers documented, verified releases.

## Dependencies
- **`agy-customizations`**: Adheres to the Antigravity agent customization structure.
- **Python 3 (stdlib)**: Used for running the bundled scaffolding and security scanning script (`scripts/scaffold.py`).

## Quick Start
To initialize a project or new major milestone with professional planning docs:
```bash
python .agents/skills/professional-project-planner/scripts/scaffold.py init --target-dir ./docs --project-name "MyProject" --output ./docs/scaffold_result.json
```

To run a static security scan on the workspace before committing:
```bash
python .agents/skills/professional-project-planner/scripts/scaffold.py check-security --target-dir . --fail-on-critical --output ./docs/security_report.json
```

## Utility Scripts
The skill includes a dedicated helper CLI located at [scripts/scaffold.py](file:///d:/line-dashboard-bot/.agents/skills/professional-project-planner/scripts/scaffold.py).

### 1. `init`
Scaffolds standard architecture and implementation templates into the specified target folder.
- `--target-dir <path>`: Folder where documents are generated (default: `./docs`).
- `--project-name <name>`: Display name of the project.
- `--overwrite`: Overwrites existing files if explicitly needed.
- `--output <file>`: **(Required)** Path to write JSON output status.

### 2. `check-security`
Scans the codebase for exposed credentials, secret keys, sensitive `.env` files, and dangerous code execution calls (`eval`, unescaped exec).
- `--target-dir <path>`: Directory to scan (default: `.`).
- `--fail-on-critical`: Exits with code 1 if any High/Critical severity issues are found.
- `--output <file>`: **(Required)** Path to write the JSON findings report.

---

## Workflow Protocol

When planning and executing any feature or project, the agent MUST follow these 5 phases sequentially:

### Phase 1: Requirements Discovery & Architecture Spec
1. **Analyze Requirements**: Clarify business objectives, constraints, target scale, and integrations.
2. **Draft Architecture Document**:
   - Utilize the template at [templates/architecture_spec_template.md](file:///d:/line-dashboard-bot/.agents/skills/professional-project-planner/templates/architecture_spec_template.md).
   - Document: Component boundaries, Mermaid diagram, Tech Stack rationale, Database Schema, and API contracts.
   - Save or update to `docs/architecture_spec.md`.

### Phase 2: Systematic Implementation Planning
1. **Milestone Breakdown**:
   - Decompose features into atomic, reviewable tasks.
   - Define unambiguous **Definition of Done (DoD)** for every milestone.
2. **Implementation Plan Document**:
   - Utilize the template at [templates/implementation_plan_template.md](file:///d:/line-dashboard-bot/.agents/skills/professional-project-planner/templates/implementation_plan_template.md).
   - Flag any breaking changes, database migrations, or security considerations using GitHub alerts (`[!IMPORTANT]`, `[!WARNING]`).
   - Stop and secure user confirmation before beginning execution if the changes are architectural.

### Phase 3: Strict Test-Driven Development (TDD)
Never write production code before establishing a test! Follow the Red-Green-Refactor loop:
1. **Red Phase (Write Tests First)**:
   - Create test files in `__tests__/`, `tests/`, or alongside modules.
   - Write unit and integration tests covering:
     - Normal happy paths
     - Boundary conditions and invalid inputs
     - Error handling and expected exceptions
   - Run tests to confirm they fail for the correct reasons.
2. **Green Phase (Minimal Implementation)**:
   - Write the minimum viable code necessary to make the test pass.
   - Do not add premature abstractions or speculative features.
3. **Refactor Phase (Clean & Optimize)**:
   - Refactor to clean code principles, DRY, and eliminate duplication.
   - Re-run test suite to ensure zero regressions.
4. **Self-Healing Rule**:
   - If tests fail, the agent may attempt up to **3 automated repair iterations**.
   - If tests still fail after 3 attempts, halt and request user guidance with exact error logs.

### Phase 4: Multi-Layer Security Review
Before concluding any implementation phase:
1. **Audit Checklist**:
   - Evaluate against [templates/security_review_checklist.md](file:///d:/line-dashboard-bot/.agents/skills/professional-project-planner/templates/security_review_checklist.md).
   - Verify: No hardcoded secrets, no SQL/Command injection vulnerabilities, strict authentication/RBAC enforcement on all routes, and input validation schemas (Zod, Pydantic, etc.).
2. **Automated Scan**:
   - Execute `python .agents/skills/professional-project-planner/scripts/scaffold.py check-security --target-dir . --output ./docs/security_report.json`.
3. **Escalation Gate**:
   - **Critical / High Severity**: **HALT IMMEDIATELY**. Do not proceed to delivery until resolved and verified.

### Phase 5: Verification & Delivery Walkthrough
1. Run complete automated test suite (`npm test`, `pytest`, etc.) and linters.
2. Verify application builds cleanly (`npm run build` if applicable).
3. Produce or update `walkthrough.md` documenting:
   - What was implemented.
   - Test execution results and code coverage.
   - Instructions for the user to run or test locally.

---

## Rate Limiting & Performance
- The CLI helper operates exclusively on the local filesystem and does not call external APIs.
- When working with third-party APIs during project development, always implement exponential backoff and adhere to the provider's documented rate limits.

---

## Common Mistakes to Avoid
1. **Writing Code Before Tests**: Jumping straight to code without writing unit/contract tests breaks the TDD cycle and results in fragile code.
2. **Skipping Architecture Specs**: Beginning development without agreed data schemas and API contracts leads to breaking changes later in development.
3. **Ignoring Security in Early Phases**: Leaving authorization or secret management as an afterthought creates severe vulnerabilities. Security must be baked in from Phase 1.
4. **Silent Failure or Over-Retrying**: Attempting infinite repair loops when tests fail. Always adhere to the 3-retry limit and escalate clearly.
