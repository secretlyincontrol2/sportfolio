// ─── Shared Neural Snake AI Engine ───────────────────────────────────────
// Used by both the full Game page and the always-running SnakeWidget.

export const DIRS = [
  [0, -1], // up
  [0,  1], // down
  [-1, 0], // left
  [1,  0], // right
]

// ─── Neural Network ───────────────────────────────────────────────────────
// Architecture: 11 inputs → 16 hidden (ReLU) → 4 outputs (linear, argmax)
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

// ─── Snake Agent ──────────────────────────────────────────────────────────
export class SnakeAgent {
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
    this.dir = [1, 0]
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
      if (!this.body.some(([bx, by]) => bx === x && by === y)) return [x, y]
    }
  }

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
    const inputs = this.getInputs()
    const out = this.brain.forward(inputs)
    const argmax = out.indexOf(Math.max(...out))
    const newDir = DIRS[argmax]
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
    } else {
      this.body.pop()
    }
  }

  // Fitness: reward survival + food heavily, penalise looping
  calcFitness() {
    this.fitness = this.steps + this.score * 100 + this.score * this.score * 200
    return this.fitness
  }
}

// ─── Genetic Algorithm ────────────────────────────────────────────────────
// Steps each generation:
//  1. Score every snake with calcFitness()
//  2. Sort descending by fitness
//  3. Elitism: copy best brain unchanged into next gen
//  4. Select top 15% as breeding pool
//  5. Fill rest with uniform crossover of two random parents + mutation
//
// Mutation: each weight has 12% chance of Gaussian perturbation (σ=0.3)

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
