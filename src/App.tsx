import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { supabase } from './services/supabase'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)
      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <p>Carregando...</p>
  }

  if (!session) {
    return <LoginPage />
  }

  return <DashboardPage />
}

export default App