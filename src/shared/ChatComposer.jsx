import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TbBold, TbItalic, TbUnderline } from 'react-icons/tb'
import AppButton from './AppButton'
import { isEmptyChatHtml } from './chatComposerUtils'
import { cn } from '@/lib/utils'

function ToolbarButton({ icon, label, active = false, disabled = false, onClick }) {
  return (
    <AppButton
      type="button"
      variant="outline"
      size="icon"
      icon={icon}
      tooltip={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={onClick}
      className={cn(
        'size-8 rounded-xl border-border bg-background text-foreground/70',
        active &&
          'ring-[1.5px] bg-accent/80 text-black/70 ring-primary/50 hover:bg-accent/60 dark:hover:bg-accent hover:text-black/70',
      )}
    />
  )
}

const ChatComposer = forwardRef(function ChatComposer(
  {
    value = '',
    onChange,
    onSubmit,
    disabled = false,
    placeholder = 'Escribe un mensaje...',
    className,
  },
  ref,
) {
  const [, setEditorVersion] = useState(0)

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'chat-composer-editor max-h-28 min-h-11 overflow-y-auto px-3 py-2.5 text-sm text-foreground outline-none',
        'data-placeholder': placeholder,
      },
      handleKeyDown: (_view, event) => {
        if (event.key !== 'Enter') {
          return false
        }

        if (event.shiftKey) {
          return false
        }

        event.preventDefault()
        onSubmit?.(event)
        return true
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      onChange?.(isEmptyChatHtml(html) ? '' : html)
    },
  })

  useEffect(() => {
    if (!editor) {
      return undefined
    }

    const refresh = () => setEditorVersion((version) => version + 1)

    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)

    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
    }
  }, [editor])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor?.commands.focus('end')
      },
      clear: () => {
        editor?.commands.clearContent(true)
        onChange?.('')
      },
      setContent: (nextValue) => {
        editor?.commands.setContent(nextValue || '', { emitUpdate: false })
      },
    }),
    [editor, onChange],
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) {
      return
    }

    const nextValue = value || ''
    const currentValue = editor.getHTML()

    if (isEmptyChatHtml(nextValue) && isEmptyChatHtml(currentValue)) {
      return
    }

    if (nextValue !== currentValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20',
        disabled && 'opacity-60',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-1.5 py-1.5">
        <ToolbarButton
          icon={TbBold}
          label="Negrita"
          active={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={TbItalic}
          label="Cursiva"
          active={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={TbUnderline}
          label="Subrayado"
          active={editor.isActive('underline')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
      </div>

      <div className="relative">
        {isEmptyChatHtml(value) ? (
          <p className="pointer-events-none absolute left-3 top-2.5 text-sm text-foreground/40">
            {placeholder}
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
})

export default ChatComposer
