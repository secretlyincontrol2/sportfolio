import { useEffect, useRef } from 'react'
import ScrollReveal from '../components/ScrollReveal'

const skills = [
  {
    group: 'AI / ML',
    items: [
      { name: 'LLM Fine-tuning (PEFT/QLoRA)', pct: 92 },
      { name: 'RAG Architecture & Neo4j', pct: 90 },
      { name: 'Computer Vision (Swin Transformer)', pct: 85 },
      { name: 'NLP & Prompt Engineering', pct: 88 },
    ],
  },
  {
    group: 'Engineering',
    items: [
      { name: 'Python / FastAPI', pct: 93 },
      { name: 'PyTorch / TensorFlow', pct: 87 },
      { name: 'Docker & Cloud Deployment', pct: 80 },
      { name: 'React / Vite / TypeScript', pct: 75 },
    ],
  },
]

function SkillBar({ name, pct, delay = 0 }) {
  const fillRef = useRef(null)

  useEffect(() => {
    const el = fillRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.width = `${pct}%`
          }, delay)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el.parentElement)
    return () => observer.disconnect()
  }, [pct, delay])

  return (
    <div className="skill-item">
      <div className="skill-header">
        <span className="skill-name">{name}</span>
        <span className="skill-pct">{pct}%</span>
      </div>
      <div className="skill-track">
        <div ref={fillRef} className="skill-fill" style={{ width: 0 }} />
      </div>
    </div>
  )
}

export default function About() {
  return (
    <main>
      <div className="container">
        <div className="page-header">
          <h1>About <span>Me</span></h1>
          <p>
            Passionate about solving complex problems through innovative AI applications.
            Proven track record in leading technical teams and optimizing AI-powered features
            from conception to production.
          </p>
        </div>

        {/* Skills */}
        <section className="section">
          <ScrollReveal>
            <h2>Skills</h2>
            <p className="section-desc">
              A hands-on stack built around production ML systems, from research to deployment.
            </p>
          </ScrollReveal>

          <div className="skills-grid">
            {skills.map((group, gi) => (
              <ScrollReveal key={group.group} delay={gi * 100}>
                <div className="skill-group">
                  <h3>{group.group}</h3>
                  {group.items.map((s, i) => (
                    <SkillBar key={s.name} name={s.name} pct={s.pct} delay={i * 120 + gi * 60} />
                  ))}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Stack tags */}
        <section className="section" style={{ paddingTop: 0 }}>
          <ScrollReveal>
            <div className="card">
              <h3 style={{ marginBottom: '1.2rem' }}>Full Technical Stack</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  'Python', 'FastAPI', 'SQLAlchemy', 'Pydantic',
                  'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Transformers',
                  'Neo4j Aura', 'PostgreSQL', 'FAISS', 'Cypher',
                  'React', 'Vite', 'TailwindCSS',
                  'Docker', 'Vercel', 'Railway', 'Render',
                  'Hugging Face', 'PEFT', 'QLoRA', 'Accelerate',
                ].map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '0.3rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      color: 'var(--text-dim)',
                      background: 'var(--surface-2)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Leadership */}
        <section className="section">
          <ScrollReveal>
            <h2>Leadership & Volunteering</h2>
            <p className="section-desc">Building the AI community at Babcock University.</p>
          </ScrollReveal>

          <div className="grid-2">
            <ScrollReveal delay={0}>
              <div className="vol-card">
                <div className="role-header">
                  <h3>GDG Babcock University</h3>
                  <span className="role-tag">Project Manager</span>
                </div>
                <p>
                  Lead the developer team in executing complex AI projects, including the University
                  Knowledge Graph Ecosystem. Responsible for project architecture, roadmap planning,
                  and cross-functional team coordination.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="vol-card">
                <div className="role-header">
                  <h3>GDG Babcock University</h3>
                  <span className="role-tag">Data & AI Track Lead</span>
                </div>
                <p>
                  Organize and host technical training sessions for ML careers, engaging 100+ students
                  and mentoring upcoming AI developers through workshops and hands-on sessions.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
    </main>
  )
}
