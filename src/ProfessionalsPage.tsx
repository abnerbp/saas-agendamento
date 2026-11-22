import { useEffect, useState, type FormEvent } from 'react'
import { EditModal } from './components/EditModal'
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  PageTitle,
} from './components/ui'
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

function getWorkingHourSaveError(message: string) {
  if (/overlap|exclusion constraint/i.test(message)) {
    return 'Os períodos ativos se sobrepõem. Revise os horários e tente novamente.'
  }

  if (/Only an active establishment owner or manager/i.test(message)) {
    return 'Somente um proprietário ou gerente ativo pode alterar os horários.'
  }

  if (/Professional does not belong/i.test(message)) {
    return 'O profissional não pertence ao estabelecimento selecionado.'
  }

  if (/permission denied|row-level security/i.test(message)) {
    return 'Você não tem permissão para alterar os horários deste profissional.'
  }

  return `Erro ao salvar horários: ${message}`
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
  const [editingProfessionalName, setEditingProfessionalName] = useState('')
  const [editingProfessionalPhone, setEditingProfessionalPhone] = useState('')
  const [editingProfessionalEmail, setEditingProfessionalEmail] = useState('')
  const [editingUnitId, setEditingUnitId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<
    string | null
  >(null)
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [showInactiveWorkingHours, setShowInactiveWorkingHours] =
    useState(false)
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
    setProfessionalName('')
    setProfessionalPhone('')
    setProfessionalEmail('')
    setSelectedUnitId('')
  }

  function resetEditForm() {
    setEditingProfessionalId(null)
    setEditingProfessionalName('')
    setEditingProfessionalPhone('')
    setEditingProfessionalEmail('')
    setEditingUnitId('')
  }

  async function handleSaveProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!establishment || saving) return

    const isEditing = editingProfessionalId !== null
    const name = (isEditing ? editingProfessionalName : professionalName).trim()
    const phone = (isEditing ? editingProfessionalPhone : professionalPhone).trim()
    const email = (isEditing ? editingProfessionalEmail : professionalEmail).trim()
    const unitId = isEditing ? editingUnitId : selectedUnitId

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
        resetEditForm()
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
    setEditingProfessionalName(professional.name)
    setEditingProfessionalPhone(professional.phone ?? '')
    setEditingProfessionalEmail(professional.email ?? '')
    setEditingUnitId(professional.unit_id)
    setError('')
    setSuccessMessage('')
  }

  function handleCancelProfessionalEdit() {
    if (saving) return

    resetEditForm()
    setError('')
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

  async function replaceWorkingHourEntries(
    establishmentId: string,
    professionalId: string,
    weekdaysToReplace: number[],
    entries: WorkingHourEntry[],
    successMessage: string,
  ) {
    setWorkingHoursSaving(true)

    const { error: replaceError } = await supabase.rpc(
      'replace_professional_working_hours',
      {
        p_establishment_id: establishmentId,
        p_professional_id: professionalId,
        p_weekdays: weekdaysToReplace,
        p_periods: entries.map(({ weekday, start_time, end_time }) => ({
          weekday,
          start_time,
          end_time,
        })),
      },
    )

    if (replaceError) {
      setWorkingHoursError(getWorkingHourSaveError(replaceError.message))
      setWorkingHoursSaving(false)
      return
    }

    const { data, error: loadError } = await supabase
      .from('professional_working_hours')
      .select(workingHourFields)
      .eq('establishment_id', establishmentId)
      .eq('professional_id', professionalId)
      .order('weekday')
      .order('start_time')

    if (loadError) {
      setWorkingHoursLoadFailed(true)
      setWorkingHoursError(
        `Horários salvos, mas não foi possível atualizar a lista: ${loadError.message}`,
      )
      setWorkingHoursSaving(false)
      return
    }

    setWorkingHours(sortWorkingHours(data ?? []))
    setWorkingHoursLoadFailed(false)
    resetWorkingHourForm()
    setWorkingHoursSuccess(successMessage)
    setWorkingHoursError('')
    setWorkingHoursSaving(false)
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
      const editedHour = workingHours.find(
        (hour) => hour.id === editingWorkingHourId,
      )

      if (
        !editedHour ||
        !Number.isInteger(weekday) ||
        weekday < 0 ||
        weekday > 6 ||
        weekday !== editedHour.weekday
      ) {
        setWorkingHoursError(
          'Não foi possível validar o horário. Recarregue a lista e tente novamente.',
        )
        return
      }

      const overlapsExistingHours =
        editedHour.active &&
        workingHours.some(
          (hour) =>
            hour.active &&
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

      const updatedEntry = {
        weekday,
        start_time: workingHourStart,
        end_time: workingHourEnd,
      }

      if (editedHour.active) {
        const entries = workingHours
          .filter(
            (hour) =>
              hour.active &&
              hour.weekday === weekday &&
              hour.id !== editingWorkingHourId,
          )
          .map(({ weekday: entryWeekday, start_time, end_time }) => ({
            weekday: entryWeekday,
            start_time,
            end_time,
          }))

        await replaceWorkingHourEntries(
          establishment.id,
          professional.id,
          [weekday],
          [...entries, updatedEntry],
          'Horário atualizado com sucesso!',
        )
        return
      }

      setWorkingHoursSaving(true)
      const { data, error: updateError } = await supabase
        .from('professional_working_hours')
        .update(updatedEntry)
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
          .filter(
            (hour) => hour.active && selectedWeekdays.includes(hour.weekday),
          )
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

    await replaceWorkingHourEntries(
      establishment.id,
      professional.id,
      selectedWeekdays,
      entries,
      `${entries.length} período(s) salvo(s) em ${selectedWeekdays.length} dia(s).`,
    )
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
              hour.active &&
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
    const existingEntries = workingHours
      .filter(
        (hour) => hour.active && weekdaysToSave.includes(hour.weekday),
      )
      .map(({ weekday, start_time, end_time }) => ({
        weekday,
        start_time,
        end_time,
      }))
    const entriesToReplace = [...existingEntries, ...entriesToSave]

    await replaceWorkingHourEntries(
      batch.establishmentId,
      batch.professionalId,
      weekdaysToSave,
      entriesToReplace,
      `${entriesToSave.length} período(s) salvo(s) em ${weekdaysToSave.length} dia(s).`,
    )
  }

  function handleCancelWorkingHourConflict() {
    if (workingHoursSaving) return

    setPendingWorkingHourBatch(null)
    setWorkingHoursError('')
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

  function handleCancelWorkingHourEdit() {
    if (workingHoursSaving) return

    resetWorkingHourForm()
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

  const displayedWorkingHours = showInactiveWorkingHours
    ? workingHours
    : workingHours.filter((hour) => hour.active)
  const hasInactiveWorkingHours = workingHours.some((hour) => !hour.active)
  const editingProfessional = professionals.find(
    (professional) => professional.id === editingProfessionalId,
  )
  const editingWorkingHour = workingHours.find(
    (hour) => hour.id === editingWorkingHourId,
  )

  if (establishmentLoading || (loading && establishment)) {
    return <LoadingState label="Carregando profissionais..." />
  }

  if (!establishment) {
    return <p role="alert">Não foi possível carregar o estabelecimento.</p>
  }

  return (
    <main className="page-container">
      <PageTitle
        title="Profissionais"
        description="Gerencie os profissionais do seu estabelecimento."
      />
      {successMessage && (
        <p className="operation-feedback" role="status">
          {successMessage}
        </p>
      )}

      <Card className="form-card">
        <h2>Cadastrar novo profissional</h2>

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
            {saving ? 'Salvando...' : 'Cadastrar profissional'}
          </button>
        </form>
      </Card>

      {error && !editingProfessionalId && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {!error && professionals.length === 0 && (
        <Card>
          <EmptyState title="Nenhum profissional cadastrado ainda" />
        </Card>
      )}

      {professionals.map((professional) => (
        <Card key={professional.id} className="entity-card">
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
              setShowInactiveWorkingHours(false)
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
            <section
              className="working-hours-panel"
              aria-label={`Horários de ${professional.name}`}
            >
              <h3>Horários de trabalho</h3>
              <p>
                Selecione um ou mais dias e informe o expediente. Um intervalo
                divide o expediente em dois períodos.
              </p>

              {!editingWorkingHourId && (
                <form
                  onSubmit={handleSaveWorkingHour}
                  className="working-hour-create-form"
                >
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
                <button
                  type="submit"
                  disabled={
                    workingHoursSaving ||
                    workingHoursLoading ||
                    workingHoursLoadFailed
                  }
                >
                  {workingHoursSaving ? 'Salvando...' : 'Adicionar período'}
                </button>
                </form>
              )}

              {workingHoursSuccess && (
                <p role="status">{workingHoursSuccess}</p>
              )}
              {workingHoursError &&
                !editingWorkingHourId &&
                !pendingWorkingHourBatch && (
                <p role="alert">{workingHoursError}</p>
              )}
              {hasInactiveWorkingHours && !workingHoursLoading && (
                <button
                  type="button"
                  aria-expanded={showInactiveWorkingHours}
                  onClick={() =>
                    setShowInactiveWorkingHours((shown) => !shown)
                  }
                >
                  {showInactiveWorkingHours
                    ? 'Ocultar horários inativos'
                    : 'Mostrar horários inativos'}
                </button>
              )}
              {workingHoursLoading ? (
                <p>Carregando horários...</p>
              ) : workingHours.length === 0 ? (
                <p>Nenhum horário cadastrado para este profissional.</p>
              ) : displayedWorkingHours.length === 0 ? (
                <p>Nenhum horário ativo cadastrado.</p>
              ) : (
                weekdays.map((day, weekday) => {
                  const dayHours = displayedWorkingHours.filter(
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
        </Card>
      ))}
      <EditModal
        open={editingProfessionalId !== null}
        title={
          editingProfessional
            ? `Editar profissional — ${editingProfessional.name}`
            : 'Editar profissional'
        }
        description="Altere os dados do profissional selecionado."
        saving={saving}
        onClose={handleCancelProfessionalEdit}
      >
        {editingProfessionalId && (
          <form onSubmit={handleSaveProfessional} className="edit-modal__form">
            <label htmlFor="editProfessionalName">Nome</label>
            <input
              id="editProfessionalName"
              type="text"
              value={editingProfessionalName}
              onChange={(event) =>
                setEditingProfessionalName(event.target.value)
              }
              disabled={saving}
              required
            />
            <label htmlFor="editProfessionalPhone">Telefone (opcional)</label>
            <input
              id="editProfessionalPhone"
              type="tel"
              value={editingProfessionalPhone}
              onChange={(event) =>
                setEditingProfessionalPhone(event.target.value)
              }
              disabled={saving}
            />
            <label htmlFor="editProfessionalEmail">Email (opcional)</label>
            <input
              id="editProfessionalEmail"
              type="email"
              value={editingProfessionalEmail}
              onChange={(event) =>
                setEditingProfessionalEmail(event.target.value)
              }
              disabled={saving}
            />
            <label htmlFor="editProfessionalUnit">Unidade</label>
            <select
              id="editProfessionalUnit"
              value={editingUnitId}
              onChange={(event) => setEditingUnitId(event.target.value)}
              required
              disabled={units.length === 0 || saving}
            >
              <option value="">Selecione uma unidade</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                  {unit.active ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
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
                onClick={handleCancelProfessionalEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || units.length === 0}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        )}
      </EditModal>
      <EditModal
        open={editingWorkingHourId !== null}
        title={
          editingWorkingHour
            ? `Editar horário — ${weekdays[editingWorkingHour.weekday]}, ${editingWorkingHour.start_time.slice(0, 5)}–${editingWorkingHour.end_time.slice(0, 5)}`
            : 'Editar horário de trabalho'
        }
        description={
          editingProfessional
            ? `Profissional: ${editingProfessional.name}. O dia da semana não pode ser alterado.`
            : 'O dia da semana não pode ser alterado.'
        }
        saving={workingHoursSaving}
        onClose={handleCancelWorkingHourEdit}
      >
        {editingWorkingHourId && (
          <form
            onSubmit={handleSaveWorkingHour}
            className="edit-modal__form"
          >
            <label htmlFor="editWorkingHourWeekday">Dia da semana</label>
            <input
              id="editWorkingHourWeekday"
              type="text"
              value={weekdays[Number(workingHourWeekday)] ?? ''}
              readOnly
            />
            <label htmlFor="editWorkingHourStart">Início do expediente</label>
            <input
              id="editWorkingHourStart"
              type="time"
              value={workingHourStart}
              onChange={(event) => setWorkingHourStart(event.target.value)}
              disabled={workingHoursSaving}
              required
            />
            <label htmlFor="editWorkingHourEnd">Término do expediente</label>
            <input
              id="editWorkingHourEnd"
              type="time"
              value={workingHourEnd}
              onChange={(event) => setWorkingHourEnd(event.target.value)}
              disabled={workingHoursSaving}
              required
            />
            {workingHoursError && (
              <p className="notice notice--error" role="alert">
                {workingHoursError}
              </p>
            )}
            <div className="edit-modal__actions">
              <Button
                variant="secondary"
                type="button"
                disabled={workingHoursSaving}
                onClick={handleCancelWorkingHourEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={
                  workingHoursSaving ||
                  workingHoursLoading ||
                  workingHoursLoadFailed
                }
              >
                {workingHoursSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        )}
      </EditModal>
      <EditModal
        open={
          pendingWorkingHourBatch !== null &&
          pendingWorkingHourBatch.establishmentId === establishment.id &&
          pendingWorkingHourBatch.professionalId === selectedProfessionalId
        }
        eyebrow="Atenção"
        title="Conflito de horários"
        description="Revise os períodos existentes e escolha como continuar."
        saving={workingHoursSaving}
        closeLabel="Fechar conflito de horários"
        onClose={handleCancelWorkingHourConflict}
      >
        {pendingWorkingHourBatch && (
          <div className="working-hour-conflict">
            {workingHoursError && (
              <p className="notice notice--error" role="alert">
                {workingHoursError}
              </p>
            )}
            <ul
              className="working-hour-conflict__days"
              aria-label="Horários propostos e existentes"
            >
              {pendingWorkingHourBatch.weekdays.map((weekday) => {
                const proposedPeriods =
                  pendingWorkingHourBatch.entries.filter(
                    (entry) => entry.weekday === weekday,
                  )
                const existingPeriods = workingHours.filter(
                  (hour) => hour.active && hour.weekday === weekday,
                )
                const hasOverlap = proposedPeriods.some((proposed) =>
                  existingPeriods.some((existing) =>
                    periodsOverlap(
                      proposed.start_time,
                      proposed.end_time,
                      existing.start_time,
                      existing.end_time,
                    ),
                  ),
                )

                return (
                  <li key={weekday}>
                    <strong>{weekdays[weekday]}</strong>
                    <p>
                      Propostos:{' '}
                      {proposedPeriods
                        .map(
                          (period) =>
                            `${period.start_time.slice(0, 5)}–${period.end_time.slice(0, 5)}`,
                        )
                        .join(', ')}
                    </p>
                    <p>
                      Expediente ativo:{' '}
                      {existingPeriods.length > 0
                        ? existingPeriods
                            .map(
                              (period) =>
                                `${period.start_time.slice(0, 5)}–${period.end_time.slice(0, 5)}`,
                            )
                            .join(', ')
                        : 'nenhum'}
                    </p>
                    {hasOverlap && (
                      <p className="working-hour-conflict__warning">
                        Há sobreposição real neste dia.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
            <p>
              “Somente nos dias sem horários” ignora qualquer dia que já tenha
              expediente. “Nos dias sem sobreposição” também considera dias
              com expediente, desde que os períodos não se cruzem, e preserva
              os horários existentes.
            </p>
            <div className="working-hour-conflict__actions">
              <Button
                type="button"
                disabled={
                  workingHoursSaving ||
                  pendingWorkingHourBatch.weekdays.every((weekday) =>
                    pendingWorkingHourBatch.conflictingWeekdays.includes(
                      weekday,
                    ),
                  )
                }
                onClick={() => handleResolveWorkingHourConflict(false)}
              >
                Cadastrar somente nos dias sem horários
              </Button>
              <Button
                type="button"
                disabled={
                  workingHoursSaving ||
                  pendingWorkingHourBatch.entries.every((entry) =>
                    workingHours.some(
                      (hour) =>
                        hour.active &&
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
                onClick={() => handleResolveWorkingHourConflict(true)}
              >
                Cadastrar nos dias sem sobreposição
              </Button>
              <Button
                variant="secondary"
                type="button"
                disabled={workingHoursSaving}
                onClick={handleCancelWorkingHourConflict}
              >
                Cancelar cadastro
              </Button>
            </div>
          </div>
        )}
      </EditModal>
    </main>
  )
}

export default ProfessionalsPage
