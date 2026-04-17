// ─── NEAT: NeuroEvolution of Augmenting Topologies ───────────────────────
// A from-scratch implementation for the Snake AI portfolio demo.
//
// Key NEAT concepts implemented:
//  1. Complexification - start minimal, grow topology via structural mutation
//  2. Innovation numbers - unique global IDs for every new gene, enabling
//                          meaningful crossover between different topologies
//  3. Speciation - group similar genomes so new structures are
//                          protected from immediate competition
//
// All randomness flows through the seeded RNG for deterministic replay.
//
// CRITICAL DESIGN: Uses RELATIVE outputs (straight, left, right) instead of
// absolute directions. This prevents the 180-turn deadlock where the network
// picks the reverse of the current direction and the move gets ignored.

import { createRng } from './seeded-random.js'

// ─── Constants ────────────────────────────────────────────────────────────
const NUM_INPUTS  = 18  // 5 directions x 3 features + global food (2) + bias (1)
const NUM_OUTPUTS = 3   // straight, turn-left, turn-right

// Speciation thresholds
const C1 = 1.0   // excess gene coefficient
const C2 = 1.0   // disjoint gene coefficient
const C3 = 0.4   // weight difference coefficient
const COMPAT_THRESHOLD_INIT = 3.0
const TARGET_SPECIES = 8
const COMPAT_ADJUST  = 0.3

// Mutation rates - tuned for faster learning
const WEIGHT_MUTATE_RATE    = 0.8   // chance a genome has its weights perturbed
const WEIGHT_PERTURB_RATE   = 0.9   // per-weight: perturb vs reset
const WEIGHT_PERTURB_AMOUNT = 0.3   // increased from 0.2 for faster exploration
const ADD_CONNECTION_RATE   = 0.08  // increased from 0.05
const ADD_NODE_RATE         = 0.04  // increased from 0.03
const DISABLE_RATE          = 0.01

// Elitism
const ELITISM_COUNT = 1
const SURVIVAL_RATE = 0.3  // top 30% of each species reproduce

// ─── Innovation Tracker ───────────────────────────────────────────────────
export class InnovationTracker {
  constructor() {
    this.globalInnovation = 0
    this.nodeId = 0
    this.history = new Map() // 'inNode-outNode' -> innovation#
  }

  getConnectionInnovation(inNode, outNode) {
    const key = `${inNode}-${outNode}`
    if (this.history.has(key)) return this.history.get(key)
    this.globalInnovation++
    this.history.set(key, this.globalInnovation)
    return this.globalInnovation
  }

  getNextNodeId() {
    this.nodeId++
    return this.nodeId
  }

  /** Set initial IDs after building the initial genome */
  init(nextNodeId, nextInnovation) {
    this.nodeId = nextNodeId
    this.globalInnovation = nextInnovation
  }
}

// ─── Node Gene ────────────────────────────────────────────────────────────
export const NodeType = { INPUT: 'input', HIDDEN: 'hidden', OUTPUT: 'output', BIAS: 'bias' }

export class NodeGene {
  constructor(id, type, layer = 0) {
    this.id    = id
    this.type  = type
    this.layer = layer  // for feedforward ordering
  }

  copy() {
    return new NodeGene(this.id, this.type, this.layer)
  }
}

// ─── Connection Gene ──────────────────────────────────────────────────────
export class ConnectionGene {
  constructor(inNode, outNode, weight, enabled, innovation) {
    this.inNode     = inNode
    this.outNode    = outNode
    this.weight     = weight
    this.enabled    = enabled
    this.innovation = innovation
  }

  copy() {
    return new ConnectionGene(this.inNode, this.outNode, this.weight, this.enabled, this.innovation)
  }
}

// ─── Genome ───────────────────────────────────────────────────────────────
export class Genome {
  constructor() {
    this.nodes       = []  // NodeGene[]
    this.connections = []  // ConnectionGene[]
    this.fitness     = 0
    this.adjustedFitness = 0
    this.species     = -1
  }

