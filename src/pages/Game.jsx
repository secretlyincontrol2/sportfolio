import { useEffect, useRef, useState, useCallback } from 'react'
import { SnakeAgent } from '../game/engine'
import { getSimulation } from '../game/simulation'
import { DQNAgent } from '../game/dqn_agent'

// ── NEAT Network Visualizer (High Quality) ───────────────────────────────
// Renders a variable-topology neural network with bezier connections,
// glow effects, and node labels. Grows dynamically as NEAT adds nodes.
function NNViz({ activations }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activations) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    const { nodes, connections } = activations
    if (!nodes || nodes.length === 0) { ctx.restore(); return }

    // Group nodes by layer
    const layerMap = new Map()
    for (const node of nodes) {
      const layer = Math.round(node.layer * 1000) / 1000
      if (!layerMap.has(layer)) layerMap.set(layer, [])
      layerMap.get(layer).push(node)
    }

    const sortedLayers = [...layerMap.keys()].sort((a, b) => a - b)
    const layerCount = sortedLayers.length
    const PAD_X = 40
    const PAD_Y = 20

    // Position nodes
    const nodePositions = new Map()
    sortedLayers.forEach((layer, li) => {
      const layerNodes = layerMap.get(layer)
      const x = PAD_X + ((W - PAD_X * 2) / (layerCount - 1 || 1)) * li
      const maxVisible = Math.min(layerNodes.length, 16)
      layerNodes.slice(0, maxVisible).forEach((node, ni) => {
        const y = PAD_Y + ((H - PAD_Y * 2 - 20) / (maxVisible - 1 || 1)) * ni
        nodePositions.set(node.id, { x, y, val: node.val ?? node.value ?? 0, type: node.type })
      })
    })

    // Draw connections with bezier curves
    for (const conn of connections) {
      const src = nodePositions.get(conn.inNode)
      const dst = nodePositions.get(conn.outNode)
      if (!src || !dst) continue

      const absWeight = Math.min(Math.abs(conn.weight), 3)
      const alpha = Math.min(0.75, absWeight * 0.2 + 0.08)
      const lineWidth = Math.min(2.5, absWeight * 0.5 + 0.4)

      const cpOffset = Math.abs(dst.x - src.x) * 0.4

      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.bezierCurveTo(src.x + cpOffset, src.y, dst.x - cpOffset, dst.y, dst.x, dst.y)

      const isPositive = conn.weight > 0
      ctx.strokeStyle = isPositive
        ? `rgba(0, 229, 255, ${alpha})`
        : `rgba(167, 139, 250, ${alpha})`
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }

    // Draw nodes with glow
    const INPUT_LABELS = [
      'WS', 'FS', 'BS',
      'WFL', 'FFL', 'BFL',
      'WL', 'FL', 'BL',
      'WFR', 'FFR', 'BFR',
      'WR', 'FR', 'BR',
      'F-FWD', 'F-RGT', 'b'
    ]
    const OUTPUT_LABELS = ['GO', 'LT', 'RT']

    for (const [nodeId, pos] of nodePositions) {
      const val = Math.min(1, Math.max(0, Math.abs(pos.val)))
      const r = pos.type === 'hidden' ? 7 : 9

      // Glow
      const glowR = r + 6
      const gradient = ctx.createRadialGradient(pos.x, pos.y, r * 0.3, pos.x, pos.y, glowR)

      let baseColor, textColor
      if (pos.type === 'input' || pos.type === 'bias') {
        gradient.addColorStop(0, `rgba(0, 229, 255, ${0.3 + val * 0.4})`)
        gradient.addColorStop(1, 'rgba(0, 229, 255, 0)')
        baseColor = `rgba(0, 229, 255, ${0.25 + val * 0.65})`
        textColor = `rgba(0, 229, 255, ${0.6 + val * 0.4})`
      } else if (pos.type === 'output') {
        gradient.addColorStop(0, `rgba(255, 71, 87, ${0.3 + val * 0.4})`)
        gradient.addColorStop(1, 'rgba(255, 71, 87, 0)')
        baseColor = `rgba(255, 71, 87, ${0.25 + val * 0.65})`
        textColor = `rgba(255, 71, 87, ${0.6 + val * 0.4})`
      } else {
        gradient.addColorStop(0, `rgba(167, 139, 250, ${0.3 + val * 0.4})`)
        gradient.addColorStop(1, 'rgba(167, 139, 250, 0)')
        baseColor = `rgba(167, 139, 250, ${0.25 + val * 0.55})`
        textColor = `rgba(167, 139, 250, ${0.6 + val * 0.4})`
      }

      // Glow circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2)
      ctx.fillStyle = baseColor
      ctx.fill()
      ctx.strokeStyle = textColor
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Node labels for input/output
      ctx.font = '7px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      if (pos.type === 'input') {
        const idx = [...nodePositions.entries()]
          .filter(([, p]) => p.type === 'input')
          .findIndex(([id]) => id === nodeId)
        if (idx >= 0 && idx < INPUT_LABELS.length) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.fillText(INPUT_LABELS[idx], pos.x - r - 10, pos.y)
        }
      } else if (pos.type === 'output') {
        const idx = [...nodePositions.entries()]
          .filter(([, p]) => p.type === 'output')
          .findIndex(([id]) => id === nodeId)
        if (idx >= 0 && idx < OUTPUT_LABELS.length) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)'
          ctx.fillText(OUTPUT_LABELS[idx], pos.x + r + 10, pos.y)
        }
      }
    }

    // Layer labels at bottom
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    sortedLayers.forEach((layer, li) => {
      const x = PAD_X + ((W - PAD_X * 2) / (layerCount - 1 || 1)) * li
      const label = li === 0 ? 'INPUT' : li === layerCount - 1 ? 'OUTPUT' : `H${li}`
      ctx.fillText(label, x, H - 6)
    })

    ctx.restore()
  }, [activations])

  // Set up HiDPI canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = 360
    const H = 400
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  )
}

