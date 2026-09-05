# Security Review Checklist

A comprehensive security audit checklist to be completed before merging or deploying any feature.

---

## 1. Credentials, Secrets & Sensitive Data
- [ ] **No Hardcoded Secrets**: No API keys, JWT secrets, database passwords, private keys, or webhook secrets in source code.
- [ ] **Environment Separation**: All secrets stored in `.env.local` or environment variables; checked against `.gitignore`.
- [ ] **Logging Hygiene**: No sensitive information (passwords, tokens, PII, full authorization headers) written to application logs or console output.
- [ ] **Client Exposure Prevention**: In Next.js / frontend frameworks, ensure server-only secrets do NOT have public prefixes (e.g. `NEXT_PUBLIC_` or `VITE_`).

## 2. Authentication & Session Security
- [ ] **Identity Verification**: All private API endpoints verify authentication credentials (token / session) before processing.
- [ ] **Session Expiry & Revocation**: Token expiration times are appropriately constrained and invalid tokens are rejected.
- [ ] **Timing Attack Protection**: Cryptographic operations (e.g., hash comparisons, signature verification) use constant-time comparison methods.

## 3. Authorization & Access Control (BOLA / IDOR)
- [ ] **Ownership Verification**: Database queries filter by `user_id` / `tenant_id` from the authenticated session, NOT purely from untrusted URL/body parameters.
- [ ] **Role-Based Access Control (RBAC)**: Elevated permissions (admin, manager) are explicitly validated server-side for every privileged action.
- [ ] **Direct Object References**: Indirect identifiers or strict permission checks prevent unauthorized access to other users' resources.

## 4. Input Validation & Injection Defense
- [ ] **Schema Validation**: All input bodies, query strings, and path parameters are strictly validated and parsed (e.g. Zod, Joi, Pydantic).
- [ ] **SQL Injection Prevention**: Parameterized queries or type-safe ORMs (Prisma, Drizzle, Supabase Client) are used exclusively. No raw string interpolation in SQL.
- [ ] **XSS Prevention**: User-supplied content rendered in HTML is sanitized or escaped automatically by the framework. Avoid `dangerouslySetInnerHTML` unless strictly sanitized.
- [ ] **Command & SSRF Injection**: No user-supplied parameters passed directly into OS shell commands or unvalidated external HTTP request URLs.

## 5. Security Headers & Network Hygiene
- [ ] **CORS Configuration**: Restrict allowed origins to trusted domains rather than wildcard `*` where credentials/cookies are involved.
- [ ] **Content-Type Enforcement**: API responses return `application/json` with appropriate `X-Content-Type-Options: nosniff`.
- [ ] **Rate Limiting**: Public endpoints (login, OTP, webhook receivers) implement rate limiting to prevent brute force and DoS attacks.

## 6. Audit & Escalation Protocol
| Severity Level | Definition | Action Required |
|---|---|---|
| **Critical** | Remote code execution, database compromise, auth bypass, exposed credentials | **HALT WORKFLOW IMMEDIATELY**. Alert user and patch before proceeding. |
| **High** | IDOR / data leakage between users, missing authorization checks | **HALT WORKFLOW**. Must be resolved prior to milestone completion. |
| **Medium** | Missing rate limit, loose CORS, verbose error messages in production | Document in implementation plan; schedule fix before release. |
| **Low / Info** | Code style, minor security headers, dependency version bump | Log as technical debt or minor follow-up task. |
