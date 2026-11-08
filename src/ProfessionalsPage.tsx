import { useEffect, useState, type FormEvent } from 'react'
import { useEstablishment } from './contexts/EstablishmentContextValue'
import { supabase } from './services/supabase'

type Unit = {
  id: string
  name: string
  active: boolean
}

type Professional = {
  id: string
  name: string
  phone: string | null
  email: string | null
  unit_id: string
  active: boolean
}

const professionalFields = 'id, name, phone, email, unit_id, active'

function ProfessionalsPage() {
  const { establishment, loading: establishmentLoading } = useEstablishment()

  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [editingProfessionalId, setEditingProfessionalId] = useState<
    string | null
  >(null)
  const [professionalName, setProfessionalName] = useState('')
  const [professionalPhone, setProfessionalPhone] = useState('')
  const [professionalEmail, setProfessionalEmail] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState('')

  useEffect(() => {
    if (establishmentLoading) return

    if (!establishment) {
      return
    }

    const establishmentId = establishment.id
    let cancelled = false

    async function loadData() {
      setLoading(true)
      setError('')

      const [professionalsResult, unitsResult] = await Promise.all([
        supabase
          .from('professionals')
          .select(professionalFields)
          .eq('establishment_id', establishmentId)
          .order('name'),
        supabase
          .from('units')
          .select('id, name, active')
          .eq('establishment_id', establishmentId)
          .order('name'),
      ])

      if (cancelled) return

      const loadErrors = [
        professionalsResult.error &&
          `Erro ao carregar profissionais: ${professionalsResult.error.message}`,
        unitsResult.error &&
          `Erro ao carregar unidades: ${unitsResult.error.message}`,
      ].filter(Boolean)

      setError(loadErrors.join(' '))
      setProfessionals(professionalsResult.data ?? [])
      setUnits(unitsResult.data ?? [])
      setLoading(false)
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [establishment, establishmentLoading])

  function resetForm() {
    setEditingProfessionalId(null)
    setProfessionalName('')
    setProfessionalPhone('')
    setProfessionalEmail('')
    setSelectedUnitId('')
  }

  async function handleSaveProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!establishment || saving) return

    const name = professionalName.trim()
    const phone = professionalPhone.trim()
    const email = professionalEmail.trim()
    const unitId = selectedUnitId

    if (!name || !unitId) {
      setError('Informe o nome e selecione uma unidade.')
      return
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um email válido.')
      return
    }

    setSaving(true)
    setError('')
    setSuccessMessage('')

    const { data: validUnit, error: unitError } = await supabase
      .from('units')
      .select('id')
      .eq('id', unitId)
      .eq('establishment_id', establishment.id)
      .maybeSingle()

    if (unitError) {
      setError(`Erro ao validar unidade: ${unitError.message}`)
      setSaving(false)
      return
    }

    if (!validUnit) {
      setError('Selecione uma unidade válida deste estabelecimento.')
      setSaving(false)
      return
    }

    const professionalData = {
      name,
      phone: phone || null,
      email: email || null,
      unit_id: unitId,
    }

    if (editingProfessionalId) {
      const { data, error: updateError } = await supabase
        .from('professionals')
        .update(professionalData)
        .eq('id', editingProfessionalId)
        .eq('establishment_id', establishment.id)
        .select(professionalFields)
        .single()

      if (updateError) {
        setError(`Erro ao atualizar profissional: ${updateError.message}`)
      } else {
        setProfessionals((previous) =>
          previous
            .map((professional) =>
              professional.id === editingProfessionalId ? data : professional,
            )
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        )
        resetForm()
        setSuccessMessage('Profissional atualizado com sucesso!')
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('professionals')
        .insert({
          establishment_id: establishment.id,
          ...professionalData,
        })
        .select(professionalFields)
        .single()

      if (insertError) {
        setError(`Erro ao cadastrar profissional: ${insertError.message}`)
      } else {
        setProfessionals((previous) =>
          [...previous, data].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR'),
          ),
        )
        resetForm()
        setSuccessMessage('Profissional cadastrado com sucesso!')
      }
    }

    setSaving(false)
  }

  function handleEditProfessional(professional: Professional) {
    setEditingProfessionalId(professional.id)
    setProfessionalName(professional.name)
    setProfessionalPhone(professional.phone ?? '')
    setProfessionalEmail(professional.email ?? '')
    setSelectedUnitId(professional.unit_id)
    setError('')
    setSuccessMessage('')
  }

  async function handleToggleProfessional(professional: Professional) {
    if (!establishment || saving) return

    setSaving(true)
    setError('')
    setSuccessMessage('')

    const { data, error: updateError } = await supabase
      .from('professionals')
      .update({ active: !professional.active })
      .eq('id', professional.id)
      .eq('establishment_id', establishment.id)
      .select(professionalFields)
      .single()

    if (updateError) {
      setError(`Erro ao alterar status: ${updateError.message}`)
    } else {
      setProfessionals((previous) =>
        previous.map((item) => (item.id === professional.id ? data : item)),
      )
      setSuccessMessage(
        data.active
          ? 'Profissional reativado com sucesso!'
          : 'Profissional desativado com sucesso!',
      )
    }

    setSaving(false)
  }

  if (establishmentLoading || (loading && establishment)) {
    return <p>Carregando profissionais...</p>
  }

  if (!establishment) {
    return <p role="alert">Não foi possível carregar o estabelecimento.</p>
  }

  return (
    <main>
      <h1>Profissionais</h1>
      <p>Gerencie os profissionais do seu estabelecimento.</p>

      <section>
        <h2>
          {editingProfessionalId
            ? 'Editar profissional'
            : 'Cadastrar novo profissional'}
        </h2>

        <form onSubmit={handleSaveProfessional}>
          <div>
            <label htmlFor="professionalName">Nome</label>
            <input
              id="professionalName"
              type="text"
              value={professionalName}
              onChange={(event) => setProfessionalName(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="professionalPhone">Telefone (opcional)</label>
            <input
              id="professionalPhone"
              type="tel"
              value={professionalPhone}
              onChange={(event) => setProfessionalPhone(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="professionalEmail">Email (opcional)</label>
            <input
              id="professionalEmail"
              type="email"
              value={professionalEmail}
              onChange={(event) => setProfessionalEmail(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="professionalUnit">Unidade</label>
            <select
              id="professionalUnit"
              value={selectedUnitId}
              onChange={(event) => setSelectedUnitId(event.target.value)}
              required
              disabled={units.length === 0}
            >
              <option value="">Selecione uma unidade</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                  {unit.active ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
          </div>

          {units.length === 0 && (
            <p role="alert">
              Cadastre uma unidade antes de cadastrar profissionais.
            </p>
          )}

          <button type="submit" disabled={saving || units.length === 0}>
            {saving
              ? 'Salvando...'
              : editingProfessionalId
                ? 'Salvar alterações'
                : 'Cadastrar profissional'}
          </button>
          {editingProfessionalId && (
            <button type="button" onClick={resetForm} disabled={saving}>
              Cancelar edição
            </button>
          )}
        </form>

        {successMessage && <p role="status">{successMessage}</p>}
      </section>

      {error && <p role="alert">{error}</p>}

      {!error && professionals.length === 0 && (
        <p>Nenhum profissional cadastrado ainda.</p>
      )}

      {professionals.map((professional) => (
        <section key={professional.id}>
          <h2>{professional.name}</h2>
          <p>Unidade: {units.find((unit) => unit.id === professional.unit_id)?.name ?? 'Unidade indisponível'}</p>
          <p>Telefone: {professional.phone || 'Não informado'}</p>
          <p>Email: {professional.email || 'Não informado'}</p>
          <p>Status: {professional.active ? 'Ativo' : 'Inativo'}</p>
          <button
            type="button"
            onClick={() => handleEditProfessional(professional)}
            disabled={saving}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => handleToggleProfessional(professional)}
            disabled={saving}
          >
            {professional.active ? 'Desativar' : 'Ativar'}
          </button>
        </section>
      ))}
    </main>
  )
}

export default ProfessionalsPage
