import ChatMessage, { type ChatMessageItem } from './ChatMessage'
import QuestionFlow from './QuestionFlow'
import ResultsPanel, { type ResultTab } from './ResultsPanel'

type WorkCheckFlowProps = {
  messages: ChatMessageItem[]
  currentStep: number
  resultsShown: boolean
  activeResultTab: ResultTab
  checkedEvidence: string[]
  onPickOption: (ko: string, en: string) => void
  onShowResults: () => void
  onResultTabChange: (tab: ResultTab) => void
  onToggleEvidence: (id: string) => void
}

function WorkCheckFlow({
  messages,
  currentStep,
  resultsShown,
  activeResultTab,
  checkedEvidence,
  onPickOption,
  onShowResults,
  onResultTabChange,
  onToggleEvidence,
}: WorkCheckFlowProps) {
  return (
    <>
      <ChatMessage
        who="bot"
        ko="계약서가 없어도 괜찮아요. 실제 근무 상황을 몇 가지 여쭤보고 부당한 부분이 있는지 확인해드릴게요."
        en="No contract needed. I'll ask a few questions about your actual work situation and check for issues."
      />
      <QuestionFlow
        messages={messages}
        currentStep={currentStep}
        resultsShown={resultsShown}
        onPickOption={onPickOption}
        onShowResults={onShowResults}
      />
      <ResultsPanel
        visible={resultsShown}
        activeTab={activeResultTab}
        checkedEvidence={checkedEvidence}
        onTabChange={onResultTabChange}
        onToggleEvidence={onToggleEvidence}
      />
    </>
  )
}

export default WorkCheckFlow
