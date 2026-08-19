# GitHub 변경사항 게시 스킬 설계

## 목표

현재 저장소의 변경사항을 안전하게 검토하고, 협업 컨벤션에 맞는 브랜치·커밋·Pull Request를 생성하는 프로젝트 공유 Codex 스킬을 만든다.

## 위치와 구성

```text
.agents/skills/publishing-github-changes/
├── SKILL.md
└── agents/
    └── openai.yaml
```

별도 실행 스크립트, README, GitHub Actions, PR 템플릿은 만들지 않는다. 저장소마다 변경 범위와 검증 명령이 다르므로 스킬은 고정 스크립트 대신 판단 가능한 워크플로 지침을 제공한다.

## Trigger

다음과 같은 요청에서 사용한다.

- 현재 변경사항으로 브랜치를 생성해 달라는 요청
- 커밋 메시지를 작성하고 커밋해 달라는 요청
- PR 제목이나 본문을 작성해 달라는 요청
- 변경사항을 push하고 GitHub Pull Request를 열어 달라는 요청
- 구현이 끝난 작업을 GitHub 협업 흐름으로 게시해 달라는 요청

단순 Git 설명, 코드 작성, 리뷰만 요청한 경우에는 사용하지 않는다.

## 핵심 원칙

GitHub 게시 전에 변경 범위, 검증 상태, 비밀정보, base branch와 remote를 확인한다. 실행 전 사용자에게 최종 작업안을 한 번 보여주고 명시적 승인을 받은 뒤 외부 상태를 변경한다.

## 워크플로

1. 저장소 지침과 상태를 확인한다.
   - 루트 및 적용 범위의 `AGENTS.md`
   - `git status --short`
   - 현재 브랜치와 upstream
   - remote URL과 기본 브랜치
   - staged/unstaged/untracked diff
   - `gh auth status`
2. 변경사항을 하나의 논리적 PR로 묶을 수 있는지 판단한다.
3. credential, `.env`, 대용량 생성물, 관련 없는 변경을 탐지한다.
4. 저장소 지침에 따른 관련 테스트·lint·build를 실행한다.
5. 변경 내용에서 다음 초안을 생성한다.
   - `<type>/<short-description>` 브랜치
   - `<type>: <summary>` 커밋 메시지
   - 커밋에 포함할 명시적 파일 목록
   - PR 제목
   - 변경 요약, 이유, 검증, 환경 영향, 제한사항을 포함한 PR 본문
6. base branch, 브랜치명, 파일 목록, 커밋 메시지, PR 제목·본문을 사용자에게 보여주고 승인을 요청한다.
7. 승인 후에만 브랜치 생성, 명시적 staging, commit, push, `gh pr create`를 수행한다.
8. PR URL, 브랜치, 커밋 SHA, 검증 결과를 보고한다.

## 안전 중단 조건

다음 상황에서는 실행을 중단하고 사용자에게 선택을 요청한다.

- 변경사항이 없거나 이미 모두 커밋됨
- 관련 없는 변경이 섞여 하나의 PR 범위가 불명확함
- credential, token, `.env` 또는 비밀값 의심 파일 발견
- 관련 테스트·lint·build 실패
- base branch 또는 remote가 불명확함
- GitHub CLI가 없거나 인증되지 않음
- 이미 같은 목적의 브랜치 또는 PR이 존재함
- 브랜치 이름이나 커밋 메시지를 신뢰성 있게 도출할 정보가 부족함

## 금지 사항

- `git add -A`, `git add .`로 범위를 확인하지 않은 전체 staging
- `git reset --hard`, 강제 checkout, 사용자 변경 삭제
- force push 또는 공유 브랜치 이력 재작성
- 테스트 실패를 무시한 commit, push 또는 PR 생성
- credential이나 `.env`를 commit 또는 PR 본문에 포함
- 사용자 승인 전 commit, push, PR 생성
- base branch를 추측한 merge 또는 PR 생성

## 출력 계약

승인 전 제안은 다음 순서를 따른다.

1. Base branch
2. New branch
3. Files to stage
4. Verification
5. Commit message
6. PR title
7. PR body
8. 승인 질문

완료 보고는 다음을 포함한다.

1. 생성 브랜치
2. commit SHA와 메시지
3. 실행한 검증과 결과
4. PR URL
5. 남은 제한사항 또는 후속 작업

## 테스트 전략

스킬 작성 전 무스킬 기준 시나리오를 실행해 다음 실패가 실제로 발생하는지 확인한다.

- 시간 압박에서 검증 없이 commit/push를 시도함
- 혼합 변경을 모두 stage함
- base branch나 PR 범위를 추측함
- credential 의심 파일을 충분히 검사하지 않음
- 사용자 승인 없이 외부 상태를 변경하려 함

스킬 작성 후 같은 시나리오에서 중단 조건과 출력 계약을 지키는지 검증한다. 실제 remote push나 PR 생성은 테스트하지 않고, 격리된 임시 Git 저장소 또는 읽기 전용 시나리오로 행동 결정을 평가한다.

## 완료 기준

- 이름과 frontmatter가 스킬 규격을 충족한다.
- `agents/openai.yaml`이 SKILL.md와 일치한다.
- 무스킬 기준 실패와 스킬 적용 개선이 기록된다.
- `quick_validate.py` 검증을 통과한다.
- 스킬 적용 테스트에서 사용자 승인 전 외부 변경을 하지 않는다.
- 저장소의 기존 변경과 미추적 파일을 훼손하지 않는다.
