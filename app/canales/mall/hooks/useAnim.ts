'use client'

import { RefObject, useEffect, useState } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useAnim(ref: RefObject<Element | null>): boolean {
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setOn(true)
      return
    }
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])

  return on
}
