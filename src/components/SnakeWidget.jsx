import { useEffect, useRef, useState } from 'react'
import { SnakeAgent, evolve } from '../game/engine'

// ─── Mini always-running Neural Snake widget ──────────────────────────────
// Renders a compact canvas with a population of AI snakes evolving
// continuously. Designed to embed anywhere (Home hero, sidebar, etc.)

const COLS = 18
const ROWS = 18
const CELL = 16
const POP  = 100
const FPS  = 10   // simulation steps per second

export default function SnakeWidget({ showStats = true }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({
    pop: [],
    gen: 1,
    bestScore: 0,
  })
  const [stats, setStats] = useState({ gen: 1, best: 0, score: 0 })
  const animRef    = useRef(null)
  const lastRef    = useRef(0)
  const accumRef   = useRef(0)

  useEffect(() => {
    stateRef.current.pop = Array.from({ length: POP }, () => new SnakeAgent(COLS, ROWS))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = COLS * CELL
    const H = ROWS * CELL

    function drawFrame() {
      const s = stateRef.current
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke()
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke()
      }

      // Find the best living snake to display
      const leader = s.pop.find(a => !a.dead) || s.pop[0]
      if (!leader) return

      // Food
      const [fx, fy] = leader.food
      ctx.fillStyle = '#ff4757'
      ctx.shadowColor = '#ff4757'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Snake
      leader.body.forEach(([bx, by], i) => {
        const isHead = i === 0
        if (isHead) {
          ctx.fillStyle = '#00e5ff'
          ctx.shadowColor = '#00e5ff'
          ctx.shadowBlur = 12
        } else {
          const alpha = 1 - (i / leader.body.length) * 0.7
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

      const step = 1000 / FPS

      while (accumRef.current >= step) {
        accumRef.current -= step

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
          setStats({ gen: s.gen, best: s.bestScore, score: 0 })
        } else {
          const leader = s.pop.find(a => !a.dead)
          setStats({ gen: s.gen, best: s.bestScore, score: leader?.score ?? 0 })
        }
      }

      drawFrame()
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
          background: 'var(--accent)',
          display: 'inline-block',
          animation: 'pulse 2s infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          LIVE · Neural Snake AI evolving
        </span>
      </div>
    </div>
  )
}
