import { useEffect, useRef, useState, useCallback } from 'react'
import { NeuralNet, SnakeAgent, evolve } from '../game/engine'

// ── NN Visualizer Canvas ─────────────────────────────────────────────────────
function NNViz({ activations }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activations) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    const layers = activations
    const layerCount = layers.length
    const layerX = (i) => (W / (layerCount + 1)) * (i + 1)

    const positions = layers.map((layer, li) => {
      const maxVisible = Math.min(layer.length, 12)
      return layer.slice(0, maxVisible).map((_, ni) => {
        const total = Math.min(layer.length, 12)
        return {
          x: layerX(li),
          y: (H / (total + 1)) * (ni + 1),
          val: layer[ni],
        }
      })
    })

    // Connections
    for (let li = 0; li < positions.length - 1; li++) {
      for (const src of positions[li]) {
        for (const dst of positions[li + 1]) {
          const strength = Math.abs(src.val)
          const alpha = Math.min(0.6, strength * 0.3 + 0.05)
          ctx.beginPath()
          ctx.moveTo(src.x, src.y)
          ctx.lineTo(dst.x, dst.y)
          ctx.strokeStyle = src.val > 0
            ? `rgba(0, 229, 255, ${alpha})`
            : `rgba(167, 139, 250, ${alpha})`
          ctx.lineWidth = 0.7
          ctx.stroke()
        }
      }
    }

    // Nodes
    positions.forEach((layer) => {
      layer.forEach(node => {
        const val = Math.min(1, Math.max(0, node.val))
        ctx.beginPath()
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 229, 255, ${0.15 + val * 0.7})`
        ctx.fill()
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 + val * 0.6})`
        ctx.lineWidth = 1
        ctx.stroke()
      })
    })
  }, [activations])

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={300}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  )
}

// ── Game constants ────────────────────────────────────────────────────────────
const COLS = 20
const ROWS = 20
const CELL = 20
const POP_SIZE = 150

