import { useState, useEffect, useCallback, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────────*/
const SIZE = 4

const TILE_COLORS = {
  2:    { bg: '#18181b', text: '#f4f4f5', shadow: 'rgba(0,0,0,0.2)' },
  4:    { bg: '#27272a', text: '#f4f4f5', shadow: 'rgba(0,0,0,0.2)' },
  8:    { bg: '#3f3f46', text: '#f4f4f5', shadow: 'rgba(0,0,0,0.25)' },
  16:   { bg: '#52525b', text: '#ffffff', shadow: 'rgba(0,0,0,0.3)' },
  32:   { bg: '#71717a', text: '#ffffff', shadow: 'rgba(0,0,0,0.3)' },
  64:   { bg: '#a1a1aa', text: '#09090b', shadow: 'rgba(0,0,0,0.35)' },
  128:  { bg: '#cbd5e1', text: '#09090b', shadow: 'rgba(0,0,0,0.35)' },
  256:  { bg: '#e2e8f0', text: '#09090b', shadow: 'rgba(0,0,0,0.4)' },
  512:  { bg: '#f1f5f9', text: '#09090b', shadow: 'rgba(0,0,0,0.45)' },
  1024: { bg: '#f8fafc', text: '#09090b', shadow: 'rgba(0,0,0,0.5)' },
  2048: { bg: '#ffffff', text: '#09090b', shadow: 'rgba(255,255,255,0.2)' },
}

function emptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function clone(grid) {
  return grid.map(row => [...row])
}

function addRandomTile(grid) {
  const empty = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) empty.push([r, c])
  if (!empty.length) return grid
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const newGrid = clone(grid)
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4
  return newGrid
}

function addRandomTiles(grid, count = 2) {
  let g = grid
  for (let i = 0; i < count; i++) g = addRandomTile(g)
  return g
}

/* Slide a single row left → returns { row, merged, score } */
function slideRow(row) {
  const filtered = row.filter(v => v !== 0)
  let score = 0
  let merged = false
  const result = []
  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2
      result.push(val)
      score += val
      merged = true
      i += 2
    } else {
      result.push(filtered[i])
      i++
    }
  }
  while (result.length < SIZE) result.push(0)
  return { row: result, score, merged }
}

/* Move directions: 0=Left 1=Right 2=Up 3=Down */
function move(grid, dir) {
  let g = clone(grid)
  let score = 0
  let changed = false

  const rotateLeft = m => m[0].map((_, i) => m.map(row => row[i]).reverse())
  const rotateRight = m => m[0].map((_, i) => m.map(row => row[row.length - 1 - i]))

  // Normalise so we always slide left
  if (dir === 1) g = g.map(r => [...r].reverse())
  if (dir === 2) g = rotateRight(g)
  if (dir === 3) g = rotateLeft(g)

  const newRows = g.map(row => {
    const { row: newRow, score: s, merged } = slideRow(row)
    score += s
    if (JSON.stringify(newRow) !== JSON.stringify(row)) changed = true
    return newRow
  })

  let result = newRows
  if (dir === 1) result = result.map(r => [...r].reverse())
  if (dir === 2) result = rotateLeft(result)
  if (dir === 3) result = rotateRight(result)

  return { grid: result, score, changed }
}

function getEmptyCells(grid) {
  const cells = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) cells.push([r, c])
  return cells
}

function isGameOver(grid) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === 0) return false
      if (c < SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false
    }
  return true
}

function hasWon(grid) {
  return grid.some(row => row.some(v => v >= 2048))
}

/* ─────────────────────────────────────────────────────────────
   EXPECTIMAX AI
───────────────────────────────────────────────────────────────*/
function countEmpty(grid) {
  return getEmptyCells(grid).length
}

