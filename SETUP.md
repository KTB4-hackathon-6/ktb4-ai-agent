# Spring Boot + React 초기 개발환경 설정

이 문서는 저장소를 clone한 팀원이 백엔드와 프론트엔드를 각각 실행하기 위한 기본 개발환경을 설명합니다. 기능, 데이터베이스 연결, 상세 아키텍처 및 배포 설정은 다루지 않습니다.

## 1. 기본 프로젝트 구조

현재 프로젝트의 주요 구조는 다음과 같습니다.

```text
ktb4-ai-agent/
├── backend/                  # Spring Boot 백엔드
│   ├── gradle/wrapper/       # Gradle Wrapper 설정
│   ├── src/main/             # 애플리케이션 진입점과 설정
│   ├── src/test/             # 기본 컨텍스트 테스트
│   ├── build.gradle
│   ├── gradlew
│   └── gradlew.bat
├── frontend/                 # React TypeScript 프론트엔드
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.ts
├── ai/                       # 기존 별도 분석 영역
├── docs/                     # 설계 및 구현 계획 문서
├── .gitignore
├── README.md
└── SETUP.md
```

- `backend/`: Spring Boot 4.1.0, Java 26, Gradle 기반 API 서버 영역입니다.
- `frontend/`: React 19.2.8, Vite 8.2.1, TypeScript 6.0.3 기반 웹 클라이언트 영역입니다.
- `ai/`: 기존 분석 로직 영역이며 이번 초기 설정 범위에서는 변경하지 않습니다.
- `docs/`: 초기 환경 설계와 구현 계획을 기록합니다.

## 2. 개발 시작 전 환경 확인

### Backend

```bash
java -version
cd backend
./gradlew --version
```

이 프로젝트의 Java toolchain은 26으로 설정되어 있습니다. 현재 생성된 Gradle Wrapper 버전은 9.5.1입니다.

Windows PowerShell에서는 Wrapper 명령만 다음과 같이 바꿉니다.

```powershell
cd backend
.\gradlew.bat --version
```

### Frontend

```bash
node -v
npm -v
```

초기 생성 및 검증 환경은 Node.js 24.18.0과 npm 11.16.0입니다.

### 공통

```bash
git --version
```

## 3. Spring Boot Backend 기본 세팅

백엔드는 이미 Spring Boot 프로젝트와 Gradle Wrapper가 생성되어 있으므로 시스템 Gradle을 별도로 설치할 필요가 없습니다.

프로젝트 루트에서 백엔드 폴더로 이동합니다.

```bash
cd backend
```

Wrapper와 Java 실행 환경을 확인합니다.

```bash
./gradlew --version
```

의존성을 내려받고 기본 테스트를 포함해 빌드합니다.

```bash
./gradlew build
```

Spring Boot 서버를 실행합니다.

```bash
./gradlew bootRun
```

Windows PowerShell:

```powershell
.\gradlew.bat build
.\gradlew.bat bootRun
```

터미널에 애플리케이션 시작 완료 메시지가 출력되고 오류가 없는지 확인합니다. 기본 설정에서는 일반적으로 `http://localhost:8080`을 사용하지만 실제 로그에 표시된 포트를 우선합니다.

### Swagger/OpenAPI 확인

백엔드 실행 후 다음 주소에서 현재 API 명세를 확인할 수 있습니다.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`

Controller나 API DTO를 변경할 때는 `AGENTS.md`의 Swagger/OpenAPI 문서 규칙에 따라 애너테이션과 문서 테스트를 함께 갱신합니다.

세션 및 채팅 API는 구현되어 있으며 `/health` API는 아직 없습니다.

## 4. React Frontend 기본 세팅

프론트엔드는 Vite의 React TypeScript 템플릿으로 이미 생성되어 있습니다.

```bash
cd frontend
npm install
npm run dev
```

개발 서버가 출력한 URL을 브라우저에서 엽니다. 기본적으로 `http://localhost:5173`을 사용하지만 포트가 이미 사용 중이면 터미널에 다른 포트가 표시될 수 있습니다.

정적 검사와 프로덕션 빌드는 다음 명령으로 확인합니다.

```bash
npm run lint
npm run build
```

현재 라우팅, 상태관리 및 UI 라이브러리는 추가되어 있지 않습니다.

새 프로젝트를 다시 생성해야 하는 경우에만 다음 Vite 명령을 사용합니다. 이미 생성된 현재 `frontend/`에서 다시 실행하지 않습니다.

```bash
npm create vite@latest frontend -- --template react-ts
```

## 5. 환경변수 기본 설정

비밀번호, 키 및 환경별 주소는 코드에 직접 작성하지 않습니다. 실제 값은 Git에서 제외되는 `.env`에 두고, 변수 이름만 있는 `.env.example`을 공유합니다.

### Spring Boot

`backend/.env.example`에는 다음 변수 이름만 준비되어 있습니다.

```env
DB_URL=
DB_USERNAME=
DB_PASSWORD=
```

향후 해당 설정이 실제로 필요해지면 Spring Boot 설정에서 다음과 같이 운영체제 환경변수를 참조할 수 있습니다.

