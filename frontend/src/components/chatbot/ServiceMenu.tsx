import { motion } from 'framer-motion'
import { services, type ServiceView } from '../../mocks/chatbot'

type ServiceMenuProps = {
  onSelect: (service: ServiceView) => void
}

const listMotion = {
  initial: 'hidden',
  animate: 'visible',
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  },
}

const itemMotion = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
}

function ServiceMenu({ onSelect }: ServiceMenuProps) {
  return (
    <motion.div className="options nested-options main-options" {...listMotion}>
      {services.map((service) => (
        <motion.button
          className="pill-button"
          key={service.id}
          onClick={() => onSelect(service.id)}
          variants={itemMotion}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          {service.label}
        </motion.button>
      ))}
    </motion.div>
  )
}

export default ServiceMenu
