import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  TbBold,
  TbH1,
  TbH2,
  TbH3,
  TbItalic,
  TbList,
  TbListNumbers,
  TbQuote,
  TbStrikethrough,
} from 'react-icons/tb'
import AppButton from './AppButton'
import { cn } from '@/lib/utils'

function isEmptyHtml(value) {
  if (!value) {
    return true
  }

  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return text.length === 0
}

function ToolbarButton({
  icon,
  label,
  active = false,
  disabled = false,
  onClick,
}) {
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
      className={cn(
        'size-9 rounded-xl border-border bg-background text-foreground/70',
        active &&
          'border-primary/40 bg-primary/15 text-primary ring-1 ring-primary/20',
      )}
      onClick={onClick}
    />
  )
}

function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Escribe aqui...',
  className,
  editorClassName,
  disabled = false,
}) {
  const [isEmpty, setIsEmpty] = useState(() => isEmptyHtml(value))

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'rich-text-editor min-h-40 px-4 py-3 text-sm text-foreground outline-none',
          editorClassName,
        ),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()
      setIsEmpty(currentEditor.isEmpty || isEmptyHtml(html))
      onChange?.(isEmptyHtml(html) ? '' : html)
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const nextValue = value || ''
    const currentValue = editor.getHTML()

    if (isEmptyHtml(nextValue) && isEmptyHtml(currentValue)) {
      setIsEmpty(true)
      return
    }

    if (nextValue !== currentValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false })
      setIsEmpty(editor.isEmpty || isEmptyHtml(nextValue))
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) {
      return
    }

    editor.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-background focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20',
        disabled && 'opacity-60',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-surface/70 px-2 py-2">
        <ToolbarButton
          icon={TbH1}
          label="Titulo H1"
          active={editor.isActive('heading', { level: 1 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          icon={TbH2}
          label="Titulo H2"
          active={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={TbH3}
          label="Titulo H3"
          active={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
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
          icon={TbStrikethrough}
          label="Tachado"
          active={editor.isActive('strike')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          icon={TbList}
          label="Lista"
          active={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={TbListNumbers}
          label="Lista numerada"
          active={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={TbQuote}
          label="Cita"
          active={editor.isActive('blockquote')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
      </div>

      <div className="relative">
        {isEmpty ? (
          <p className="pointer-events-none absolute left-4 top-3 text-sm text-foreground/40">
            {placeholder}
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default RichTextEditor
