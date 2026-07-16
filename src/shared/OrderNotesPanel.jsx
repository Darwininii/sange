import { useEffect, useState } from 'react'
import appToast from '../hooks/appToast'
import AppButton from './AppButton'
import {
  createOrderNote,
  getOrderNotes,
} from '../services/orderService'

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function formatNoteDate(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function OrderNotesPanel({ orderUuid, userId, authorName }) {
  const [notes, setNotes] = useState([])
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadNotes() {
      if (!orderUuid) {
        setNotes([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const result = await getOrderNotes(orderUuid)

        if (!cancelled) {
          setNotes(result)
        }
      } catch (error) {
        if (!cancelled) {
          appToast.danger(getErrorMessage(error, 'No se pudieron cargar las notas.'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadNotes()

    return () => {
      cancelled = true
    }
  }, [orderUuid])

  async function handleSubmit(event) {
    event.preventDefault()

    if (!body.trim()) {
      appToast.warning('Escribe una nota antes de guardar.')
      return
    }

    setIsSubmitting(true)

    try {
      const note = await createOrderNote(orderUuid, body, {
        userId,
        authorName,
      })
      setNotes((current) => [...current, note])
      setBody('')
      appToast.success('Nota agregada.')
    } catch (error) {
      appToast.danger(getErrorMessage(error, 'No se pudo crear la nota.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mt-6 rounded-4xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Bitacora / Notas
        </h2>
        <p className="mt-1 text-sm text-foreground/55">
          Historial permanente visible para todo el equipo con acceso a la orden.
        </p>
      </div>

      <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-3xl border border-border bg-background p-4">
        {isLoading ? (
          <p className="text-sm text-foreground/55">Cargando notas...</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-foreground/55">
            Aun no hay notas en esta orden.
          </p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl border border-border bg-surface px-4 py-3"
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-foreground">{note.authorName}</p>
                <p className="text-xs text-foreground/45">
                  {formatNoteDate(note.createdAt)}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{note.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
          value={body}
          placeholder="Escribe una nota para el equipo..."
          onChange={(event) => setBody(event.target.value)}
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <AppButton type="submit" isLoading={isSubmitting}>
            Agregar nota
          </AppButton>
        </div>
      </form>
    </section>
  )
}

export default OrderNotesPanel