export default function Game() {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    population: [],
    generation: 1,
    bestScore: 0,
    allDead: false,
    speed: 8,
    paused: false,
    manualMode: false,
    manualSnake: null,
    keys: new Set(),
  })
  const [stats, setStats] = useState({ gen: 1, alive: POP_SIZE, best: 0, current: 0 })
  const [nnActivations, setNnActivations] = useState(null)
  const [speed, setSpeed] = useState(8)
  const [paused, setPaused] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const animRef = useRef(null)
  const lastTimeRef = useRef(0)
  const frameAccRef = useRef(0)

  // Init population
  useEffect(() => {
    const s = stateRef.current
    s.population = Array.from({ length: POP_SIZE }, () => new SnakeAgent(COLS, ROWS))
    s.manualSnake = new SnakeAgent(COLS, ROWS)
  }, [])

  // Key handling
  useEffect(() => {
    const s = stateRef.current
    const onDown = (e) => {
      s.keys.add(e.key)
      if (s.manualMode && s.manualSnake) {
        const m = s.manualSnake
        const dirMap = {
          ArrowUp: [0, -1], ArrowDown: [0, 1],
          ArrowLeft: [-1, 0], ArrowRight: [1, 0],
          w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
        }
        const nd = dirMap[e.key]
        if (nd && (nd[0] !== -m.dir[0] || nd[1] !== -m.dir[1])) {
          m.dir = nd
        }
        if (m.dead) m.reset()
      }
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [])

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    const W = COLS * CELL
    const H = ROWS * CELL

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke()
    }

    const target = s.manualMode ? s.manualSnake : s.population.find(a => !a.dead) || s.population[0]
    if (!target) return

    const [fx, fy] = target.food
    ctx.fillStyle = '#ff4757'
    ctx.shadowColor = '#ff4757'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    target.body.forEach(([bx, by], i) => {
      const isHead = i === 0
      if (isHead) {
        ctx.fillStyle = '#00e5ff'
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 16
      } else {
        const alpha = 1 - (i / target.body.length) * 0.65
        ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`
        ctx.shadowBlur = 0
      }
      const pad = isHead ? 1 : 2
      ctx.fillRect(bx * CELL + pad, by * CELL + pad, CELL - pad * 2, CELL - pad * 2)
    })
    ctx.shadowBlur = 0

    if (target.brain && target.body.length > 0) {
      const inputs = target.getInputs()
      target.brain.forward(inputs)
      setNnActivations([...target.brain.activations.map(l => [...l])])
    }
  }, [])

  // Game loop
  useEffect(() => {
    const s = stateRef.current

    const loop = (timestamp) => {
      animRef.current = requestAnimationFrame(loop)

      if (s.paused) { render(); return }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
        render()
        return
      }

      const dt = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      frameAccRef.current += Math.min(dt, 200)

      const frameDuration = 1000 / s.speed

      while (frameAccRef.current >= frameDuration) {
        frameAccRef.current -= frameDuration

        if (s.manualMode) {
          if (s.manualSnake && !s.manualSnake.dead) {
            s.manualSnake.step()
          }
        } else {
          let aliveCount = 0
          let bestCurrent = 0
          s.population.forEach(agent => {
            if (!agent.dead) {
              agent.step()
              aliveCount++
              if (agent.score > s.bestScore) s.bestScore = agent.score
              if (agent.score > bestCurrent) bestCurrent = agent.score
            }
          })

          if (aliveCount === 0) {
            const newPop = evolve(s.population)
            s.population = newPop
            s.generation++
            aliveCount = POP_SIZE
            setStats({ gen: s.generation, alive: aliveCount, best: s.bestScore, current: 0 })
          } else {
            const leader = s.population.find(a => !a.dead)
            setStats({
              gen: s.generation,
              alive: aliveCount,
              best: s.bestScore,
              current: leader ? leader.score : 0,
            })
          }
        }
      }

      render()
    }

    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [render])

  const handleSpeed = (v) => {
    stateRef.current.speed = v
    setSpeed(v)
  }

  const handlePause = () => {
    stateRef.current.paused = !stateRef.current.paused
    setPaused(p => !p)
  }

  const handleManual = () => {
    const s = stateRef.current
    s.manualMode = !s.manualMode
    if (s.manualMode) {
      s.manualSnake = new SnakeAgent(COLS, ROWS)
      s.manualSnake.brain = null
    }
    setManualMode(m => !m)
  }

  const handleReset = () => {
    const s = stateRef.current
    s.population = Array.from({ length: POP_SIZE }, () => new SnakeAgent(COLS, ROWS))
    s.generation = 1
    s.bestScore = 0
    setStats({ gen: 1, alive: POP_SIZE, best: 0, current: 0 })
  }

  return (
    <main>
      <div className="container">
        <div className="page-header" style={{ paddingBottom: '2rem', marginBottom: '2.5rem' }}>
          <h1>Neural <span>Snake AI</span></h1>
          <p>
            A population of {POP_SIZE} snakes trained via a <strong style={{ color: 'var(--text)' }}>genetic algorithm</strong>.
            Each snake is controlled by a neural network that evolves across generations.
            Watch them learn to survive.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>

          {/* Left: game + controls */}
          <div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Generation', val: stats.gen },
                { label: 'Alive', val: `${stats.alive} / ${POP_SIZE}` },
                { label: 'Best Score', val: stats.best },
                { label: manualMode ? 'Your Score' : 'Leader Score', val: stats.current },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  padding: '0.6rem 1.1rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  minWidth: 90,
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              display: 'inline-block',
              boxShadow: 'var(--glow-strong)',
            }}>
              <canvas
                ref={canvasRef}
                width={COLS * CELL}
                height={ROWS * CELL}
                style={{ display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handlePause}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>

              <button
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handleReset}
              >
                Reset
              </button>

              <button
                className={`btn ${manualMode ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handleManual}
              >
                {manualMode ? 'Watch AI' : 'Play Yourself'}
              </button>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginLeft: 'auto' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Speed:</span>
                {[4, 10, 30, 60].map(v => (
                  <button
                    key={v}
                    onClick={() => handleSpeed(v)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: speed === v ? 'var(--accent-dim)' : 'transparent',
                      color: speed === v ? 'var(--accent)' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    {v === 4 ? '1x' : v === 10 ? '3x' : v === 30 ? '8x' : '20x'}
                  </button>
                ))}
              </div>
            </div>

            {manualMode && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--accent-dim)',
                border: '1px solid rgba(0,229,255,0.15)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                color: 'var(--text-dim)',
              }}>
                Use <strong style={{ color: 'var(--text)' }}>Arrow Keys</strong> or <strong style={{ color: 'var(--text)' }}>WASD</strong> to play. Press any direction key to restart after death.
              </div>
            )}
          </div>

          {/* Right: NN viz + quick summary */}
          <div style={{ minWidth: 240, maxWidth: 280 }}>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              padding: '1.25rem',
              marginBottom: '1.25rem',
            }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                Live Neural Network
              </h3>
              <NNViz activations={nnActivations} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>11 inputs</span>
                <span>16 hidden</span>
                <span>4 outputs</span>
              </div>
            </div>

            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              padding: '1.25rem',
            }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                Quick Summary
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: 'var(--text)' }}>Network:</strong> 11 inputs, 16 hidden (ReLU), 4 outputs (argmax).
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: 'var(--text)' }}>Selection:</strong> Top 15% of {POP_SIZE} agents selected each generation.
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: 'var(--text)' }}>Crossover:</strong> Uniform, each weight independently from either parent.
                </p>
                <p>
                  <strong style={{ color: 'var(--text)' }}>Fitness:</strong> steps + score x 100 + score2 x 200
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Deep Explanation ──────────────────────────────────────── */}
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            How It <span style={{ color: 'var(--accent)' }}>Actually Works</span>
          </h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '3rem', maxWidth: 680 }}>
            A technical deep-dive into every part of this simulation: the neural network,
            the genetic algorithm, and why this approach works without any labelled data.
          </p>

          <div style={{ display: 'grid', gap: '1.5rem' }}>

            {/* 1 - Neural Network */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                Part 1
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>The Neural Network</h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                Each snake carries a tiny feedforward neural network with three layers: 11 input neurons,
                16 hidden neurons, and 4 output neurons. At every game tick the network reads the snake's
                immediate surroundings as numbers, passes them through the layers, and picks the output
                with the highest value as the next move (argmax).
              </p>

              <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Index</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Input</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['0', 'Danger straight', '1 if wall or body 1 step ahead, else 0'],
                      ['1', 'Danger right', '1 if wall or body 1 step to relative right'],
                      ['2', 'Danger left', '1 if wall or body 1 step to relative left'],
                      ['3', 'Moving left', '1-hot direction flag'],
                      ['4', 'Moving right', '1-hot direction flag'],
                      ['5', 'Moving up', '1-hot direction flag'],
                      ['6', 'Moving down', '1-hot direction flag'],
                      ['7', 'Food to the left', '1 if food x < head x'],
                      ['8', 'Food to the right', '1 if food x > head x'],
                      ['9', 'Food above', '1 if food y < head y'],
                      ['10', 'Food below', '1 if food y > head y'],
                    ].map(([idx, input, value]) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600 }}>{idx}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text)' }}>{input}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-dim)' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Hidden activation', value: 'ReLU (max(0, x))' },
                  { label: 'Output activation', value: 'Linear (no squash)' },
                  { label: 'Decision', value: 'Argmax of 4 outputs' },
                  { label: 'Weight init', value: 'He initialisation' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '0.75rem 1rem', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--accent)', fontFamily: 'monospace' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2 - Genetic Algorithm */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                Part 2
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>The Genetic Algorithm</h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                No gradients. No loss function. Instead, the process mimics natural selection:
                the snakes that survive longest and eat the most food are treated as the "fittest"
                and their network weights are used to produce the next generation.
              </p>

              <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  {
                    step: '1',
                    title: 'Score every snake',
                    body: 'When all 150 snakes have died, each one is assigned a fitness value based on how long it survived and how many apples it ate.',
                  },
                  {
                    step: '2',
                    title: 'Rank and select the elite',
                    body: 'Snakes are sorted by fitness. The top 15% (about 22 snakes) become the breeding pool. The rest are discarded.',
                  },
                  {
                    step: '3',
                    title: 'Elitism - keep the best',
                    body: 'The single highest-scoring brain is copied unchanged into the next generation. This ensures the best solution never gets lost.',
                  },
                  {
                    step: '4',
                    title: 'Crossover',
                    body: 'Two elite parents are randomly chosen. For each weight in the child network, there is a 50% chance it comes from parent A and 50% from parent B. This mixes successful strategies.',
                  },
                  {
                    step: '5',
                    title: 'Mutation',
                    body: 'After crossover, each weight has a 12% chance of being perturbed by a small random amount (standard deviation 0.3). This introduces new variation the selection pressure can act on.',
                  },
                ].map(({ step, title, body }) => (
                  <div key={step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)',
                    }}>
                      {step}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.25rem' }}>{title}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.8 }}>{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 - Fitness Formula */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                Part 3
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>The Fitness Formula</h3>
              <div style={{
                fontFamily: 'monospace', fontSize: '1rem',
                padding: '1rem 1.25rem',
                background: 'rgba(0,229,255,0.05)',
                border: '1px solid rgba(0,229,255,0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent)',
                marginBottom: '1.5rem',
              }}>
                fitness = steps + (score x 100) + (score^2 x 200)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {[
                  {
                    term: 'steps',
                    why: 'Rewards snakes that stay alive longer, even if they are not finding food. This prevents the algorithm from selecting snakes that die immediately.',
                  },
                  {
                    term: 'score x 100',
                    why: 'Strongly rewards eating food. A snake that eats one apple is vastly preferred over one that just wanders.',
                  },
                  {
                    term: 'score^2 x 200',
                    why: 'The quadratic term creates exponentially larger rewards for consecutive apples. A snake that eats 5 apples is not just 5x better - it earns 5x5x200 = 5000 bonus points. This incentivises consistent performance over lucky one-off finds.',
                  },
                ].map(({ term, why }) => (
                  <div key={term} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700, marginBottom: '0.5rem' }}>{term}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.8 }}>{why}</div>
                  </div>
                ))}
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.8, marginTop: '1rem' }}>
                There is also a starvation limit: a snake dies if it goes {100} + (score x 50) steps without eating.
                This prevents snakes from learning to circle endlessly to rack up survival time without ever seeking food.
              </p>
            </div>

            {/* 4 - Why No Backprop */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                Part 4
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Why No Backpropagation?</h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1rem' }}>
                Standard deep learning trains networks by computing a loss, differentiating it through
                the network (backprop), and nudging weights in the direction that reduces error.
                This requires labelled training data and a differentiable objective.
              </p>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1rem' }}>
                Neuroevolution sidesteps both requirements. There is no labelled data - just a score.
                There is no gradient - just selection pressure. This makes it useful for environments
                where defining a differentiable loss is hard, or where the reward signal is sparse
                and delayed (like snake, where eating food might happen 100 steps after the decision
                that caused it).
              </p>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.9 }}>
                This is the same paradigm used in early OpenAI reinforcement learning research,
                in neuroevolution of augmenting topologies (NEAT), and in some game-playing agents.
                The tradeoff is sample efficiency: gradient-based methods typically need far fewer
                evaluations to converge. But for small networks and simple environments like this one,
                neuroevolution is fast, simple, and produces visually compelling emergent behaviour.
              </p>
            </div>

          </div>
        </div>

      </div>
    </main>
  )
}