// ── Q-Value Bar Visualizer ───────────────────────────────────────────────
function QValueViz({ qValues, scores }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    // ── Top half: Q-Value bars ──
    const labels = ['Straight', 'Turn Right', 'Turn Left']
    const barH = 22
    const gap = 10
    const startY = 20

    ctx.font = '11px Inter, sans-serif'
    ctx.textBaseline = 'middle'

    const maxQ = Math.max(0.01, ...qValues.map(Math.abs))

    qValues.forEach((q, i) => {
      const y = startY + i * (barH + gap)
      const barW = (Math.abs(q) / maxQ) * (W - 130)
      const isPositive = q >= 0
      const isMax = Math.abs(q) === Math.max(...qValues.map(Math.abs))

      // Label
      ctx.fillStyle = isMax ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
      ctx.textAlign = 'left'
      ctx.fillText(labels[i], 8, y + barH / 2)

      // Bar background
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(90, y, W - 130, barH)

      // Bar fill
      const color = isPositive ? 'rgba(46, 213, 115, 0.6)' : 'rgba(255, 71, 87, 0.6)'
      const glowColor = isPositive ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)'

      if (isMax) {
        ctx.shadowColor = isPositive ? '#2ed573' : '#ff4757'
        ctx.shadowBlur = 8
      }
      ctx.fillStyle = color
      ctx.fillRect(90, y, barW, barH)
      ctx.shadowBlur = 0

      // Value text
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.textAlign = 'right'
      ctx.fillText(q.toFixed(2), W - 8, y + barH / 2)
    })

    // ── Bottom half: Score chart ──
    const chartTop = startY + 3 * (barH + gap) + 20
    const chartH = H - chartTop - 20
    const chartW = W - 40

    if (scores && scores.length > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '9px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Score History (last 50 games)', 20, chartTop - 6)

      const maxScore = Math.max(1, ...scores)

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= 4; i++) {
        const y = chartTop + (chartH / 4) * i
        ctx.beginPath()
        ctx.moveTo(20, y)
        ctx.lineTo(20 + chartW, y)
        ctx.stroke()
      }

      // Score line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)'
      ctx.lineWidth = 1.5
      scores.forEach((score, i) => {
        const x = 20 + (i / (scores.length - 1)) * chartW
        const y = chartTop + chartH - (score / maxScore) * chartH
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Moving average line
      if (scores.length > 5) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(255, 165, 2, 0.5)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        for (let i = 0; i < scores.length; i++) {
          const windowStart = Math.max(0, i - 4)
          const window = scores.slice(windowStart, i + 1)
          const avg = window.reduce((a, b) => a + b, 0) / window.length
          const x = 20 + (i / (scores.length - 1)) * chartW
          const y = chartTop + chartH - (avg / maxScore) * chartH
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Legend
      ctx.font = '8px Inter, sans-serif'
      ctx.fillStyle = 'rgba(0, 229, 255, 0.6)'
      ctx.textAlign = 'left'
      ctx.fillText('● Score', 20, H - 6)
      ctx.fillStyle = 'rgba(255, 165, 2, 0.5)'
      ctx.fillText('● Avg (5)', 70, H - 6)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '11px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Training... scores will appear here', W / 2, chartTop + chartH / 2)
    }

    ctx.restore()
  }, [qValues, scores])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = 360 * dpr
    canvas.height = 400 * dpr
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: 'auto' }}
    />
  )
}

