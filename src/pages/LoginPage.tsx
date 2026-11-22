import { useState } from 'react'
import { Button, Card, PageTitle, ScissorsIcon } from '../components/ui'
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
    <main className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <ScissorsIcon />
          <span>AcheiHora</span>
        </div>

        <PageTitle
          title="Bem-vindo"
          description="Entre para acessar seu estabelecimento."
        />

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

          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {message && (
          <p className="login-message" role="status">
            {message}
          </p>
        )}
      </Card>
    </main>
  )
}

export default LoginPage