```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

현재 데이터베이스 의존성이나 연결 설정은 추가되어 있지 않습니다.

Spring 백엔드가 FastAPI 분석 서버를 호출하기 위한 비민감 설정은 다음과 같습니다.

```env
AI_BASE_URL=http://localhost:8000
AI_CONNECT_TIMEOUT=2s
AI_READ_TIMEOUT=30s
```

기본값은 `backend/src/main/resources/application.properties`에 정의되어 있습니다. 상세 요청 계약과 세션 동기화 규칙은 `docs/api/session-chat-api.md`를 참고합니다.

S3 사용을 위한 비민감 설정 예시는 같은 파일에 다음과 같이 정의되어 있습니다.

```env
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=hackathon6-s3
S3_ORIGINALS_PREFIX=originals/
S3_RESULTS_PREFIX=results/
S3_MODELS_PREFIX=models/
S3_PRESIGNED_EXPIRES_SECONDS=600
```

Spring Boot는 `.env` 파일을 기본적으로 자동 로드하지 않습니다. 별도 dotenv 의존성을 추가하지 않고, 로컬 셸에서 `.env` 내용을 환경변수로 내보낸 후 서버를 실행합니다.

```bash
cd backend
cp .env.example .env
set -a
source .env
set +a
./gradlew bootRun
```

Windows PowerShell에서는 현재 터미널 세션에 각 환경변수를 설정하거나 IDE의 Run Configuration 환경변수 항목에 `.env.example`과 같은 변수 이름을 등록한 뒤 `gradlew.bat bootRun`을 실행합니다.

`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 같은 credential은 `.env.example`, 소스 코드 또는 Git에 추가하지 않습니다. 필요한 경우 개발자 로컬 환경이나 AWS가 제공하는 표준 credential 공급 방식을 사용합니다.

### React

`frontend/.env.example`에는 다음 변수가 준비되어 있습니다.

```env
VITE_API_BASE_URL=
```

Vite에서 `VITE_` 접두사가 붙은 값은 브라우저 번들에 노출될 수 있으므로 비밀번호나 비밀 API Key를 넣지 않습니다.

로컬 환경 파일을 만들 때 예제 파일을 복사한 후 실제 로컬 값만 입력합니다.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## 6. `.gitignore` 기본 설정

루트 `.gitignore`에는 다음 항목이 설정되어 있습니다.

```gitignore
# Spring Boot / Gradle
.gradle/
build/
*.class

# React / Vite
node_modules/
dist/

# Environment
.env
.env.*
!.env.example

# IDE
.idea/
.vscode/

# macOS
.DS_Store
```

- `.gradle/`: 로컬 Gradle 캐시 및 작업 파일입니다.
- `build/`, `*.class`: 다시 생성할 수 있는 Java 빌드 결과입니다.
- `node_modules/`: npm으로 다시 설치할 수 있는 의존성입니다.
- `dist/`: Vite 빌드 결과입니다.
- `.env`, `.env.*`: 비밀값이나 개발자별 설정이 들어갈 수 있습니다.
- `!.env.example`: 값이 없는 환경변수 예제는 Git에 포함합니다.
- `.idea/`, `.vscode/`: 개발자별 IDE 설정입니다.
- `.DS_Store`: macOS가 자동 생성하는 메타데이터입니다.

Gradle Wrapper 파일과 `gradle-wrapper.jar`는 팀원이 같은 Gradle 버전을 사용할 수 있도록 Git에 포함합니다.

## 7. Backend / Frontend 실행 방법

저장소를 clone하고 프로젝트 루트로 이동합니다.

```bash
git clone <repository-url>
cd ktb4-ai-agent
```

Backend:

```bash
cd backend
./gradlew bootRun
```

Windows PowerShell:

```powershell
cd backend
.\gradlew.bat bootRun
```

Frontend는 별도 터미널에서 실행합니다.

```bash
cd frontend
npm install
npm run dev
```

## 8. 기본 연결 확인

### Backend

- `bootRun` 로그에 애플리케이션 시작 완료 메시지가 표시되는지 확인합니다.
- 로그에 표시된 포트에서 HTTP 응답이 오는지 확인합니다.
- `/health` API는 없으므로 루트 경로의 `404` 응답은 서버 실행 실패를 의미하지 않습니다.

```bash
curl -i http://localhost:8080/
```

### Frontend

- `npm run dev` 출력에 표시된 URL을 브라우저에서 엽니다.
- 기본 React 화면이 표시되는지 확인합니다.
- 터미널과 브라우저 개발자 도구 Console에 오류가 없는지 확인합니다.

```bash
curl -I http://localhost:5173/
```

## 9. Frontend ↔ Backend 연결 기본 개념

개발 중에는 두 서버가 별도 프로세스로 실행됩니다.

```text
React 개발 서버
http://localhost:5173

        ↓ HTTP API 요청

Spring Boot 서버
http://localhost:8080
```

실제 주소와 포트는 실행 로그를 우선합니다. 서로 다른 출처 간 요청에는 CORS 또는 Vite 개발 프록시 설정이 필요할 수 있지만, 현재는 프론트엔드와 백엔드 연결 코드가 없으므로 관련 설정을 추가하지 않았습니다.

## 10. 초기 세팅 체크리스트

- [x] Java 26 설치 및 버전 확인
- [x] Node.js / npm 설치 및 버전 확인
- [x] Git 설치 확인
- [x] Backend Gradle Wrapper 생성 및 실행 확인
- [x] Spring Boot 기본 테스트 및 빌드 확인
- [x] Spring Boot 개발 서버 실행 확인
- [x] Frontend 의존성 설치
- [x] React lint 및 빌드 확인
- [x] React 개발 서버 실행 확인
- [x] `.env.example` 생성
- [x] `.gitignore` 생성
- [x] Frontend와 Backend 각각 개발 서버 응답 확인
- [ ] 다른 팀원 환경에서도 동일하게 실행 가능한지 확인

## 현재 버전

```text
Java:       26.0.1
Spring Boot: 4.1.0
Gradle:     9.5.1
Node.js:    24.18.0
npm:        11.16.0
React:      19.2.8
Vite:       8.2.1
TypeScript: 6.0.3
```