// ── Shared Snake Renderer ────────────────────────────────────────────────
function renderSnakeCanvas(ctx, W, H, CELL, COLS, ROWS, snake, food, rays, headColor = '#00e5ff') {
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

  if (!snake || !food) return

  // Food
  const [fx, fy] = food
  ctx.fillStyle = '#ff4757'
  ctx.shadowColor = '#ff4757'
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.arc(fx * CELL + CELL / 2, fy * CELL + CELL / 2, CELL * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Rays
  if (rays && rays.length > 0) {
    const [hx, hy] = snake[0]
    ctx.lineWidth = 1.5
    rays.forEach(r => {
      ctx.beginPath()
      ctx.moveTo(hx * CELL + CELL / 2, hy * CELL + CELL / 2)
      ctx.lineTo(r.hitPoint[0] * CELL + CELL / 2, r.hitPoint[1] * CELL + CELL / 2)

      if (r.foodDist > 0) ctx.strokeStyle = 'rgba(46, 213, 115, 0.4)'
      else if (r.bodyDist > 0) ctx.strokeStyle = 'rgba(255, 71, 87, 0.4)'
      else ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'

      ctx.stroke()

      ctx.beginPath()
      ctx.arc(r.hitPoint[0] * CELL + CELL / 2, r.hitPoint[1] * CELL + CELL / 2, 2, 0, Math.PI * 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
    })
  }

  // Snake body
  snake.forEach(([bx, by], i) => {
    const isHead = i === 0
    if (isHead) {
      ctx.fillStyle = headColor
      ctx.shadowColor = headColor
      ctx.shadowBlur = 16
    } else {
      const alpha = 1 - (i / snake.length) * 0.65
      const r = parseInt(headColor.slice(1, 3), 16) || 0
      const g = parseInt(headColor.slice(3, 5), 16) || 229
      const b = parseInt(headColor.slice(5, 7), 16) || 255
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      ctx.shadowBlur = 0
    }
    const pad = isHead ? 1 : 2
    ctx.fillRect(bx * CELL + pad, by * CELL + pad, CELL - pad * 2, CELL - pad * 2)

    // Eyes
    if (isHead) {
      ctx.fillStyle = '#0a0a0a'
      ctx.shadowBlur = 0
      let dx = 1, dy = 0
      if (snake.length > 1) {
        dx = Math.sign(snake[0][0] - snake[1][0])
        dy = Math.sign(snake[0][1] - snake[1][1])
      }
      const cx = bx * CELL + CELL / 2
      const cy = by * CELL + CELL / 2
      const off = CELL * 0.25
      const sz = 2.5
      ctx.beginPath()
      if (dx !== 0) {
        ctx.arc(cx + dx * 2, cy - off, sz, 0, Math.PI * 2)
        ctx.arc(cx + dx * 2, cy + off, sz, 0, Math.PI * 2)
      } else {
        ctx.arc(cx - off, cy + dy * 2, sz, 0, Math.PI * 2)
        ctx.arc(cx + off, cy + dy * 2, sz, 0, Math.PI * 2)
      }
      ctx.fill()
    }
  })
  ctx.shadowBlur = 0
}


// ── Game constants ────────────────────────────────────────────────────────
const COLS = 20
const ROWS = 20
const CELL = 20
const POP_SIZE = 100

export default function Game() {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('neat')

  // ── Shared state ──
  const canvasRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [manualMode, setManualMode] = useState(false)
  const [manualScore, setManualScore] = useState(0)

  const animRef = useRef(null)
  const manualSnakeRef = useRef(null)
  const lastTimeRef = useRef(0)
  const frameAccRef = useRef(0)
  const speedRef = useRef(8)
  const pausedRef = useRef(false)
  const manualModeRef = useRef(false)
  const activeTabRef = useRef('neat')

  // ── NEAT state ──
  const [neatStats, setNeatStats] = useState({ gen: 1, alive: POP_SIZE, best: 0, current: 0, species: 0, avgNodes: 12, avgConns: 48 })
  const [nnActivations, setNnActivations] = useState(null)

  // ── DQN state ──
  const dqnRef = useRef(null)
  const [dqnStats, setDqnStats] = useState({ games: 0, score: 0, record: 0, epsilon: 80, meanScore: 0 })
  const [dqnQValues, setDqnQValues] = useState([0, 0, 0])
  const [dqnScores, setDqnScores] = useState([])

  // Initialize DQN agent
  useEffect(() => {
    dqnRef.current = new DQNAgent(COLS, ROWS)
  }, [])

  // Sync tab ref
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Key handling for manual mode
  useEffect(() => {
    const onDown = (e) => {
      if (manualModeRef.current && manualSnakeRef.current) {
        const m = manualSnakeRef.current
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
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onDown)
    return () => window.removeEventListener('keydown', onDown)
  }, [])

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = COLS * CELL
    const H = ROWS * CELL

    if (manualModeRef.current) {
      const m = manualSnakeRef.current
      if (m) {
        m.getAdvancedInputs() // force rays computation
        renderSnakeCanvas(ctx, W, H, CELL, COLS, ROWS, m.body, m.food, m.rays)
        setManualScore(m.score)
      }
      return
    }

    if (activeTabRef.current === 'neat') {
      const sim = getSimulation()
      const frame = sim.getCurrentFrame()
      if (frame) {
        renderSnakeCanvas(ctx, W, H, CELL, COLS, ROWS, frame.snake, frame.food, frame.rays)
        setNnActivations(frame.activations)
        setNeatStats({
          gen: frame.gen,
          alive: frame.alive,
          best: frame.best,
          current: frame.score,
          species: frame.species,
          avgNodes: frame.avgNodes,
          avgConns: frame.avgConns,
        })
      }
    } else {
      // DQN tab
      const dqn = dqnRef.current
      if (dqn) {
        renderSnakeCanvas(ctx, W, H, CELL, COLS, ROWS, dqn.snake.body, dqn.snake.food, null, '#2ed573')
        setDqnStats({
          games: dqn.nGames,
          score: dqn.snake.score,
          record: dqn.record,
          epsilon: Math.max(0, 80 - dqn.nGames),
          meanScore: dqn.getMeanScore(),
        })
        setDqnQValues([...dqn.lastQValues])
        setDqnScores(dqn.getRecentScores(50))
      }
    }
  }, [])

  // Game loop
  useEffect(() => {
    const loop = (timestamp) => {
      animRef.current = requestAnimationFrame(loop)

      if (pausedRef.current) { render(); return }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
        render()
        return
      }

      const dt = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      frameAccRef.current += Math.min(dt, 200)

      const frameDuration = 1000 / speedRef.current

      while (frameAccRef.current >= frameDuration) {
        frameAccRef.current -= frameDuration

        if (manualModeRef.current) {
          const m = manualSnakeRef.current
          if (m && !m.dead) m._move()
        } else if (activeTabRef.current === 'dqn') {
          // DQN: run multiple steps per frame for fast training
          const dqn = dqnRef.current
          if (dqn) {
            dqn.step()
          }
        }
      }

      render()
    }

    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [render])

  const SPEED_OPTIONS = [
    { multiplier: 1, label: '1x' },
    { multiplier: 3, label: '3x' },
    { multiplier: 8, label: '8x' },
    { multiplier: 20, label: '20x' },
  ]

  const handleSpeed = (mult) => {
    if (activeTabRef.current === 'neat') {
      const sim = getSimulation()
      sim.setSpeed(mult)
    }
    speedRef.current = 10 * mult
    setSpeed(mult)
  }

  const handlePause = () => {
    pausedRef.current = !pausedRef.current
    setPaused(p => !p)
  }

  const handleManual = () => {
    const toManual = !manualModeRef.current
    manualModeRef.current = toManual
    if (toManual) {
      manualSnakeRef.current = new SnakeAgent(COLS, ROWS)
      manualSnakeRef.current.brain = null
      speedRef.current = 10
      setManualScore(0)
    } else {
      speedRef.current = 10 * speed
    }
    setManualMode(m => !m)
  }

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    activeTabRef.current = tab
    // Reset manual mode when switching tabs
    if (manualModeRef.current) {
      manualModeRef.current = false
      setManualMode(false)
    }
    // Reset speed to appropriate default
    if (tab === 'dqn') {
      speedRef.current = 80 // DQN trains faster
      setSpeed(8)
    } else {
      const sim = getSimulation()
      sim.setSpeed(1)
      speedRef.current = 10
      setSpeed(1)
    }
    lastTimeRef.current = 0
    frameAccRef.current = 0
  }

  // ── Tab button style ──
  const tabStyle = (isActive) => ({
    padding: '0.65rem 1.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-dim)',
    transition: 'all 0.2s ease',
  })

  // ── Stats bar content ──
  const getStatsItems = () => {
    if (manualMode) {
      return [
        { label: 'Your Score', val: manualScore },
        { label: 'Status', val: manualSnakeRef.current?.dead ? 'Dead' : 'Alive' },
      ]
    }
    if (activeTab === 'neat') {
      return [
        { label: 'Generation', val: neatStats.gen },
        { label: 'Alive', val: `${neatStats.alive}/${POP_SIZE}` },
        { label: 'Best Score', val: neatStats.best },
        { label: 'Leader', val: neatStats.current },
        { label: 'Species', val: neatStats.species },
        { label: 'Nodes', val: neatStats.avgNodes },
        { label: 'Conns', val: neatStats.avgConns },
      ]
    }
    return [
      { label: 'Games Played', val: dqnStats.games },
      { label: 'Current Score', val: dqnStats.score },
      { label: 'Record', val: dqnStats.record },
      { label: 'Epsilon', val: `${Math.max(0, dqnStats.epsilon).toFixed(0)}%` },
      { label: 'Avg Score (20)', val: dqnStats.meanScore },
    ]
  }

  return (
    <main>
      <div className="container">
        <div className="page-header" style={{ paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h1>Snake <span>AI Lab</span></h1>
          <p>
            Compare two fundamentally different approaches to AI: <strong style={{ color: 'var(--accent)' }}>NEAT</strong> evolves
            both network topology and weights through natural selection, while <strong style={{ color: '#2ed573' }}>Deep Q-Learning</strong> trains
            a fixed network through reinforcement learning and experience replay.
          </p>
        </div>

        {/* ── Tab Selector ── */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.5rem',
        }}>
          <button
            style={tabStyle(activeTab === 'neat')}
            onClick={() => handleTabSwitch('neat')}
          >
            NEAT (Neuroevolution)
          </button>
          <button
            style={tabStyle(activeTab === 'dqn')}
            onClick={() => handleTabSwitch('dqn')}
          >
            DQN (Deep Q-Learning)
          </button>
        </div>

        {/* Stats bar */}
        <div className="game-stats-bar">
          {getStatsItems().map(({ label, val }) => (
            <div key={label} className="game-stat-item">
              <div className="game-stat-label">{label}</div>
              <div className="game-stat-value">{val}</div>
            </div>
          ))}
        </div>

        {/* Main grid: Canvas + Side Panel */}
        <div className="game-main-grid">
          {/* Game canvas */}
          <div>
            <div style={{
              border: `1px solid ${activeTab === 'dqn' ? 'rgba(46,213,115,0.3)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              boxShadow: activeTab === 'dqn' ? '0 0 30px rgba(46,213,115,0.08)' : 'var(--glow-strong)',
            }}>
              <canvas
                ref={canvasRef}
                width={COLS * CELL}
                height={ROWS * CELL}
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.83rem' }}
                onClick={handlePause}
              >
                {paused ? 'Resume' : 'Pause'}
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
                {SPEED_OPTIONS.map(({ multiplier, label }) => (
                  <button
                    key={multiplier}
                    onClick={() => handleSpeed(multiplier)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: speed === multiplier ? (activeTab === 'dqn' ? 'rgba(46,213,115,0.15)' : 'var(--accent-dim)') : 'transparent',
                      color: speed === multiplier ? (activeTab === 'dqn' ? '#2ed573' : 'var(--accent)') : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                    }}
                  >
                    {label}
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

          {/* ── Side Panel ── */}
          <div>
            {activeTab === 'neat' ? (
              <>
                {/* NEAT: Live Network */}
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                    Live NEAT Network
                  </h3>
                  <NNViz activations={nnActivations} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.72rem' }}>
                    <span style={{ color: 'rgba(0,229,255,0.7)' }}>● Input</span>
                    <span style={{ color: 'rgba(167,139,250,0.7)' }}>● Hidden</span>
                    <span style={{ color: 'rgba(255,71,87,0.7)' }}>● Output</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Topology evolves. Watch new nodes appear!
                  </div>
                </div>

                {/* NEAT Quick Summary */}
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  padding: '1.25rem',
                }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                    NEAT Quick Summary
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Algorithm:</strong> NEAT evolves both weights <em>and topology</em>.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Start:</strong> Minimal network (18 inputs, 3 outputs, no hidden nodes).
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Speciation:</strong> Similar topologies compete together, protecting innovation.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Mutations:</strong> Add node, add connection, perturb weights.
                    </p>
                    <p>
                      <strong style={{ color: 'var(--text)' }}>Crossover:</strong> Gene alignment by innovation number.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* DQN: Q-Value Visualization + Score Chart */}
                <div style={{
                  border: '1px solid rgba(46,213,115,0.2)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#2ed573', marginBottom: '1rem' }}>
                    Live Q-Values & Training
                  </h3>
                  <QValueViz qValues={dqnQValues} scores={dqnScores} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.72rem' }}>
                    <span style={{ color: 'rgba(46,213,115,0.7)' }}>● Q-Positive</span>
                    <span style={{ color: 'rgba(255,71,87,0.7)' }}>● Q-Negative</span>
                    <span style={{ color: 'rgba(255,165,2,0.7)' }}>― Moving Avg</span>
                  </div>
                </div>

                {/* DQN Quick Summary */}
                <div style={{
                  border: '1px solid rgba(46,213,115,0.2)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  padding: '1.25rem',
                }}>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#2ed573', marginBottom: '1rem' }}>
                    Deep Q-Learning Summary
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Algorithm:</strong> Deep Q-Learning with experience replay.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Network:</strong> Fixed topology: 11 → 256 (ReLU) → 3 outputs.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Training:</strong> MSE loss with SGD backpropagation, γ=0.9.
                    </p>
                    <p style={{ marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text)' }}>Exploration:</strong> ε-greedy: starts random, becomes greedy after ~80 games.
                    </p>
                    <p>
                      <strong style={{ color: 'var(--text)' }}>Replay:</strong> Stores 100K experiences, trains on random batch of 1000.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Deep Explanation (context-aware) ──────────────────────────────── */}
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {activeTab === 'neat' ? (
              <>How NEAT <span style={{ color: 'var(--accent)' }}>Actually Works</span></>
            ) : (
              <>How Deep Q-Learning <span style={{ color: '#2ed573' }}>Actually Works</span></>
            )}
          </h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '3rem', maxWidth: 680 }}>
            {activeTab === 'neat'
              ? 'A technical deep-dive into NEAT: the algorithm that evolves neural network topology alongside weights, producing increasingly complex brains from scratch.'
              : 'A technical deep-dive into DQN: the reinforcement learning algorithm that learns optimal actions through trial-and-error, using a neural network to approximate Q-values.'
            }
          </p>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {activeTab === 'neat' ? (
              <>
                {/* NEAT explanations */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>Part 1</div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Complexification: Start Simple, Grow</h3>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                    Unlike traditional neural networks with fixed architectures, NEAT starts with the
                    <strong style={{ color: 'var(--text)' }}> simplest possible network</strong>: just
                    18 inputs from a multi-directional ray-cast vision system connected to 3 output neurons (straight, turn-left, turn-right). No hidden layers at all.
                  </p>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                    The ray-cast vision acts like LiDAR, shooting 5 rays forward allowing the snake to see corridors and traps before entering them.
                    Over generations, structural mutations add complexity to optimally process this vision. The algorithm finds the <em>minimal</em> topology needed. You can watch the network visualization grow over time.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                      { label: 'Initial topology', value: '18 in, 3 out (no hidden)' },
                      { label: 'Add node mutation', value: 'Split a connection, insert neuron' },
                      { label: 'Add connection', value: 'Link two unconnected nodes' },
                      { label: 'Weight perturbation', value: 'Gaussian noise (σ=0.2)' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '0.75rem 1rem', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontFamily: 'monospace' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>Part 2</div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Speciation: Protecting Innovation</h3>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                    When a new structural mutation appears, the resulting network often performs <em>worse</em> at first. NEAT solves this by dividing the population into <strong style={{ color: 'var(--text)' }}>species</strong> based on topological similarity. Genomes only compete against others in their species, giving new structures time to optimize.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.5rem' }}>Part 3</div>
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
                    fitness = steps + (score × 100) + (score² × 200)
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', lineHeight: 1.8 }}>
                    Starvation limit: a snake dies after 100 + (score × 50) steps without eating.
                    This prevents snakes from evolving to loop endlessly without seeking food.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* DQN explanations */}
                <div style={{ border: '1px solid rgba(46,213,115,0.15)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#2ed573', marginBottom: '0.5rem' }}>Part 1</div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>The Bellman Equation</h3>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                    Deep Q-Learning is built on a profound mathematical insight: the <strong style={{ color: 'var(--text)' }}>optimal Q-value</strong> of
                    a state-action pair equals the immediate reward plus the discounted maximum Q-value of the next state. The neural network learns to approximate
                    this recursive relationship through gradient descent.
                  </p>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '1rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(46,213,115,0.05)',
                    border: '1px solid rgba(46,213,115,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#2ed573',
                    marginBottom: '1.5rem',
                  }}>
                    Q(s,a) = reward + γ · max(Q(s', a'))
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                      { label: 'Network', value: '11 → 256 → 3 (fixed topology)' },
                      { label: 'Activation', value: 'ReLU (hidden), Linear (output)' },
                      { label: 'Optimizer', value: 'SGD with lr=0.001' },
                      { label: 'Discount γ', value: '0.9 (values future rewards)' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '0.75rem 1rem', background: 'rgba(46,213,115,0.04)', border: '1px solid rgba(46,213,115,0.1)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: '0.85rem', color: '#2ed573', fontFamily: 'monospace' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ border: '1px solid rgba(46,213,115,0.15)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#2ed573', marginBottom: '0.5rem' }}>Part 2</div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Exploration vs Exploitation</h3>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                    The agent uses an <strong style={{ color: 'var(--text)' }}>ε-greedy strategy</strong>. Early on (ε is high), it takes random actions
                    to explore the environment. As training progresses, ε decays and the agent increasingly trusts its learned Q-values. After ~80 games,
                    the agent plays almost entirely greedily, exploiting its learned policy.
                  </p>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {[
                      { step: '1', title: 'Observe state', body: 'The agent reads 11 inputs: 3 danger sensors, 4 direction flags, and 4 food-relative flags.' },
                      { step: '2', title: 'Choose action', body: 'With probability ε, pick a random action. Otherwise, forward-pass the state through the network and pick the action with the highest Q-value.' },
                      { step: '3', title: 'Execute & learn', body: 'Apply the action, observe reward (+10 for food, -10 for death), and store the experience tuple (s, a, r, s\', done).' },
                      { step: '4', title: 'Experience replay', body: 'After each game ends, sample 1000 random experiences from memory and retrain the network. This decorrelates sequential experiences and stabilizes learning.' },
                    ].map(({ step, title, body }) => (
                      <div key={step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{
                          flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                          background: 'rgba(46,213,115,0.1)', border: '1px solid #2ed573',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.72rem', fontWeight: 700, color: '#2ed573',
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

                <div style={{ border: '1px solid rgba(46,213,115,0.15)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#2ed573', marginBottom: '0.5rem' }}>Part 3</div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Backpropagation in the Browser</h3>
                  <p style={{ color: 'var(--text-dim)', lineHeight: 1.9, marginBottom: '1.5rem' }}>
                    This DQN runs entirely in your browser with <strong style={{ color: 'var(--text)' }}>zero Python dependencies</strong>. The
                    backpropagation engine (gradient descent through ReLU and linear layers) is implemented in pure vanilla JavaScript — a direct
                    mathematical translation of PyTorch's <code style={{ color: '#2ed573' }}>nn.Linear</code> and <code style={{ color: '#2ed573' }}>F.relu</code>.
                  </p>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '0.85rem',
                    padding: '1rem 1.25rem',
                    background: 'rgba(46,213,115,0.05)',
                    border: '1px solid rgba(46,213,115,0.15)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#2ed573',
                    lineHeight: 2,
                  }}>
                    loss = MSE(Q_pred, Q_target)<br/>
                    ∂loss/∂w = chain_rule(dL/dOut → dOut/dHidden → dHidden/dInput)<br/>
                    w -= lr × ∂loss/∂w
                  </div>
                </div>

                {/* NEAT vs DQN comparison */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '2rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Comparison</div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>NEAT vs Deep Q-Learning</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--text-dim)' }}>Aspect</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--accent)' }}>🧬 NEAT</th>
                          <th style={{ textAlign: 'left', padding: '0.75rem', color: '#2ed573' }}>🧠 DQN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Paradigm', 'Evolutionary (genetic algorithm)', 'Reinforcement learning (gradient descent)'],
                          ['Topology', 'Evolves dynamically', 'Fixed (11→256→3)'],
                          ['Population', '100 agents competing', '1 agent learning'],
                          ['Learning', 'Fitness-based selection', 'Backpropagation + MSE loss'],
                          ['Exploration', 'Mutation-driven diversity', 'ε-greedy random actions'],
                          ['Memory', 'None (stateless generations)', '100K experience replay buffer'],
                          ['Speed', 'Slower convergence, creative solutions', 'Faster convergence, predictable training'],
                        ].map(([aspect, neat, dqn], i) => (
                          <tr key={aspect} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--text)' }}>{aspect}</td>
                            <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-dim)' }}>{neat}</td>
                            <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-dim)' }}>{dqn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
