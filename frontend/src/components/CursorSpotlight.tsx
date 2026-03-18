 'use client'
 
 import { useEffect } from 'react'
 
 export default function CursorSpotlight() {
   useEffect(() => {
     const root = document.documentElement
     const prefersReducedMotion =
       typeof window !== 'undefined' &&
       window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
 
     if (prefersReducedMotion) return
 
     let raf = 0
     let lastX = window.innerWidth / 2
     let lastY = window.innerHeight / 3
 
     const setVars = (x: number, y: number) => {
       root.style.setProperty('--cursor-x', `${x}px`)
       root.style.setProperty('--cursor-y', `${y}px`)
     }
 
     setVars(lastX, lastY)
 
     const onMove = (e: PointerEvent) => {
       lastX = e.clientX
       lastY = e.clientY
       if (raf) return
       raf = window.requestAnimationFrame(() => {
         raf = 0
         setVars(lastX, lastY)
       })
     }
 
     window.addEventListener('pointermove', onMove, { passive: true })
     return () => {
       window.removeEventListener('pointermove', onMove)
       if (raf) window.cancelAnimationFrame(raf)
     }
   }, [])
 
   return null
 }
