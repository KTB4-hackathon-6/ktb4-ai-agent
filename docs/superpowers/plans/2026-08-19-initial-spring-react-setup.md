# Spring Boot + React Initial Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create minimal, independently runnable Spring Boot and React TypeScript projects for the existing backend and frontend directories.

**Architecture:** Generate the backend from Spring Initializr so its supported Spring Boot, Gradle, and Wrapper versions remain aligned, then generate the frontend from the latest Vite `react-ts` template. Preserve all existing README files, add only local-development ignore/example files, and document the commands that are proven by verification.

**Tech Stack:** Spring Boot 4.1.0, Java 26, Gradle Wrapper, Spring Web, React 19.2.x, Vite 8.1 latest stable line, TypeScript, npm

**Spec:** `docs/superpowers/specs/2026-08-19-initial-spring-react-setup-design.md`

## Global Constraints

- Backend language and toolchain target: Java 26.
- Backend framework: Spring Boot 4.1.0 with Gradle and Spring Web only.
- Backend package: `com.ktb4.aiagent`.
- Frontend template: latest stable Vite `react-ts` with latest stable React.
- Do not add routing, state management, UI, database, security, AI, deployment, or CI dependencies.
- Preserve `backend/README.md`, `frontend/README.md`, root `README.md`, and everything under `ai/`.
- Do not implement `/health` or any business API.

---

## File Map

- `backend/build.gradle`: Spring Boot plugins, Java 26 toolchain, Spring Web, and test dependencies.
- `backend/settings.gradle`: Gradle project name.
- `backend/gradlew`, `backend/gradlew.bat`, `backend/gradle/wrapper/*`: reproducible Gradle execution.
- `backend/src/main/java/com/ktb4/aiagent/*Application.java`: generated Spring Boot entry point.
- `backend/src/test/java/com/ktb4/aiagent/*ApplicationTests.java`: generated context-load smoke test.
- `backend/src/main/resources/application.properties`: minimal Spring Boot configuration file.
- `backend/.env.example`: empty backend environment variable names only.
- `frontend/package.json`, `frontend/package-lock.json`: frontend dependencies and reproducible npm install.
- `frontend/src/*`, `frontend/index.html`, TypeScript/Vite config files: generated React TypeScript starter.
- `frontend/.env.example`: empty `VITE_API_BASE_URL` example.
- `.gitignore`: generated build, dependency, environment, editor, and OS file exclusions.
- `SETUP.md`: actual versions, initialization state, and verified run commands.

### Task 1: Generate and verify the Spring Boot backend

**Files:**
- Create: `backend/build.gradle`
- Create: `backend/settings.gradle`
- Create: `backend/gradlew`
- Create: `backend/gradlew.bat`
- Create: `backend/gradle/wrapper/gradle-wrapper.jar`
- Create: `backend/gradle/wrapper/gradle-wrapper.properties`
- Create: `backend/src/main/java/com/ktb4/aiagent/AiAgentApplication.java`
- Create: `backend/src/test/java/com/ktb4/aiagent/AiAgentApplicationTests.java`
- Create: `backend/src/main/resources/application.properties`
- Preserve: `backend/README.md`

**Interfaces:**
- Consumes: OpenJDK 26 and Spring Initializr project generation endpoint.
- Produces: Gradle Wrapper commands `./gradlew test`, `./gradlew build`, and `./gradlew bootRun`.

- [ ] **Step 1: Confirm the active JDK**

Run:

```bash
java -version
```

Expected: version begins with `26`.

- [ ] **Step 2: Request the minimal project from Spring Initializr in a temporary directory**

Run from the repository root:

```bash
setup_tmp_dir="$(mktemp -d)"
curl -fsSLG https://start.spring.io/starter.zip \
  --data-urlencode type=gradle-project \
  --data-urlencode language=java \
  --data-urlencode bootVersion=4.1.0 \
  --data-urlencode baseDir=backend-template \
  --data-urlencode groupId=com.ktb4 \
  --data-urlencode artifactId=ai-agent \
  --data-urlencode name=ai-agent \
  --data-urlencode packageName=com.ktb4.aiagent \
  --data-urlencode packaging=jar \
  --data-urlencode javaVersion=26 \
  --data-urlencode dependencies=web \
  -o "$setup_tmp_dir/backend.zip"
unzip -q "$setup_tmp_dir/backend.zip" -d "$setup_tmp_dir"
```

Expected: `$setup_tmp_dir/backend-template` contains the generated project. Do not download directly over existing `backend/`.

- [ ] **Step 3: Inspect the generated archive before copying**

Run:

```bash
find "$setup_tmp_dir/backend-template" -maxdepth 4 -type f | sort
rg 'JavaLanguageVersion.of\(26\)|spring-boot-starter-web|spring-boot-starter-test' "$setup_tmp_dir/backend-template/build.gradle"
```

Expected: the tree contains `build.gradle`, both Wrapper scripts, `gradle/wrapper/`, the application entry point, and the context-load test. The search finds Java toolchain 26, Spring Web, and the generated test starter.

- [ ] **Step 4: Copy generated files while preserving the existing README**

Run from the repository root:

```bash
rsync -a --exclude README.md "$setup_tmp_dir/backend-template/" backend/
```

Expected: `backend/README.md` retains its original content.

- [ ] **Step 5: Run the generated smoke test**

Run:

