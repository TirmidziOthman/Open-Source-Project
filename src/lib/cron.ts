/**
 * croncraft — pure TypeScript cron engine (zero external dependencies)
 *
 * Supports 5-field cron expressions: minute hour day-of-month month day-of-week
 * Range:  minute 0-59, hour 0-23, day-of-month 1-31, month 1-12, day-of-week 0-6 (0=Sun)
 */

export interface CronField {
  raw: string
  values: number[]      // expanded set of valid values
}

export interface ParsedCron {
  minute: CronField
  hour: CronField
  dayOfMonth: CronField
  month: CronField
  dayOfWeek: CronField
}

export interface ParseResult {
  ok: true
  parsed: ParsedCron
  expression: string
}

export interface ParseError {
  ok: false
  error: string
}

// ── Field metadata ──────────────────────────────────────────────────────────

interface FieldMeta {
  name: string
  min: number
  max: number
}

const FIELDS: FieldMeta[] = [
  { name: 'minute',       min: 0,  max: 59 },
  { name: 'hour',         min: 0,  max: 23 },
  { name: 'day-of-month', min: 1,  max: 31 },
  { name: 'month',        min: 1,  max: 12 },
  { name: 'day-of-week',  min: 0,  max: 6  },
]

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}
const DOW_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(values: number[], min: number, max: number): number[] {
  return values.filter(v => v >= min && v <= max)
}

function resolveAlias(token: string, fieldIndex: number): string {
  const lower = token.toLowerCase()
  if (fieldIndex === 3 && lower in MONTH_NAMES) return String(MONTH_NAMES[lower])
  if (fieldIndex === 4 && lower in DOW_NAMES)   return String(DOW_NAMES[lower])
  return token
}

function range(start: number, end: number, step = 1): number[] {
  if (step <= 0) return []
  const result: number[] = []
  for (let i = start; i <= end; i += step) result.push(i)
  return result
}

// ── Single-token parser ───────────────────────────────────────────────────────

function parseToken(
  raw: string,
  meta: FieldMeta,
  fieldIndex: number,
): number[] | string {
  const token = resolveAlias(raw.trim(), fieldIndex)

  // Wildcard
  if (token === '*') return range(meta.min, meta.max)

  // Step on wildcard: */n
  const stepWildcard = /^\*\/(\d+)$/.exec(token)
  if (stepWildcard) {
    const step = parseInt(stepWildcard[1], 10)
    if (step === 0) return `Step of 0 is invalid in "${raw}"`
    return range(meta.min, meta.max, step)
  }

  // Range with optional step: a-b or a-b/n
  const rangeMatch = /^(\w+)-(\w+)(?:\/(\d+))?$/.exec(token)
  if (rangeMatch) {
    const start = parseInt(resolveAlias(rangeMatch[1], fieldIndex), 10)
    const end   = parseInt(resolveAlias(rangeMatch[2], fieldIndex), 10)
    const step  = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1
    if (isNaN(start) || isNaN(end)) return `Invalid range values in "${raw}"`
    if (start > end)  return `Range start > end in "${raw}"`
    if (step === 0)   return `Step of 0 is invalid in "${raw}"`
    const vals = range(start, end, step)
    const clamped = clamp(vals, meta.min, meta.max)
    if (clamped.length !== vals.length)
      return `Range "${raw}" contains values outside ${meta.name} bounds [${meta.min}-${meta.max}]`
    return clamped
  }

  // Plain number
  const num = parseInt(resolveAlias(token, fieldIndex), 10)
  if (isNaN(num)) return `Cannot parse "${raw}" as a number for ${meta.name}`
  if (num < meta.min || num > meta.max)
    return `Value ${num} is out of range for ${meta.name} [${meta.min}-${meta.max}]`
  return [num]
}

// ── Field parser (handles comma-separated lists) ─────────────────────────────

function parseField(
  raw: string,
  meta: FieldMeta,
  fieldIndex: number,
): CronField | string {
  const parts = raw.split(',')
  const values = new Set<number>()
  for (const part of parts) {
    const result = parseToken(part.trim(), meta, fieldIndex)
    if (typeof result === 'string') return result   // propagate error
    result.forEach(v => values.add(v))
  }
  return { raw, values: [...values].sort((a, b) => a - b) }
}

// ── Main parse entry point ───────────────────────────────────────────────────

export function parseCron(expression: string): ParseResult | ParseError {
  const trimmed = expression.trim()

  // Named shortcuts
  const shortcuts: Record<string, string> = {
    '@yearly':   '0 0 1 1 *',
    '@annually': '0 0 1 1 *',
    '@monthly':  '0 0 1 * *',
    '@weekly':   '0 0 * * 0',
    '@daily':    '0 0 * * *',
    '@midnight': '0 0 * * *',
    '@hourly':   '0 * * * *',
  }
  const resolved = shortcuts[trimmed.toLowerCase()] ?? trimmed

  const parts = resolved.split(/\s+/)
  if (parts.length !== 5) {
    return {
      ok: false,
      error: `Expected 5 fields (minute hour day month weekday) but got ${parts.length}.`,
    }
  }

  const fieldNames: (keyof ParsedCron)[] = [
    'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek',
  ]
  const parsed: Partial<ParsedCron> = {}

  for (let i = 0; i < 5; i++) {
    const result = parseField(parts[i], FIELDS[i], i)
    if (typeof result === 'string') {
      return { ok: false, error: `Field "${FIELDS[i].name}": ${result}` }
    }
    parsed[fieldNames[i]] = result
  }

  return {
    ok: true,
    parsed: parsed as ParsedCron,
    expression: resolved,
  }
}

