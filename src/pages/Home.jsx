import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ScrollReveal from '../components/ScrollReveal'
import SnakeWidget from '../components/SnakeWidget'

// ── Particle canvas background ─────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let nodes = []
    const N = 60
    const MAX_DIST = 130

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    function init() {
      resize()
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.5 + 0.5,
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - dist / MAX_DIST) * 0.35})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0, 229, 255, 0.5)'
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }

    init(); draw()
    const ro = new ResizeObserver(() => { resize(); init() })
    ro.observe(canvas)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="hero-canvas" />
}

// ── Typewriter ─────────────────────────────────────────────────────────────
const ROLES = [
  'AI/ML Developer',
  'LLM Fine-tuning',
  'RAG Architect',
  'Computer Vision',
  'FastAPI Engineer',
]

function Typewriter() {
  const [text, setText] = useState('')
  const [roleIdx, setRoleIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) {
      const t = setTimeout(() => setPaused(false), 1400)
      return () => clearTimeout(t)
    }
    const target = ROLES[roleIdx]
    const speed = deleting ? 45 : 80
    const t = setTimeout(() => {
      if (!deleting) {
        if (text.length < target.length) {
          setText(target.slice(0, text.length + 1))
        } else {
          setPaused(true); setDeleting(true)
        }
      } else {
        if (text.length > 0) {
          setText(text.slice(0, -1))
        } else {
          setDeleting(false)
          setRoleIdx(i => (i + 1) % ROLES.length)
        }
      }
    }, speed)
    return () => clearTimeout(t)
  }, [text, deleting, paused, roleIdx])

  return (
    <span className="typewriter-container">
      {text}
      <span className="typewriter-cursor" />
    </span>
  )
}

// ── Photo ──────────────────────────────────────────────────────────────────
const PHOTO_SRC = '/assets/photo.jpg'

export default function Home() {
  const [photoLoaded, setPhotoLoaded] = useState(false)

  return (
    <main>
      {/* ── Hero ── */}
      <section className="hero">
        <ParticleCanvas />
        <div className="container">
          <div className="hero-layout">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="dot" />
                <Typewriter />
              </div>

              <h1>
                I'm <span className="name">Timilehin</span>,<br />
                Building the Future
              </h1>

              <p className="tagline">
                Results-driven AI/ML Developer with expertise in designing and deploying
                machine learning solutions: fine-tuned LLMs, computer vision systems,
                and production RAG pipelines.
              </p>

              <div className="hero-cta">
                <Link to="/projects" className="btn btn-primary">View Projects</Link>
                <Link to="/contact" className="btn btn-outline">Get in Touch</Link>
              </div>

              <div className="social-links">
                <a href="https://github.com/secretlyincontrol2" target="_blank" rel="noreferrer">↗ GitHub</a>
                <a href="https://www.linkedin.com/in/timilehin-adedayo-2697a431a/" target="_blank" rel="noreferrer">↗ LinkedIn</a>
                <a href="https://huggingface.co/santacl" target="_blank" rel="noreferrer">↗ Hugging Face</a>
              </div>
            </div>

            <div className="hero-photo-wrap">
              <div className="hero-photo-ring">
                <img
                  src={PHOTO_SRC}
                  alt="Timilehin Adedayo"
                  className="hero-photo"
                  onLoad={() => setPhotoLoaded(true)}
                  onError={e => { e.target.style.display = 'none' }}
                />
                {!photoLoaded && (
                  <div className="hero-photo-placeholder">T</div>
                )}
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">5</div>
              <div className="stat-label">Projects Shipped</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">7</div>
              <div className="stat-label">Certifications</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100+</div>
              <div className="stat-label">Students Mentored</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">2026</div>
              <div className="stat-label">B.Sc CS, Babcock University</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What I Build ── */}
      <section className="section" style={{ borderTop: '1px solid var(--border)', paddingTop: '4rem' }}>
        <div className="container">
          <ScrollReveal>
            <h2 style={{ marginBottom: '3rem', fontSize: '1.6rem', color: 'var(--text-dim)', fontWeight: 400 }}>
              What I build
            </h2>
          </ScrollReveal>
          <div className="grid-3">
            {[
              {
                title: 'LLM Fine-tuning',
                body: 'PEFT / QLoRA fine-tuning of open-source models for domain-specific alignment, safety research, and downstream tasks.',
              },
              {
                title: 'RAG Pipelines',
                body: 'Hybrid retrieval systems combining vector search with graph traversal over Neo4j knowledge graphs for high-precision Q&A.',
              },
              {
                title: 'Computer Vision',
                body: 'Swin Transformer-based classification with explainability layers (Grad-CAM++) for medical imaging and beyond.',
              },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <div className="card">
                  <h3>{item.title}</h3>
                  <p style={{ marginTop: '0.5rem' }}>{item.body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Neural Snake AI ── */}
      <section className="section" style={{ borderTop: '1px solid var(--border)', paddingTop: '4rem' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '4rem',
            alignItems: 'center',
          }}
          className="snake-home-grid"
          >
            {/* Live game */}
            <ScrollReveal>
              <SnakeWidget showStats={true} />
            </ScrollReveal>

            {/* Explanation */}
            <ScrollReveal delay={100}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.75rem' }}>
                  Live Demo
                </div>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                  Neural Snake AI
                </h2>
                <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: 1.9 }}>
                  This is a real neural network running live in your browser. 100 AI agents play
                  snake simultaneously, each controlled by a feedforward neural network. When they
                  all die, a <strong style={{ color: 'var(--text)' }}>genetic algorithm</strong> selects
                  the best performers, breeds them together, and starts the next generation.
                </p>
                <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.9 }}>
                  No backpropagation. No labelled data. The network learns purely through
                  <strong style={{ color: 'var(--text)' }}> survival pressure</strong>: the same
                  principle used in OpenAI's early reinforcement learning research.
                </p>
                <Link to="/game" className="btn btn-outline" style={{ display: 'inline-block' }}>
                  Play it yourself →
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  )
}
