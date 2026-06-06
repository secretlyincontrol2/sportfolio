import { useEffect, useRef } from 'react'
import ScrollReveal from '../components/ScrollReveal'

const skills = [
  {
    group: 'AI / ML',
    items: [
      { name: 'Computer Vision (Swin / Grad-CAM++)', pct: 95 },
      { name: 'LLM Fine-tuning (PEFT/QLoRA)', pct: 92 },
      { name: 'RAG Architecture & Neo4j', pct: 90 },
      { name: 'NLP & Prompt Engineering', pct: 88 },
    ],
  },
  {
    group: 'Engineering',
    items: [
      { name: 'Python / FastAPI', pct: 93 },
      { name: 'PyTorch / TensorFlow', pct: 87 },
      { name: 'Docker & Cloud Deployment', pct: 80 },
      { name: 'Git & Version Control', pct: 82 },
    ],
  },
]

const experience = [
  {
    company: 'Acturian',
    role: 'Co-Founder & CTO',
    period: 'Feb 2026 - Present',
    type: 'Full-time',
    bullets: [
      'Architect and maintain the core scoring engine, designing ML pipelines that evaluate risk signals across structured and unstructured data sources',
      'Integrate fine-tuned transformer models into the scoring pipeline to improve classification accuracy by ~18% over the prior rule-based system',
      'Build FastAPI microservices to expose scoring endpoints consumed by internal underwriting tools with sub-100ms p95 latency',
      'Collaborate with actuarial analysts to translate domain expertise into feature engineering strategies and model evaluation criteria',
      'Own model monitoring and drift detection, maintaining dashboards tracking data distribution shifts and prediction confidence over time',
    ],
  },
  {
    company: 'Cortex AI',
    role: 'Founder & AI Lead',
    period: 'Sep 2025 - Jan 2026',
    type: 'Contract',
    bullets: [
      'Designed and shipped a diagnostic inference engine combining computer vision (Swin Transformer) with a RAG-grounded knowledge base of clinical guidelines',
      'Built the end-to-end ML pipeline from data ingestion to model serving, supporting real-time inference at scale',
      'Developed a lightweight model quantization pipeline enabling deployment on low-bandwidth, low-compute edge devices',
      'Implemented data governance protocols ensuring HIPAA-aligned anonymisation and consent management for all patient data',
      'Coordinated a cross-functional team of engineers, clinicians, and UX researchers to ship the product on schedule',
    ],
  },
  {
    company: 'IITA (International Institute of Tropical Agriculture)',
    role: 'Software Developer Intern',
    period: 'Jan 2025 - Jun 2025',
    type: 'Internship',
    bullets: [
      'Built convolutional neural networks for early detection of cassava mosaic disease and brown streak virus from field imagery, achieving 94% validation accuracy',
      'Developed automated crop yield estimation pipelines using satellite imagery and Random Forest regressors across multi-season datasets',
      'Integrated drone-captured multispectral data into a soil health classification model to guide precision fertiliser application',
      'Created a Flask-based internal dashboard for researchers to upload leaf samples and receive real-time disease predictions',
      'Collaborated with agronomists to curate and label a 12,000-image dataset of pest-affected maize crops for downstream model training',
    ],
  },
  {
    company: 'Synthea Labs',
    role: 'Machine Learning Intern',
    period: 'Sep 2024 - Dec 2024',
    type: 'Internship',
    bullets: [
      'Trained and evaluated generative adversarial networks for synthetic tabular data augmentation, reducing class imbalance in fraud detection datasets by 3x',
      'Built an automated feature selection pipeline using mutual information and SHAP values, cutting model training time by 40%',
      'Deployed inference endpoints on AWS Lambda behind API Gateway, handling 2,000+ daily prediction requests',
      'Wrote comprehensive model cards and experiment reports documenting hyperparameter sweeps across 50+ configurations',
    ],
  },
  {
    company: 'Meridian Analytics',
    role: 'ML Engineering Intern',
    period: 'May 2024 - Aug 2024',
    type: 'Internship',
    bullets: [
      'Developed time-series forecasting models (LSTM, Prophet) for energy consumption prediction across commercial building portfolios',
      'Designed a real-time anomaly detection system using Isolation Forest and autoencoders, flagging equipment failures 6 hours ahead of traditional thresholds',
      'Optimised ETL pipelines ingesting 500GB+ of sensor telemetry data into a feature store built on DuckDB and Parquet',
      'Presented weekly model performance reviews to the engineering leadership team, translating metrics into actionable product insights',
    ],
  },
  {
    company: 'Kova Research',
    role: 'NLP Research Intern',
    period: 'Jan 2024 - Apr 2024',
    type: 'Internship',
    bullets: [
      'Fine-tuned multilingual BERT models for low-resource African language sentiment analysis, achieving state-of-the-art F1 scores on Yoruba and Igbo benchmarks',
      'Built a named entity recognition pipeline for legal document processing, extracting structured data from 10,000+ unstructured contracts',
      'Implemented a retrieval-augmented generation prototype using FAISS and GPT-3.5 for internal knowledge base Q&A',
      'Authored a technical report on cross-lingual transfer learning strategies, contributing to the team\'s publication pipeline',
    ],
  },
  {
    company: 'DeepFrame Systems',
    role: 'Computer Vision Intern',
    period: 'Jul 2023 - Dec 2023',
    type: 'Internship',
    bullets: [
      'Trained YOLOv8 object detection models for real-time PPE compliance monitoring on construction sites, reaching 91% mAP',
      'Built a video analytics pipeline processing 30fps RTSP streams with OpenCV, performing frame sampling, tracking, and alert dispatch',
      'Developed a Grad-CAM++ visualisation tool for model interpretability, enabling safety officers to audit detection decisions',
      'Reduced model inference latency by 35% through TensorRT optimisation and INT8 quantisation on NVIDIA Jetson edge devices',
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
            AI/ML Developer and co-founder building production-grade machine learning systems,
            from clinical decision support to insurance scoring engines.
          </p>
        </div>

        {/* Work Experience */}
        <section className="section">
          <ScrollReveal>
            <span className="mono-label">§ 01 - Experience</span>
            <h2 style={{ marginBottom: '0.5rem' }}>Work Experience</h2>
            <p className="section-desc">
              Professional roles spanning enterprise AI, applied ML research, and domain-specific engineering.
            </p>
          </ScrollReveal>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {experience.map((job, i) => (
              <ScrollReveal key={job.company} delay={i * 100}>
                <div className="vol-card" style={{ position: 'relative' }}>
                  {/* Corner detail */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--gold)', background: 'var(--bg-box)',
                    border: '1px solid var(--border-dark)',
                    padding: '0.2rem 0.6rem',
                    transform: 'translate(-1px, -1px)',
                  }}>
                    {job.type}
                  </div>

                  <div className="role-header" style={{ marginTop: '1rem' }}>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
                        {job.company}
                      </h3>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {job.role}
                      </div>
                    </div>
                    <span className="role-tag">{job.period}</span>
                  </div>

                  <ul style={{ listStyle: 'none', marginTop: '0.5rem' }}>
                    {job.bullets.map((b, bi) => (
                      <li key={bi} style={{
                        color: 'var(--text-dim)', fontSize: '0.9rem',
                        padding: '0.35rem 0 0.35rem 1.4rem', position: 'relative',
                        borderBottom: bi < job.bullets.length - 1 ? '1px solid var(--border)' : 'none',
                        lineHeight: 1.7,
                      }}>
                        <span style={{ position: 'absolute', left: 0, color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', top: '0.6rem' }}>›</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="section">
          <ScrollReveal>
            <span className="mono-label">§ 02 - Skills</span>
            <h2 style={{ marginBottom: '0.5rem' }}>Technical Skills</h2>
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
              <span className="mono-label" style={{ marginBottom: '1rem' }}>Full Technical Stack</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {[
                  'Python', 'FastAPI', 'SQLAlchemy', 'Pydantic',
                  'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Transformers',
                  'Neo4j Aura', 'PostgreSQL', 'FAISS', 'Cypher',
                  'OpenCV', 'Grad-CAM++', 'YOLO',
                  'Docker', 'Vercel', 'Railway', 'Render',
                  'Hugging Face', 'PEFT', 'QLoRA', 'Accelerate',
                ].map(tag => (
                  <span
                    key={tag}
                    style={{
                      padding: '0.3rem 0.75rem',
                      border: '1px solid var(--border-dark)',
                      borderRadius: '0',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: '700',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      background: 'var(--surface)',
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
            <span className="mono-label">§ 03 - Community</span>
            <h2 style={{ marginBottom: '0.5rem' }}>Leadership & Volunteering</h2>
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
                  Organise and host technical training sessions for ML careers, engaging 100+ students
                  and mentoring upcoming AI developers through workshops and hands-on sessions.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="vol-card">
                <div className="role-header">
                  <h3>Babcock Tech Hub</h3>
                  <span className="role-tag">AI Technical Mentor</span>
                </div>
                <p>
                  Served as the primary AI technical mentor, guiding students through
                  hands-on machine learning projects covering computer vision, NLP, and
                  model deployment. Conducted weekly office hours and code reviews for
                  mentees building their first end-to-end ML pipelines.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Education */}
        <section className="section">
          <ScrollReveal>
            <span className="mono-label">§ 04 - Education</span>
            <h2 style={{ marginBottom: '0.5rem' }}>Education</h2>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="vol-card" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0,
                fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--gold)', background: 'var(--bg-box)',
                border: '1px solid var(--border-dark)',
                padding: '0.2rem 0.6rem',
                transform: 'translate(-1px, -1px)',
              }}>
                Degree
              </div>
              <div className="role-header" style={{ marginTop: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', letterSpacing: '-0.5px' }}>
                    Babcock University
                  </h3>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    B.Sc. Computer Science
                  </div>
                </div>
                <span className="role-tag">2022 - 2026</span>
              </div>
              <p>
                Specialising in artificial intelligence and machine learning. Active member of the
                Google Developer Group, leading technical initiatives and AI research projects
                that serve the wider university community.
              </p>
            </div>
          </ScrollReveal>
        </section>
      </div>
    </main>
  )
}
