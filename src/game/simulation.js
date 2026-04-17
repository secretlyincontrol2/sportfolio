// ─── Deterministic NEAT Simulation Manager ──────────────────────────────
// Replaces the WebSocket server. Every client running this code with the
// same wall-clock time produces the same simulation state, so everyone
// sees identical snakes evolving in real time.
//
// How it works:
//  1. A time-based seed is derived from the current epoch interval.
//  2. A seeded PRNG generates the entire NEAT population deterministically.
//  3. On page load, the simulation fast-forwards to the current tick.
//  4. From that point, it ticks in real-time at the configured FPS.
//
// The simulation runs headless (no canvas). UI components read frames
// from getCurrentFrame() or subscribe via onFrame callbacks.

import { createRng } from './seeded-random.js'
import { NEATPopulation } from './neat.js'
import { SnakeAgent } from './engine.js'

// ── Config ────────────────────────────────────────────────────────────────
const POP_SIZE   = 100
const COLS       = 20
const ROWS       = 20
const BASE_FPS   = 10
const EPOCH_MS   = 120_000  // 2 minutes per epoch (seed changes)
const MAX_TICKS  = 600      // max ticks per generation (60s at 10fps)

// ── Singleton state ───────────────────────────────────────────────────────
let instance = null

export function getSimulation() {
  if (!instance) instance = new Simulation()
  return instance
}

class Simulation {
  constructor() {
    this.frame      = null      // current display frame
    this.listeners  = new Set()
    this._running   = false
    this._speed     = 1         // speed multiplier (1 = base, 3 = 3x, etc.)
    this._boostUntil = 0        // timestamp until food-boost is active

    // Determine our epoch seed
    this._epochStart = Math.floor(Date.now() / EPOCH_MS) * EPOCH_MS
    this._seed       = Math.floor(this._epochStart / 1000)

    // Init NEAT population
    this._rng  = createRng(this._seed)
    this._neat = new NEATPopulation(POP_SIZE, this._seed + 7)

    // Build initial agents
    this._agents   = []
    this._networks = []
    this._gen      = 1
    this._bestScore = 0
    this._tick     = 0
    this._genTick  = 0
    this._lastLeaderScore = 0

    this._buildAgents()

    // Fast-forward to current time
    const elapsed = Date.now() - this._epochStart
    const targetTick = Math.floor((elapsed / 1000) * BASE_FPS)
    this._fastForward(targetTick)

    // Start real-time loop
    this._startLoop()
  }

  _buildAgents() {
    this._agents = []
    this._networks = []
    for (let i = 0; i < this._neat.genomes.length; i++) {
      const genome = this._neat.genomes[i]
      const network = genome.buildNetwork()
      const agent = new SnakeAgent(COLS, ROWS, null, this._rng)
      this._agents.push(agent)
      this._networks.push(network)
    }
    this._genTick = 0
    this._lastLeaderScore = 0
  }

  _stepOnce() {
    let alive = 0
    let leader = null
    let leaderScore = -1

    for (let i = 0; i < this._agents.length; i++) {
      const agent = this._agents[i]
      if (agent.dead) continue

      // Use RELATIVE ray-cast inputs for NEAT
      const inputs = agent.getAdvancedInputs()
      const outputs = this._networks[i].forward(inputs)

      // 3 relative outputs: [straight, turn-left, turn-right]
      const maxIdx = outputs.indexOf(Math.max(...outputs))

      const [dx, dy] = agent.dir
      if (maxIdx === 0) {
        // Straight: keep current direction (do nothing)
      } else if (maxIdx === 1) {
        // Turn left: rotate 90 degrees counter-clockwise
        agent.dir = [dy, -dx]
      } else {
        // Turn right: rotate 90 degrees clockwise
        agent.dir = [-dy, dx]
      }

      agent.stepNoThink()
      alive++

      if (agent.score > this._bestScore) this._bestScore = agent.score
      if (agent.score > leaderScore) {
        leader = agent
        leaderScore = agent.score
      }
    }

    // Detect food eaten for speed boost
    if (leader && leaderScore > this._lastLeaderScore) {
      this._boostUntil = performance.now() + 2000 // 2s speed boost
      this._lastLeaderScore = leaderScore
    }

    this._tick++
    this._genTick++

    // End generation if all dead or time limit reached
    if (alive === 0 || this._genTick >= MAX_TICKS) {
      // Assign fitness to NEAT genomes
      // Fitness heavily rewards food and penalises pure survival without eating
      for (let i = 0; i < this._agents.length; i++) {
        const a = this._agents[i]
        const closerMoves = a._closerCount || 0

        // Base fitness from food eaten (the primary signal)
        let fit = a.score * 500 + a.score * a.score * 1000

        // Small bonus for moving toward food (direction shaping in early gens)
        fit += closerMoves * 2

        // Mild survival bonus capped at a limit to prevent loop-abuse
        fit += Math.min(a.steps, 200)

        this._neat.genomes[i].fitness = Math.max(fit, 1)
      }
      this._neat.evolve()
      this._gen++
      this._buildAgents()

      // After new generation, find the new leader
      leader = this._agents[0]
      leaderScore = 0
      alive = POP_SIZE
    }

    // Build frame
    const leaderIdx = leader ? this._agents.indexOf(leader) : 0
    const leaderNetwork = this._networks[leaderIdx >= 0 ? leaderIdx : 0]
    const stats = this._neat.getStats()

    this.frame = {
      gen:         this._gen,
      alive:       alive,
      best:        this._bestScore,
      score:       leader ? leader.score : 0,
      snake:       leader ? leader.body : [[10, 10]],
      food:        leader ? leader.food : [5, 5],
      rays:        leader ? leader.rays : [],
      species:     stats.species,
      avgNodes:    stats.avgNodes,
      avgConns:    stats.avgConns,
      activations: leaderNetwork?.activations ?? null,
    }
  }

  _fastForward(targetTick) {
    const steps = Math.min(targetTick, 10000) // cap to prevent freeze
    for (let i = 0; i < steps; i++) {
      this._stepOnce()
    }
  }

  _startLoop() {
    if (this._running) return
    this._running = true

    let lastTime = performance.now()
    let accum = 0

    const loop = (now) => {
      const dt = Math.min(now - lastTime, 200)
      lastTime = now

      // Apply speed multiplier + food boost
      const isBoosted = now < this._boostUntil
      const effectiveSpeed = this._speed * (isBoosted ? 1.8 : 1)
      const stepMs = 1000 / (BASE_FPS * effectiveSpeed)

      accum += dt

      while (accum >= stepMs) {
        accum -= stepMs
        this._stepOnce()
        // Notify listeners
        for (const cb of this.listeners) cb(this.frame)
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  /** Set speed multiplier (1, 3, 8, 20) */
  setSpeed(multiplier) {
    this._speed = multiplier
  }

  getSpeed() {
    return this._speed
  }

  getCurrentFrame() {
    return this.frame
  }

  onFrame(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  getGeneration() {
    return this._gen
  }

  getSpeciesCount() {
    return this._neat.species.length
  }

  getNeatPopulation() {
    return this._neat
  }

  getLeaderGenome() {
    if (!this._neat.genomes.length) return null
    return this._neat.genomes.reduce((a, b) => a.fitness > b.fitness ? a : b)
  }
}
