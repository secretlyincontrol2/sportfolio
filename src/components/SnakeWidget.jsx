import { useEffect, useRef, useState } from 'react'
import { getSimulation } from '../game/simulation'

// ── Shared live widget ────────────────────────────────────────────────────
// Renders the deterministic NEAT simulation that is synchronized across
// all visitors via time-based seeding. No server needed.

const COLS = 20
const ROWS = 20
const CELL = 14   // 20*14 = 280px canvas

export default function SnakeWidget({ showStats = true }) {
  const canvasRef     = useRef(null)
  const animRef       = useRef(null)
  const statsTimerRef = useRef(0)

  const [stats, setStats] = useState({ gen: 1, best: 0, score: 0, species: 0 })

  // ── Render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const sim = getSimulation()
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
      if (!snake || !food) return

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

    function render() {
      animRef.current = requestAnimationFrame(render)

      const frame = sim.getCurrentFrame()
      if (!frame) return

      // ── Draw ──
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)
      drawGrid()
      drawSnakeAndFood(frame.snake, frame.food)

      // Stats - rate-limited to 10fps
      const now = performance.now()
      if (now - statsTimerRef.current >= 100) {
        statsTimerRef.current = now
        setStats({
          gen:     frame.gen,
          best:    frame.best,
          score:   frame.score,
          species: frame.species,
        })
      }
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: COLS * CELL, width: '100%' }}>
      {showStats && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Generation', val: stats.gen },
            { label: 'Best Score', val: stats.best },
            { label: 'Live Score', val: stats.score },
            { label: 'Species', val: stats.species },
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
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#2ed573',
          display: 'inline-block',
          animation: 'pulse 2s infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          SYNCED LIVE · NEAT evolving · Gen {stats.gen}
        </span>
      </div>
    </div>
  )
}
