'use client'
import { createContext, useContext } from 'react'

const DemoCtx = createContext(false)

export function DemoProvider({ isDemo, children }: { isDemo: boolean; children: React.ReactNode }) {
  return <DemoCtx.Provider value={isDemo}>{children}</DemoCtx.Provider>
}

export function useDemo() {
  return useContext(DemoCtx)
}
