import { describe, expect, it } from 'vitest'
import { identityFrom } from '../src/sequence/runner'

const now = new Date('2026-11-21T12:00:00Z')
const lead = { firstName: null, lastName: null, connectedAt: null, relationRequestId: null }
const profile = (specifics: Record<string, unknown>) => ({
  id: 'ACoAAA1',
  first_name: 'Jane',
  last_name: 'Doe',
  specifics,
})

describe('identityFrom', () => {
  it('marks first-degree profiles as connected so the invite step is skipped', () => {
    expect(identityFrom(profile({ network_distance: 'FIRST_DEGREE' }), lead, now)).toMatchObject({
      userId: 'ACoAAA1',
      connectedAt: now,
    })
  })

  it('reuses a pending relation request instead of sending another', () => {
    const patch = identityFrom(
      profile({
        network_distance: 'SECOND_DEGREE',
        relation_request_status: 'PENDING',
        relation_request: { id: 'SENT_1' },
      }),
      lead,
      now,
    )
    expect(patch).toMatchObject({ relationRequestId: 'SENT_1' })
    expect(patch.connectedAt).toBeUndefined()
  })

  it('keeps names from the CSV over profile names', () => {
    expect(identityFrom(profile({}), { ...lead, firstName: 'Janie' }, now)).toMatchObject({
      firstName: 'Janie',
      lastName: 'Doe',
    })
  })
})
