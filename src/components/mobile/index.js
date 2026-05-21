// src/components/mobile/index.js
// Barrel export — design system mobile da Idemaq.
//
// Uso:
//   import { MobileSheet, MobilePageHeader, MobileListItem, ... } from '../../components/mobile'

export { default as MobileSheet }        from './MobileSheet'
export { default as MobilePageHeader }   from './MobilePageHeader'
export { default as MobileListItem }     from './MobileListItem'
export { default as MobileSearchBar }    from './MobileSearchBar'
export { default as MobileFAB }          from './MobileFAB'
export { default as MobileEmptyState }   from './MobileEmptyState'
export { default as MobileChipFilter }   from './MobileChipFilter'

// Componentes já existentes — reexporta pra import único
export { default as FiltrosMobile }      from './FiltrosMobile'
export { default as HeroMobile }         from './HeroMobile'
export { default as KPIGridMobile }      from './KPIGridMobile'
export { default as OSCardMobile }       from './OSCardMobile'
export { default as PipelineMobile }     from './PipelineMobile'