  copy() {
    const g = new Genome()
    g.nodes = this.nodes.map(n => n.copy())
    g.connections = this.connections.map(c => c.copy())
    g.fitness = this.fitness
    return g
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id)
  }

  /** Build a minimal genome: all inputs connected to all outputs */
  static createMinimal(rng, tracker) {
    const g = new Genome()

    // Input nodes (0 .. NUM_INPUTS-1)
    // These are: danger_straight, danger_left, danger_right,
    //            food_ahead, food_behind, food_left, food_right, bias
    for (let i = 0; i < NUM_INPUTS; i++) {
      g.nodes.push(new NodeGene(i, NodeType.INPUT, 0))
    }

    // Output nodes (3): straight, turn-left, turn-right
    for (let i = 0; i < NUM_OUTPUTS; i++) {
      g.nodes.push(new NodeGene(NUM_INPUTS + i, NodeType.OUTPUT, 1))
    }

    // Connect every input to every output
    for (let i = 0; i < NUM_INPUTS; i++) {
      for (let o = 0; o < NUM_OUTPUTS; o++) {
        const outId = NUM_INPUTS + o
        const innov = tracker.getConnectionInnovation(i, outId)
        const w = (rng.random() * 2 - 1) * 1.0
        g.connections.push(new ConnectionGene(i, outId, w, true, innov))
      }
    }

    // Init tracker with next available IDs
    const maxNodeId = NUM_INPUTS + NUM_OUTPUTS - 1
    tracker.init(maxNodeId, g.connections.length)

    return g
  }

  // ── Mutations ─────────────────────────────────────────────────────────

  mutateWeights(rng) {
    for (const c of this.connections) {
      if (rng.random() < WEIGHT_PERTURB_RATE) {
        c.weight += rng.gaussian(0, WEIGHT_PERTURB_AMOUNT)
      } else {
        c.weight = rng.random() * 2 - 1
      }
    }
  }

  mutateAddConnection(rng, tracker) {
    // Pick two random nodes where in.layer < out.layer (feedforward)
    const possibleIn = this.nodes.filter(n => n.type !== NodeType.OUTPUT)
    const possibleOut = this.nodes.filter(n => n.type !== NodeType.INPUT && n.type !== NodeType.BIAS)

    // Try up to 20 times to find a valid pair
    for (let attempt = 0; attempt < 20; attempt++) {
      const nIn  = rng.pick(possibleIn)
      const nOut = rng.pick(possibleOut)

      if (nIn.id === nOut.id) continue
      if (nIn.layer >= nOut.layer) continue  // must be feedforward

      // Check if connection already exists
      const exists = this.connections.some(c => c.inNode === nIn.id && c.outNode === nOut.id)
      if (exists) continue

      const innov = tracker.getConnectionInnovation(nIn.id, nOut.id)
      this.connections.push(new ConnectionGene(nIn.id, nOut.id, rng.random() * 2 - 1, true, innov))
      return
    }
  }

  mutateAddNode(rng, tracker) {
    // Pick a random enabled connection to split
    const enabled = this.connections.filter(c => c.enabled)
    if (enabled.length === 0) return

    const conn = rng.pick(enabled)
    conn.enabled = false

    const newNodeId = tracker.getNextNodeId()
    const inNode  = this.getNode(conn.inNode)
    const outNode = this.getNode(conn.outNode)

    // New node layer is between the two
    const newLayer = (inNode.layer + outNode.layer) / 2
    this.nodes.push(new NodeGene(newNodeId, NodeType.HIDDEN, newLayer))

    // Connection from old input to new node (weight = 1)
    const innov1 = tracker.getConnectionInnovation(conn.inNode, newNodeId)
    this.connections.push(new ConnectionGene(conn.inNode, newNodeId, 1.0, true, innov1))

    // Connection from new node to old output (weight = old weight)
    const innov2 = tracker.getConnectionInnovation(newNodeId, conn.outNode)
    this.connections.push(new ConnectionGene(newNodeId, conn.outNode, conn.weight, true, innov2))
  }

  mutateDisableConnection(rng) {
    const enabled = this.connections.filter(c => c.enabled)
    if (enabled.length <= 1) return  // keep at least one
    const conn = rng.pick(enabled)
    conn.enabled = false
  }

  mutate(rng, tracker) {
    if (rng.random() < WEIGHT_MUTATE_RATE) this.mutateWeights(rng)
    if (rng.random() < ADD_CONNECTION_RATE) this.mutateAddConnection(rng, tracker)
    if (rng.random() < ADD_NODE_RATE) this.mutateAddNode(rng, tracker)
    if (rng.random() < DISABLE_RATE) this.mutateDisableConnection(rng)
  }

  // ── Network evaluation (phenotype) ────────────────────────────────────

  /** Build a feed-forward evaluation function from this genome */
  buildNetwork() {
    // Sort nodes by layer for feedforward evaluation
    const sortedNodes = [...this.nodes].sort((a, b) => a.layer - b.layer)
    const activeConns = this.connections.filter(c => c.enabled)

    // Pre-index connections by outNode for fast lookup
    const incomingByNode = new Map()
    for (const c of activeConns) {
      if (!incomingByNode.has(c.outNode)) incomingByNode.set(c.outNode, [])
      incomingByNode.get(c.outNode).push(c)
    }

    const nodeValues = new Map()
    const inputIds  = this.nodes.filter(n => n.type === NodeType.INPUT).map(n => n.id).sort((a, b) => a - b)
    const outputIds = this.nodes.filter(n => n.type === NodeType.OUTPUT).map(n => n.id).sort((a, b) => a - b)

    // Store activations for visualization
    const activations = {
      nodes: sortedNodes.map(n => ({ id: n.id, type: n.type, layer: n.layer, value: 0 })),
      connections: activeConns.map(c => ({ inNode: c.inNode, outNode: c.outNode, weight: c.weight, innovation: c.innovation })),
    }

    return {
      forward(inputs) {
        nodeValues.clear()

        // Set input values
        for (let i = 0; i < inputIds.length; i++) {
          nodeValues.set(inputIds[i], inputs[i] ?? 0)
        }

        // Evaluate each non-input node in layer order
        for (const node of sortedNodes) {
          if (node.type === NodeType.INPUT || node.type === NodeType.BIAS) continue

          const incoming = incomingByNode.get(node.id)
          if (!incoming || incoming.length === 0) {
            nodeValues.set(node.id, 0)
            continue
          }

          let sum = 0
          for (const c of incoming) {
            sum += (nodeValues.get(c.inNode) ?? 0) * c.weight
          }

          // Sigmoid for hidden (prevents runaway values in recurrent-like paths),
          // tanh for output (centered around 0, good for argmax)
          let val
          if (node.type === NodeType.HIDDEN) {
            val = 1 / (1 + Math.exp(-4.9 * sum))  // steep sigmoid, NEAT paper uses 4.9
          } else {
            val = Math.tanh(sum)
          }
          nodeValues.set(node.id, val)
        }

        // Collect outputs
        const outputs = outputIds.map(id => nodeValues.get(id) ?? 0)

        // Update activations for viz
        for (const an of activations.nodes) {
          an.value = nodeValues.get(an.id) ?? 0
        }

        return outputs
      },

      activations,
    }
  }
}

