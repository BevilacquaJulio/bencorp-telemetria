import {
  useState,
  type ReactNode,
} from 'react'
import { setApiAccessToken } from '../../lib/api'
import type { AuthSession } from './auth.types'
import { AuthContext } from './auth-context'

const SESSION_KEY = 'pad.session'

function readStoredSession(): AuthSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as AuthSession) : null
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readStoredSession()
    setApiAccessToken(stored?.token ?? null)
    return stored
  })

  function signIn(nextSession: AuthSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
    setApiAccessToken(nextSession.token)
    setSession(nextSession)
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY)
    setApiAccessToken(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.usuario ?? null,
        token: session?.token ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
