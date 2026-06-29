export const projects = [
  {
    slug: 'brain',
    tag: 'Computer Vision',
    tagClass: 'project-thumb-cv',
    icon: 'visibility',
    title: 'BRAIN | Breast Retrieval-Augmented Intelligence Network',
    short: 'Explainable AI diagnostic system for breast cancer detection using a Swin Transformer backbone, achieving 98.99% accuracy.',
    subtitle: 'Breast Retrieval-Augmented Intelligence Network | Developed at CortexAI',
    links: [
      { label: 'Hugging Face', href: 'https://huggingface.co/santacl/brain/tree/main', external: true }
    ],
    overview: `BRAIN is an explainable AI diagnostic system for breast cancer detection using a Swin Transformer (Swin-B) backbone, achieving 98.99% accuracy on a 4,916-image test set. The system features a retrieval-augmented verification module to cross-check predictions against a 24,000+ image knowledge base.`,
    highlights: [
      'Designed an explainable AI diagnostic system for breast cancer detection using Swin-B, achieving 98.99% accuracy on a 4,916-image test set',
      'Built a retrieval-augmented verification module using FAISS to cross-check predictions against a 24,000+ image knowledge base',
      'In partnership discussions with University College Hospital (UCH) Ibadan to pilot the system in a clinical research setting (pending)',
      'Used Grad-CAM++ and Attention Rollout to generate visual heatmaps of pathological features for transparent decision support'
    ],
    stack: ['Python', 'PyTorch', 'FAISS', 'FastAPI', 'React', 'Grad-CAM++'],
    role: 'Founder & Lead AI Consultant',
    status: 'Research / Pending Pilot'
  },
  {
    slug: 'knowledge-graph',
    tag: 'RAG & Neo4j',
    tagClass: 'project-thumb-rag',
    icon: 'database',
    title: 'gdg-bu-kg | Enterprise RAG Platform',
    short: 'Production-grade RAG platform integrating LLMs with a Neo4j Knowledge Graph of 10,000+ entities.',
    subtitle: 'Enterprise RAG Platform for Academic Data | GDG Babcock',
    links: [
      { label: 'PyPI SDK', href: 'https://pypi.org/project/gdg-bu-kg/', external: true }
    ],
    overview: `Engineered a RAG platform integrating LLMs with a Neo4j Knowledge Graph (10,000+ academic entities) for high-precision data retrieval. Also published gdg-bu-kg, a Python SDK with hybrid JWT authentication, reducing query latency by ~500ms.`,
    highlights: [
      'Engineered a RAG platform integrating LLMs with a Neo4j Knowledge Graph (10,000+ academic entities) for high-precision data retrieval',
      'Published gdg-bu-kg, a Python SDK with hybrid JWT authentication, reducing query latency by ~500ms'
    ],
    stack: ['Neo4j Aura', 'FastAPI', 'React', 'Pydantic v2', 'SQLAlchemy 2.0', 'PostgreSQL'],
    role: 'Lead Engineer',
    status: 'Production'
  },
  {
    slug: 'yami',
    tag: 'Fintech & ML',
    tagClass: 'project-thumb-nlp',
    icon: 'payments',
    title: 'Yami | P2P Student Lending Platform',
    short: 'P2P student lending platform with automated trust scoring and adaptive loan structuring microservices.',
    subtitle: 'Hackathon Finalist, Paystack-Sponsored Ideathon',
    links: [],
    overview: `Yami is a P2P student lending platform built for a Paystack-sponsored ideathon, where it reached the finalist stage. It features end-to-end product architecture across 13 subsystems and custom ML models for trust scoring and fraud prediction.`,
    highlights: [
      'Defined end-to-end product architecture across 13 subsystems including trust scoring, lending marketplace, dispute resolution, AI copilot, and fraud detection',
      'Built a Python/FastAPI AI microservice for repayment prediction, adaptive loan structuring, and fraud scoring using behavioral signals',
      'Reached the finalist stage at a Paystack-sponsored ideathon; presented the trust score model as a behavioral credit infrastructure layer for Nigerian university students'
    ],
    stack: ['FastAPI', 'Python', 'React', 'PostgreSQL', 'Scikit-Learn'],
    role: 'Lead Developer & Architect',
    status: 'Hackathon Finalist'
  },
  {
    slug: 'dolphin-llm',
    tag: 'LLM Fine-tuning',
    tagClass: 'project-thumb-llm',
    icon: 'psychology',
    title: 'Dolphin LLM | Memory-Efficient AI Alignment',
    short: 'Safety alignment research involving PEFT fine-tuning (LoRA) to study alignment drift and safety guardrails.',
    subtitle: 'Memory-Efficient AI Alignment Research | Independent Study',
    links: [],
    overview: `Performed memory-efficient fine-tuning (LoRA/PEFT) on an open-source LLM to study how alignment objectives and guardrail behavior shift under different training configurations.`,
    highlights: [
      'Performed memory-efficient fine-tuning (LoRA/PEFT) on an open-source LLM to study how alignment objectives and guardrail behavior shift under different training configurations',
      'Documented findings on instruction-following, honesty, and directness trade-offs as part of independent AI safety coursework'
    ],
    stack: ['Python', 'PyTorch', 'Hugging Face PEFT', 'Transformers', 'Accelerate'],
    role: 'Independent Researcher',
    status: 'Completed Research'
  }
]
