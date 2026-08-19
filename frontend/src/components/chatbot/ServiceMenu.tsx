export type ServiceView = 'contract' | 'work' | 'admin' | 'agencies'

type ServiceMenuProps = {
  onSelect: (service: ServiceView) => void
}

const services: Array<{ id: ServiceView; label: string }> = [
  { id: 'contract', label: '📄 근로계약서 분석하기 / Analyze my contract' },
  { id: 'work', label: '🔍 현재 근무 실태 체크하기 / Check my current working conditions' },
  { id: 'admin', label: '🗂 행정문서 확인하기 / Check an admin document' },
  { id: 'agencies', label: '☎ 상담기관 바로 연결 / Connect to a counselor' },
]

function ServiceMenu({ onSelect }: ServiceMenuProps) {
  return (
    <div className="options nested-options main-options">
      {services.map((service) => (
        <button className="pill-button" key={service.id} onClick={() => onSelect(service.id)}>
          {service.label}
        </button>
      ))}
    </div>
  )
}

export default ServiceMenu
