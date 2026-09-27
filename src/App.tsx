import { useState } from 'react'
import { supabase } from './services/supabase'
import './App.css'

type Establishment = {
  id: string
  name: string
  slug: string
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [establishments, setEstablishments] = useState<Establishment[]>([])

  async function handleLogin() {
    setMessage('Entrando...')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`Erro no login: ${error.message}`)
      return
    }

    setMessage('Login realizado. Consultando estabelecimentos...')

    const { data, error: queryError } = await supabase
      .from('establishments')
      .select('id, name, slug')

    if (queryError) {
      setMessage(`Erro ao consultar: ${queryError.message}`)
      return
    }

    setEstablishments(data ?? [])
    setMessage(`Consulta concluída. Registros encontrados: ${data?.length ?? 0}`)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setEstablishments([])
    setMessage('Logout realizado.')
  }

  return (
    <main style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Teste de autenticação e RLS</h1>

      <p>
        Entre com o usuário de teste criado no Supabase.
      </p>

      <div style={{ display: 'grid', gap: '12px' }}>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button type="button" onClick={handleLogin}>
          Entrar e testar RLS
        </button>

        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </div>

      <p>
        <strong>Status:</strong> {message}
      </p>

      {establishments.length > 0 && (
        <div>
          <h2>Estabelecimentos permitidos pelo RLS</h2>

          {establishments.map((establishment) => (
            <div key={establishment.id}>
              <strong>{establishment.name}</strong>
              <br />
              <small>{establishment.slug}</small>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default App
