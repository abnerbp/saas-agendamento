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

type WorkingHour = {
  id: string
  weekday: number
  start_time: string
  end_time: string
  active: boolean
}

type WorkingHourEntry = Omit<WorkingHour, 'id' | 'active'>

type PendingWorkingHourBatch = {
  establishmentId: string
  professionalId: string
  weekdays: number[]
  entries: WorkingHourEntry[]
  conflictingWeekdays: number[]
}

const professionalFields = 'id, name, phone, email, unit_id, active'
const workingHourFields = 'id, weekday, start_time, end_time, active'

const weekdays = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const weekdaysInSelectionOrder = [
  { weekday: 1, label: 'Segunda-feira' },
  { weekday: 2, label: 'Terça-feira' },
  { weekday: 3, label: 'Quarta-feira' },
  { weekday: 4, label: 'Quinta-feira' },
  { weekday: 5, label: 'Sexta-feira' },
  { weekday: 6, label: 'Sábado' },
  { weekday: 0, label: 'Domingo' },
]

function timeToMinutes(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.slice(0, 5))

  if (!match) return null

  return Number(match[1]) * 60 + Number(match[2])
}

function periodsOverlap(
  start: string,
  end: string,
  otherStart: string,
  otherEnd: string,
) {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  const otherStartMinutes = timeToMinutes(otherStart)
  const otherEndMinutes = timeToMinutes(otherEnd)

  return (
    startMinutes !== null &&
    endMinutes !== null &&
    otherStartMinutes !== null &&
    otherEndMinutes !== null &&
    startMinutes < otherEndMinutes &&
    otherStartMinutes < endMinutes
  )
}

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
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<
    string | null
  >(null)
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [workingHoursLoading, setWorkingHoursLoading] = useState(false)
  const [workingHoursLoadFailed, setWorkingHoursLoadFailed] = useState(false)
  const [workingHoursSaving, setWorkingHoursSaving] = useState(false)
  const [workingHoursError, setWorkingHoursError] = useState('')
  const [workingHoursSuccess, setWorkingHoursSuccess] = useState('')
  const [editingWorkingHourId, setEditingWorkingHourId] = useState<
    string | null
  >(null)
  const [workingHourWeekday, setWorkingHourWeekday] = useState('1')
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [workingHourStart, setWorkingHourStart] = useState('09:00')
  const [workingHourEnd, setWorkingHourEnd] = useState('17:00')
  const [hasWorkingHourBreak, setHasWorkingHourBreak] = useState(false)
  const [workingHourBreakStart, setWorkingHourBreakStart] =
    useState('12:00')
  const [workingHourBreakEnd, setWorkingHourBreakEnd] = useState('13:00')
  const [pendingWorkingHourBatch, setPendingWorkingHourBatch] =
    useState<PendingWorkingHourBatch | null>(null)

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

  useEffect(() => {
    if (establishmentLoading || !establishment || !selectedProfessionalId) {
      return
    }

    const establishmentId = establishment.id
    const professionalId = selectedProfessionalId
    let cancelled = false

    async function loadWorkingHours() {
      setWorkingHoursLoading(true)
      setWorkingHoursLoadFailed(false)
      setWorkingHoursError('')

      const { data, error: loadError } = await supabase
        .from('professional_working_hours')
        .select(workingHourFields)
        .eq('establishment_id', establishmentId)
        .eq('professional_id', professionalId)
        .order('weekday')
        .order('start_time')

      if (cancelled) return

      if (loadError) {
        setWorkingHours([])
        setWorkingHoursLoadFailed(true)
        setWorkingHoursError(
          `Erro ao carregar horários: ${loadError.message}`,
        )
      } else {
        setWorkingHours(data ?? [])
        setWorkingHoursLoadFailed(false)
      }

      setWorkingHoursLoading(false)
    }

    loadWorkingHours()

    return () => {
      cancelled = true
    }
  }, [establishment, establishmentLoading, selectedProfessionalId])

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

  function resetWorkingHourForm() {
    setEditingWorkingHourId(null)
    setWorkingHourWeekday('1')
    setSelectedWeekdays([])
    setWorkingHourStart('09:00')
    setWorkingHourEnd('17:00')
    setHasWorkingHourBreak(false)
    setWorkingHourBreakStart('12:00')
    setWorkingHourBreakEnd('13:00')
    setPendingWorkingHourBatch(null)
  }

  function sortWorkingHours(hours: WorkingHour[]) {
    return [...hours].sort(
      (a, b) =>
        a.weekday - b.weekday ||
        a.start_time.localeCompare(b.start_time),
    )
  }

  async function handleSaveWorkingHour(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !establishment ||
      !selectedProfessionalId ||
      workingHoursSaving
    ) {
      return
    }

    if (workingHoursLoadFailed) {
      setWorkingHoursError(
        'Não foi possível verificar os horários existentes. Tente carregar os horários novamente antes de salvar.',
      )
      return
    }

    const professional = professionals.find(
      (item) => item.id === selectedProfessionalId,
    )

    if (!professional) {
      setWorkingHoursError('Selecione um profissional válido.')
      return
    }

    const startMinutes = timeToMinutes(workingHourStart)
    const endMinutes = timeToMinutes(workingHourEnd)

    if (
      startMinutes === null ||
      endMinutes === null ||
      startMinutes >= endMinutes
    ) {
      setWorkingHoursError('O horário de término deve ser posterior ao início.')
      return
    }

    setWorkingHoursError('')
    setWorkingHoursSuccess('')

    if (editingWorkingHourId) {
      const weekday = Number(workingHourWeekday)

      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        setWorkingHoursError('Selecione um dia válido.')
        return
      }

      const overlapsExistingHours = workingHours.some(
        (hour) =>
          hour.id !== editingWorkingHourId &&
          hour.weekday === weekday &&
          periodsOverlap(
            workingHourStart,
            workingHourEnd,
            hour.start_time,
            hour.end_time,
          ),
      )

      if (overlapsExistingHours) {
        setWorkingHoursError(
          'O período não pode se sobrepor a outro horário deste dia.',
        )
        return
      }

      setWorkingHoursSaving(true)
      const values = {
        weekday,
        start_time: workingHourStart,
        end_time: workingHourEnd,
      }
      const { data, error: updateError } = await supabase
        .from('professional_working_hours')
        .update(values)
        .eq('id', editingWorkingHourId)
        .eq('establishment_id', establishment.id)
        .eq('professional_id', professional.id)
        .select(workingHourFields)
        .single()

      if (updateError) {
        setWorkingHoursError(
          `Erro ao atualizar horário: ${updateError.message}`,
        )
      } else {
        setWorkingHours((previous) =>
          sortWorkingHours(
            previous.map((hour) =>
              hour.id === editingWorkingHourId ? data : hour,
            ),
          ),
        )
        resetWorkingHourForm()
        setWorkingHoursSuccess('Horário atualizado com sucesso!')
      }

      setWorkingHoursSaving(false)
      return
    }

    if (
      selectedWeekdays.length === 0 ||
      selectedWeekdays.some(
        (weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6,
      )
    ) {
      setWorkingHoursError('Selecione pelo menos um dia válido.')
      return
    }

    if (hasWorkingHourBreak) {
      const breakStartMinutes = timeToMinutes(workingHourBreakStart)
      const breakEndMinutes = timeToMinutes(workingHourBreakEnd)

      if (
        breakStartMinutes === null ||
        breakEndMinutes === null ||
        startMinutes >= breakStartMinutes ||
        breakStartMinutes >= breakEndMinutes ||
        breakEndMinutes >= endMinutes
      ) {
        setWorkingHoursError(
          'O intervalo deve começar e terminar dentro do expediente, com duração válida.',
        )
        return
      }
    }

    const entries = selectedWeekdays.flatMap((weekday) =>
      hasWorkingHourBreak
        ? [
            {
              weekday,
              start_time: workingHourStart,
              end_time: workingHourBreakStart,
            },
            {
              weekday,
              start_time: workingHourBreakEnd,
              end_time: workingHourEnd,
            },
          ]
        : [
            {
              weekday,
              start_time: workingHourStart,
              end_time: workingHourEnd,
            },
          ],
    )
    const conflictingWeekdays = [
      ...new Set(
        workingHours
          .filter((hour) => selectedWeekdays.includes(hour.weekday))
          .map((hour) => hour.weekday),
      ),
    ].sort((a, b) => a - b)

    if (conflictingWeekdays.length > 0) {
      setPendingWorkingHourBatch({
        establishmentId: establishment.id,
        professionalId: professional.id,
        weekdays: selectedWeekdays,
        entries,
        conflictingWeekdays,
      })
      setWorkingHoursError(
        `Já existem horários em: ${conflictingWeekdays
          .map((weekday) => weekdays[weekday])
          .join(', ')}. Nenhum horário foi alterado.`,
      )
      return
    }

    await insertWorkingHourEntries(
      establishment.id,
      professional.id,
      entries,
      selectedWeekdays.length,
    )
  }

  async function insertWorkingHourEntries(
    establishmentId: string,
    professionalId: string,
    entries: WorkingHourEntry[],
    savedWeekdaysCount: number,
  ) {
    setWorkingHoursSaving(true)
    const { data, error: insertError } = await supabase
      .from('professional_working_hours')
      .insert(
        entries.map((entry) => ({
          establishment_id: establishmentId,
          professional_id: professionalId,
          ...entry,
        })),
      )
      .select(workingHourFields)

    if (insertError) {
      setWorkingHoursError(
        `Erro ao cadastrar horários: ${insertError.message}`,
      )
    } else {
      setWorkingHours((previous) =>
        sortWorkingHours([...previous, ...(data ?? [])]),
      )
      resetWorkingHourForm()
      setWorkingHoursSuccess(
        `${entries.length} período(s) cadastrado(s) em ${savedWeekdaysCount} dia(s).`,
      )
      setWorkingHoursError('')
    }

    setWorkingHoursSaving(false)
  }

  async function handleResolveWorkingHourConflict(
    includeDaysWithExistingHours: boolean,
  ) {
    if (
      !establishment ||
      workingHoursSaving ||
      workingHoursLoadFailed ||
      !pendingWorkingHourBatch ||
      pendingWorkingHourBatch.establishmentId !== establishment.id ||
      pendingWorkingHourBatch.professionalId !== selectedProfessionalId
    ) {
      return
    }

    const batch = pendingWorkingHourBatch
    const overlappingWeekdays = new Set(
      batch.entries
        .filter((entry) =>
          workingHours.some(
            (hour) =>
              hour.weekday === entry.weekday &&
              periodsOverlap(
                entry.start_time,
                entry.end_time,
                hour.start_time,
                hour.end_time,
              ),
          ),
        )
        .map((entry) => entry.weekday),
    )
    const weekdaysToSave = batch.weekdays.filter(
      (weekday) =>
        !overlappingWeekdays.has(weekday) &&
        (includeDaysWithExistingHours ||
          !batch.conflictingWeekdays.includes(weekday)),
    )

    if (weekdaysToSave.length === 0) {
      setWorkingHoursError(
        'Não há dias disponíveis sem sobreposição para cadastrar. Ajuste os horários ou cancele.',
      )
      return
    }

    const entriesToSave = batch.entries.filter((entry) =>
      weekdaysToSave.includes(entry.weekday),
    )
    await insertWorkingHourEntries(
      batch.establishmentId,
      batch.professionalId,
      entriesToSave,
      weekdaysToSave.length,
    )
  }

  function handleEditWorkingHour(hour: WorkingHour) {
    setPendingWorkingHourBatch(null)
    setEditingWorkingHourId(hour.id)
    setWorkingHourWeekday(String(hour.weekday))
    setWorkingHourStart(hour.start_time.slice(0, 5))
    setWorkingHourEnd(hour.end_time.slice(0, 5))
    setWorkingHoursError('')
    setWorkingHoursSuccess('')
  }

  async function handleToggleWorkingHour(hour: WorkingHour) {
    if (
      !establishment ||
      !selectedProfessionalId ||
      workingHoursSaving
    ) {
      return
    }

    if (
      !hour.active &&
      workingHours.some(
        (item) =>
          item.id !== hour.id &&
          item.active &&
          item.weekday === hour.weekday &&
          periodsOverlap(
            hour.start_time,
            hour.end_time,
            item.start_time,
            item.end_time,
          ),
      )
    ) {
      setWorkingHoursError(
        'Este horário não pode ser ativado porque se sobrepõe a outro período ativo.',
      )
      return
    }

    setWorkingHoursSaving(true)
    setWorkingHoursError('')
    setWorkingHoursSuccess('')

    const { data, error: updateError } = await supabase
      .from('professional_working_hours')
      .update({ active: !hour.active })
      .eq('id', hour.id)
      .eq('establishment_id', establishment.id)
      .eq('professional_id', selectedProfessionalId)
      .select(workingHourFields)
      .single()

    if (updateError) {
      setWorkingHoursError(
        `Erro ao alterar status do horário: ${updateError.message}`,
      )
    } else {
      setWorkingHours((previous) =>
        sortWorkingHours(
          previous.map((item) => (item.id === hour.id ? data : item)),
        ),
      )
      setWorkingHoursSuccess(
        data.active
          ? 'Horário reativado com sucesso!'
          : 'Horário desativado com sucesso!',
      )
    }

    setWorkingHoursSaving(false)
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
          <p>
            Unidade:{' '}
            {units.find((unit) => unit.id === professional.unit_id)?.name ??
              'Unidade indisponível'}
          </p>
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
          <button
            type="button"
            onClick={() => {
              const isSelected =
                selectedProfessionalId === professional.id
              setSelectedProfessionalId(
                isSelected ? null : professional.id,
              )
              setWorkingHoursError('')
              setWorkingHoursSuccess('')
              resetWorkingHourForm()
            }}
          >
            {selectedProfessionalId === professional.id
              ? 'Fechar horários'
              : 'Gerenciar horários'}
          </button>

          {selectedProfessionalId === professional.id && (
            <section aria-label={`Horários de ${professional.name}`}>
              <h3>Horários de trabalho</h3>
              <p>
                Selecione um ou mais dias e informe o expediente. Um intervalo
                divide o expediente em dois períodos.
              </p>

              <form onSubmit={handleSaveWorkingHour}>
                {editingWorkingHourId ? (
                  <div>
                    <label htmlFor="workingHourWeekday">Dia da semana</label>
                    <select
                      id="workingHourWeekday"
                      value={workingHourWeekday}
                      onChange={(event) =>
                        setWorkingHourWeekday(event.target.value)
                      }
                      required
                    >
                      {weekdays.map((day, index) => (
                        <option key={day} value={index}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <fieldset>
                    <legend>Dias da semana</legend>
                    {weekdaysInSelectionOrder.map(({ weekday, label }) => (
                      <label key={weekday}>
                        <input
                          type="checkbox"
                          checked={selectedWeekdays.includes(weekday)}
                          onChange={(event) =>
                            setSelectedWeekdays((previous) =>
                              event.target.checked
                                ? [...previous, weekday]
                                : previous.filter((day) => day !== weekday),
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                )}
                <div>
                  <label htmlFor="workingHourStart">Início do expediente</label>
                  <input
                    id="workingHourStart"
                    type="time"
                    value={workingHourStart}
                    onChange={(event) =>
                      setWorkingHourStart(event.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label htmlFor="workingHourEnd">Término do expediente</label>
                  <input
                    id="workingHourEnd"
                    type="time"
                    value={workingHourEnd}
                    onChange={(event) =>
                      setWorkingHourEnd(event.target.value)
                    }
                    required
                  />
                </div>
                {!editingWorkingHourId && (
                  <>
                    <div>
                      <label>
                        <input
                          type="checkbox"
                          checked={hasWorkingHourBreak}
                          onChange={(event) =>
                            setHasWorkingHourBreak(event.target.checked)
                          }
                        />
                        Possui intervalo de descanso?
                      </label>
                    </div>
                    {hasWorkingHourBreak && (
                      <>
                        <div>
                          <label htmlFor="workingHourBreakStart">
                            Início do intervalo
                          </label>
                          <input
                            id="workingHourBreakStart"
                            type="time"
                            value={workingHourBreakStart}
                            onChange={(event) =>
                              setWorkingHourBreakStart(event.target.value)
                            }
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="workingHourBreakEnd">
                            Término do intervalo
                          </label>
                          <input
                            id="workingHourBreakEnd"
                            type="time"
                            value={workingHourBreakEnd}
                            onChange={(event) =>
                              setWorkingHourBreakEnd(event.target.value)
                            }
                            required
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
                <button
                  type="submit"
                  disabled={
                    workingHoursSaving ||
                    workingHoursLoading ||
                    workingHoursLoadFailed
                  }
                >
                  {workingHoursSaving
                    ? 'Salvando...'
                    : editingWorkingHourId
                      ? 'Salvar alterações'
                      : 'Adicionar período'}
                </button>
                {editingWorkingHourId && (
                  <button
                    type="button"
                    onClick={resetWorkingHourForm}
                    disabled={workingHoursSaving}
                  >
                    Cancelar edição
                  </button>
                )}
              </form>

              {workingHoursSuccess && (
                <p role="status">{workingHoursSuccess}</p>
              )}
              {workingHoursError && (
                <p role="alert">{workingHoursError}</p>
              )}
              {pendingWorkingHourBatch &&
                pendingWorkingHourBatch.professionalId ===
                  selectedProfessionalId && (
                  <div>
                    <p>
                      Escolha como continuar. Períodos existentes não serão
                      substituídos ou apagados; períodos sobrepostos não serão
                      cadastrados.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleResolveWorkingHourConflict(false)}
                      disabled={
                        workingHoursSaving ||
                        pendingWorkingHourBatch.weekdays.every((weekday) =>
                          pendingWorkingHourBatch.conflictingWeekdays.includes(
                            weekday,
                          ),
                        )
                      }
                    >
                      Cadastrar somente nos dias sem horários
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveWorkingHourConflict(true)}
                      disabled={
                        workingHoursSaving ||
                        pendingWorkingHourBatch.entries.every((entry) =>
                          workingHours.some(
                            (hour) =>
                              hour.weekday === entry.weekday &&
                              periodsOverlap(
                                entry.start_time,
                                entry.end_time,
                                hour.start_time,
                                hour.end_time,
                              ),
                          ),
                        )
                      }
                    >
                      Cadastrar nos dias sem sobreposição
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingWorkingHourBatch(null)
                        setWorkingHoursError('')
                      }}
                      disabled={workingHoursSaving}
                    >
                      Cancelar cadastro
                    </button>
                  </div>
                )}
              {workingHoursLoading ? (
                <p>Carregando horários...</p>
              ) : workingHours.length === 0 ? (
                <p>Nenhum horário cadastrado para este profissional.</p>
              ) : (
                weekdays.map((day, weekday) => {
                  const dayHours = workingHours.filter(
                    (hour) => hour.weekday === weekday,
                  )

                  if (dayHours.length === 0) return null

                  return (
                    <section key={day}>
                      <h4>{day}</h4>
                      {dayHours.map((hour) => (
                        <div key={hour.id}>
                          <span>
                            {hour.start_time.slice(0, 5)}–
                            {hour.end_time.slice(0, 5)}{' '}
                            ({hour.active ? 'Ativo' : 'Inativo'})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditWorkingHour(hour)}
                            disabled={workingHoursSaving}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleWorkingHour(hour)}
                            disabled={workingHoursSaving}
                          >
                            {hour.active ? 'Desativar' : 'Reativar'}
                          </button>
                        </div>
                      ))}
                    </section>
                  )
                })
              )}
            </section>
          )}
        </section>
      ))}
    </main>
  )
}

export default ProfessionalsPage
