// ─── Shared Snake AI Engine ──────────────────────────────────────────────
// Provides the SnakeAgent game logic. The brain can be either:
//  - A legacy NeuralNet (fixed topology, for manual mode backup)
//  - A NEAT genome's network (variable topology, for the main simulation)
//  - null (manual / human-controlled mode)
//
// Also exports the legacy NeuralNet + evolve() for backward compat.

export const DIRS = [
  [0, -1], // up
  [0,  1], // down
  [-1, 0], // left
  [1,  0], // right
]

// ─── Legacy Neural Network (fixed topology) ───────────────────────────────
// Architecture: 11 inputs -> 16 hidden (ReLU) -> 4 outputs (linear, argmax)
//
// Inputs (11):
//  [0] danger straight   - wall or body 1 step ahead
//  [1] danger right      - wall or body 1 step to relative right
//  [2] danger left       - wall or body 1 step to relative left
//  [3] moving left       - one-hot direction encoding
//  [4] moving right
//  [5] moving up
//  [6] moving down
//  [7] food left         - food is to the left of head
//  [8] food right
//  [9] food up
// [10] food down
//
// Outputs (4): [up, down, left, right] - argmax selects the move

export class NeuralNet {
  constructor(layers = [11, 16, 4]) {
    this.layers = layers
    this.weights = []
    this.biases = []

    for (let i = 0; i < layers.length - 1; i++) {
      const w = []
      for (let j = 0; j < layers[i + 1]; j++) {
        const row = []
        for (let k = 0; k < layers[i]; k++) {
          // He initialisation for ReLU layers
          row.push((Math.random() * 2 - 1) * Math.sqrt(2 / layers[i]))
        }
        w.push(row)
      }
      this.weights.push(w)
      this.biases.push(Array.from({ length: layers[i + 1] }, () => 0))
    }

    // Store activations for live visualisation
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

  // Uniform crossover - each weight independently from either parent
  crossover(other) {
    const child = this.copy()
    for (let l = 0; l < child.weights.length; l++) {
      for (let j = 0; j < child.weights[l].length; j++) {
        for (let k = 0; k < child.weights[l][j].length; k++) {
          if (Math.random() < 0.5) child.weights[l][j][k] = other.weights[l][j][k]
        }
        if (Math.random() < 0.5) child.biases[l][j] = other.biases[l][j]
      }
    }
    return child
  }
}

// ─── PyTorch Q-Learning Model (Deep Q-Network) ────────────────────────────
// Directly mathematically translates the linear model from `model.py` in PyTorch.
// Architecture: 11 state inputs -> 256 Hidden (ReLU) -> 3 Q-value outputs (Straight, Right, Left)
// This enables loading state_dict JSON weights trained via python backend.

export class PyTorchQNet {
  constructor(weightsJson = null) {
    this.hiddenSize = 256
    this.inputSize = 11
    this.outputSize = 3

    if (weightsJson) {
      // Load directly from PyTorch state_dict export
      this.l1_weight = weightsJson['linear1.weight']
      this.l1_bias = weightsJson['linear1.bias']
      this.l2_weight = weightsJson['linear2.weight']
      this.l2_bias = weightsJson['linear2.bias']
    } else {
      // Initialize mathematically identical to PyTorch nn.Linear to prevent NaNs
      const kaiming1 = Math.sqrt(1 / this.inputSize)
      this.l1_weight = Array.from({ length: this.hiddenSize }, () => 
        Array.from({ length: this.inputSize }, () => (Math.random() * 2 - 1) * kaiming1))
      this.l1_bias = Array.from({ length: this.hiddenSize }, () => (Math.random() * 2 - 1) * kaiming1)

      const kaiming2 = Math.sqrt(1 / this.hiddenSize)
      this.l2_weight = Array.from({ length: this.outputSize }, () => 
        Array.from({ length: this.hiddenSize }, () => (Math.random() * 2 - 1) * kaiming2))
      this.l2_bias = Array.from({ length: this.outputSize }, () => (Math.random() * 2 - 1) * kaiming2)
    }
  }

