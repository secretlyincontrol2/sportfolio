import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ScrollReveal from '../components/ScrollReveal'


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
              <div className="stat-number">5+</div>
              <div className="stat-label">Projects Shipped</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">7</div>
              <div className="stat-label">Certifications</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">2</div>
              <div className="stat-label">Companies</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100+</div>
              <div className="stat-label">Students Mentored</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What I Build ── */}
      <section style={{ borderTop: '1px solid var(--border-dark)' }}>
        <div className="container">
          <ScrollReveal>
            <div className="feature-grid-editorial">
              {[
                {
                  idx: '01',
                  title: 'LLM Fine-tuning',
                  body: 'PEFT / QLoRA fine-tuning of open-source models for domain-specific alignment, safety research, and downstream tasks.',
                },
                {
                  idx: '02',
                  title: 'RAG Pipelines',
                  body: 'Hybrid retrieval systems combining vector search with graph traversal over Neo4j knowledge graphs for high-precision Q&A.',
                },
                {
                  idx: '03',
                  title: 'Computer Vision',
                  body: 'Swin Transformer-based classification with explainability layers (Grad-CAM++) for medical imaging and beyond.',
                },
              ].map((item) => (
                <div key={item.title} className="feature-item-editorial">
                  <span className="fi-label">§ {item.idx}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── 2048 + Expectimax AI ── */}
      <section className="section" style={{ borderTop: '1px solid var(--border-dark)', paddingTop: '4rem' }}>
        <div className="container">
          <div className="snake-home-grid">
            {/* Board preview */}
            <ScrollReveal>
              <div style={{
                width: 240, height: 240, flexShrink: 0,
                background: 'var(--border-dark)',
                borderRadius: 'var(--radius-sm)',
                padding: 8,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}>
                {[
                  512, 256, 128, 64,
                  32,  16,  8,   4,
                  2,   0,   0,   0,
                  0,   0,   0,   0,
                ].map((v, i) => {
                  const colors = {
                    512: '#f1f5f9', 256: '#cbd5e1', 128: '#a1a1aa', 64: '#71717a',
                    32: '#52525b', 16: '#3f3f46', 8: '#27272a', 4: '#18181b', 2: '#09090b',
                  }
                  const textColors = {
                    512: '#09090b', 256: '#09090b', 128: '#09090b', 64: '#ffffff',
                    32: '#ffffff', 16: '#ffffff', 8: '#ffffff', 4: '#ffffff', 2: '#ffffff',
                  }
                  return (
                    <div key={i} style={{
                      background: v ? colors[v] : 'rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-serif)', fontWeight: 700,
                      fontSize: v >= 256 ? '0.75rem' : '0.9rem',
                      color: v ? textColors[v] : 'transparent',
                    }}>
                      {v || ''}
                    </div>
                  )
                })}
              </div>
            </ScrollReveal>

            {/* Explanation */}
            <ScrollReveal delay={100}>
              <div>
                <span className="mono-label">Interactive Demo</span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem', letterSpacing: '-0.5px' }}>
                  2048 + Expectimax AI
                </h2>
                <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem', lineHeight: 1.9 }}>
                  Play 2048 manually or hand control to an
                  <strong style={{ color: 'var(--text)' }}> Expectimax AI</strong> that
                  searches 4 plies deep, weighing empty cells, merge potential, monotonicity,
                  and corner positioning to consistently reach the 2048 tile.
                </p>
                <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', lineHeight: 1.9 }}>
                  Unlike minimax, Expectimax models tile spawns as probability-weighted
                  chance nodes (90% for a 2, 10% for a 4) making it the correct algorithm
                  for stochastic environments.
                </p>
                <Link to="/game" className="btn btn-outline" style={{ display: 'inline-block' }}>
                  Play Now
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </main>
  )
}
