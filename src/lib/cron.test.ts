import { describe, it, expect } from 'vitest'
import { parseCron, humanReadable, nextRuns } from './cron'

// ── parseCron: valid expressions ─────────────────────────────────────────────

describe('parseCron – valid expressions', () => {
  it('parses a simple expression', () => {
    const r = parseCron('0 9 * * 1-5')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toEqual([0])
    expect(r.parsed.hour.values).toEqual([9])
    expect(r.parsed.dayOfWeek.values).toEqual([1, 2, 3, 4, 5])
  })

  it('parses wildcard *', () => {
    const r = parseCron('* * * * *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toHaveLength(60)  // 0-59
    expect(r.parsed.hour.values).toHaveLength(24)    // 0-23
  })

  it('parses step */15', () => {
    const r = parseCron('*/15 * * * *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toEqual([0, 15, 30, 45])
  })

  it('parses step */5 for minutes', () => {
    const r = parseCron('*/5 * * * *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
  })

  it('parses comma-separated list', () => {
    const r = parseCron('0 0 1,15 * *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.dayOfMonth.values).toEqual([1, 15])
  })

  it('parses range 1-5', () => {
    const r = parseCron('0 8-17 * * *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.hour.values).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
  })

  it('parses range with step 0-30/10', () => {
    const r = parseCron('0-30/10 * * * *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toEqual([0, 10, 20, 30])
  })

  it('parses @daily shortcut', () => {
    const r = parseCron('@daily')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toEqual([0])
    expect(r.parsed.hour.values).toEqual([0])
  })

  it('parses @hourly shortcut', () => {
    const r = parseCron('@hourly')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.minute.values).toEqual([0])
    expect(r.parsed.hour.values).toHaveLength(24)
  })

  it('parses @yearly shortcut', () => {
    const r = parseCron('@yearly')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.month.values).toEqual([1])
    expect(r.parsed.dayOfMonth.values).toEqual([1])
  })

  it('parses month names (jan, dec)', () => {
    const r = parseCron('0 0 1 jan,dec *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.month.values).toEqual([1, 12])
  })

  it('parses day-of-week names (mon-fri)', () => {
    const r = parseCron('0 0 * * mon-fri')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.dayOfWeek.values).toEqual([1, 2, 3, 4, 5])
  })

  it('parses quarterly: 0 0 1 1,4,7,10 *', () => {
    const r = parseCron('0 0 1 1,4,7,10 *')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.parsed.month.values).toEqual([1, 4, 7, 10])
  })
})

// ── parseCron: invalid expressions ───────────────────────────────────────────

describe('parseCron – invalid expressions', () => {
  it('rejects too few fields', () => {
    const r = parseCron('* * *')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/5 fields/)
  })

  it('rejects too many fields', () => {
    const r = parseCron('* * * * * *')
    expect(r.ok).toBe(false)
  })

  it('rejects minute out of range (60)', () => {
    const r = parseCron('60 * * * *')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/minute/)
  })

  it('rejects hour out of range (24)', () => {
    const r = parseCron('0 24 * * *')
    expect(r.ok).toBe(false)
  })

  it('rejects day-of-month out of range (32)', () => {
    const r = parseCron('0 0 32 * *')
    expect(r.ok).toBe(false)
  })

  it('rejects month out of range (13)', () => {
    const r = parseCron('0 0 * 13 *')
    expect(r.ok).toBe(false)
  })

  it('rejects day-of-week out of range (7)', () => {
    const r = parseCron('0 0 * * 7')
    expect(r.ok).toBe(false)
  })

  it('rejects range where start > end', () => {
    const r = parseCron('5-3 * * * *')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error).toMatch(/start > end/)
  })

  it('rejects step of 0', () => {
    const r = parseCron('*/0 * * * *')
    expect(r.ok).toBe(false)
  })

  it('rejects non-numeric junk', () => {
    const r = parseCron('abc * * * *')
    expect(r.ok).toBe(false)
  })

  it('rejects range with out-of-bounds values', () => {
    const r = parseCron('50-70 * * * *')
    expect(r.ok).toBe(false)
  })
})

// ── humanReadable ─────────────────────────────────────────────────────────────

