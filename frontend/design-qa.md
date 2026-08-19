# 노동나침반 상담봇 Design QA

## Comparison target

- Source visual truth: `/Users/Yihyun_1/Downloads/선택형 챗봇 디자인.zip`의 `노동나침반.dc.html`
- Source capture: `/private/tmp/labor-compass-reference.png`
- Implementation screenshot: `/private/tmp/labor-compass-implementation-v3.png`
- Full comparison evidence: `/private/tmp/labor-compass-comparison.png`
- Focused comparison evidence: `/private/tmp/labor-compass-comparison-focus.png`
- Mobile evidence: `/private/tmp/labor-compass-implementation-mobile-final.png`
- Interaction evidence: `/private/tmp/labor-compass-interaction-final.png`
- State: 최초 언어 선택 화면, 밝은 테마
- Viewport: 640 × 450 CSS px, `deviceScaleFactor: 1`
- Source pixels: 640 × 450
- Implementation pixels: 640 × 450
- Density normalization: 동일 CSS 크기와 1× 픽셀 밀도로 캡처하여 추가 리사이징 없음

## Findings

- 최종 비교에서 남은 P0/P1/P2 불일치는 없다.
- Fonts and typography: 원본과 동일한 Noto Sans KR/Noto Sans 계열, 크기, 굵기, 줄 높이 및 한·영 계층을 사용한다. 일부 다국어 칩의 브라우저별 글리프 폭 차이는 줄바꿈이나 조작 영역을 해치지 않는 P3 수준이다.
- Spacing and layout rhythm: 640 × 450에서 헤더, 20px 채팅 패딩, 36px 선택지 들여쓰기, 14px 세로 간격, 하단 작성창 위치와 버튼 폭이 원본과 일치한다.
- Colors and visual tokens: `#1f6f5c` 주 색상, `#f5f4f0` 메시지 배경, `#fbfaf7` 헤더/작성창 배경, `#e4e1da` 경계선을 원본과 동일하게 사용한다.
- Image quality and asset fidelity: 최초 화면에는 별도 래스터 이미지가 없다. 원본의 N 아바타와 상태 표시는 동일한 UI 요소로 재현했고, 원본이 기능 버튼 텍스트에 직접 사용한 기호만 동일하게 유지했다.
- Copy and content: 최초 화면의 한국어/영어 문구, 언어 목록, 진행 단계, 입력창 문구가 원본과 일치한다.
- Responsive behavior: 390 × 844에서 문서와 앱 셸의 너비가 모두 390px이며 수평 문서 오버플로가 없다. 언어 칩은 행 단위로 줄바꿈되고 고정 전송 버튼은 완전히 노출된다.

## Full-view comparison evidence

- `/private/tmp/labor-compass-comparison.png`에서 왼쪽 원본과 오른쪽 구현을 동일한 640 × 450 크기로 배치해 전체 구성, 헤더 비율, 메시지 위치, 선택지 밀도와 작성창을 비교했다.
- 헤더 하단선, 첫 메시지 시작점, 입력창의 상하 위치와 주요 색상은 동일하다.

## Focused region comparison evidence

- `/private/tmp/labor-compass-comparison-focus.png`에서 상단 260px을 1:1로 비교해 아바타, 브랜드 텍스트, 진행 단계, 메시지 타이포그래피, 언어 칩의 패딩·라운드·경계선을 확인했다.
- 하단 작성창은 전체 비교에서 원본과 구현의 좌우 여백, 입력 높이, 전송 버튼 위치가 직접 읽힐 만큼 선명해 별도 확대가 필요하지 않았다.

## Primary interactions tested

- 언어 선택 후 네 가지 주요 요청 옵션 노출
- 근로계약서 데모 분석의 대기 → 분석 중 → 진단 완료 상태 전환
- 진단 조항 펼치기/접기
- 근무 실태 질문 3단계 답변과 결과 문서 생성
- 확인요청문/사건요약 탭 전환
- 증거자료 체크 항목 선택
- 상담기관 연결 화면과 진단 요약 공유 동의
- 자유 입력 폼 제출 가능 상태
- 브라우저 콘솔 오류: 없음

## Comparison history

1. 첫 비교에서 640px 화면에도 모바일 패딩이 적용되어 메시지와 작성창이 원본보다 6px 안쪽으로 들어간 P2 차이를 확인했다. 반응형 기준을 520px로 낮추고 외곽 테두리, 헤더 높이, 전송 버튼 폭을 조정했다. 수정 후 `/private/tmp/labor-compass-comparison.png`에서 원본 좌표와 비율이 일치함을 확인했다.
2. 390px 모바일 캡처에서 언어 칩 내용과 전송 버튼이 오른쪽에서 잘리는 P2 문제를 확인했다. 칩을 줄바꿈 가능한 고정 폭 flex 항목으로 만들고 입력의 강제 100% 폭을 제거했다. 수정 후 문서 `scrollWidth`가 390px이고 작성창 버튼의 오른쪽 좌표가 378px임을 확인했다.

## Implementation checklist

- [x] 원본 초기 화면과 1:1 비교
- [x] 데스크톱 P0/P1/P2 수정
- [x] 모바일 오버플로 수정
- [x] 핵심 흐름 실제 브라우저 테스트
- [x] 브라우저 콘솔 오류 확인
- [x] 린트 및 프로덕션 빌드 통과

## Follow-up polish

- 브라우저와 언어별 글꼴 로딩 시 일부 비라틴 언어 칩의 폭이 2~6px 달라질 수 있으나 레이아웃과 사용성에는 영향이 없다.

final result: passed
