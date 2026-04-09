import { Link } from 'react-router-dom'
import { projects } from '../data/projects'
import ScrollReveal from '../components/ScrollReveal'

export default function Projects() {
  return (
    <main>
      <div className="container">
        <div className="page-header">
          <h1><span>Projects</span></h1>
          <p>
            Innovative solutions in AI, Knowledge Graphs, and Automation.
            Click any project for a full case study walkthrough.
          </p>
        </div>

        <section className="section">
          <div className="grid-2">
            {projects.map((p, i) => (
              <ScrollReveal key={p.slug} delay={(i % 2) * 100}>
                <div className="project-card">
                  <div className={`project-thumb ${p.tagClass}`}>
                    <span className="project-thumb-icon">{p.icon}</span>
                    <span className="project-thumb-label">{p.tag}</span>
                  </div>
                  <div className="project-body">
                    <span className="tag">{p.tag}</span>
                    <h3>{p.title}</h3>
                    <p>{p.short}</p>
                    <div className="project-links">
                      <Link to={`/projects/${p.slug}`} className="primary">
                        Case Study →
                      </Link>
                      {p.links.filter(l => l.external).map(l => (
                        <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