```bash
cd backend
./gradlew test
```

Expected: `BUILD SUCCESSFUL` and the generated context-load test passes.

- [ ] **Step 6: Build the backend**

Run:

```bash
./gradlew build
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 7: Commit the independently working backend**

```bash
git add backend
git commit -m "chore: initialize Spring Boot backend"
```

### Task 2: Generate and verify the React TypeScript frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/package-lock.json`
- Create: `frontend/index.html`
- Create: `frontend/src/`
- Create: `frontend/public/`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/eslint.config.js`
- Preserve: `frontend/README.md`

**Interfaces:**
- Consumes: Node.js 24.18.0 and npm 11.16.0.
- Produces: npm scripts `dev`, `build`, `lint`, and `preview` from the Vite template.

- [ ] **Step 1: Confirm Node.js and npm**

Run:

```bash
node -v
npm -v
```

Expected: Node `v24.18.0` and npm `11.16.0`, both compatible with current Vite.

- [ ] **Step 2: Generate the latest React TypeScript template in a temporary directory**

Run from the repository root:

```bash
frontend_tmp_dir="$(mktemp -d)"
cd "$frontend_tmp_dir"
npm create vite@latest frontend-template -- --template react-ts
```

Expected: a new `frontend-template` directory with React, TypeScript, and Vite configuration.

- [ ] **Step 3: Inspect generated dependencies and scripts**

Run:

```bash
cd frontend-template
npm install
npm pkg get dependencies devDependencies scripts
```

Expected: `react` and `react-dom` use current stable versions; `vite` uses the latest stable line; scripts include `dev`, `build`, and `lint`.

- [ ] **Step 4: Copy generated files while preserving the existing README**

Run from the repository root after returning to it:

```bash
rsync -a --exclude README.md --exclude node_modules "$frontend_tmp_dir/frontend-template/" frontend/
```

Expected: `frontend/README.md` retains its original content and `frontend/package-lock.json` is present.

- [ ] **Step 5: Run frontend static verification**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: both commands exit successfully and `dist/` is produced.

- [ ] **Step 6: Commit the independently working frontend**

```bash
git add frontend
git commit -m "chore: initialize React TypeScript frontend"
```

### Task 3: Add local environment conventions and synchronize setup documentation

**Files:**
- Create: `.gitignore`
- Create: `backend/.env.example`
- Create: `frontend/.env.example`
- Modify: `SETUP.md`

**Interfaces:**
- Consumes: verified Gradle and npm scripts from Tasks 1 and 2.
- Produces: clone-to-run instructions that use only existing files and scripts.

- [ ] **Step 1: Add root ignore rules**

Create `.gitignore` containing:

```gitignore
.gradle/
build/
*.class
node_modules/
dist/
.env
.env.*
!.env.example
.idea/
.vscode/
.DS_Store
```

- [ ] **Step 2: Add empty environment examples**

Create `backend/.env.example`:

```env
DB_URL=
DB_USERNAME=
DB_PASSWORD=
```

Create `frontend/.env.example`:

```env
VITE_API_BASE_URL=
```

These are variable-name examples only; no runtime database or API integration is added.

- [ ] **Step 3: Update SETUP.md to match generated files**

Remove statements saying Gradle Wrapper, Spring Boot, and React files are absent. Record the versions found in `backend/build.gradle` and `frontend/package-lock.json`; retain macOS/Linux and Windows Wrapper commands; use only the verified scripts.

- [ ] **Step 4: Verify ignore behavior and documentation commands**

Run:

```bash
git check-ignore backend/build frontend/node_modules frontend/dist backend/.env frontend/.env
git check-ignore -v backend/.env.example frontend/.env.example || true
```

Expected: generated/local paths are ignored, while both `.env.example` files are not ignored.

- [ ] **Step 5: Commit environment and documentation files**

```bash
git add .gitignore backend/.env.example frontend/.env.example SETUP.md docs/superpowers
git commit -m "docs: add local development setup"
```

### Task 4: Verify both development servers

**Files:**
- No production file changes expected.

**Interfaces:**
- Consumes: `backend/gradlew` and frontend `dev` npm script.
- Produces: fresh evidence that both generated applications start and respond locally.

- [ ] **Step 1: Start Spring Boot**

Run:

```bash
cd backend
./gradlew bootRun
```

Expected: application start completes and embedded server listens on the logged port, normally 8080.

- [ ] **Step 2: Probe the backend root**

Run against the logged port:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8080/
```

Expected: an HTTP response is received. A `404` is acceptable because no API is implemented.

- [ ] **Step 3: Start the Vite development server**

Run:

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

Expected: Vite logs a local URL, normally `http://127.0.0.1:5173`.

- [ ] **Step 4: Probe the frontend page**

Run against the logged port:

```bash
curl -fsS http://127.0.0.1:5173/ > /dev/null
```

Expected: exit code 0.

- [ ] **Step 5: Run the complete final verification**

Run:

```bash
cd backend
./gradlew clean test build
cd ../frontend
npm run lint
npm run build
```

Expected: all commands exit successfully with no failed tests, lint errors, TypeScript errors, or build errors.

- [ ] **Step 6: Inspect the final change set**

Run:

```bash
git status --short
git diff --check
```

Expected: only the approved scaffold, environment conventions, docs, and preserved README files appear; `git diff --check` exits successfully.