// ─── Crossover ────────────────────────────────────────────────────────────
// Align genes by innovation number.
// Matching genes: randomly from either parent.
// Disjoint & excess: always from the fitter parent.

export function crossover(parent1, parent2, rng) {
  // parent1 should be the fitter parent
  const [fitter, weaker] = parent1.fitness >= parent2.fitness
    ? [parent1, parent2]
    : [parent2, parent1]

  const child = new Genome()

  // Copy fitter parent's nodes (child inherits fitter topology)
  child.nodes = fitter.nodes.map(n => n.copy())

  // Build lookup for weaker parent's connections
  const weakerMap = new Map()
  for (const c of weaker.connections) weakerMap.set(c.innovation, c)

  for (const fc of fitter.connections) {
    const wc = weakerMap.get(fc.innovation)
    if (wc) {
      // Matching gene: randomly pick
      const chosen = rng.random() < 0.5 ? fc : wc
      const gene = chosen.copy()
      // If either parent has it disabled, 75% chance it stays disabled
      if (!fc.enabled || !wc.enabled) {
        gene.enabled = rng.random() > 0.75
      }
      child.connections.push(gene)
    } else {
      // Disjoint/excess: from fitter parent
      child.connections.push(fc.copy())
    }
  }

  return child
}

// ─── Compatibility Distance ──────────────────────────────────────────────
export function compatibilityDistance(g1, g2) {
  const map1 = new Map()
  const map2 = new Map()
  for (const c of g1.connections) map1.set(c.innovation, c)
  for (const c of g2.connections) map2.set(c.innovation, c)

  const allInnovations = new Set([...map1.keys(), ...map2.keys()])
  const max1 = g1.connections.length > 0 ? Math.max(...g1.connections.map(c => c.innovation)) : 0
  const max2 = g2.connections.length > 0 ? Math.max(...g2.connections.map(c => c.innovation)) : 0
  const maxInnovation = Math.min(max1, max2)

  let excess   = 0
  let disjoint = 0
  let matching = 0
  let weightDiff = 0

  for (const innov of allInnovations) {
    const in1 = map1.has(innov)
    const in2 = map2.has(innov)

    if (in1 && in2) {
      matching++
      weightDiff += Math.abs(map1.get(innov).weight - map2.get(innov).weight)
    } else if ((in1 && !in2) || (!in1 && in2)) {
      if (innov > maxInnovation) {
        excess++
      } else {
        disjoint++
      }
    }
  }

  const N = Math.max(g1.connections.length, g2.connections.length, 1)
  const avgWeight = matching > 0 ? weightDiff / matching : 0

  return (C1 * excess) / N + (C2 * disjoint) / N + C3 * avgWeight
}

