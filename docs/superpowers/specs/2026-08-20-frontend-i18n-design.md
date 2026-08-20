# 프론트엔드 정적 UI i18n 도입 설계

- 상태: 프론트엔드 구현 완료 (번역 검수 대기)
- 작성일: 2026-08-20
- 관련 사전조사: 대화 내 조사 결과 (i18n 현황 grep 기반 분석, 별도 문서화하지 않음)

## 배경 및 목표

이 서비스는 외국인 근로자를 위한 근로계약서 분석/상담 서비스로, AI 응답
(`answer` 등 자유 텍스트)은 이미 `preferredLanguage` 파라미터를 통해 LLM
컨텍스트에 전달되어 사실상 사용자가 선택한 언어로 생성되고 있다. 반면
**정적 UI 텍스트(버튼, 안내문, 헤딩, 에러 메시지 등)는 언어 선택과 무관하게
항상 한국어(+ 일부는 영어 병기)로 고정 렌더링**된다. 이 설계는 정적 UI 텍스트를
사용자가 선택한 언어로 표시되도록 i18n 라이브러리를 도입하는 것을 목표로 한다.

프론트엔드에는 `frontend/src/i18n/frontend-hardcoded-texts.json`에 현재 화면의 228개
하드코딩 텍스트 항목이 인벤토리로 정리되어 있고(`key`, `sources`, `kind`,
`values.ko`, `machineTranslations`), 각 항목마다 Google Translate 기계번역이
포함되어 있다(미검수 상태).

## 지원 언어 확정

현재 프론트엔드·백엔드·AI 요청 계약이 공통으로 지원하는 언어는
**캄보디아어(km), 베트남어(vi), 태국어(th), 인도네시아어(id), 몽골어(mn),
영어(en), 한국어(ko)** 7개다. 이번 작업은 AI와 백엔드 계약을 변경하지 않는다는
범위 제약에 따라 이 실제 계약을 기준으로 구현한다. 네팔어(ne)와 미얀마어(my)는
세 서버의 계약을 함께 변경할 수 있는 후속 작업에서 검토한다.

## 범위

**포함**
- `react-i18next` + `i18next` 도입 및 배선.
- `frontend-hardcoded-texts.json`을 7개 로케일 리소스 JSON으로 변환.
- 언어 선택 상태를 `i18next` 단일 소스로 통합, `localStorage` 영속화.
- 하드코딩된 정적 UI 텍스트를 `t()` 호출로 교체.
- `<html lang>` 동적 갱신.

**제외**
- 번역 품질 검수(현재 기계번역은 미검수 상태로 그대로 출시, 검수는 후속 작업).
- 백엔드 에러 메시지 다국어화(`ErrorCode` 등) — 별도 설계로 분리.
- AI 응답 언어 제어 메커니즘 변경 — 이미 동작 중이므로 이번 설계에서 손대지
  않는다.

## 아키텍처

```
frontend/src/i18n/
  ├── index.ts          # i18next.init(), languageDetector 플러그인,
  │                      # <html lang> 동기화, 커스텀 interpolation prefix/suffix
  ├── locales/
  │   ├── ko.json
  │   ├── en.json
  │   ├── vi.json
  │   ├── id.json
  │   ├── km.json
  │   ├── th.json
  │   └── mn.json
  └── frontend-hardcoded-texts.json   # 로케일 리소스에서 생성하는 감사용 인벤토리
```

한국어 로케일을 기준으로 `npm run i18n:generate`를 실행해 6개 기계번역 리소스와
감사용 `frontend-hardcoded-texts.json`을 생성한다. 컴포넌트에서는
`useTranslation()` 훅과 `t('app.analysis.requestPrompt')` 형태의 키 조회로 사용한다.

## 언어 코드 정합성

`types/chatbot.ts`와 실제 백엔드·AI 요청 계약의 7개 코드
(`km`, `vi`, `th`, `id`, `mn`, `ko`, `en`)를 단일 기준으로 사용한다. 프론트엔드
정적 UI와 API의 `preferredLanguage`에 동일한 정규화 값을 전달한다.

## Interpolation 문법

인벤토리의 placeholder 문법은 `{count}`(단일 중괄호)인데, i18next 기본
interpolation 문법은 `{{count}}`(이중 중괄호)다. 모든 항목의 문자열을 일일이
바꾸는 대신, i18next 초기화 시 `interpolation.prefix`를 `{`, `suffix`를 `}`로
커스텀 설정해 기존 데이터를 그대로 재사용한다.

## 전역 언어 상태 전환

- `App.tsx`의 `detectDeviceLanguage()` 함수와 로컬
  `useState<PreferredLanguage>`를 제거하고, `i18next-browser-languagedetector`
  플러그인으로 대체한다. 이 플러그인이 `localStorage` 캐싱과
  `navigator.language` 기반 자동 감지(및 미지원 언어 시 폴백)를 표준 처리한다.
- `i18n.language`가 언어 상태의 유일한 source of truth가 된다. `ChatHeader`의
  언어 선택 UI는 `i18n.changeLanguage(code)` 호출로 통일한다.
- 이 값은 그대로 `analyzeContract` API 호출의 `preferredLanguage` 파라미터로
  재사용한다 — 두 스키마가 이미 동일한 7개 코드 체계이므로 별도 매핑이
  필요 없다.
- `i18n.on('languageChanged', (lng) => { document.documentElement.lang = lng })`로
  `<html lang>` 속성을 갱신한다.

## 컴포넌트 마이그레이션

- 기존 컴포넌트의 한국어 본문 + 영어 보조 표기 동시 렌더링을 `t(key)` 기반
  단일 언어 렌더링으로 전환한다. 7개 언어를 지원하는 상황에서 두 언어를 항상
  동시에 보여주는 것은 적절하지 않다.
- 그 외 하드코딩된 리터럴(버튼 라벨, 안내문, 헤딩, 에러 메시지 등)을
  인벤토리의 `key` 값을 그대로 사용해 `t()` 호출로 교체한다.
- `variables`가 있는 항목(`count`, `total`, `processed`, `value`, `fields` 등)은
  `t('key', { count, total, ... })` 형태로 인터폴레이션 값을 전달한다.
- 번역 키 누락 시 `fallbackLng: 'ko'`로 설정해 빈 키 대신 한국어로 폴백한다.

## 테스트 전략

- **Vitest**: 7개 로케일 JSON 파일이 서로 동일한 키 집합을 갖는지 검증하는
  완전성 테스트를 작성한다(빌드/CI 단계에서 번역 누락을 잡아낸다).
- **브라우저 수동 검증**: 7개 언어로 전환하며 UI 텍스트, `<html lang>` 속성,
  `analyzeContract` API에 전달되는 `preferredLanguage` 파라미터가 모두
  올바르게 바뀌는지 확인한다.

## 미해결 리스크 요약

1. 기계번역 품질은 검수되지 않은 상태로 그대로 출시한다 — 정확도 이슈는
   후속 작업(네이티브 스피커 검수)에서 다룬다.
2. 인벤토리는 현재 화면과 수동 마스킹 흐름을 포함해 다시 생성했지만, 이후 정적
   문자열이 추가되면 로케일 리소스와 인벤토리를 함께 갱신해야 한다.
3. 네팔어와 미얀마어 추가는 프론트엔드만의 변경으로 끝나지 않으므로 백엔드·AI
   계약 변경 권한이 확보된 뒤 별도 작업으로 진행한다.