function monotonicity(grid) {
  let score = 0
  // Rows: prefer increasing or decreasing
  for (let r = 0; r < SIZE; r++) {
    let incr = 0, decr = 0
    for (let c = 0; c < SIZE - 1; c++) {
      const a = grid[r][c], b = grid[r][c + 1]
      if (a > b) incr += a - b
      if (a < b) decr += b - a
    }
    score -= Math.min(incr, decr)
  }
  // Cols
  for (let c = 0; c < SIZE; c++) {
    let incr = 0, decr = 0
    for (let r = 0; r < SIZE - 1; r++) {
      const a = grid[r][c], b = grid[r + 1][c]
      if (a > b) incr += a - b
      if (a < b) decr += b - a
    }
    score -= Math.min(incr, decr)
  }
  return score
}

function mergePotential(grid) {
  let count = 0
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (c < SIZE - 1 && grid[r][c] !== 0 && grid[r][c] === grid[r][c + 1]) count++
      if (r < SIZE - 1 && grid[r][c] !== 0 && grid[r][c] === grid[r + 1][c]) count++
    }
  return count
}

function maxTile(grid) {
  let max = 0
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] > max) max = grid[r][c]
  return max
}

function cornerBonus(grid) {
  const max = maxTile(grid)
  // Reward if max tile is in a corner
  const corners = [
    grid[0][0], grid[0][SIZE-1],
    grid[SIZE-1][0], grid[SIZE-1][SIZE-1]
  ]
  return corners.includes(max) ? max * 2 : 0
}

function heuristic(grid) {
  const empty = countEmpty(grid)
  return (
    empty * 270 +
    monotonicity(grid) * 1.0 +
    mergePotential(grid) * 700 +
    cornerBonus(grid) * 1.8 +
    Math.log2(Math.max(maxTile(grid), 1)) * 10
  )
}

function expectimax(grid, depth, isMaxNode) {
  if (depth === 0 || isGameOver(grid)) return heuristic(grid)

  if (isMaxNode) {
    let best = -Infinity
    for (let d = 0; d < 4; d++) {
      const { grid: newGrid, changed } = move(grid, d)
      if (!changed) continue
      const val = expectimax(newGrid, depth - 1, false)
      if (val > best) best = val
    }
    return best === -Infinity ? heuristic(grid) : best
  } else {
    // Chance node: place 2 (90%) or 4 (10%) on each empty cell
    const empty = getEmptyCells(grid)
    if (!empty.length) return heuristic(grid)
    let total = 0
    for (const [r, c] of empty) {
      for (const [val, prob] of [[2, 0.9], [4, 0.1]]) {
        const ng = clone(grid)
        ng[r][c] = val
        total += prob * expectimax(ng, depth - 1, true)
      }
    }
    return total / empty.length
  }
}

function bestMove(grid, depth = 4) {
  let best = -Infinity
  let bestDir = -1
  const dirNames = ['Left', 'Right', 'Up', 'Down']
  for (let d = 0; d < 4; d++) {
    const { grid: newGrid, changed } = move(grid, d)
    if (!changed) continue
    const val = expectimax(newGrid, depth - 1, false)
    if (val > best) { best = val; bestDir = d }
  }
  return { dir: bestDir, name: dirNames[bestDir] ?? '—' }
}

