// ─── Deep Q-Network Agent (Pure JavaScript) ──────────────────────────────
// A mathematically exact JavaScript port of the PyTorch snake-ai agent.
// Implements: Linear QNet with backprop, experience replay, epsilon-greedy.
// No external ML library required — pure vanilla matrix math.

import { SnakeAgent } from './engine.js'

// ─── Trainable Linear Q-Network ──────────────────────────────────────────
// Architecture: 11 -> 256 (ReLU) -> 3  (identical to model.py)
// Includes full forward + backward pass with SGD optimizer.

export class TrainableQNet {
  constructor(inputSize = 11, hiddenSize = 256, outputSize = 3, lr = 0.001) {
    this.inputSize = inputSize
    this.hiddenSize = hiddenSize
    this.outputSize = outputSize
    this.lr = lr

    // Xavier initialization for stable training
    const xav1 = Math.sqrt(2 / (inputSize + hiddenSize))
    this.l1_weight = this._randMatrix(hiddenSize, inputSize, xav1)
    this.l1_bias = new Float64Array(hiddenSize)

    const xav2 = Math.sqrt(2 / (hiddenSize + outputSize))
    this.l2_weight = this._randMatrix(outputSize, hiddenSize, xav2)
    this.l2_bias = new Float64Array(outputSize)

    // Cache for backward pass
    this._input = null
    this._hidden = null
    this._preRelu = null
  }

  _randMatrix(rows, cols, scale) {
    const m = []
    for (let i = 0; i < rows; i++) {
      const row = new Float64Array(cols)
      for (let j = 0; j < cols; j++) {
        row[j] = (Math.random() * 2 - 1) * scale
      }
      m.push(row)
    }
    return m
  }

  forward(inputs) {
    this._input = inputs

    // Layer 1: linear + ReLU
    const preRelu = new Float64Array(this.hiddenSize)
    const hidden = new Float64Array(this.hiddenSize)
    for (let i = 0; i < this.hiddenSize; i++) {
      let val = this.l1_bias[i]
      for (let j = 0; j < this.inputSize; j++) {
        val += this.l1_weight[i][j] * inputs[j]
      }
      preRelu[i] = val
      hidden[i] = val > 0 ? val : 0  // ReLU
    }
    this._preRelu = preRelu
    this._hidden = hidden

    // Layer 2: linear (no activation)
    const output = new Float64Array(this.outputSize)
    for (let i = 0; i < this.outputSize; i++) {
      let val = this.l2_bias[i]
      for (let j = 0; j < this.hiddenSize; j++) {
        val += this.l2_weight[i][j] * hidden[j]
      }
      output[i] = val
    }
    return output
  }

  // Train a single sample (or batch item) using MSE loss + SGD
  // target is the full Q-target vector (same shape as output)
  trainStep(state, target) {
    const pred = this.forward(state)

    // ── Compute dL/dOutput (MSE derivative: 2*(pred - target)/n)
    const dOutput = new Float64Array(this.outputSize)
    for (let i = 0; i < this.outputSize; i++) {
      dOutput[i] = (2 / this.outputSize) * (pred[i] - target[i])
    }

    // ── Backward through Layer 2 ──
    // dL/d(l2_weight[i][j]) = dOutput[i] * hidden[j]
    // dL/d(l2_bias[i])      = dOutput[i]
    // dL/d(hidden[j])        = sum_i(dOutput[i] * l2_weight[i][j])
    const dHidden = new Float64Array(this.hiddenSize)
    for (let i = 0; i < this.outputSize; i++) {
      this.l2_bias[i] -= this.lr * dOutput[i]
      for (let j = 0; j < this.hiddenSize; j++) {
        dHidden[j] += dOutput[i] * this.l2_weight[i][j]
        this.l2_weight[i][j] -= this.lr * dOutput[i] * this._hidden[j]
      }
    }

    // ── Backward through ReLU ──
    // dL/d(preRelu[j]) = dHidden[j] * (preRelu[j] > 0 ? 1 : 0)
    const dPreRelu = new Float64Array(this.hiddenSize)
    for (let j = 0; j < this.hiddenSize; j++) {
      dPreRelu[j] = this._preRelu[j] > 0 ? dHidden[j] : 0
    }

    // ── Backward through Layer 1 ──
    for (let i = 0; i < this.hiddenSize; i++) {
      this.l1_bias[i] -= this.lr * dPreRelu[i]
      for (let j = 0; j < this.inputSize; j++) {
        this.l1_weight[i][j] -= this.lr * dPreRelu[i] * this._input[j]
      }
    }

    return pred
  }
}


// ─── DQN Agent ───────────────────────────────────────────────────────────
// Direct JS port of agent.py: epsilon-greedy, experience replay, Q-learning.

const MAX_MEMORY = 100_000
const BATCH_SIZE = 1000
const LR = 0.001
const GAMMA = 0.9

const CLOCK_WISE = [
  [1, 0],  // right
  [0, 1],  // down
  [-1, 0], // left
  [0, -1], // up
]

export class DQNAgent {
  constructor(cols = 20, rows = 20) {
    this.cols = cols
    this.rows = rows
    this.nGames = 0
    this.epsilon = 0
    this.gamma = GAMMA
    this.memory = []
    this.memoryIdx = 0
    this.model = new TrainableQNet(11, 256, 3, LR)

    // Current game
    this.snake = new SnakeAgent(cols, rows)
    this.snake.brain = null // manual control via DQN

    // Stats
    this.record = 0
    this.scores = []
    this.lastQValues = [0, 0, 0]
  }

