import { WebSocketServer } from 'ws'
import { SnakeAgent, evolve } from '../src/game/engine.js'

const PORT = process.env.PORT || 3001

const COLS = 20
const ROWS = 20
const POP  = 150
const FPS  = 10

// ── Simulation state ──────────────────────────────────────────────────────
let population = Array.from({ length: POP }, () => new SnakeAgent(COLS, ROWS))
let gen = 1
let bestScore = 0

// ── WebSocket server ──────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws) => {
  ws.on('error', () => {}) // prevent unhandled error crash on dropped client
})

console.log(`Snake WS server running on ws://localhost:${PORT}`)

// ── Simulation + broadcast loop ───────────────────────────────────────────
function tick() {
  let alive = 0
  let leader = null
  let leaderScore = -1

  for (const agent of population) {
    if (!agent.dead) {
      agent.step()
      alive++
      if (agent.score > bestScore) bestScore = agent.score
      if (agent.score > leaderScore) {
        leader = agent
        leaderScore = agent.score
      }
    }
  }

  if (alive === 0) {
    population = evolve(population)
    gen++
    leader = population[0]  // elitism: best brain is first
    alive = POP
    leaderScore = 0
  }

  // Skip serialisation when nobody is watching (saves CPU on free tier)
  if (wss.clients.size === 0) return

  const frame = JSON.stringify({
    gen,
    alive,
    best: bestScore,
    score: leaderScore,
    snake: leader.body,
    food: leader.food,
    viewers: wss.clients.size,
  })

  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(frame)
  }
}

setInterval(tick, 1000 / FPS)
