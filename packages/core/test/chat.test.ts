import { describe, expect, it } from 'vitest'
import { type ChatMessage, inspectChat } from '../src/sequence/chat'

const since = new Date('2026-11-21T10:00:00Z')
const at = (minutes: number) => new Date(since.getTime() + minutes * 60_000)
const first = 'Hi Jane, quick question about Acme'
const followUp = 'Following up on this, Jane'
const context = { since, text: followUp, campaignTexts: [first, followUp] }

const ours = (text: string, minutes: number): ChatMessage => ({
  text,
  isSender: true,
  at: at(minutes),
})
const theirs = (text: string, minutes: number): ChatMessage => ({
  text,
  isSender: false,
  at: at(minutes),
})

describe('inspectChat', () => {
  it('is clear when only our earlier campaign message is there', () => {
    expect(inspectChat([ours(first, 1)], context)).toEqual({ kind: 'clear' })
  })

  it('stops when the lead replied after the sequence started, even without a webhook', () => {
    expect(inspectChat([theirs('sounds good', 3), ours(first, 1)], context)).toEqual({
      kind: 'replied',
      at: at(3),
    })
  })

  it('ignores replies from before the lead was added', () => {
    expect(inspectChat([ours(first, 1), theirs('old chat', -500)], context)).toEqual({
      kind: 'clear',
    })
  })

  it('detects a follow-up that was already sent but never recorded', () => {
    expect(inspectChat([ours(followUp, 6), ours(first, 1)], context)).toEqual({
      kind: 'already_sent',
    })
  })

  it('matches already-sent text regardless of whitespace', () => {
    expect(inspectChat([ours('Following up  on this,\nJane', 6)], context)).toEqual({
      kind: 'already_sent',
    })
  })

  it('stops when the user wrote something manually in the chat', () => {
    expect(inspectChat([ours('let me call you tomorrow', 4), ours(first, 1)], context)).toEqual({
      kind: 'manual',
      at: at(4),
    })
  })

  it('ignores our own old manual messages from before the lead was added', () => {
    expect(inspectChat([ours(first, 1), ours('haha', -900)], context)).toEqual({ kind: 'clear' })
  })

  it('prioritises a reply over everything else', () => {
    const messages = [ours(followUp, 6), theirs('yes!', 5), ours('manual', 4)]
    expect(inspectChat(messages, context).kind).toBe('replied')
  })
})