  // ── Get 11-dimensional state (identical to agent.py get_state) ──
  getState() {
    const s = this.snake
    const [hx, hy] = s.body[0]
    const [dx, dy] = s.dir

    // Clockwise direction index
    const dirIdx = CLOCK_WISE.findIndex(d => d[0] === dx && d[1] === dy)

    // Points adjacent to head
    const ahead = [hx + dx, hy + dy]
    const rightDir = CLOCK_WISE[(dirIdx + 1) % 4]
    const leftDir = CLOCK_WISE[(dirIdx + 3) % 4]
    const rightPt = [hx + rightDir[0], hy + rightDir[1]]
    const leftPt = [hx + leftDir[0], hy + leftDir[1]]

    const isCollision = (px, py) => {
      if (px < 0 || px >= this.cols || py < 0 || py >= this.rows) return 1
      if (s.body.slice(1).some(([bx, by]) => bx === px && by === py)) return 1
      return 0
    }

    const [fx, fy] = s.food

    return [
      // Danger
      isCollision(ahead[0], ahead[1]),
      isCollision(rightPt[0], rightPt[1]),
      isCollision(leftPt[0], leftPt[1]),
      // Direction
      dx === -1 ? 1 : 0,  // left
      dx === 1 ? 1 : 0,   // right
      dy === -1 ? 1 : 0,  // up
      dy === 1 ? 1 : 0,   // down
      // Food location
      fx < hx ? 1 : 0,
      fx > hx ? 1 : 0,
      fy < hy ? 1 : 0,
      fy > hy ? 1 : 0,
    ]
  }

  // ── Epsilon-greedy action selection ──
  getAction(state) {
    this.epsilon = 80 - this.nGames
    const action = [0, 0, 0]
    if (Math.random() * 200 < this.epsilon) {
      // Random exploration
      action[Math.floor(Math.random() * 3)] = 1
    } else {
      // Exploit model
      const qValues = this.model.forward(state)
      this.lastQValues = Array.from(qValues)
      const maxIdx = qValues.indexOf(Math.max(...qValues))
      action[maxIdx] = 1
    }
    return action
  }

  // ── Apply action to snake ──
  applyAction(action) {
    const s = this.snake
    const [dx, dy] = s.dir
    const dirIdx = CLOCK_WISE.findIndex(d => d[0] === dx && d[1] === dy)

    const actionIdx = action.indexOf(1)
    let newDir
    if (actionIdx === 0) {
      newDir = CLOCK_WISE[dirIdx] // straight
    } else if (actionIdx === 1) {
      newDir = CLOCK_WISE[(dirIdx + 1) % 4] // right turn
    } else {
      newDir = CLOCK_WISE[(dirIdx + 3) % 4] // left turn
    }
    s.dir = newDir

    const prevScore = s.score
    s._move()

    // Calculate reward (identical to game.py)
    let reward = 0
    const done = s.dead
    if (done) {
      reward = -10
    } else if (s.score > prevScore) {
      reward = 10
    }

    return { reward, done, score: s.score }
  }

  // ── Store experience ──
  remember(state, action, reward, nextState, done) {
    if (this.memory.length < MAX_MEMORY) {
      this.memory.push({ state, action, reward, nextState, done })
    } else {
      this.memory[this.memoryIdx % MAX_MEMORY] = { state, action, reward, nextState, done }
    }
    this.memoryIdx++
  }

  // ── Train on a single transition (short memory) ──
  trainShort(state, action, reward, nextState, done) {
    this._trainBatch([{ state, action, reward, nextState, done }])
  }

  // ── Train on replay buffer (long memory / experience replay) ──
  trainLong() {
    let batch
    if (this.memory.length > BATCH_SIZE) {
      // Random sample
      batch = []
      for (let i = 0; i < BATCH_SIZE; i++) {
        batch.push(this.memory[Math.floor(Math.random() * this.memory.length)])
      }
    } else {
      batch = [...this.memory]
    }
    this._trainBatch(batch)
  }

  _trainBatch(batch) {
    for (const { state, action, reward, nextState, done } of batch) {
      const pred = this.model.forward(state)
      const target = Array.from(pred)

      let qNew = reward
      if (!done) {
        const nextQ = this.model.forward(nextState)
        qNew = reward + this.gamma * Math.max(...nextQ)
      }

      const actionIdx = action.indexOf(1)
      target[actionIdx] = qNew

      this.model.trainStep(state, target)
    }
  }

  // ── Run one complete game step ── returns { done, score }
  step() {
    const stateOld = this.getState()
    const action = this.getAction(stateOld)
    const { reward, done, score } = this.applyAction(action)
    const stateNew = this.getState()

    this.trainShort(stateOld, action, reward, stateNew, done)
    this.remember(stateOld, action, reward, stateNew, done)

    if (done) {
      this.snake.reset()
      this.nGames++
      this.trainLong()

      if (score > this.record) {
        this.record = score
      }
      this.scores.push(score)
    }

    return { done, score }
  }

  // Run N steps at once (for fast-forward training)
  stepBatch(n) {
    for (let i = 0; i < n; i++) {
      this.step()
    }
  }

  // Get recent score history for charting
  getRecentScores(count = 50) {
    return this.scores.slice(-count)
  }

  getMeanScore() {
    if (this.scores.length === 0) return 0
    const recent = this.scores.slice(-20)
    return (recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1)
  }
}
