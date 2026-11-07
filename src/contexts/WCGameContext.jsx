import { createContext, useContext } from 'react'

/**
 * Shared context for the World Cup game state.
 * WorldCupLayout calls useWCGame() once and provides the result here.
 * All child pages consume from this context instead of calling useWCGame()
 * directly, so they all share the same reactive state.
 */
export const WCGameContext = createContext(null)

export function useWCGameContext() {
  const ctx = useContext(WCGameContext)
  if (!ctx) throw new Error('useWCGameContext must be used inside WorldCupLayout')
  return ctx
}