// ── Human-readable summary ───────────────────────────────────────────────────


const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_LABELS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

export function humanReadable(parsed: ParsedCron): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = parsed

  const everyMinute = minute.raw === '*'
  const everyHour   = hour.raw === '*'
  const everyDOM    = dayOfMonth.raw === '*'
  const everyMonth  = month.raw === '*'
  const everyDOW    = dayOfWeek.raw === '*'

  // Time part
  let timePart: string
  if (everyMinute && everyHour) {
    timePart = 'every minute'
  } else if (everyMinute) {
    timePart = `every minute of hour ${hour.values.join(', ')}`
  } else if (/^\*\/\d+$/.test(minute.raw) && everyHour) {
    const step = minute.raw.split('/')[1]
    timePart = `every ${step} minutes`
  } else if (everyHour) {
    timePart = `at minute ${minute.values.join(', ')} of every hour`
  } else {
    const times = hour.values.flatMap(h =>
      minute.values.map(m => {
        const hh = String(h).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        return `${hh}:${mm}`
      })
    )
    timePart = `at ${times.join(', ')}`
  }

  // Day part
  let dayPart = ''
  if (!everyDOM && !everyDOW) {
    const domStr = dayOfMonth.values.map(ordinal).join(', ')
    const dowStr = dayOfWeek.values.map(d => DOW_LABELS[d]).join(', ')
    dayPart = `, on the ${domStr} or ${dowStr}`
  } else if (!everyDOM) {
    dayPart = `, on the ${dayOfMonth.values.map(ordinal).join(', ')} of the month`
  } else if (!everyDOW) {
    dayPart = `, on ${dayOfWeek.values.map(d => DOW_LABELS[d]).join(', ')}`
  }

  // Month part
  let monthPart = ''
  if (!everyMonth) {
    monthPart = ` in ${month.values.map(m => MONTH_LABELS[m]).join(', ')}`
  }

  return `Runs ${timePart}${dayPart}${monthPart}.`
}

// ── Next N run times ─────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate() // month is 1-based here
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Returns true if Feb 29 could ever be matched (leap-year aware) */
function hasLeapDayIssue(parsed: ParsedCron): boolean {
  return (
    parsed.dayOfMonth.values.includes(29) &&
    parsed.month.values.includes(2) &&
    !isLeapYear(new Date().getFullYear())
  )
}

export function nextRuns(parsed: ParsedCron, count = 5, from?: Date): Date[] {
  const start = from ? new Date(from) : new Date()
  // Advance by one minute so "now" is not included
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)

  const results: Date[] = []
  const candidate = new Date(start)
  candidate.setSeconds(0, 0)

  // Guard: max 4 years of searching to avoid infinite loops
  const limit = new Date(start)
  limit.setFullYear(limit.getFullYear() + 4)

  while (results.length < count && candidate < limit) {
    const m  = candidate.getMonth() + 1   // 1-12
    const d  = candidate.getDate()         // 1-31
    const dw = candidate.getDay()          // 0-6
    const h  = candidate.getHours()
    const mn = candidate.getMinutes()

    // Check month first (cheapest skip)
    if (!parsed.month.values.includes(m)) {
      // Skip to 1st of next valid month
      const nextMonth = parsed.month.values.find(v => v > m)
      if (nextMonth !== undefined) {
        candidate.setMonth(nextMonth - 1, 1)
      } else {
        candidate.setFullYear(candidate.getFullYear() + 1, parsed.month.values[0] - 1, 1)
      }
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    // DOM / DOW: standard cron "OR" when both restricted, otherwise use set field
    const domMatch = parsed.dayOfMonth.raw === '*' || parsed.dayOfMonth.values.includes(d)
    const dowMatch = parsed.dayOfWeek.raw  === '*' || parsed.dayOfWeek.values.includes(dw)
    const dayMatch = parsed.dayOfMonth.raw !== '*' && parsed.dayOfWeek.raw !== '*'
      ? domMatch || dowMatch   // both restricted → OR
      : parsed.dayOfMonth.raw !== '*'
        ? domMatch
        : dowMatch

    if (!dayMatch) {
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    // Check hour
    if (!parsed.hour.values.includes(h)) {
      const nextHour = parsed.hour.values.find(v => v > h)
      if (nextHour !== undefined) {
        candidate.setHours(nextHour, parsed.minute.values[0], 0, 0)
      } else {
        candidate.setDate(candidate.getDate() + 1)
        candidate.setHours(parsed.hour.values[0], parsed.minute.values[0], 0, 0)
      }
      continue
    }

    // Check minute
    if (!parsed.minute.values.includes(mn)) {
      const nextMin = parsed.minute.values.find(v => v > mn)
      if (nextMin !== undefined) {
        candidate.setMinutes(nextMin, 0, 0)
      } else {
        const nextHour = parsed.hour.values.find(v => v > h)
        if (nextHour !== undefined) {
          candidate.setHours(nextHour, parsed.minute.values[0], 0, 0)
        } else {
          candidate.setDate(candidate.getDate() + 1)
          candidate.setHours(parsed.hour.values[0], parsed.minute.values[0], 0, 0)
        }
      }
      continue
    }

    // All fields matched — but validate day exists in month (e.g. Feb 30)
    const dim = daysInMonth(candidate.getFullYear(), m)
    if (d > dim) {
      candidate.setDate(candidate.getDate() + 1)
      candidate.setHours(0, 0, 0, 0)
      continue
    }

    results.push(new Date(candidate))
    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  // Suppress unused warning for helper
  void hasLeapDayIssue

  return results
}
