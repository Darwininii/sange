import { useEffect, useRef, useState } from 'react'
import { GrSend } from 'react-icons/gr'
import appToast from '../hooks/appToast'
import AppButton from './AppButton'
import ChatComposer from './ChatComposer'
import { isEmptyChatHtml } from './chatComposerUtils'
import {
  formatChatAuthorName,
  getChatAuthorName,
  getOrderMessages,
  sendOrderMessage,
  subscribeOrderMessages,
} from '../services/orderService'
import { cn } from '@/lib/utils'

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function formatMessageTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function MessageBody({ html, className }) {
  return (
    <div
      className={cn('chat-message-body text-sm', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function OrderChatPanel({
  orderUuid = null,
  orderLabel = '',
  clientName = '',
  technicianId = '',
  currentUser = null,
  className,
  style,
}) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(orderUuid))
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef(null)
  const composerRef = useRef(null)
  const canChat = Boolean(orderUuid && currentUser?.id)

  function focusComposer() {
    composerRef.current?.focus?.()
  }

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      if (!orderUuid) {
        setMessages([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const result = await getOrderMessages(orderUuid)

        if (!cancelled) {
          setMessages(result)
        }
      } catch (error) {
        if (!cancelled) {
          appToast.danger(
            getErrorMessage(error, 'No se pudieron cargar los mensajes.'),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [orderUuid])

  useEffect(() => {
    if (!orderUuid) {
      return undefined
    }

    return subscribeOrderMessages(orderUuid, (message) => {
      if (!message) {
        return
      }

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current
        }

        return [...current, message]
      })
    })
  }, [orderUuid])

  useEffect(() => {
    const node = listRef.current

    if (!node) {
      return
    }

    node.scrollTop = node.scrollHeight
  }, [messages, isLoading])

  async function handleSend(event) {
    event?.preventDefault?.()

    if (!canChat || isEmptyChatHtml(draft) || isSending) {
      focusComposer()
      return
    }

    const body = draft
    setIsSending(true)
    setDraft('')
    composerRef.current?.clear?.()
    focusComposer()

    try {
      const message = await sendOrderMessage(orderUuid, body, {
        userId: currentUser.id,
        authorName: getChatAuthorName(currentUser),
        orderNumber: orderLabel,
        clientName,
        technicianId,
      })

      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current
        }

        return [...current, message]
      })
    } catch (error) {
      setDraft(body)
      composerRef.current?.setContent?.(body)
      appToast.danger(getErrorMessage(error, 'No se pudo enviar el mensaje.'))
    } finally {
      setIsSending(false)
      focusComposer()
    }
  }

  return (
    <aside
      style={style}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-4xl border border-border bg-surface shadow-sm',
        className,
      )}
    >
      <header className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Chat de la orden
        </h2>
        <p className="text-xs text-foreground/55">
          {orderLabel
            ? `Conversacion de la orden #${orderLabel}`
            : 'Guarda la orden para activar el chat'}
        </p>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background/50 px-3 py-4"
      >
        {!canChat ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="text-sm text-foreground/55">
              El chat se activa al editar una orden ya guardada.
            </p>
          </div>
        ) : isLoading ? (
          <p className="px-2 text-sm text-foreground/55">Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <p className="text-sm text-foreground/55">
              Aun no hay mensajes. Escribe el primero.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => {
              const isMine = message.userId === currentUser?.id
              const isHtml = /<\/?[a-z][\s\S]*>/i.test(message.body)

              return (
                <article
                  key={message.id}
                  className={cn(
                    'flex max-w-[90%] flex-col gap-1',
                    isMine ? 'ml-auto items-end' : 'mr-auto items-start',
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 text-sm shadow-sm',
                      isMine
                        ? 'rounded-br-md bg-[#1A2340] text-white dark:bg-primary dark:text-black'
                        : 'rounded-bl-md bg-surface text-foreground ring-1 ring-border',
                    )}
                  >
                    {!isMine ? (
                      <p className="mb-1 text-[11px] font-semibold tracking-wide opacity-70">
                        {formatChatAuthorName(message.authorName)}
                      </p>
                    ) : null}
                    {isHtml ? (
                      <MessageBody html={message.body} />
                    ) : (
                      <p className="whitespace-pre-wrap wrap-break-words">
                        {message.body}
                      </p>
                    )}
                  </div>
                  <p className="px-1 text-[10px] text-foreground/45">
                    {formatMessageTime(message.createdAt)}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-border bg-surface p-3"
        onSubmit={handleSend}
      >
        <ChatComposer
          ref={composerRef}
          value={draft}
          disabled={!canChat}
          placeholder={canChat ? 'Escribe un mensaje...' : 'Chat no disponible'}
          onChange={setDraft}
          onSubmit={handleSend}
        />
        <AppButton
          type="submit"
          size="icon"
          effect="zoomIn"
          icon={GrSend}
          aria-label="Enviar mensaje"
          tooltip="Enviar"
          disabled={!canChat || isSending || isEmptyChatHtml(draft)}
          isLoading={isSending}
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          className="shrink-0 rounded-full bg-accent text-black/70 disabled:text-white ring-2 ring-black/60 disabled:bg-black disabled:opacity-60 dark:bg-primary dark:text-black dark:disabled:text-white dark:disabled:bg-black"
        />
      </form>
    </aside>
  )
}

export default OrderChatPanel