  // Exact duplicate of PyTorch Linear_QNet forward pass
  forward(inputs) {
    const hidden = new Array(this.hiddenSize).fill(0)
    for (let i = 0; i < this.hiddenSize; i++) {
      let val = this.l1_bias[i]
      for (let j = 0; j < this.inputSize; j++) {
        val += this.l1_weight[i][j] * inputs[j]
      }
      hidden[i] = Math.max(0, val) // F.relu(self.linear1(x))
    }

    const output = new Array(this.outputSize).fill(0)
    for (let i = 0; i < this.outputSize; i++) {
      let val = this.l2_bias[i]
      for (let j = 0; j < this.hiddenSize; j++) {
        val += this.l2_weight[i][j] * hidden[j]
      }
      output[i] = val // self.linear2(x) - raw Q-Values
    }
    return output
  }
}

// ─── Snake Agent ──────────────────────────────────────────────────────────
// Now accepts an optional seeded RNG for deterministic food placement.
//
// NEAT mode uses RELATIVE outputs: [straight, turn-left, turn-right]
// This avoids the 180-turn deadlock that absolute directions cause.
export class SnakeAgent {
  constructor(cols, rows, brain = null, rng = null) {
    this.cols = cols
    this.rows = rows
    this.brain = brain || null
    this._rng = rng  // seeded RNG for deterministic mode, null = Math.random
    this.reset()
  }

  reset() {
    const cx = Math.floor(this.cols / 2)
    const cy = Math.floor(this.rows / 2)
    this.body = [[cx, cy], [cx - 1, cy], [cx - 2, cy]]
    this.dir = [1, 0]
    this.food = this._placeFood()
    this.score = 0
    this.steps = 0
    this.stepsWithoutFood = 0
    this.dead = false
    this.fitness = 0
    this._prevDist = this._foodDist()
  }

  _placeFood() {
    const rand = this._rng ? () => this._rng.random() : Math.random
    while (true) {
      const x = Math.floor(rand() * this.cols)
      const y = Math.floor(rand() * this.rows)
      if (!this.body.some(([bx, by]) => bx === x && by === y)) return [x, y]
    }
  }

  _foodDist() {
    const [hx, hy] = this.body[0]
    const [fx, fy] = this.food
    return Math.abs(hx - fx) + Math.abs(hy - fy)
  }

  _castRay(rayDx, rayDy) {
    let [x, y] = this.body[0]
    let dist = 0
    let hitFood = false
    let hitBody = false
    let foodDist = 0
    let bodyDist = 0

    rayDx = Math.sign(rayDx)
    rayDy = Math.sign(rayDy)

    while (true) {
      x += rayDx
      y += rayDy
      dist++

      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
        break // Wall hit
      }

      if (!hitFood && x === this.food[0] && y === this.food[1]) {
        hitFood = true
        foodDist = dist
      }

      if (!hitBody && this.body.some(([bx, by], i) => i > 0 && bx === x && by === y)) {
        hitBody = true
        bodyDist = dist
      }
    }

    return {
      wallDist: 1 / dist,
      foodDist: hitFood ? 1 / foodDist : 0,
      bodyDist: hitBody ? 1 / bodyDist : 0,
      hitPoint: [x, y], // where it hit the wall
      dist,
    }
  }

  // Ray-cast vision system: 5 directions x 3 features + 1 bias = 16 inputs
  getAdvancedInputs() {
    const [dx, dy] = this.dir

    // Relative directional vectors
    const dirs = [
      [dx, dy],                // Straight
      [dx + dy, dy - dx],      // Front-Left
      [dy, -dx],               // Left
      [dx - dy, dy + dx],      // Front-Right
      [-dy, dx],               // Right
    ]

    const inputs = []
    this.rays = []

    for (const d of dirs) {
      const ray = this._castRay(d[0], d[1])
      inputs.push(ray.wallDist, ray.foodDist, ray.bodyDist)
      this.rays.push({ dx: d[0], dy: d[1], ...ray })
    }

    // Global food vector (so it's not blind when food is between rays)
    const foodDx = this.food[0] - this.body[0][0]
    const foodDy = this.food[1] - this.body[0][1]
    const rightDir = [-dy, dx]
    const dotForward = foodDx * dx + foodDy * dy
    const dotRight = foodDx * rightDir[0] + foodDy * rightDir[1]

    inputs.push(dotForward / this.cols, dotRight / this.cols)
    inputs.push(1) // Bias
    return inputs
  }

  // Original absolute inputs (kept for legacy NeuralNet compatibility)
  getInputs() {
    const [hx, hy] = this.body[0]
    const [dx, dy] = this.dir
    const [fx, fy] = this.food

    // Relative left/right perpendicular directions
    const leftDir  = [ dy, -dx]
    const rightDir = [-dy,  dx]

    const danger = (d) => {
      const nx = this.body[0][0] + d[0]
      const ny = this.body[0][1] + d[1]
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) return 1
      if (this.body.slice(1).some(([bx, by]) => bx === nx && by === ny)) return 1
      return 0
    }

