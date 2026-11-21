export type ChatMessage = { text: string | null; isSender: boolean; at: Date }

export type ChatVerdict =
  | { kind: 'replied'; at: Date }
  | { kind: 'manual'; at: Date }
  | { kind: 'already_sent' }
  | { kind: 'clear' }

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

export function inspectChat(
  messages: ChatMessage[],
  context: { since: Date; text: string; campaignTexts: string[] },
): ChatVerdict {
  const recent = messages.filter((m) => m.at >= context.since)
  const inbound = recent.find((m) => !m.isSender)
  if (inbound) return { kind: 'replied', at: inbound.at }

  const ours = new Set(context.campaignTexts.map(normalizeText))
  const manual = recent.find((m) => m.isSender && !ours.has(normalizeText(m.text)))
  if (manual) return { kind: 'manual', at: manual.at }

  const target = normalizeText(context.text)
  if (recent.some((m) => m.isSender && normalizeText(m.text) === target)) {
    return { kind: 'already_sent' }
  }
  return { kind: 'clear' }
}
