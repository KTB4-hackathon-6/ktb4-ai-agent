# AGENTS.md

이 문서는 이 저장소에서 작업하는 코딩 에이전트를 위한 공통 협업 지침이다. 별도의 하위 `AGENTS.md`가 추가되지 않는 한 저장소 전체에 적용한다. 사용자 요청과 저장소의 실제 파일이 이 문서보다 우선한다.

## 프로젝트 개요

외국인 근로자를 위한 계약서 진단·대응 에이전트 프로젝트다. 현재 기본 개발환경은 다음과 같다.

- Backend: Java 26, Spring Boot 4.1.0, Gradle Wrapper
- Frontend: React 19.2.8, Vite 8.2.1, TypeScript 6.0.3, npm
- 공통 설정 및 실행 방법: `SETUP.md`

기능, API, 의존성 또는 인프라가 구현되어 있다고 추정하지 않는다. 작업 전에 실제 파일을 확인한다.

## 디렉터리 역할

- `backend/`: Spring Boot API 서버와 백엔드 테스트
- `frontend/`: React TypeScript 웹 클라이언트
- `ai/`: 분석 로직을 위한 별도 영역
- `docs/`: 설계 및 구현 계획 문서
- `SETUP.md`: 로컬 환경 준비와 실행 방법

요청받은 영역 밖의 파일은 수정하지 않는다. 여러 영역을 함께 변경해야 한다면 그 필요성과 영향을 먼저 설명한다.

## 작업 시작 전

1. 사용자 요청과 성공 조건을 다시 확인한다.
2. 관련 README, `SETUP.md`, 소스, 설정 및 테스트를 읽는다.
3. 실제 파일 구조와 등록된 실행 명령을 확인한다.
4. 작업 전에 다음 명령으로 현재 변경 상태를 확인한다.

```bash
git status --short
```

5. 기존 수정 및 미추적 파일은 사용자나 다른 작업자의 작업으로 간주해 보존한다.

다음 행위는 사용자 승인 없이 수행하지 않는다.

- 기존 변경 되돌리기 또는 삭제
- `git reset --hard`, 강제 checkout 등 복구하기 어려운 Git 명령
- 관련 없는 리팩터링과 대규모 포맷 변경
- 요청 범위 밖의 라이브러리, 기능, API, 데이터베이스 또는 인프라 추가
- commit, push, PR 생성, merge 및 배포

## Backend 작업

### 기본 명령

macOS/Linux에서는 프로젝트에 포함된 Gradle Wrapper를 사용한다.

```bash
cd backend
./gradlew test
./gradlew build
./gradlew bootRun
```

Windows에서는 `gradlew.bat`를 사용한다.

```powershell
cd backend
.\gradlew.bat test
.\gradlew.bat build
.\gradlew.bat bootRun
```

### Backend 규칙

- 시스템 Gradle보다 저장소의 Gradle Wrapper를 우선한다.
- Java toolchain 26과 현재 Spring Boot 버전을 임의로 변경하지 않는다.
- 기존 패키지 `com.ktb4.aiagent` 구조를 따른다.
- 애플리케이션 설정 방식은 `backend/src/main/resources/application.properties`를 따른다.
- 새로운 API, 의존성 또는 설정은 요청에 필요한 최소 범위로 추가한다.
- 변경 중에는 가장 작은 관련 테스트를 실행하고, 완료 전에는 전체 `./gradlew test`와 `./gradlew build`를 실행한다.

## Frontend 작업

### 기본 명령

```bash
cd frontend
npm install
npm run lint
npm run build
npm run dev
```

### Frontend 규칙

- `package.json`과 `package-lock.json`을 기준으로 npm을 사용한다.
- 라우팅, 상태관리, UI 라이브러리 등 새로운 의존성은 요청 없이 추가하지 않는다.
- TypeScript 타입 오류를 우회하기 위해 불필요한 `any`, 타입 단언 또는 검사 비활성화를 추가하지 않는다.
- 기존 React/Vite 구조와 파일 명명 방식을 따른다.
- 변경 중에는 관련 검사를 실행하고, 완료 전에는 `npm run lint`와 `npm run build`를 실행한다.

## 환경변수와 보안

- 실제 환경값은 코드에 하드코딩하지 않는다.
- `.env`와 `.env.*`는 Git에 포함하지 않는다.
- `.env.example`에는 필요한 변수 이름과 공개 가능한 비민감 예시만 기록한다.
- AWS Access Key, Secret Key, 세션 토큰, 비밀번호, 개인 토큰 및 실제 credential을 코드, 문서, 테스트, 로그 또는 Git에 추가하지 않는다.
- 비밀정보가 발견되면 응답에 값을 재출력하지 말고 노출 위치만 보고한다.
- Spring Boot는 `.env` 파일을 기본적으로 자동 로드하지 않는다. 로컬에서는 셸 또는 IDE 실행 설정을 통해 환경변수를 주입한다.