    return [
      danger(this.dir),    // [0] danger straight
      danger(rightDir),    // [1] danger right
      danger(leftDir),     // [2] danger left
      dx === -1 ? 1 : 0,  // [3] moving left
      dx ===  1 ? 1 : 0,  // [4] moving right
      dy === -1 ? 1 : 0,  // [5] moving up
      dy ===  1 ? 1 : 0,  // [6] moving down
      fx < hx ? 1 : 0,    // [7] food left
      fx > hx ? 1 : 0,    // [8] food right
      fy < hy ? 1 : 0,    // [9] food up
      fy > hy ? 1 : 0,    // [10] food down
    ]
  }

  think() {
    if (!this.brain) return // manual mode
    
    // Is this the 11-input PyTorch DQN or 11-input Legacy NeuralNet?
    const isPyTorch = this.brain instanceof PyTorchQNet

    // Fall back to legacy getInputs() for non-NEAT 11-nodes
    const inputs = this.brain.inputSize === 11 || isPyTorch ? this.getInputs() : this.getAdvancedInputs()
    const out = this.brain.forward(inputs)
    const argmax = out.indexOf(Math.max(...out))

    if (isPyTorch) {
      // PyTorch Action map: [Straight, Right Turn, Left Turn]
      const clock_wise = [
        [1, 0],  // right
        [0, 1],  // down
        [-1, 0], // left
        [0, -1]  // up
      ]
      const idx = clock_wise.findIndex(d => d[0] === this.dir[0] && d[1] === this.dir[1])
      
      let newDir = this.dir
      if (argmax === 1) {
        newDir = clock_wise[(idx + 1) % 4] // right
      } else if (argmax === 2) {
        newDir = clock_wise[(idx + 3) % 4] // left ((idx - 1) % 4 resolves to +3)
      }
      this.dir = newDir

    } else {
      // Legacy Genetic NeuralNet and NEAT (which now relies on simulation's explicit forward passes anyway)
      const newDir = DIRS[argmax]
      if (newDir[0] !== -this.dir[0] || newDir[1] !== -this.dir[1]) {
        this.dir = newDir
      }
    }
  }

  /** Step with think() - used by legacy GA mode */
  step() {
    if (this.dead) return
    this.think()
    this._move()
  }

  /** Step without think() - used by NEAT simulation which calls forward() externally */
  stepNoThink() {
    if (this.dead) return
    this._move()
  }

  _move() {
    const [hx, hy] = this.body[0]
    const [dx, dy] = this.dir
    const nx = hx + dx
    const ny = hy + dy

    if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
      this.dead = true; return
    }
    if (this.body.slice(1).some(([bx, by]) => bx === nx && by === ny)) {
      this.dead = true; return
    }

    this.body.unshift([nx, ny])
    this.steps++
    this.stepsWithoutFood++

    if (this.stepsWithoutFood > 100 + this.score * 50) {
      this.dead = true; return
    }

    if (nx === this.food[0] && ny === this.food[1]) {
      this.score++
      this.stepsWithoutFood = 0
      this.food = this._placeFood()
      this._prevDist = this._foodDist()
    } else {
      this.body.pop()
      // Track distance change for fitness shaping
      const newDist = this._foodDist()
      this._closerCount = (this._closerCount || 0) + (newDist < this._prevDist ? 1 : 0)
      this._prevDist = newDist
    }
  }

  // Fitness: heavily reward food, penalise spinning/stalling
  calcFitness() {
    this.fitness = this.steps + this.score * 100 + this.score * this.score * 200
    return this.fitness
  }
}

// ─── Legacy Genetic Algorithm ─────────────────────────────────────────────
// Kept for backward compat (manual/local mode on the Game page).
export function evolve(population) {
  population.forEach(s => s.calcFitness())
  population.sort((a, b) => b.fitness - a.fitness)

  const top = Math.max(5, Math.floor(population.length * 0.15))
  const elite = population.slice(0, top)

  const newBrains = [elite[0].brain.copy()] // elitism: best survives unchanged

  while (newBrains.length < population.length) {
    const pA = elite[Math.floor(Math.random() * elite.length)]
    const pB = elite[Math.floor(Math.random() * elite.length)]
    const child = pA.brain.crossover(pB.brain)
    child.mutate(0.12, 0.3)
    newBrains.push(child)
  }

  return newBrains.map(brain => new SnakeAgent(population[0].cols, population[0].rows, brain))
}
