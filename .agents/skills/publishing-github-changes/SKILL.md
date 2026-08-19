---
name: publishing-github-changes
description: Use when local repository changes are ready to be organized into a branch, commit, push, or GitHub Pull Request, especially before changing remote Git state
---

# Publishing GitHub Changes

## Overview

Publish one reviewed change set safely. Mutate state only after explicit approval.

## Output Language

Write all user-facing natural-language text in Korean. This includes progress updates, blocked responses, questions, contract labels, verification descriptions, commit summaries, PR titles, and PR bodies. Keep code, commands, file paths, branch names, identifiers, and unavoidable tool output in their original form.

## Workflow

1. Read applicable `AGENTS.md` and contribution guides.
2. Inspect status, diffs, untracked names, branch/upstream, recent commits, remotes/default base, related branches/PRs, and `gh auth status`.
3. Stop on mixed scope, suspected secrets, failed checks, ambiguous base/remote, missing authentication, duplicates, or no changes. Reply only `차단됨: <이유>` and `질문: <차단 해제를 위한 질문 하나>`, then end. Never include commands or next actions. For suspected secrets, leave files untouched and ask the user to remove, ignore, or rotate them.
4. Run prescribed tests, lint, and build. Never call a failure flaky without evidence.
5. Present this contract in order and wait:

```text
기준 브랜치:
새 브랜치:
스테이징할 파일:
검증:
커밋 메시지:
PR 제목:
PR 본문:
브랜치 생성, 커밋, 푸시 및 PR 생성을 승인하시겠습니까? (예/아니요)
```

Earlier approval does not approve this contract. Require a clear yes afterward.

6. After approval, create the branch; stage approved paths explicitly; inspect `git diff --cached`; commit; push without force; run `gh pr create` with the approved draft.
7. Report branch, commit SHA/message, verification, PR URL, and limitations.

For a branch name, commit message, or PR draft only, produce only that artifact.

## Hard Safety Rules

- Never use `git add -A` or `git add .`.
- Never stage secrets, `.env`, unrelated changes, caches, or outputs.
- Never use force push, destructive reset/checkout, or history rewriting.
- Never guess a base, fabricate a PR URL, or bypass failed checks.
- Never commit, push, or open a PR before the post-preview approval.

## Example

```text
기준 브랜치: main
새 브랜치: docs/update-setup-guide
스테이징할 파일:
- AGENTS.md
- SETUP.md
검증: git diff --check (통과)
커밋 메시지: docs: 협업 및 설정 가이드 업데이트
PR 제목: docs: 협업 및 설정 가이드 업데이트
PR 본문:
## 변경 요약
- 협업 및 로컬 설정 안내 업데이트
## 검증
- git diff --check
## 제한사항
- 런타임 변경 없음
브랜치 생성, 커밋, 푸시 및 PR 생성을 승인하시겠습니까? (예/아니요)
```

## Quick Reference

| State | Action |
|---|---|
| Any stop condition | Output only the two-line blocked template |
| Draft approved | Execute exactly the approved contract |

## Common Mistakes

| Rationalization | Correction |
|---|---|
| “The user said commit everything.” | Mixed changes still require explicit path selection. |
| “The repo is private.” | Secret commits remain unsafe. |
| “Tests are flaky.” | Reproduce; do not publish unexplained failures. |
| “The PR was requested.” | Obtain post-preview approval. |

## Red Flags

Stop before bulk staging, skipped checks, guessing, secret exposure, or premature action.
