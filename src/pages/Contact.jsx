import ScrollReveal from '../components/ScrollReveal'

const links = [
  { icon: '', label: 'timilehinadedayo@gmail.com', href: 'mailto:timilehinadedayo@gmail.com' },
  { icon: '', label: 'github.com/secretlyincontrol2', href: 'https://github.com/secretlyincontrol2' },
  { icon: '', label: 'LinkedIn', href: 'https://www.linkedin.com/in/timilehin-adedayo-2697a431a/' },
  { icon: '', label: 'Hugging Face', href: 'https://huggingface.co/santacl' },
]

export default function Contact() {
  return (
    <main>
      <div className="container">
        <div className="page-header">
          <h1>Get in <span>Touch</span></h1>
          <p>Have a challenging problem or an innovative project? Let's create something impactful.</p>
        </div>

        <section className="section">
          <div className="contact-grid">
            <ScrollReveal>
              <div className="contact-info">
                <h2>Let's Build Together</h2>
                <p>
                  I'm currently open to AI/ML roles, research collaborations, and freelance
                  projects. Feel free to reach out via any of the channels below.
                </p>

                <div className="contact-links">
                  {links.map(l => (
                    <a key={l.href} href={l.href} target={l.href.startsWith('mailto') ? undefined : '_blank'} rel="noreferrer">
                      <span className="link-icon">{l.icon}</span>
                      {l.label}
                    </a>
                  ))}
                </div>

                <a
                  href="/cv/Timilehin Adedayo - CV.pdf"
                  download
                  className="btn btn-primary"
                >
                  Download Resume
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="card" style={{ height: '100%' }}>
                <h3>Open to Opportunities</h3>
                <p style={{ marginTop: '0.5rem' }}>
                  I'm looking for full-time, internship, or freelance positions in AI/ML
                  development, data engineering, and research. If you have an interesting
                  project or role, I'd love to hear about it.
                </p>

                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    background: 'var(--accent-dim)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(0,229,255,0.15)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Status
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    Available for opportunities
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
    </main>
  )
}
