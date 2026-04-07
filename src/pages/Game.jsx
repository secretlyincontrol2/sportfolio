import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Neural Network ───────────────────────────────────────────────────────
class NeuralNet {
  constructor(layers = [11, 16, 4]) {
    this.layers = layers
    this.weights = []
    this.biases = []
    for (let i = 0; i < layers.length - 1; i++) {
      const w = []
      for (let j = 0; j < layers[i + 1]; j++) {
        const row = []
        for (let k = 0; k < layers[i]; k++) {
          row.push((Math.random() * 2 - 1) * Math.sqrt(2 / layers[i]))
        }
        w.push(row)
      }
      this.weights.push(w)
      this.biases.push(Array.from({ length: layers[i + 1] }, () => 0))
    }
    this.activations = layers.map(n => new Array(n).fill(0))
  }

  forward(inputs) {
    this.activations[0] = [...inputs]
    for (let l = 0; l < this.weights.length; l++) {
      const out = []
      for (let j = 0; j < this.weights[l].length; j++) {
        let sum = this.biases[l][j]
        for (let k = 0; k < this.activations[l].length; k++) {
          sum += this.weights[l][j][k] * this.activations[l][k]
        }
        // ReLU on hidden layers, linear on output
        out.push(l < this.weights.length - 1 ? Math.max(0, sum) : sum)
      }
      this.activations[l + 1] = out
    }
    return this.activations[this.activations.length - 1]
  }

  copy() {
    const n = new NeuralNet(this.layers)
    n.weights = this.weights.map(layer => layer.map(row => [...row]))
    n.biases = this.biases.map(b => [...b])
    return n
  }

  mutate(rate = 0.12, amount = 0.3) {
    for (let l = 0; l < this.weights.length; l++) {
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let k = 0; k < this.weights[l][j].length; k++) {
          if (Math.random() < rate) {
            this.weights[l][j][k] += (Math.random() * 2 - 1) * amount
          }
        }
        if (Math.random() < rate) {
          this.biases[l][j] += (Math.random() * 2 - 1) * amount
        }
      }
    }
  }

  crossover(other) {
    const child = this.copy()
    for (let l = 0; l < child.weights.length; l++) {
      for (let j = 0; j < child.weights[l].length; j++) {
        for (let k = 0; k < child.weights[l][j].length; k++) {
          if (Math.random() < 0.5) {
            child.weights[l][j][k] = other.weights[l][j][k]
          }
        }
        if (Math.random() < 0.5) {
          child.biases[l][j] = other.biases[l][j]
        }
      }
    }
    return child
  }
}

// ─── Snake Agent ──────────────────────────────────────────────────────────
const DIRS = [
  [0, -1], // up
  [0,  1], // down
  [-1, 0], // left
  [1,  0], // right
]

class SnakeAgent {
  constructor(cols, rows, brain = null) {
    this.cols = cols
    this.rows = rows
    this.brain = brain || new NeuralNet([11, 16, 4])
    this.reset()
  }

  reset() {
    const cx = Math.floor(this.cols / 2)
    const cy = Math.floor(this.rows / 2)
    this.body = [[cx, cy], [cx - 1, cy], [cx - 2, cy]]
    this.dir = [1, 0] // moving right
    this.food = this._placeFood()
    this.score = 0
    this.steps = 0
    this.stepsWithoutFood = 0
    this.dead = false
    this.fitness = 0
  }

  _placeFood() {
    while (true) {
      const x = Math.floor(Math.random() * this.cols)
      const y = Math.floor(Math.random() * this.rows)
      if (!this.body.some(([bx, by]) => bx === x && by === y)) {
        return [x, y]
      }
    }
  }

  _getInputs() {
    const [hx, hy] = this.body[0]
    const [dx, dy] = this.dir
    const [fx, fy] = this.food

    // Perpendicular dirs (left/right relative to heading)
    const leftDir  = [ dy, -dx]
    const rightDir = [-dy,  dx]

    function danger(snake, cols, rows, d) {
      const nx = snake.body[0][0] + d[0]
      const ny = snake.body[0][1] + d[1]
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return 1
      if (snake.body.slice(1).some(([bx, by]) => bx === nx && by === ny)) return 1
      return 0
    }

    return [
      danger(this, this.cols, this.rows, this.dir),    // danger straight
      danger(this, this.cols, this.rows, rightDir),    // danger right
      danger(this, this.cols, this.rows, leftDir),     // danger left
      dx === -1 ? 1 : 0,  // moving left
      dx ===  1 ? 1 : 0,  // moving right
      dy === -1 ? 1 : 0,  // moving up
      dy ===  1 ? 1 : 0,  // moving down
      fx < hx ? 1 : 0,    // food left
      fx > hx ? 1 : 0,    // food right
      fy < hy ? 1 : 0,    // food up
      fy > hy ? 1 : 0,    // food down
    ]
  }

  think() {
    const inputs = this._getInputs()
    const out = this.brain.forward(inputs)
    // out: [up, down, left, right]
    const argmax = out.indexOf(Math.max(...out))
    const newDir = DIRS[argmax]

    // Prevent 180° turn
    if (newDir[0] !== -this.dir[0] || newDir[1] !== -this.dir[1]) {
      this.dir = newDir
    }
  }

  step() {
    if (this.dead) return

    this.think()
    const [hx, hy] = this.body[0]
    const [dx, dy] = this.dir
    const nx = hx + dx
    const ny = hy + dy

    // Wall collision
    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.dead = true
      return
    }

