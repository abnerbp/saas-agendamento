import { useState } from 'react'
import { supabase } from '../services/supabase'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('E-mail ou senha inválidos.')
      setLoading(false)
      return
    }

    setMessage('Login realizado com sucesso.')
    setLoading(false)
  }

  return (
    <main>
      <section>
        <header>
          <p>Gestão de atendimentos</p>

          <h1>Bem-vindo</h1>

          <p>Entre para acessar seu estabelecimento.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            E-mail

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Senha

            <div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {message && <p>{message}</p>}
      </section>
    </main>
  )
}

export default LoginPage