/* ─────────────────────────────────────────────────────────────
   INITIAL STATE
───────────────────────────────────────────────────────────────*/
function initGame() {
  return {
    grid: addRandomTiles(emptyGrid()),
    score: 0,
    moves: 0,
    over: false,
    won: false,
    continued: false,
  }
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────*/
export default function Game() {
  const [state, setState] = useState(() => initGame())
  const [bestScore, setBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem('2048-best') || '0') } catch { return 0 }
  })
  const [aiMode, setAiMode] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [lastAiMove, setLastAiMove] = useState(null)
  const [mergedCells, setMergedCells] = useState([])
  const [newCells, setNewCells] = useState([])
  const touchStartRef = useRef(null)
  const aiLoopRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const [lastDir, setLastDir] = useState(null)

  /* persist best score */
  useEffect(() => {
    if (state.score > bestScore) {
      setBestScore(state.score)
      try { localStorage.setItem('2048-best', String(state.score)) } catch {}
    }
  }, [state.score])

  /* ── Apply a move direction ── */
  const applyMove = useCallback((dir) => {
    setState(prev => {
      if (prev.over || (prev.won && !prev.continued)) return prev
      const { grid: newGrid, score: gained, changed } = move(prev.grid, dir)
      if (!changed) return prev

      setLastDir(dir)

      // Track which cells are new / merged for animation
      const spawned = addRandomTile(newGrid)

      const over = isGameOver(spawned)
      const won = !prev.won && hasWon(spawned)

      const newScore = prev.score + gained
      return {
        grid: spawned,
        score: newScore,
        moves: prev.moves + 1,
        over,
        won,
        continued: prev.continued,
      }
    })
  }, [])

  /* ── Keyboard controls ── */
  useEffect(() => {
    const keyMap = {
      ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3,
      a: 0, d: 1, w: 2, s: 3,
    }
    const handler = (e) => {
      if (aiMode) return
      const dir = keyMap[e.key]
      if (dir !== undefined) {
        e.preventDefault()
        applyMove(dir)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [aiMode, applyMove])

  /* ── Touch / swipe controls ── */
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || aiMode) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const absDx = Math.abs(dx), absDy = Math.abs(dy)
    if (Math.max(absDx, absDy) < 30) return
    if (absDx > absDy) applyMove(dx > 0 ? 1 : 0)
    else applyMove(dy > 0 ? 3 : 2)
    touchStartRef.current = null
  }

  /* ── AI loop ── */
  useEffect(() => {
    if (!aiMode) {
      clearTimeout(aiLoopRef.current)
      setAiThinking(false)
      setLastAiMove(null)
      return
    }

    const tick = () => {
      const s = stateRef.current
      if (s.over || (s.won && !s.continued)) {
        setAiThinking(false)
        return
      }
      setAiThinking(true)
      // Yield to browser then compute
      aiLoopRef.current = setTimeout(() => {
        const { dir, name } = bestMove(stateRef.current.grid, 4)
        setLastAiMove(name)
        if (dir !== -1) applyMove(dir)
        setAiThinking(false)
        // Schedule next tick
        aiLoopRef.current = setTimeout(tick, 120)
      }, 30)
    }

    aiLoopRef.current = setTimeout(tick, 200)
    return () => clearTimeout(aiLoopRef.current)
  }, [aiMode, applyMove])

  /* ── New game ── */
  const newGame = useCallback(() => {
    clearTimeout(aiLoopRef.current)
    setLastAiMove(null)
    setAiThinking(false)
    setLastDir(null)
    setState(initGame())
  }, [])

  const continueGame = () => setState(p => ({ ...p, won: false, continued: true }))

  const toggleAI = () => setAiMode(m => !m)

  /* ── Tile display value ── */
  const getTileStyle = (val) => {
    const cfg = TILE_COLORS[val] ?? { bg: '#1a1815', text: '#d4a35b', shadow: 'rgba(0,0,0,0.5)' }
    return cfg
  }

  const fontSize = (val) => {
    if (val >= 1024) return '1.1rem'
    if (val >= 128) return '1.4rem'
    return '1.7rem'
  }

  return (
    <>
      {/* ── Styles ── */}
      <style>{`
        .g-page {
          min-height: 100vh;
          background: var(--bg);
          padding: 3rem 1rem 5rem;
          font-family: var(--font-sans, 'Inter'), sans-serif;
          color: var(--text);
        }
        .g-container {
          max-width: 560px;
          margin: 0 auto;
        }

        /* Header */
        .g-header {
          text-align: center;
          margin-bottom: 2.4rem;
        }
        .g-title {
          font-family: var(--font-serif, 'Playfair Display'), serif;
          font-size: clamp(2.2rem, 6vw, 3.2rem);
          font-weight: 700;
          color: var(--text, #2b2b2b);
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .g-subtitle {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.72rem;
          color: var(--text-muted, #909090);
          letter-spacing: 0.5em;
          text-transform: uppercase;
        }

        /* Score bar */
        .g-scorebar {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 1.2rem;
        }
        .g-scorecard {
          background: var(--bg-box);
          border: 1px solid var(--border-dark);
          border-radius: var(--radius-sm);
          padding: 0.55rem 1.1rem;
          text-align: center;
          min-width: 80px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .g-scorecard-label {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.6rem;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: var(--text-muted, #909090);
          margin-bottom: 0.2rem;
        }
        .g-scorecard-value {
          font-family: var(--font-serif, 'Playfair Display'), serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text, #2b2b2b);
          line-height: 1;
        }

        /* Control bar */
        .g-controls {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          align-items: center;
          margin-bottom: 1.6rem;
          flex-wrap: wrap;
        }
        .g-btn {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.7rem;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          border: 1px solid var(--border-dark);
          background: var(--bg-box);
          color: var(--text);
          border-radius: var(--radius-sm);
          padding: 0.55rem 1.25rem;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .g-btn:hover {
          border-color: var(--text, #2b2b2b);
          background: var(--surface, #e8e8e8);
          color: var(--text, #2b2b2b);
        }
        .g-btn-ai {
          border-color: var(--text-dim, #5a5a5a);
          color: var(--text-dim, #5a5a5a);
        }
        .g-btn-ai.active {
          background: var(--text);
          color: var(--bg);
          border-color: var(--text);
        }
        .g-ai-status {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.62rem;
          color: var(--text-muted, #a3a092);
          letter-spacing: 0.3em;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .g-ai-status.thinking {
          color: var(--gold, #d4a35b);
          animation: g-pulse 0.9s ease-in-out infinite;
        }
        @keyframes g-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .g-ai-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: currentColor;
          display: inline-block;
        }

        /* Board wrapper */
        .g-board-wrap {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 1.4rem;
        }

        /* Game board */
        .g-board {
          background: var(--border-dark);
          border-radius: var(--radius);
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          width: min(96vw, 440px);
          height: min(96vw, 440px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          touch-action: none;
          user-select: none;
          position: relative;
        }

        /* Empty cells */
        .g-cell-bg {
          background: rgba(255,255,255,0.03);
          border-radius: var(--radius-sm);
        }

        /* Tiles overlay */
        .g-tiles-overlay {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          pointer-events: none;
        }
        .g-tile {
          position: absolute;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-serif, 'Playfair Display'), serif;
          font-weight: 700;
          transition:
            top 0.12s cubic-bezier(0.25, 1, 0.5, 1),
            left 0.12s cubic-bezier(0.25, 1, 0.5, 1),
            transform 0.12s cubic-bezier(0.25, 1, 0.5, 1);
          will-change: transform, top, left;
        }
        .g-tile.new-tile {
          animation: g-pop-in 0.15s ease forwards;
        }
        .g-tile.merged-tile {
          animation: g-merge-bounce 0.18s ease forwards;
        }
        @keyframes g-pop-in {
          0%   { transform: scale(0.4); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes g-merge-bounce {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        /* Overlays */
        .g-overlay {
          position: absolute;
          inset: 0;
          border-radius: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          z-index: 10;
          animation: g-fade-in 0.25s ease;
        }
        @keyframes g-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .g-overlay-over {
          background: rgba(9, 9, 11, 0.94);
          backdrop-filter: blur(4px);
        }
        .g-overlay-won {
          background: rgba(43,43,43,0.90);
          backdrop-filter: blur(2px);
        }
        .g-overlay-title {
          font-family: var(--font-serif, 'Playfair Display'), serif;
          font-size: 2.4rem;
          font-weight: 700;
          color: var(--text, #2b2a26);
          letter-spacing: -0.02em;
        }
        .g-overlay-won .g-overlay-title { color: #ffffff; }
        .g-overlay-sub {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.72rem;
          letter-spacing: 0.5em;
          color: var(--text-muted, #909090);
          text-transform: uppercase;
          margin-top: -0.5rem;
        }
        .g-overlay-won .g-overlay-sub { color: rgba(255,255,255,0.8); }
        .g-overlay-won .g-overlay-title { color: #ffffff; }
        .g-overlay-btns {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .g-overlay-btn {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.68rem;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          border: 1px solid var(--text, #2b2b2b);
          background: transparent;
          color: var(--text, #2b2b2b);
          border-radius: 8px;
          padding: 0.6rem 1.5rem;
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .g-overlay-btn:hover {
          background: var(--text, #2b2b2b);
          color: var(--bg, #f4f2ec);
        }
        .g-overlay-won .g-overlay-btn {
          border-color: rgba(255,255,255,0.6);
          color: #ffffff;
        }
        .g-overlay-won .g-overlay-btn:hover {
          background: #ffffff;
          color: var(--text, #2b2b2b);
        }

        /* Explainer */
        .g-explainer {
          background: var(--bg-box, #ffffff);
          border: 1px solid var(--border-dark, #d4cbb8);
          border-left: 3px solid var(--gold, #d4a35b);
          border-radius: 0;
          padding: 1.5rem 1.6rem;
          margin-top: 0.5rem;
        }
        .g-explainer-title {
          font-family: var(--font-serif, 'Playfair Display'), serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text, #2b2a26);
          margin: 0 0 0.6rem;
        }
        .g-explainer p {
          font-size: 0.88rem;
          line-height: 1.72;
          color: #5a5650;
          margin: 0 0 0.75rem;
        }
        .g-explainer p:last-child { margin-bottom: 0; }
        .g-mono {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.78em;
          background: var(--surface, #e8e8e8);
          color: var(--text-dim, #5a5a5a);
          padding: 0.1em 0.4em;
          border-radius: 0;
        }
        .g-heuristic-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem 1.2rem;
          margin: 0.75rem 0;
        }
        .g-heuristic-item {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          font-size: 0.82rem;
          color: #5a5650;
        }
        .g-heuristic-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--gold, #d4a35b);
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Key hints */
        .g-keyhints {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .g-keyhint {
          font-family: var(--font-mono, 'Fira Code'), monospace;
          font-size: 0.58rem;
          letter-spacing: 0.3em;
          background: var(--bg-box, #ffffff);
          border: 1px solid var(--border-dark, #c0c0c0);
          border-radius: 999px;
          padding: 0.25rem 0.7rem;
          color: var(--text-muted, #a3a092);
        }
      `}</style>

      <div className="g-page">
        <div className="g-container">

          {/* ── Header ── */}
          <div className="g-header">
            <h1 className="g-title">Play 2048</h1>
            <p className="g-subtitle">Powered by Expectimax AI · Depth 4</p>
          </div>

          {/* ── Score bar ── */}
          <div className="g-scorebar">
            <div className="g-scorecard">
              <div className="g-scorecard-label">Score</div>
              <div className="g-scorecard-value">{state.score.toLocaleString()}</div>
            </div>
            <div className="g-scorecard">
              <div className="g-scorecard-label">Best</div>
              <div className="g-scorecard-value">{Math.max(bestScore, state.score).toLocaleString()}</div>
            </div>
            <div className="g-scorecard">
              <div className="g-scorecard-label">Moves</div>
              <div className="g-scorecard-value">{state.moves}</div>
            </div>
          </div>

          {/* ── Controls ── */}
          <div className="g-controls">
            <button className="g-btn" onClick={newGame} id="btn-new-game">New Game</button>
            <button
              className={`g-btn g-btn-ai${aiMode ? ' active' : ''}`}
              onClick={toggleAI}
              id="btn-toggle-ai"
            >
              {aiMode ? '⏹ Stop AI' : '▶ AI Mode'}
            </button>
            {aiMode && (
              <div className={`g-ai-status${aiThinking ? ' thinking' : ''}`}>
                <span className="g-ai-dot" />
                {aiThinking
                  ? 'THINKING...'
                  : lastAiMove
                    ? `→ ${lastAiMove.toUpperCase()}`
                    : 'READY'}
              </div>
            )}
          </div>

          {/* ── Key hints ── */}
          {!aiMode && (
            <div className="g-keyhints">
              <span className="g-keyhint">← → ↑ ↓ Arrow keys</span>
              <span className="g-keyhint">W A S D</span>
              <span className="g-keyhint">Swipe on mobile</span>
            </div>
          )}

          {/* ── Board ── */}
          <div className="g-board-wrap">
            <div
              className="g-board"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              id="game-board-2048"
            >
              {/* Background cells */}
              {Array.from({ length: SIZE * SIZE }).map((_, i) => (
                <div key={i} className="g-cell-bg" />
              ))}

              {/* Tiles overlay */}
              <TileGrid grid={state.grid} getTileStyle={getTileStyle} fontSize={fontSize} lastDir={lastDir} />

              {/* Game Over overlay */}
              {state.over && (
                <div className="g-overlay g-overlay-over">
                  <div className="g-overlay-title">Game Over</div>
                  <div className="g-overlay-sub">Final score: {state.score.toLocaleString()}</div>
                  <div className="g-overlay-btns">
                    <button className="g-overlay-btn" onClick={newGame} id="btn-restart-over">
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Won overlay */}
              {state.won && !state.continued && (
                <div className="g-overlay g-overlay-won">
                  <div className="g-overlay-title">You Won!</div>
                  <div className="g-overlay-sub">2048 reached · Score: {state.score.toLocaleString()}</div>
                  <div className="g-overlay-btns">
                    <button className="g-overlay-btn" onClick={continueGame} id="btn-continue-game">
                      Keep Playing
                    </button>
                    <button className="g-overlay-btn" onClick={newGame} id="btn-new-after-win">
                      New Game
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Explainer ── */}
          <div className="g-explainer">
            <h2 className="g-explainer-title">How Expectimax Works</h2>
            <p>
              Unlike minimax, Expectimax doesn't assume an adversarial opponent. In 2048, the
              random tile placement is <em>stochastic</em>, so the algorithm models it as a{' '}
              <span className="g-mono">chance node</span> that computes a probability-weighted
              average over all possible tile spawns (90% for 2, 10% for 4).
            </p>
            <p>
              The AI searches <span className="g-mono">4 plies</span> deep, alternating between
              player moves (maximising nodes) and tile spawns (chance nodes), evaluating each
              leaf state with a composite heuristic:
            </p>
            <div className="g-heuristic-grid">
              <div className="g-heuristic-item">
                <div className="g-heuristic-dot" />
                <span><strong>Empty cells</strong> (weight ×270)</span>
              </div>
              <div className="g-heuristic-item">
                <div className="g-heuristic-dot" />
                <span><strong>Merge potential</strong> (×700)</span>
              </div>
              <div className="g-heuristic-item">
                <div className="g-heuristic-dot" />
                <span><strong>Monotonicity</strong> - tiles ordered along rows/cols</span>
              </div>
              <div className="g-heuristic-item">
                <div className="g-heuristic-dot" />
                <span><strong>Corner bonus</strong> - max tile stays in a corner</span>
              </div>
            </div>
            <p>
              Each AI tick runs inside a <span className="g-mono">setTimeout</span> to yield
              control back to the browser between moves, keeping the UI smooth and the{' '}
              <span className="g-mono">THINKING...</span> indicator responsive.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────
   TILE GRID - reconciled overlay for smooth CSS transitions
 ───────────────────────────────────────────────────────────────*/
let idCounter = 1;
function nextId() { return idCounter++; }

function reconcileGrid(prevTiles, newGrid, dir) {
  const activePrev = prevTiles.filter(t => !t.mergedInto);
  const nextTiles = [];
  const matchedPositions = new Set();
  const posKey = (r, c) => `${r},${c}`;

  if (dir === null || dir === undefined) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = newGrid[r][c];
        if (val !== 0) {
          nextTiles.push({ id: nextId(), val, r, c, isNew: true });
        }
      }
    }
    return nextTiles;
  }

  if (dir === 0 || dir === 1) {
    for (let r = 0; r < SIZE; r++) {
      const rowTiles = activePrev.filter(t => t.r === r);
      if (dir === 0) rowTiles.sort((a, b) => a.c - b.c);
      else rowTiles.sort((a, b) => b.c - a.c);

      let nextIdx = (dir === 0) ? 0 : SIZE - 1;
      const step = (dir === 0) ? 1 : -1;

      let i = 0;
      while (i < rowTiles.length) {
        const t1 = rowTiles[i];
        const t2 = rowTiles[i + 1];

        if (t2 && t1.val === t2.val) {
          const mergedVal = t1.val * 2;
          const targetC = nextIdx;
          nextIdx += step;

          const newTileId = nextId();
          nextTiles.push({
            id: newTileId,
            val: mergedVal,
            r,
            c: targetC,
            isMerged: true
          });
          matchedPositions.add(posKey(r, targetC));

          nextTiles.push({ ...t1, c: targetC, mergedInto: newTileId });
          nextTiles.push({ ...t2, c: targetC, mergedInto: newTileId });
          i += 2;
        } else {
          const targetC = nextIdx;
          nextIdx += step;

          nextTiles.push({ ...t1, c: targetC });
          matchedPositions.add(posKey(r, targetC));
          i += 1;
        }
      }
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const colTiles = activePrev.filter(t => t.c === c);
      if (dir === 2) colTiles.sort((a, b) => a.r - b.r);
      else colTiles.sort((a, b) => b.r - a.r);

      let nextIdx = (dir === 2) ? 0 : SIZE - 1;
      const step = (dir === 2) ? 1 : -1;

      let i = 0;
      while (i < colTiles.length) {
        const t1 = colTiles[i];
        const t2 = colTiles[i + 1];

        if (t2 && t1.val === t2.val) {
          const mergedVal = t1.val * 2;
          const targetR = nextIdx;
          nextIdx += step;

          const newTileId = nextId();
          nextTiles.push({
            id: newTileId,
            val: mergedVal,
            r: targetR,
            c,
            isMerged: true
          });
          matchedPositions.add(posKey(targetR, c));

          nextTiles.push({ ...t1, r: targetR, mergedInto: newTileId });
          nextTiles.push({ ...t2, r: targetR, mergedInto: newTileId });
          i += 2;
        } else {
          const targetR = nextIdx;
          nextIdx += step;

          nextTiles.push({ ...t1, r: targetR });
          matchedPositions.add(posKey(targetR, c));
          i += 1;
        }
      }
    }
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const val = newGrid[r][c];
      if (val !== 0 && !matchedPositions.has(posKey(r, c))) {
        nextTiles.push({ id: nextId(), val, r, c, isNew: true });
      }
    }
  }

  return nextTiles;
}

function TileGrid({ grid, getTileStyle, fontSize, lastDir }) {
  const [tiles, setTiles] = useState([])

  useEffect(() => {
    const next = reconcileGrid(tiles, grid, lastDir)
    setTiles(next)

    const timer = setTimeout(() => {
      setTiles(prev => prev.filter(t => !t.mergedInto))
    }, 120)

    return () => clearTimeout(timer)
  }, [grid, lastDir])

  return (
    <div className="g-tiles-overlay">
      {tiles.map(tile => {
        const style = getTileStyle(tile.val)
        const cellFraction = `calc((100% - 24px) / 4)`
        const offset = (idx) => `calc(${idx} * ((100% - 24px) / 4) + ${idx * 8}px)`

        return (
          <div
            key={tile.id}
            className={`g-tile${tile.isNew ? ' new-tile' : ''}${tile.isMerged ? ' merged-tile' : ''}`}
            style={{
              top: offset(tile.r),
              left: offset(tile.c),
              width: cellFraction,
              height: cellFraction,
              background: style.bg,
              color: style.text,
              boxShadow: `0 4px 14px ${style.shadow}`,
              fontSize: fontSize(tile.val),
            }}
          >
            {tile.val}
          </div>
        )
      })}
    </div>
  )
}
