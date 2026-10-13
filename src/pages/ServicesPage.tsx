
import { useEffect, useState } from 'react'
import { useEstablishment } from '../contexts/EstablishmentContext'
import { supabase } from '../services/supabase'

type Service = {
  id: string
  name: string
  price_cents: number
  duration_minutes: number
  active: boolean
}

function ServicesPage() {
  const { establishment, loading: establishmentLoading } = useEstablishment()

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceDuration, setServiceDuration] = useState('30')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (establishmentLoading) return

    if (!establishment) {
      setServices([])
      setLoading(false)
      return
    }

    async function loadServices() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('services')
        .select('id, name, price_cents, duration_minutes, active')
        .eq('establishment_id', establishment!.id)
        .order('name')

      if (error) {
        setError(`Erro ao carregar serviços: ${error.message}`)
        setServices([])
      } else {
        setServices(data ?? [])
      }

      setLoading(false)
    }

    loadServices()
  }, [establishment, establishmentLoading])
  
async function handleCreateService(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()

  if (!establishment || saving) return

  const name = serviceName.trim()
  const price = Number(servicePrice)
  const duration = Number(serviceDuration)

  if (
    !name ||
    servicePrice.trim() === '' ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isSafeInteger(Math.round(price * 100)) ||
    serviceDuration.trim() === '' ||
    !Number.isInteger(duration) ||
    duration <= 0
  ) {
    setError('Preencha nome, preço e duração corretamente.')
    return
  }

  setSaving(true)
  setError('')
  setSuccessMessage('')

  const { data, error: insertError } = await supabase
    .from('services')
    .insert({
      establishment_id: establishment.id,
      name,
      price_cents: Math.round(price * 100),
      duration_minutes: duration,
    })
    .select('id, name, price_cents, duration_minutes, active')
    .single()

  if (insertError) {
    setError(`Erro ao cadastrar serviço: ${insertError.message}`)
  } else {
    setServices((previous) =>
      [...previous, data].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR')
      )
    )

    setServiceName('')
    setServicePrice('')
    setServiceDuration('30')
    setSuccessMessage('Serviço cadastrado com sucesso!')
  }

  setSaving(false)
}


  if (establishmentLoading || loading) {
    return <p>Carregando serviços...</p>
  }

  return (
    <main>
      <h1>Serviços</h1>

      <p>Gerencie os serviços oferecidos pelo seu estabelecimento.</p>
      <section>
  <h2>Cadastrar novo serviço</h2>

  <form onSubmit={handleCreateService}>
    <div>
      <label htmlFor="serviceName">Nome do serviço</label>
      <input
        id="serviceName"
        type="text"
        placeholder="Ex.: Corte masculino"
        value={serviceName}
        onChange={(event) => setServiceName(event.target.value)}
        required
      />
    </div>

    <div>
      <label htmlFor="servicePrice">Preço (R$)</label>
      <input
        id="servicePrice"
        type="number"
        min="0"
        step="0.01"
        placeholder="Ex.: 35.00"
        value={servicePrice}
        onChange={(event) => setServicePrice(event.target.value)}
        required
      />
    </div>

    <div>
      <label htmlFor="serviceDuration">Duração (minutos)</label>
      <input
        id="serviceDuration"
        type="number"
        min="1"
        step="1"
        value={serviceDuration}
        onChange={(event) => setServiceDuration(event.target.value)}
        required
      />
    </div>

    <button type="submit" disabled={saving}>
      {saving ? 'Salvando...' : 'Cadastrar serviço'}
    </button>
  </form>

  {successMessage && <p>{successMessage}</p>}
</section>

      {error && <p role="alert">{error}</p>}

      {!error && services.length === 0 && (
        <p>Nenhum serviço cadastrado ainda.</p>
      )}

      {services.map((service) => (
        <section key={service.id}>
          <h2>{service.name}</h2>

          <p>
            Preço:{' '}
            {(service.price_cents / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: establishment?.currency ?? 'BRL',
            })}
          </p>

          <p>Duração: {service.duration_minutes} minutos</p>

          <p>Status: {service.active ? 'Ativo' : 'Inativo'}</p>
        </section>
      ))}
    </main>
  )
}

export default ServicesPage