macOS/Linux 로컬 실행 예시:

```bash
cd backend
cp .env.example .env
set -a
source .env
set +a
./gradlew bootRun
```

현재 S3 관련 환경변수 이름과 매핑은 `backend/.env.example`과 `backend/src/main/resources/application.properties`에서 확인한다. S3 기능이나 AWS SDK가 실제로 추가되어 있다고 추정하지 않는다.

## 구현과 테스트

- 기능 또는 동작 변경은 가능한 경우 테스트를 먼저 작성한다.
- 새 테스트가 변경 전 기대한 이유로 실패하는지 확인한 후 최소 구현을 작성한다.
- 테스트는 실제 사용자 또는 시스템 동작을 검증하고 구현 세부사항만 고정하지 않는다.
- 생성 코드나 순수 설정처럼 테스트 우선 적용이 부적절한 경우 사용자와 대체 검증 방법을 합의한다.
- 버그를 수정할 때는 가능하면 문제를 재현하는 회귀 테스트를 먼저 추가한다.
- 기존 패턴을 따르고 변경을 작고 집중된 단위로 유지한다.
- 요청하지 않은 추상화, 최적화, 호환 계층 또는 미래 기능을 미리 추가하지 않는다.
- 테스트 실패가 발생하면 원인을 확인한 뒤 수정한다. 검증을 생략하거나 실패를 숨기지 않는다.

## GitHub 협업 컨벤션

### 브랜치

- `main`에 직접 push하지 않고 작업별 브랜치를 사용한다.
- 브랜치 이름은 `<type>/<short-description>` 형식을 사용한다.
- type은 `feat`, `fix`, `refactor`, `test`, `docs`, `chore` 중 하나를 사용한다.
- short-description은 소문자 영문과 하이픈으로 간결하게 작성한다.
- 예: `feat/s3-upload`, `docs/update-setup-guide`
- 공유 브랜치의 이력을 임의로 재작성하거나 force push하지 않는다.

### 커밋

- Conventional Commits의 `<type>: <summary>` 형식을 사용한다.
- type은 `feat`, `fix`, `refactor`, `test`, `docs`, `chore` 중 하나를 사용한다.
- summary는 명령형으로 간결하게 작성하고 끝에 마침표를 붙이지 않는다.
- 예: `feat: add S3 upload configuration`
- 하나의 커밋에는 하나의 논리적 변경만 포함한다.
- 관련 없는 수정, 생성 결과물, `.env` 또는 비밀정보를 커밋에 섞지 않는다.
- 커밋 전 변경 범위에 맞는 테스트와 정적 검사를 실행한다.

### Pull Request

- 하나의 PR에는 하나의 목적만 담고 리뷰 가능한 크기로 유지한다.
- PR 본문에는 다음 내용을 포함한다.

  - 변경 요약
  - 변경 이유
  - 주요 변경 파일
  - 실행한 검증 명령과 결과
  - 환경변수, 마이그레이션 또는 호환성 영향
  - 남은 작업과 알려진 제한사항

- 완료되지 않은 작업은 Draft PR로 생성한다.
- 리뷰 의견의 반영 여부와 이유를 명확히 남긴다.
- 필수 승인과 검증이 완료되기 전에 merge하지 않는다.
- 충돌을 해결할 때 다른 작업자의 변경을 임의로 삭제하지 않는다.
- credential, `.env`, 개인 IDE 설정, 의존성 캐시 및 빌드 결과물을 PR에 포함하지 않는다.

현재 저장소에 GitHub Actions, PR/Issue 템플릿 또는 CODEOWNERS가 추가되면 해당 파일의 규칙도 확인한다. 이 파일들을 요청 없이 새로 만들지 않는다.

## 완료 전 검증

변경 영역에 따라 다음 최소 검증을 수행한다.

Backend 변경:

```bash
cd backend
./gradlew test
./gradlew build
```

Frontend 변경:

```bash
cd frontend
npm run lint
npm run build
```

문서 또는 설정 변경:

- 문서의 경로, 버전, 명령이 실제 파일과 일치하는지 확인한다.
- `git diff --check`로 공백 오류를 확인한다.
- 환경변수 및 credential이 노출되지 않았는지 확인한다.

공통:

```bash
git diff --check
git status --short
```

검증 명령을 실행할 수 없으면 성공한 것처럼 표현하지 말고, 실행하지 못한 명령과 이유를 보고한다.

## 결과 보고

최종 보고는 간결하게 다음 내용을 포함한다.

- 변경한 파일
- 각 변경의 이유
- 실행한 검증 명령과 결과
- 실행하지 못한 검증과 이유
- 알려진 제한사항 또는 사용자가 이어서 해야 할 작업

추정이나 계획이 아니라 실제 작업 결과를 기준으로 보고한다.
