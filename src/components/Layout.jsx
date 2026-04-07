import { useState, useEffect } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [location])

  // Update page title based on route
  useEffect(() => {
    const titles = {
      '/': 'Timilehin Adedayo | AI/ML Developer',
      '/about': 'About | Timilehin Adedayo',
      '/projects': 'Projects | Timilehin Adedayo',
      '/certifications': 'Certifications | Timilehin Adedayo',
      '/contact': 'Contact | Timilehin Adedayo',
      '/game': 'Neural Snake AI | Timilehin Adedayo',
    }
    document.title = titles[location.pathname] || 'Timilehin Adedayo'
  }, [location])

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="header-inner">
            <Link to="/" className="logo">
              T<span>IMILEHIN</span>
            </Link>

            <button
              className={`menu-toggle ${menuOpen ? 'open' : ''}`}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen(o => !o)}
            >
              <span /><span /><span />
            </button>

            <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
              <li><NavLink to="/" end>Home</NavLink></li>
              <li><NavLink to="/about">About</NavLink></li>
              <li><NavLink to="/projects">Projects</NavLink></li>
              <li><NavLink to="/certifications">Certs</NavLink></li>
              <li><NavLink to="/contact">Contact</NavLink></li>
              <li><NavLink to="/game">Game</NavLink></li>
              <li>
                <a
                  href="/cv/Timilehin Adedayo - CV.pdf"
                  download
                  className="btn-cv"
                >
                  Resume
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="container">
          <p>
            &copy; 2026 Timilehin Adedayo &mdash;{' '}
            <a href="https://timilehinadedayo.dev" target="_blank" rel="noreferrer">
              timilehinadedayo.dev
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
