---
name: audit-foreign-worker-ui
description: Audit a screen, screenshot, prototype, or live web flow for complexity and usability from a foreign worker perspective. Use when Codex is asked whether a UI is confusing, crowded, difficult, multilingual enough, accessible to migrant workers, or suitable for users with limited Korean proficiency, limited digital literacy, older or low-end mobile devices, or stressful labor and administrative tasks.
---

# Audit Foreign Worker UI

Evaluate UI complexity with observable evidence. Treat the result as a heuristic expert review, not a substitute for usability testing with actual foreign workers.

## Workflow

1. Establish the primary user goal and the shortest successful path.
2. Inspect the actual rendered UI before judging it.
   - For a live app, capture screenshots at mobile width around 360–390 px and at one desktop width.
   - Exercise the main interaction flow when safe and available.
   - For supplied screenshots or mockups, inspect every relevant state.
   - If only source code is available, state that visual confidence is limited.
3. Evaluate the baseline personas below without assuming nationality determines ability.
4. Score each audit dimension and identify task blockers.
5. Report evidence, affected users, and the smallest useful improvement.

Do not modify the UI unless the user explicitly asks for implementation.

## Baseline Personas

Consider at least these conditions together:

- Beginner Korean proficiency and reliance on a preferred language.
- Low or uneven digital literacy, including unfamiliarity with Korean administrative patterns.
- Mobile-first use on a small or low-performance Android device.
- High-stress use involving wages, contracts, immigration, deadlines, or employer conflict.
- Possible visual, motor, reading, or age-related accessibility needs.

Do not invent cultural preferences or claim findings represent all foreign workers. Describe which condition makes an issue harmful.

## Required Task Checks

For this project, verify whether a user can:

1. Choose a language without reading Korean first.
2. Understand what the service can do and select one primary action.
3. Upload or provide a document and recover from an error.
4. distinguish status, warning, and required action without relying only on color.
5. Understand the next step after a diagnosis.
6. Reach a human counselor or emergency help without finishing unrelated steps.
7. Return, cancel, or change an earlier choice without losing orientation.

If a requested screen does not include a task, mark it not observed rather than failed.

## Audit Dimensions

Score each dimension from 0 to 3:

- `0 — Clear`: no meaningful barrier observed.
- `1 — Minor`: brief hesitation is likely, but the task remains easy.
- `2 — Major`: misunderstanding, repeated reading, or assistance is likely.
- `3 — Blocking`: users may abandon, choose incorrectly, or miss urgent help.

Evaluate:

- **Language entry:** language choice visibility, plain wording, translation consistency, and untranslated Korean.
- **Information load:** number of simultaneous choices, bilingual duplication, paragraph length, progressive disclosure.
- **Navigation and state:** current step, back/cancel behavior, selected state, progress, and recovery.
- **Action clarity:** one obvious primary action, specific button labels, and separation of destructive or secondary actions.
- **Forms and documents:** accepted formats, examples, required fields, upload feedback, error recovery, and privacy expectations.
- **Risk communication:** plain-language consequences, deadlines, severity labels, next actions, and non-color cues.
- **Accessibility and mobile use:** target size, contrast, text scaling, focus order, screen-reader labels, scrolling, and keyboard behavior.

Calculate the mean score only as a summary:

- `0.0–0.7`: 단순함
- `0.8–1.5`: 보통
- `1.6–2.2`: 복잡함
- `2.3–3.0`: 매우 복잡함

A single blocking issue overrides the mean: clearly label the flow as blocked for the affected condition.

## Evidence Rules

- Tie every finding to a visible element, state, or tested interaction.
- Distinguish observation from inference.
- Do not penalize multilingual text merely for existing; penalize it only when presentation increases scanning or ambiguity.
- Do not claim a translation is correct unless it was verified. Flag unverified or inconsistent translation separately.
- Prioritize task completion and safety over visual preference.
- Avoid vague advice such as “make it cleaner.” Name the element and the intended change.

## Output Format

Respond in Korean unless the user requests another language.

Start with:

```text
판정: 단순함 | 보통 | 복잡함 | 매우 복잡함
평균 점수: X.X / 3.0
신뢰도: 높음 | 중간 | 낮음
한 줄 이유: ...
```

Then provide:

### 핵심 발견

| 심각도 | 화면·요소 | 관찰 근거 | 영향받는 조건 | 개선안 |
|---|---|---|---|---|

List blocking and major findings first. Include minor findings only when actionable.

### 항목별 점수

List all seven audit dimensions with a score and one-sentence rationale.

### 우선 수정 순서

Provide at most five actions, ordered by user harm and implementation leverage. Separate immediate fixes from changes that require user research.

### 확인하지 못한 항목

List missing states, languages, device conditions, or real-user evidence. Explicitly recommend testing with representative foreign workers for high-risk decisions.
