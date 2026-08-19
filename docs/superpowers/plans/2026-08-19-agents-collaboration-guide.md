# AGENTS.md Collaboration Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a repository-wide `AGENTS.md` that gives coding agents accurate project commands, safety rules, and GitHub collaboration conventions.

**Architecture:** Use one root instruction file whose scope covers the whole repository. Keep rules grounded in existing Gradle, npm, environment, and ignore configuration; do not create nested agent guides or GitHub automation files.

**Tech Stack:** Markdown, Git, GitHub conventions, Spring Boot 4.1.0, Java 26, Gradle Wrapper, React 19.2.8, Vite 8.2.1, TypeScript 6.0.3, npm

**Spec:** `docs/superpowers/specs/2026-08-19-agents-collaboration-guide-design.md`

## Global Constraints

- Create only the root `AGENTS.md` as the collaboration instruction artifact.
- Preserve all existing source, configuration, README, setup, spec, and plan content.
- Document only commands and files that currently exist.
- Do not add dependencies, APIs, deployment configuration, GitHub Actions, templates, or CODEOWNERS.
- Never include `.env` contents, AWS credentials, tokens, or other secrets.
- Include branch, Conventional Commit, and Pull Request conventions from the approved spec.

---

### Task 1: Create and verify the repository collaboration guide

**Files:**
- Create: `AGENTS.md`
- Reference: `README.md`
- Reference: `SETUP.md`
- Reference: `backend/build.gradle`
- Reference: `backend/src/main/resources/application.properties`
- Reference: `frontend/package.json`
- Reference: `.gitignore`

**Interfaces:**
- Consumes: the repository's actual directory layout, Gradle Wrapper tasks, npm scripts, environment mapping, and ignore rules.
- Produces: repository-wide instructions for future coding agents.

- [ ] **Step 1: Record the repository scope and project facts**

Create `AGENTS.md` with a Korean title and state that it applies to the whole repository. Record these exact facts:

```text
Backend: Java 26, Spring Boot 4.1.0, Gradle Wrapper
Frontend: React 19.2.8, Vite 8.2.1, TypeScript 6.0.3, npm
Directories: backend/, frontend/, ai/, docs/
```

- [ ] **Step 2: Add work-start and change-safety rules**

Require agents to inspect the request, related docs and files, and `git status` before editing. Require preservation of user changes and untracked files; prohibit destructive Git operations, unrelated refactors, invented commands, and out-of-scope dependencies or infrastructure.

- [ ] **Step 3: Add exact backend and frontend commands**

Document these commands:

```bash
cd backend
./gradlew test
./gradlew build
./gradlew bootRun
```

```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

State that Windows uses `gradlew.bat` and that agents should run the smallest relevant verification during iteration plus the full relevant checks before completion.

- [ ] **Step 4: Add environment and credential rules**

State that `.env` is ignored, `.env.example` may contain variable names and non-secret examples, Spring Boot does not automatically load `.env`, and local variables must be exported through the shell or IDE. Prohibit committing AWS access keys, secret keys, tokens, passwords, and real credentials.

- [ ] **Step 5: Add implementation and testing rules**

Require tests before behavior changes, a verified failing test before minimal implementation, existing patterns, small focused changes, and explicit agreement when generated code or pure configuration uses another verification method. Prohibit business features, API routes, libraries, and architectural changes not requested by the user.

- [ ] **Step 6: Add GitHub collaboration conventions**

Document:

```text
Branch: <type>/<short-description>
Types: feat, fix, refactor, test, docs, chore
Commit: <type>: <summary>
Example branch: feat/s3-upload
Example commit: feat: add S3 upload configuration
```

Require lowercase hyphenated branch descriptions, imperative commit summaries without a trailing period, one logical change per commit, no direct push to `main`, no force push to shared branches, and verification before commit.

Require each PR to have one purpose and include change summary, reason, verification commands/results, environment or migration impact, and remaining work. Require Draft status for incomplete work, review resolution, required approval/checks before merge, and exclusion of secrets and generated outputs.

- [ ] **Step 7: Add completion and handoff rules**

Require final reports to list changed files, reasons, verification commands and results, limitations, and anything the user must do. Require agents to state clearly when a test or server could not be run.

- [ ] **Step 8: Verify document completeness and repository accuracy**

Run:

```bash
for heading in '프로젝트 개요' '디렉터리 역할' '작업 시작 전' 'Backend' 'Frontend' '환경변수와 보안' '구현과 테스트' 'GitHub 협업 컨벤션' '완료 전 검증' '결과 보고'; do rg -F "$heading" AGENTS.md >/dev/null; done
for command in './gradlew test' './gradlew build' './gradlew bootRun' 'npm run lint' 'npm run build' 'npm run dev'; do rg -F "$command" AGENTS.md >/dev/null; done
git diff --check
```

Expected: every search exits successfully and `git diff --check` reports no whitespace errors.

- [ ] **Step 9: Verify that no credential values were introduced**

Run:

```bash
if rg -n 'AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)[[:space:]]*=[[:space:]]*[^[:space:]]+' AGENTS.md; then exit 1; fi
```

Expected: no output and exit code 0.

- [ ] **Step 10: Inspect the final scope**

Run:

```bash
git status --short
git diff -- AGENTS.md
```

Expected: `AGENTS.md` is the only new implementation artifact for this task; existing project files have no task-related edits.
