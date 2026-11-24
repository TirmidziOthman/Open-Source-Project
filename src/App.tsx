import { useState, useEffect, useCallback, useRef } from 'react'
import { parseCron, humanReadable, nextRuns } from './lib/cron'

// ── Presets ──────────────────────────────────────────────────────────────────

interface Preset {
  label: string
  expr: string
}

const PRESETS: Preset[] = [
  { label: 'Every minute',     expr: '* * * * *' },
  { label: 'Every 5 mins',     expr: '*/5 * * * *' },
  { label: 'Every 15 mins',    expr: '*/15 * * * *' },
  { label: 'Every hour',       expr: '0 * * * *' },
  { label: 'Weekdays at 9 AM', expr: '0 9 * * 1-5' },
  { label: 'Daily midnight',   expr: '0 0 * * *' },
  { label: '1st of month',     expr: '0 0 1 * *' },
  { label: 'Every Sunday',     expr: '0 0 * * 0' },
  { label: 'Quarterly',        expr: '0 0 1 1,4,7,10 *' },
]

// ── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diff = Math.round((date.getTime() - Date.now()) / 1000)
  if (diff < 60)         return `in ${diff}s`
  if (diff < 3600)       return `in ${Math.round(diff / 60)}m`
  if (diff < 86400)      return `in ${Math.round(diff / 3600)}h`
  if (diff < 86400 * 7)  return `in ${Math.round(diff / 86400)}d`
  return `in ${Math.round(diff / (86400 * 7))}w`
}

function formatDate(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    second:  '2-digit',
  })
}

// ── Field editor ─────────────────────────────────────────────────────────────

interface FieldEditorProps {
  label: string
  value: string
  onChange: (v: string) => void
}

function FieldEditor({ label, value, onChange }: FieldEditorProps) {
  return (
    <div>
      <div className="field-label">{label}</div>
      <input
        className="field-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={`Cron field: ${label}`}
      />
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

type Fields = [string, string, string, string, string]

function splitExpr(expr: string): Fields {
  const parts = expr.trim().split(/\s+/)
  const f = (i: number) => parts[i] ?? '*'
  return [f(0), f(1), f(2), f(3), f(4)]
}

export default function App() {
  const [rawExpr, setRawExpr]   = useState('*/5 * * * *')
  const [fields, setFields]     = useState<Fields>(splitExpr('*/5 * * * *'))
  const [copied, setCopied]     = useState(false)
  const [runs, setRuns]         = useState<Date[]>([])
  const [parseOk, setParseOk]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [summary, setSummary]   = useState<string>('')
  const [now, setNow]           = useState(new Date())
  const timerRef                = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tick every second for relative times
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])
  void now // consumed by relativeTime inside render

  // Parse whenever rawExpr changes
  useEffect(() => {
    const result = parseCron(rawExpr)
    if (result.ok) {
      setParseOk(true)
      setSummary(humanReadable(result.parsed))
      setRuns(nextRuns(result.parsed, 5))
      setError(null)
    } else {
      setParseOk(false)
      setSummary('')
      setRuns([])
      setError(result.error)
    }
  }, [rawExpr])

  // Sync raw → fields (when user types in main input)
  const handleRawChange = useCallback((value: string) => {
    setRawExpr(value)
    setFields(splitExpr(value))
  }, [])

  // Sync fields → raw (when user edits a field box)
  const onFieldChange = (index: number, value: string) => {
    const next = [...fields] as Fields
    next[index] = value
    setFields(next)
    setRawExpr(next.join(' '))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawExpr)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard API may be unavailable in some environments
    }
  }

  const activePreset = PRESETS.find(p => p.expr === rawExpr)?.label

  const FIELD_LABELS = ['Minute', 'Hour', 'Day (Month)', 'Month', 'Day (Week)']

  return (
    <div className="app">
      <header>
        <h1>⏱ CronCraft</h1>
        <p>Visual cron expression builder &amp; next-run predictor</p>
      </header>

      {/* ── Presets ── */}
      <div className="card">
        <div className="card-title">Quick Presets</div>
        <div className="presets">
          {PRESETS.map(p => (
            <button
              key={p.expr}
              className={`preset-btn${activePreset === p.label ? ' active' : ''}`}
              onClick={() => { setRawExpr(p.expr); setFields(splitExpr(p.expr)) }}
              aria-pressed={activePreset === p.label}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cron Input ── */}
      <div className="card">
        <div className="card-title">Cron Expression</div>
        <div className="cron-input-row" style={{ marginBottom: '1rem' }}>
          <input
            className={`cron-input${error ? ' error' : parseOk ? ' ok' : ''}`}
            value={rawExpr}
            onChange={e => handleRawChange(e.target.value)}
            aria-label="Cron expression"
            spellCheck={false}
          />
          <button
            className={`copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            aria-label="Copy cron expression to clipboard"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>

        {/* Field editors */}
        <div className="field-labels">
          {FIELD_LABELS.map((label, i) => (
            <FieldEditor
              key={label}
              label={label}
              value={fields[i]}
              onChange={v => onFieldChange(i, v)}
            />
          ))}
        </div>
      </div>

      {/* ── Explanation Banner ── */}
      <div className="card">
        <div className="card-title">Human Explanation</div>
        {error ? (
          <div className="banner err" role="alert">⚠ {error}</div>
        ) : summary ? (
          <div className="banner ok" role="status">✓ {summary}</div>
        ) : (
          <div className="muted">Enter a cron expression above.</div>
        )}
      </div>

      {/* ── Next Run Times ── */}
      <div className="card">
        <div className="card-title">Next 5 Scheduled Runs</div>
        {runs.length > 0 ? (
          <ul className="runs-list" aria-label="Next scheduled run times">
            {runs.map((r, i) => (
              <li key={r.toISOString()}>
                <span className="run-index">{i + 1}</span>
                <span className="run-time">{formatDate(r)}</span>
                <span className="run-relative">{relativeTime(r)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">
            {error ? 'Fix the expression above to see run times.' : 'No upcoming runs found.'}
          </div>
        )}
      </div>

      <footer>
        <p>
          Open source · <a href="https://github.com/yourusername/croncraft" target="_blank" rel="noopener noreferrer">GitHub</a>
          {' · '}Built with React + TypeScript · Zero runtime dependencies
        </p>
      </footer>
    </div>
  )
}
