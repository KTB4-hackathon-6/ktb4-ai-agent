import { motion } from 'framer-motion'
import illoMascot from '../../assets/illo-mascot.png'
import { confirmQuestions, judgmentLimits, supportChannels } from '../../mocks/chatbot'
import type { FlowState } from '../../types/chatbot'

/**
 * 데스크톱 화면의 오른쪽 안내 영역.
 * ILLO_SERVICE_SPEC 3. 화면 구성 — 현재 단계에서 무엇을 하는지와 판단 제한을 항상 함께 보여준다.
 */
const guideByState: Record<FlowState, { title: string; body: string }> = {
  UPLOAD: {
    title: '지금 하는 일',
    body: '근로계약서와 급여명세서를 올리면 두 문서를 비교합니다. 한 문서만 있어도 시작할 수 있습니다.',
  },
  ANALYZING: {
    title: '지금 하는 일',
    body: '문서의 글자를 읽고 항목을 정리하는 중입니다. 창을 닫지 말고 기다려 주세요.',
  },
  REVIEW: {
    title: '지금 하는 일',
    body: '항목별 결과를 보고, 추가 확인 질문에 답하면 결과가 더 정확해집니다.',
  },
  REVIEW_UPDATING: {
    title: '지금 하는 일',
    body: '방금 답한 내용을 결과에 반영하고 있습니다.',
  },
  DRAFTING: {
    title: '지금 하는 일',
    body: '노동포털 진정서(SN001) 항목을 채우는 단계입니다. 비어 있는 항목만 입력하면 됩니다.',
  },
  DRAFT_READY: {
    title: '지금 하는 일',
    body: '초안을 확인하고 내려받는 단계입니다. 접수는 기관에서 직접 진행합니다.',
  },
  AGENCY: {
    title: '지금 하는 일',
    body: '문제 유형에 맞는 기관을 안내합니다. 상담은 모국어로도 받을 수 있습니다.',
  },
  COMPLETED: {
    title: '마무리',
    body: '정리한 내용을 저장해 두고, 다음 급여명세서를 받으면 다시 확인해 보세요.',
  },
}

type SideRailProps = {
  state: FlowState
  answers: Record<string, string>
}

function SideRail({ state, answers }: SideRailProps) {
  const guide = guideByState[state]
  const answered = confirmQuestions.filter((question) => answers[question.id]).length
  const showQuestionProgress = state === 'REVIEW' || state === 'REVIEW_UPDATING'
  const helpline = supportChannels.find((channel) => channel.id === 'foreign-centre')

  return (
    <aside className="side-rail" aria-label="안내 / Guide">
      <motion.section className="rail-card guide-card" layout>
        <img className="mascot small" src={illoMascot} alt="" aria-hidden="true" />
        <h2>{guide.title}</h2>
        <p>{guide.body}</p>
        {showQuestionProgress && (
          <p className="rail-progress">추가 확인 {answered}/{confirmQuestions.length}</p>
        )}
      </motion.section>

      <section className="rail-card">
        <h2>이 결과의 한계</h2>
        <ul className="rail-list">
          {judgmentLimits.slice(0, 3).map((limit) => <li key={limit}>{limit}</li>)}
        </ul>
      </section>

      {helpline && (
        <section className="rail-card helpline-card">
          <h2>모국어 상담</h2>
          <p>{helpline.ko}</p>
          <a className="ghost-button" href={helpline.href}>1577-0071</a>
        </section>
      )}
    </aside>
  )
}

export default SideRail