    // Self collision
    if (this.body.slice(1).some(([bx, by]) => bx === nx && by === ny)) {
      this.dead = true
      return
    }

    this.body.unshift([nx, ny])
    this.steps++
    this.stepsWithoutFood++

    const maxSteps = 100 + this.score * 50
    if (this.stepsWithoutFood > maxSteps) {
      this.dead = true
      return
    }

    if (nx === this.food[0] && ny === this.food[1]) {
      this.score++
      this.stepsWithoutFood = 0
      this.food = this._placeFood()
    } else {
      this.body.pop()
    }
  }

  calcFitness() {
    this.fitness = this.steps + this.score * 100 + this.score * this.score * 200
    return this.fitness
  }
}

// ─── Genetic Algorithm ────────────────────────────────────────────────────
function evolve(population) {
  population.forEach(s => s.calcFitness())
  population.sort((a, b) => b.fitness - a.fitness)

  const top = Math.max(5, Math.floor(population.length * 0.15))
  const elite = population.slice(0, top)
  const newPop = [elite[0].brain.copy()] // keep best unchanged

  // Fill rest with crossover + mutation
  while (newPop.length < population.length) {
    const pA = elite[Math.floor(Math.random() * elite.length)]
    const pB = elite[Math.floor(Math.random() * elite.length)]
    const childBrain = pA.brain.crossover(pB.brain)
    childBrain.mutate(0.12, 0.3)
    newPop.push(childBrain)
  }

  return newPop.map((brain, i) => {
    const agent = new SnakeAgent(population[0].cols, population[0].rows, brain)
    return agent
  })
}

// ─── NN Visualizer Canvas ─────────────────────────────────────────────────
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

    // Compute node positions
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

    // Draw connections
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

    // Draw nodes
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

// ─── Game Canvas ──────────────────────────────────────────────────────────
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
    speed: 8, // frames per second sim
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

    // Grid
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

    // Food
    const [fx, fy] = target.food
    ctx.fillStyle = '#ff4757'
    ctx.shadowColor = '#ff4757'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Snake body
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

    // Update NN viz every 4 frames
    if (target.brain && target.body.length > 0) {
      const inputs = target._getInputs()
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

      const dt = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      frameAccRef.current += dt

      const frameDuration = 1000 / s.speed

      while (frameAccRef.current >= frameDuration) {
        frameAccRef.current -= frameDuration

        if (s.manualMode) {
          if (s.manualSnake && !s.manualSnake.dead) {
            s.manualSnake.step()
          }
        } else {
          // Step all alive agents
          let aliveCount = 0
          let bestCurrent = 0
          s.population.forEach(agent => {
            if (!agent.dead) {
              agent.step()
              aliveCount++
              if (agent.score > bestCurrent) bestCurrent = agent.score
            }
          })

          if (s.population[0]?.score > s.bestScore) {
            s.bestScore = s.population[0].score
          }

          // Check if all dead
          if (aliveCount === 0) {
            if (s.bestScore < bestCurrent) s.bestScore = bestCurrent
            const newPop = evolve(s.population)
            const realBest = Math.max(s.bestScore, ...newPop.map(a => 0))
            s.population = newPop
            s.generation++
            aliveCount = POP_SIZE
            setStats({ gen: s.generation, alive: aliveCount, best: s.bestScore, current: 0 })
          } else {
            const leader = s.population.find(a => !a.dead)
            setStats(prev => ({
              ...prev,
              gen: s.generation,
              alive: aliveCount,
              best: s.bestScore,
              current: leader ? leader.score : 0,
            }))
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
            {/* Stats bar */}
            <div style={{
              display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap',
            }}>
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

            {/* Canvas */}
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

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handlePause}
              >
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>

              <button
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handleReset}
              >
                ↺ Reset
              </button>

              <button
                className={`btn ${manualMode ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handleManual}
              >
                {manualMode ? '🤖 Watch AI' : '🎮 Play Yourself'}
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
                    {v === 4 ? '1×' : v === 10 ? '3×' : v === 30 ? '8×' : '20×'}
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

          {/* Right: NN viz + explanation */}
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
                How It Works
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: 'var(--text)' }}>Neural Network:</strong> Each snake has an 11→16→4 feedforward network predicting which direction to move.
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: 'var(--text)' }}>Inputs:</strong> Danger ahead/left/right, current heading, food direction.
                </p>
                <p style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: 'var(--text)' }}>Genetic Algorithm:</strong> After all {POP_SIZE} snakes die, the top 15% breed into the next generation via crossover + mutation.
                </p>
                <p>
                  <strong style={{ color: 'var(--text)' }}>Fitness:</strong> steps_alive + score×100 + score²×200
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '3rem', padding: '2rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>About This Simulation</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', lineHeight: 1.9, maxWidth: 700 }}>
            This game demonstrates the principles behind <strong style={{ color: 'var(--text)' }}>neuroevolution</strong> —
            using evolutionary algorithms to train neural networks without backpropagation.
            Unlike supervised learning, each agent discovers effective behaviour purely through
            selection pressure: snakes that survive longer and eat more food pass their "genes"
            (network weights) to the next generation. Over many generations, emergent navigation
            strategies appear. This is the same paradigm used in OpenAI's early reinforcement
            learning research and <em>neuroevolution of augmenting topologies</em> (NEAT).
          </p>
        </div>
      </div>
    </main>
  )
}
