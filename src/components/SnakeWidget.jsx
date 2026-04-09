import { useEffect, useRef, useState } from 'react'
import { SnakeAgent, evolve } from '../game/engine'

// ── Shared live widget ────────────────────────────────────────────────────
// Connects to the WebSocket server so every visitor sees the same simulation.
// Falls back to a local simulation instantly (no black canvas) if the server
// is cold-starting or unavailable, and auto-reconnects every 4 seconds.

const COLS = 20
const ROWS = 20
const CELL = 14   // 20*14 = 280px canvas
const POP  = 100  // local fallback population
const FPS  = 10

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001'

export default function SnakeWidget({ showStats = true }) {
  const canvasRef     = useRef(null)
  const stateRef      = useRef({ pop: [], gen: 1, bestScore: 0 })
  const frameRef      = useRef(null)    // latest server frame | null when local
  const modeRef       = useRef('local') // 'local' | 'live'
  const animRef       = useRef(null)
  const lastRef       = useRef(0)
  const accumRef      = useRef(0)
  const statsTimerRef = useRef(0)

  const [stats, setStats] = useState({ gen: 1, best: 0, score: 0, viewers: 0, live: false })

  // ── WebSocket connection ────────────────────────────────────────────────
  useEffect(() => {
    let ws = null
    let reconnectTimer = null

    function connect() {
      try {
        ws = new WebSocket(WS_URL)
      } catch {
        reconnectTimer = setTimeout(connect, 4000)
        return
      }

      ws.onopen = () => {
        modeRef.current = 'live'
      }

      ws.onmessage = (e) => {
        // Ref assignment only — no setState, no re-render on every message.
        // The rAF loop reads this ref and updates stats at a throttled 10fps.
        frameRef.current = JSON.parse(e.data)
      }

      ws.onclose = () => {
        accumRef.current = 0  // prevent burst of local ticks on reconnect
        modeRef.current = 'local'
        frameRef.current = null
        reconnectTimer = setTimeout(connect, 4000)
      }

      ws.onerror = () => {}   // onclose fires after onerror
    }

    connect()

    return () => {
      ws?.close()
      clearTimeout(reconnectTimer)
    }
  }, [])

  // ── Render + simulation loop ────────────────────────────────────────────
  useEffect(() => {
    // Init local fallback immediately so canvas is never blank
    stateRef.current.pop = Array.from({ length: POP }, () => new SnakeAgent(COLS, ROWS))

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = COLS * CELL
    const H = ROWS * CELL

    function drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke()
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke()
      }
    }

    function drawSnakeAndFood(snake, food) {
      const [fx, fy] = food
      ctx.fillStyle = '#ff4757'
      ctx.shadowColor = '#ff4757'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      snake.forEach(([bx, by], i) => {
        const isHead = i === 0
        if (isHead) {
          ctx.fillStyle = '#00e5ff'
          ctx.shadowColor = '#00e5ff'
          ctx.shadowBlur = 12
        } else {
          const alpha = 1 - (i / snake.length) * 0.7
          ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`
          ctx.shadowBlur = 0
        }
        const pad = isHead ? 1 : 2
        ctx.fillRect(bx * CELL + pad, by * CELL + pad, CELL - pad * 2, CELL - pad * 2)
      })
      ctx.shadowBlur = 0
    }

    function loop(ts) {
      animRef.current = requestAnimationFrame(loop)

      if (lastRef.current === 0) { lastRef.current = ts; return }
      const dt = ts - lastRef.current
      lastRef.current = ts
      accumRef.current += Math.min(dt, 150)

      const stepMs = 1000 / FPS
      while (accumRef.current >= stepMs) {
        accumRef.current -= stepMs

        // Only advance local sim when it is the active display source
        if (modeRef.current === 'local') {
          const s = stateRef.current
          let alive = 0
          s.pop.forEach(agent => {
            if (!agent.dead) {
              agent.step()
              alive++
              if (agent.score > s.bestScore) s.bestScore = agent.score
            }
          })
          if (alive === 0) {
            s.pop = evolve(s.pop)
            s.gen++
          }
        }
      }

      // ── Draw ──
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)
      drawGrid()

      if (modeRef.current === 'live' && frameRef.current) {
        const f = frameRef.current
        drawSnakeAndFood(f.snake, f.food)
      } else {
        const s = stateRef.current
        const leader = s.pop.find(a => !a.dead) || s.pop[0]
        if (leader) drawSnakeAndFood(leader.body, leader.food)
      }

      // ── Stats — rate-limited to 10fps to avoid 60fps re-renders ──
      const now = performance.now()
      if (now - statsTimerRef.current >= 100) {
        statsTimerRef.current = now
        if (modeRef.current === 'live' && frameRef.current) {
          const f = frameRef.current
          setStats({ gen: f.gen, best: f.best, score: f.score, viewers: f.viewers, live: true })
        } else {
          const s = stateRef.current
          const leader = s.pop.find(a => !a.dead)
          setStats({ gen: s.gen, best: s.bestScore, score: leader?.score ?? 0, viewers: 0, live: false })
        }
      }
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.75rem' }}>
      {showStats && (
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { label: 'Generation', val: stats.gen },
            { label: 'Best Score', val: stats.best },
            { label: 'Live Score', val: stats.score },
            ...(stats.live ? [{ label: 'Watching', val: stats.viewers }] : []),
          ].map(({ label, val }) => (
            <div key={label}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--glow-strong)',
        lineHeight: 0,
      }}>
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          style={{ display: 'block' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: stats.live ? '#2ed573' : 'var(--accent)',
          display: 'inline-block',
          animation: 'pulse 2s infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          {stats.live
            ? `SHARED LIVE · ${stats.viewers} watching`
            : 'LOCAL · Neural Snake AI evolving'
          }
        </span>
      </div>
    </div>
  )
}