// ─── Species ──────────────────────────────────────────────────────────────
export class Species {
  constructor(representative) {
    this.representative = representative.copy()
    this.members   = [representative]
    this.bestFitness = 0
    this.staleness = 0
    this.avgFitness = 0
  }

  addMember(genome) {
    this.members.push(genome)
  }

  reset() {
    if (this.members.length > 0) {
      // Pick a random member as new representative
      this.representative = this.members[Math.floor(Math.random() * this.members.length)].copy()
    }
    this.members = []
  }

  calculateAdjustedFitness() {
    const size = this.members.length || 1
    let total = 0
    for (const m of this.members) {
      m.adjustedFitness = m.fitness / size
      total += m.adjustedFitness
    }
    this.avgFitness = total / size

    const currentBest = Math.max(...this.members.map(m => m.fitness), 0)
    if (currentBest > this.bestFitness) {
      this.bestFitness = currentBest
      this.staleness = 0
    } else {
      this.staleness++
    }
  }

  /** Get the top member (for elitism) */
  getChampion() {
    return this.members.reduce((a, b) => a.fitness > b.fitness ? a : b)
  }

  /** Produce one offspring from this species */
  reproduce(rng, tracker) {
    const sorted = [...this.members].sort((a, b) => b.fitness - a.fitness)
    const pool = sorted.slice(0, Math.max(1, Math.floor(sorted.length * SURVIVAL_RATE)))

    let child
    if (pool.length === 1 || rng.random() < 0.25) {
      // Asexual: copy + mutate
      child = rng.pick(pool).copy()
    } else {
      const p1 = rng.pick(pool)
      const p2 = rng.pick(pool)
      child = crossover(p1, p2, rng)
    }
    child.mutate(rng, tracker)
    return child
  }
}

