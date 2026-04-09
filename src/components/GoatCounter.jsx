import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function GoatCounter() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window.goatcounter?.count === 'function') {
      window.goatcounter.count({
        path: location.pathname + location.search,
        title: document.title,
      })
    }
  }, [location])

  return null
}
