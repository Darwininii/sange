export function isEmptyChatHtml(value) {
  if (!value) {
    return true
  }

  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return text.length === 0
}
