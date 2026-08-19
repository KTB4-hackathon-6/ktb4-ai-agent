import { services, type ServiceView } from '../../mocks/chatbot'

type ServiceMenuProps = {
  onSelect: (service: ServiceView) => void
}

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
