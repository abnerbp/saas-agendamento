
import { useEffect, useState } from 'react'
import { EditModal } from '../components/EditModal'
import { Button, Card, EmptyState, LoadingState, PageTitle } from '../components/ui'
import { useEstablishment } from '../contexts/EstablishmentContextValue'
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
  const [editingServiceName, setEditingServiceName] = useState('')
  const [editingServicePrice, setEditingServicePrice] = useState('')
  const [editingServiceDuration, setEditingServiceDuration] = useState('30')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)

  useEffect(() => {
    if (establishmentLoading) return

    if (!establishment) return

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
  
async function handleToggleService(service: Service) {
  if (!establishment || saving) return

  setSaving(true)
  setError('')
  setSuccessMessage('')

  const { data, error: updateError } = await supabase
    .from('services')
    .update({ active: !service.active })
    .eq('id', service.id)
    .eq('establishment_id', establishment.id)
    .select('id, name, price_cents, duration_minutes, active')
    .single()

  if (updateError) {
    setError(`Erro ao alterar status: ${updateError.message}`)
  } else {
    setServices((previous) =>
      previous.map((item) =>
        item.id === service.id ? data : item
      )
    )

    setSuccessMessage(
      data.active
        ? 'Serviço reativado com sucesso!'
        : 'Serviço desativado com sucesso!'
    )
  }

  setSaving(false)
}

  
async function handleUpdateService(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()

  if (!establishment || !editingServiceId || saving) return

  const name = editingServiceName.trim()
  const price = Number(editingServicePrice)
  const duration = Number(editingServiceDuration)
  const priceCents = Math.round(price * 100)

  if (
    !name ||
    editingServicePrice.trim() === '' ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isSafeInteger(priceCents) ||
    editingServiceDuration.trim() === '' ||
    !Number.isInteger(duration) ||
    duration <= 0
  ) {
    setError('Preencha nome, preço e duração corretamente.')
    return
  }

  setSaving(true)
  setError('')
  setSuccessMessage('')

  const { data, error: updateError } = await supabase
    .from('services')
    .update({
      name,
      price_cents: priceCents,
      duration_minutes: duration,
    })
    .eq('id', editingServiceId)
    .eq('establishment_id', establishment.id)
    .select('id, name, price_cents, duration_minutes, active')
    .single()

  if (updateError) {
    setError(`Erro ao atualizar serviço: ${updateError.message}`)
  } else {
    setServices((previous) =>
      previous
        .map((service) =>
          service.id === editingServiceId ? data : service
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    )

    setEditingServiceId(null)
    setEditingServiceName('')
    setEditingServicePrice('')
    setEditingServiceDuration('30')
    setSuccessMessage('Serviço atualizado com sucesso!')
  }

  setSaving(false)
}

function handleCancelServiceEdit() {
  if (saving) return

  setEditingServiceId(null)
  setEditingServiceName('')
  setEditingServicePrice('')
  setEditingServiceDuration('30')
  setError('')
}

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


  if (establishmentLoading || (loading && establishment)) {
    return <LoadingState label="Carregando serviços..." />
  }

  if (!establishment) {
    return <p>Não foi possível carregar o estabelecimento.</p>
  }

  const editingService = services.find(
    (service) => service.id === editingServiceId,
  )

  return (
    <main className="page-container">
      <PageTitle
        title="Serviços"
        description="Gerencie os serviços oferecidos pelo seu estabelecimento."
      />
      {successMessage && (
        <p className="operation-feedback" role="status">
          {successMessage}
        </p>
      )}
      <Card className="form-card">
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

    <Button type="submit" disabled={saving}>
      {saving ? 'Salvando...' : 'Cadastrar serviço'}
    </Button>
  </form>
</Card>

      {error && !editingServiceId && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {!error && services.length === 0 && (
        <Card>
          <EmptyState title="Nenhum serviço cadastrado ainda" />
        </Card>
      )}

      {services.map((service) => (
        <Card key={service.id} className="entity-card service-card">
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
          <div className="service-card__actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setEditingServiceId(service.id)
                setEditingServiceName(service.name)
                setEditingServicePrice(
                  (service.price_cents / 100).toFixed(2),
                )
                setEditingServiceDuration(String(service.duration_minutes))
                setError('')
                setSuccessMessage('')
              }}
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => handleToggleService(service)}
            >
              {service.active ? 'Desativar' : 'Reativar'}
            </Button>
          </div>
        </Card>
      ))}
      <EditModal
        open={editingServiceId !== null}
        title={
          editingService
            ? `Editar serviço — ${editingService.name}`
            : 'Editar serviço'
        }
        description="Altere os dados do serviço selecionado."
        saving={saving}
        onClose={handleCancelServiceEdit}
      >
        {editingServiceId && (
          <form onSubmit={handleUpdateService} className="edit-modal__form">
            <label htmlFor="editServiceName">Nome do serviço</label>
            <input
              id="editServiceName"
              type="text"
              value={editingServiceName}
              onChange={(event) => setEditingServiceName(event.target.value)}
              disabled={saving}
              required
            />
            <label htmlFor="editServicePrice">Preço (R$)</label>
            <input
              id="editServicePrice"
              type="number"
              min="0"
              step="0.01"
              value={editingServicePrice}
              onChange={(event) => setEditingServicePrice(event.target.value)}
              disabled={saving}
              required
            />
            <label htmlFor="editServiceDuration">Duração (minutos)</label>
            <input
              id="editServiceDuration"
              type="number"
              min="1"
              step="1"
              value={editingServiceDuration}
              onChange={(event) =>
                setEditingServiceDuration(event.target.value)
              }
              disabled={saving}
              required
            />
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            <div className="edit-modal__actions">
              <Button
                variant="secondary"
                type="button"
                disabled={saving}
                onClick={handleCancelServiceEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        )}
      </EditModal>
    </main>
  )
}

export default ServicesPage
