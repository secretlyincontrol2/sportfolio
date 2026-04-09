import { certifications } from '../data/certifications'
import ScrollReveal from '../components/ScrollReveal'

export default function Certifications() {
  return (
    <main>
      <div className="container">
        <div className="page-header">
          <h1><span>Certifications</span></h1>
          <p>Validated expertise from industry-leading institutions.</p>
        </div>

        <section className="section">
          <div className="grid-3">
            {certifications.map((cert, i) => (
              <ScrollReveal key={cert.title} delay={(i % 3) * 80}>
                <a
                  href={cert.href}
                  target="_blank"
                  rel="noreferrer"
                  className="cert-card"
                >
                  <div className="cert-issuer-badge">{cert.badge}</div>
                  <h3>{cert.title}</h3>
                  <p>{cert.issuer}</p>
                  <div className="cert-arrow">View Certificate →</div>
                </a>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
