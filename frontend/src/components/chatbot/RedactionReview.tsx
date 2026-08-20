import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createNormalizedBox, isUsableBox } from '../../redaction/geometry'
import type { NormalizedBox, RedactionPage } from '../../redaction/types'

type RedactionReviewProps = {
  pages: RedactionPage[]
  exporting: boolean
  error: string | null
  onPagesChange: (pages: RedactionPage[]) => void
  onCancel: () => void
  onSubmit: () => void
}

function RedactionReview({
  pages,
  exporting,
  error,
  onPagesChange,
  onCancel,
  onSubmit,
}: RedactionReviewProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [draft, setDraft] = useState<NormalizedBox | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const page = pages[pageIndex]
  const allConfirmed = pages.every((item) => item.confirmed)
  const confirmedCount = pages.filter((item) => item.confirmed).length

  const pageLabel = useMemo(
    () => `${pageIndex + 1} / ${pages.length}`,
    [pageIndex, pages.length],
  )

  const updatePage = (updater: (current: RedactionPage) => RedactionPage) => {
    onPagesChange(pages.map((item, index) => index === pageIndex ? updater(item) : item))
  }

  const coordinatesFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    }
  }

  const startDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (exporting || event.button !== 0) return
    const start = coordinatesFromEvent(event)
    dragStart.current = start
    setDraft(createNormalizedBox(start.x, start.y, start.x, start.y))
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const continueDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const current = coordinatesFromEvent(event)
    setDraft(createNormalizedBox(dragStart.current.x, dragStart.current.y, current.x, current.y))
  }

  const finishDrawing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const current = coordinatesFromEvent(event)
    const box = createNormalizedBox(dragStart.current.x, dragStart.current.y, current.x, current.y)
    dragStart.current = null
    setDraft(null)
    if (!isUsableBox(box)) return
    updatePage((currentPage) => ({
      ...currentPage,
      confirmed: false,
      regions: [...currentPage.regions, {
        id: crypto.randomUUID(),
        box,
      }],
    }))
  }

  const addKeyboardRegion = () => {
    updatePage((currentPage) => ({
      ...currentPage,
      confirmed: false,
      regions: [
        ...currentPage.regions,
        {
          id: crypto.randomUUID(),
          box: { x: 0.35, y: 0.45, width: 0.3, height: 0.1 },
        },
      ],
    }))
  }

  const removeRegion = (regionId: string) => {
    updatePage((currentPage) => ({
      ...currentPage,
      confirmed: false,
      regions: currentPage.regions.filter((region) => region.id !== regionId),
    }))
  }

  return (
    <section className="panel redaction-review" aria-labelledby="redaction-title">
      <header className="redaction-header">
        <div>
          <span className="privacy-status">기기에서 처리 중 / On-device only</span>
          <h2 id="redaction-title">서버로 보내기 전에 민감정보를 가려주세요</h2>
          <p>이 화면을 완료하기 전에는 문서가 서버에 전송되지 않습니다.</p>
        </div>
        <strong>{confirmedCount}/{pages.length} 페이지 확인</strong>
      </header>

      <div className="redaction-toolbar">
        <button
          className="ghost-button"
          type="button"
          disabled={pageIndex === 0 || exporting}
          onClick={() => setPageIndex((current) => current - 1)}
        >
          이전
        </button>
        <strong>{pageLabel}</strong>
        <button
          className="ghost-button"
          type="button"
          disabled={pageIndex === pages.length - 1 || exporting}
          onClick={() => setPageIndex((current) => current + 1)}
        >
          다음
        </button>
        <label className="zoom-control">
          확대
          <input
            type="range"
            min="0.75"
            max="1.75"
            step="0.25"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="redaction-workspace">
        <div className="redaction-document-scroll">
          <div
            className="redaction-page"
            style={{ width: `${zoom * 100}%` }}
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={() => {
              dragStart.current = null
              setDraft(null)
            }}
          >
            <img src={page.previewUrl} alt={`확인 중인 문서 ${pageIndex + 1}페이지`} draggable="false" />
            {page.regions.map((region, index) => (
              <span
                className="redaction-region"
                key={region.id}
                style={{
                  left: `${region.box.x * 100}%`,
                  top: `${region.box.y * 100}%`,
                  width: `${region.box.width * 100}%`,
                  height: `${region.box.height * 100}%`,
                }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
            ))}
            {draft && (
              <span
                className="redaction-region draft"
                style={{
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.width * 100}%`,
                  height: `${draft.height * 100}%`,
                }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <aside className="redaction-sidebar">
          <h3>이 페이지의 가림 영역</h3>
          <p>이름, 번호, 개인 주소, 서명과 도장을 문서 위에서 직접 드래그해 가려주세요.</p>
          <button className="ghost-button" type="button" onClick={addKeyboardRegion} disabled={exporting}>
            가림 영역 추가
          </button>
          {page.regions.length === 0 ? (
            <p className="redaction-empty">추가된 가림 영역이 없습니다.</p>
          ) : (
            <ol className="redaction-region-list">
              {page.regions.map((region, index) => (
                <li key={region.id}>
                  <span>영역 {index + 1}</span>
                  <button type="button" onClick={() => removeRegion(region.id)} disabled={exporting}>삭제</button>
                </li>
              ))}
            </ol>
          )}
          <button
            className={page.confirmed ? 'page-confirmed-button' : 'primary-button'}
            type="button"
            onClick={() => updatePage((currentPage) => ({ ...currentPage, confirmed: true }))}
            disabled={exporting}
          >
            {page.confirmed ? '✓ 이 페이지 확인됨' : '이 페이지 확인 완료'}
          </button>
        </aside>
      </div>

      {error && <p className="inline-error" role="alert">{error}</p>}
      <footer className="panel-actions redaction-actions">
        <button className="ghost-button" type="button" onClick={onCancel} disabled={exporting}>
          취소하고 파일 다시 선택
        </button>
        <button className="primary-button" type="button" onClick={onSubmit} disabled={!allConfirmed || exporting}>
          {exporting ? '가공본 만드는 중…' : '가린 문서로 분석 시작'}
        </button>
      </footer>
    </section>
  )
}

export default RedactionReview
