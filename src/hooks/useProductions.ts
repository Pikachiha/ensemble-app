import { createContext, useContext } from 'react'
import type { Production } from '../types'

type ProductionsContextType = {
  productions: Production[]
  addProduction: (p: Production) => void
  updateProduction: (p: Production) => void
  removeProduction: (id: string) => void
}

export const ProductionsContext = createContext<ProductionsContextType | null>(null)

export function useProductions() {
  const ctx = useContext(ProductionsContext)
  if (!ctx) throw new Error('useProductions must be used within Layout')
  return ctx
}
