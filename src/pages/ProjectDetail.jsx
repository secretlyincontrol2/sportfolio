import { useParams, Link, Navigate } from 'react-router-dom'
import { projects } from '../data/projects'

export default function ProjectDetail() {
  const { slug } = useParams()
  const project = projects.find(p => p.slug === slug)

  if (!project) return <Navigate to="/projects" replace />

  return (
    <main>
      <div className="container">
        <div className="project-detail">
          <Link to="/projects" className="back-link">← Back to Projects</Link>

          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '0.75rem',
            }}
          >
            {project.tag}
          </span>

          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>

          <div className="detail-layout">
            {/* Main content */}
            <div>
              <div className="detail-section">
                <h2>Overview</h2>
                <p>{project.overview}</p>
              </div>

              <div className="detail-section">
                <h2>Key Highlights</h2>
                <ul>
                  {project.highlights.map(h => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <div className="sidebar-box">
                <h3>Tech Stack</h3>
                <ul>
                  {project.stack.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>

              <div className="sidebar-box">
                <h3>Details</h3>
                <ul>
                  <li>Role: {project.role}</li>
                  <li>Status: {project.status}</li>
                </ul>
              </div>

              <div className="sidebar-box">
                <h3>Links</h3>
                <ul>
                  {project.links.filter(l => l.external).map(l => (
                    <li key={l.label}>
                      <a href={l.href} target="_blank" rel="noreferrer">
                        {l.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
