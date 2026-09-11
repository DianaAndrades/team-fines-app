import { beforeEach, describe, expect, it, vi } from 'vitest'

const order = vi.fn()
const eq = vi.fn(() => ({ order }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from })),
}))

import { listTeamSeasons } from './service'

describe('season history service', () => {
  beforeEach(() => {
    from.mockClear()
    select.mockClear()
    eq.mockClear()
    order.mockReset()
  })

  it('lists active and historical seasons with carried debt counts', async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: 'season-new',
          name: '2027/28',
          is_active: true,
          created_at: '2027-07-01T10:00:00.000Z',
          fine_season_links: [
            { fine_id: 'fine-1', link_type: 'CARRIED' },
            { fine_id: 'fine-2', link_type: 'CARRIED' },
          ],
        },
        {
          id: 'season-old',
          name: '2026/27',
          is_active: false,
          created_at: '2026-07-01T10:00:00.000Z',
          fine_season_links: [
            { fine_id: 'fine-1', link_type: 'ORIGIN' },
            { fine_id: 'fine-3', link_type: 'ORIGIN' },
          ],
        },
      ],
      error: null,
    })

    await expect(listTeamSeasons('team-123')).resolves.toEqual([
      {
        id: 'season-new',
        name: '2027/28',
        isActive: true,
        createdAt: '2027-07-01T10:00:00.000Z',
        carriedDebtCount: 2,
      },
      {
        id: 'season-old',
        name: '2026/27',
        isActive: false,
        createdAt: '2026-07-01T10:00:00.000Z',
        carriedDebtCount: 0,
      },
    ])

    expect(from).toHaveBeenCalledWith('seasons')
    expect(select).toHaveBeenCalledWith(
      'id,name,is_active,created_at,fine_season_links(fine_id,link_type)',
    )
    expect(eq).toHaveBeenCalledWith('team_id', 'team-123')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('fails closed when season history cannot be loaded', async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    await expect(listTeamSeasons('team-123')).rejects.toThrow(
      'Could not load team seasons.',
    )
  })
})