describe('humanReadable', () => {
  it('describes "* * * * *"', () => {
    const r = parseCron('* * * * *')
    if (!r.ok) throw new Error(r.error)
    expect(humanReadable(r.parsed)).toMatch(/every minute/i)
  })

  it('describes "0 9 * * 1-5"', () => {
    const r = parseCron('0 9 * * 1-5')
    if (!r.ok) throw new Error(r.error)
    const h = humanReadable(r.parsed)
    expect(h).toMatch(/09:00/i)
    expect(h).toMatch(/Monday|weekday/i)
  })

  it('describes "*/5 * * * *"', () => {
    const r = parseCron('*/5 * * * *')
    if (!r.ok) throw new Error(r.error)
    expect(humanReadable(r.parsed)).toMatch(/5 minutes/i)
  })

  it('describes "0 0 1 * *"', () => {
    const r = parseCron('0 0 1 * *')
    if (!r.ok) throw new Error(r.error)
    const h = humanReadable(r.parsed)
    expect(h).toMatch(/00:00/)
    expect(h).toMatch(/1st/)
  })

  it('describes "0 0 * * 0" (every Sunday)', () => {
    const r = parseCron('0 0 * * 0')
    if (!r.ok) throw new Error(r.error)
    expect(humanReadable(r.parsed)).toMatch(/Sunday/i)
  })
})

// ── nextRuns ──────────────────────────────────────────────────────────────────

describe('nextRuns', () => {
  /**
   * Fixed reference point: Wed 2025-01-15 10:00:00 local time
   * Using local Date constructor to avoid UTC/local offset confusion.
   */
  const REF = new Date(2025, 0, 15, 10, 0, 0, 0) // local 10:00 AM Jan 15 2025

  it('returns 5 results by default', () => {
    const r = parseCron('* * * * *')
    if (!r.ok) throw new Error(r.error)
    expect(nextRuns(r.parsed, 5, REF)).toHaveLength(5)
  })

  it('*/5 runs: each result is exactly 5 min apart', () => {
    const r = parseCron('*/5 * * * *')
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 5, REF)
    expect(runs).toHaveLength(5)
    for (let i = 1; i < runs.length; i++) {
      const diff = (runs[i].getTime() - runs[i - 1].getTime()) / 1000
      expect(diff).toBe(300)
    }
  })

  it('runs are strictly in the future relative to from', () => {
    const r = parseCron('*/15 * * * *')
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 5, REF)
    runs.forEach(d => expect(d.getTime()).toBeGreaterThan(REF.getTime()))
  })

  it('runs are monotonically increasing', () => {
    const r = parseCron('0 9 * * 1-5')
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 5, REF)
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].getTime()).toBeGreaterThan(runs[i - 1].getTime())
    }
  })

  it('handles month boundary rollover (end of January)', () => {
    // Use local noon on Jan 31 to avoid any UTC/local midnight ambiguity
    const endOfJan = new Date(2025, 0, 31, 12, 0, 0, 0) // local noon Jan 31
    const r = parseCron('0 0 1 * *')   // 1st of month at midnight
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 1, endOfJan)
    expect(runs).toHaveLength(1)
    // Should land on Feb 1st local time
    expect(runs[0].getMonth()).toBe(1)   // February (0-indexed)
    expect(runs[0].getDate()).toBe(1)
  })

  it('handles year boundary rollover (Dec 31 → Jan 1)', () => {
    // Use local noon on Dec 31 to avoid any UTC/local midnight ambiguity
    const endOfYear = new Date(2025, 11, 31, 12, 0, 0, 0) // local noon Dec 31
    const r = parseCron('0 0 1 1 *')   // Jan 1st at midnight
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 1, endOfYear)
    expect(runs).toHaveLength(1)
    expect(runs[0].getFullYear()).toBe(2026)
    expect(runs[0].getMonth()).toBe(0)   // January (0-indexed)
    expect(runs[0].getDate()).toBe(1)
  })

  it('skips invalid calendar days (Feb 30)', () => {
    // Feb 30 never exists; should return 0 results rather than infinite loop
    const r = parseCron('0 0 30 2 *')
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 1, new Date(2025, 0, 1, 12, 0, 0, 0))
    // Leap years have Feb 29 max; Feb 30 never valid → empty
    expect(runs).toHaveLength(0)
  })

  it('handles leap year Feb 29 on a leap year', () => {
    // 2028 is a leap year — use local noon Feb 28 to avoid UTC/local boundary ambiguity
    const before = new Date(2028, 1, 28, 12, 0, 0, 0) // local noon Feb 28 2028
    const r = parseCron('0 0 29 2 *')
    if (!r.ok) throw new Error(r.error)
    const runs = nextRuns(r.parsed, 1, before)
    expect(runs).toHaveLength(1)
    expect(runs[0].getMonth()).toBe(1)   // February (0-indexed)
    expect(runs[0].getDate()).toBe(29)
  })
})