// ─── Population ───────────────────────────────────────────────────────────
export class NEATPopulation {
  constructor(size, seed) {
    this.size    = size
    this.rng     = createRng(seed)
    this.tracker = new InnovationTracker()
    this.genomes = []
    this.species = []
    this.generation = 0
    this.bestFitnessEver = 0
    this.bestGenome = null
    this.compatThreshold = COMPAT_THRESHOLD_INIT

    // Create initial population of minimal genomes
    for (let i = 0; i < size; i++) {
      if (i === 0) {
        // Create the first genome (which also initializes the tracker)
        this.genomes.push(Genome.createMinimal(this.rng, this.tracker))
      } else {
        // Copy the structure of the first, re-randomize weights
        const g = this.genomes[0].copy()
        for (const c of g.connections) {
          c.weight = this.rng.random() * 2 - 1
        }
        this.genomes.push(g)
      }
    }

    this._speciate()
  }

  /** Assign each genome to a species based on compatibility distance */
  _speciate() {
    // Reset species members but keep representatives
    for (const s of this.species) s.members = []

    for (const genome of this.genomes) {
      let placed = false
      for (const sp of this.species) {
        if (compatibilityDistance(genome, sp.representative) < this.compatThreshold) {
          sp.addMember(genome)
          placed = true
          break
        }
      }
      if (!placed) {
        this.species.push(new Species(genome))
      }
    }

    // Remove empty species
    this.species = this.species.filter(s => s.members.length > 0)

    // Update representatives
    for (const sp of this.species) {
      sp.representative = this.rng.pick(sp.members).copy()
    }

    // Adjust compatibility threshold to target species count
    if (this.species.length < TARGET_SPECIES) {
      this.compatThreshold = Math.max(0.3, this.compatThreshold - COMPAT_ADJUST)
    } else if (this.species.length > TARGET_SPECIES) {
      this.compatThreshold += COMPAT_ADJUST
    }
  }

  /** Called after all genomes have been evaluated with fitness values set */
  evolve() {
    this.generation++

    // Calculate adjusted fitness per species
    for (const sp of this.species) {
      sp.calculateAdjustedFitness()
    }

    // Track global best
    for (const g of this.genomes) {
      if (g.fitness > this.bestFitnessEver) {
        this.bestFitnessEver = g.fitness
        this.bestGenome = g.copy()
      }
    }

    // Remove stale species (stale > 15 gens and not the best species)
    const bestSpecies = this.species.reduce((a, b) => a.bestFitness > b.bestFitness ? a : b)
    this.species = this.species.filter(s => s.staleness < 15 || s === bestSpecies)

    // Calculate offspring allocation per species (proportional to avg fitness)
    const totalAvg = this.species.reduce((sum, s) => sum + s.avgFitness, 0) || 1
    const newGenomes = []

    for (const sp of this.species) {
      // Elitism: keep the champion of each species
      if (sp.members.length >= 5) {
        newGenomes.push(sp.getChampion().copy())
      }

      // Number of offspring for this species
      const numOffspring = Math.floor((sp.avgFitness / totalAvg) * this.size) - (sp.members.length >= 5 ? 1 : 0)

      for (let i = 0; i < numOffspring && newGenomes.length < this.size; i++) {
        newGenomes.push(sp.reproduce(this.rng, this.tracker))
      }
    }

    // Fill remaining slots
    while (newGenomes.length < this.size) {
      const sp = this.rng.pick(this.species)
      newGenomes.push(sp.reproduce(this.rng, this.tracker))
    }

    this.genomes = newGenomes.slice(0, this.size)
    this._speciate()
  }

  /** Get population stats for display */
  getStats() {
    const gBest = this.genomes.reduce((a, b) => a.fitness > b.fitness ? a : b, this.genomes[0])
    return {
      generation:  this.generation,
      species:     this.species.length,
      bestFitness: this.bestFitnessEver,
      currentBest: gBest?.fitness ?? 0,
      avgNodes:    Math.round(this.genomes.reduce((s, g) => s + g.nodes.length, 0) / this.genomes.length),
      avgConns:    Math.round(this.genomes.reduce((s, g) => s + g.connections.filter(c => c.enabled).length, 0) / this.genomes.length),
    }
  }
}
