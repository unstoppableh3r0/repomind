 'use client'
 
 import { useEffect, useRef } from 'react'
 
 function canUseFinePointer() {
   if (typeof window === 'undefined') return false
   const fine = window.matchMedia?.('(pointer: fine)')?.matches
   const hover = window.matchMedia?.('(hover: hover)')?.matches
   return Boolean(fine && hover)
 }
 
 export default function CursorEffects() {
   const cursorRef = useRef<HTMLDivElement | null>(null)
 
   useEffect(() => {
     const root = document.documentElement
     const prefersReducedMotion =
       typeof window !== 'undefined' &&
       window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
 
     if (prefersReducedMotion) return
 
     // Only enable custom cursor on desktop-like pointers.
     if (!canUseFinePointer()) return
 
     root.classList.add('rm-custom-cursor')
 
     let raf = 0
     let lastX = window.innerWidth / 2
     let lastY = window.innerHeight / 3
     let hoveringInteractive = false
 
     const setVars = (x: number, y: number) => {
       root.style.setProperty('--cursor-x', `${x}px`)
       root.style.setProperty('--cursor-y', `${y}px`)
     }
 
     setVars(lastX, lastY)
 
     const computeInteractive = (target: EventTarget | null) => {
       if (!(target instanceof Element)) return false
       return Boolean(
         target.closest(
           'a,button,input,textarea,select,summary,[role="button"],[role="link"],[data-interactive="true"]',
         ),
       )
     }
 
     const applyInteractive = (next: boolean) => {
       if (hoveringInteractive === next) return
       hoveringInteractive = next
       if (next) root.classList.add('rm-cursor-interactive')
       else root.classList.remove('rm-cursor-interactive')
     }
 
     const onMove = (e: PointerEvent) => {
       lastX = e.clientX
       lastY = e.clientY
       applyInteractive(computeInteractive(e.target))
       if (raf) return
       raf = window.requestAnimationFrame(() => {
         raf = 0
         setVars(lastX, lastY)
         const el = cursorRef.current
         if (el) {
           el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`
         }
       })
     }
 
     const onDown = () => root.classList.add('rm-cursor-down')
     const onUp = () => root.classList.remove('rm-cursor-down')
     const onLeave = () => root.classList.add('rm-cursor-hidden')
     const onEnter = () => root.classList.remove('rm-cursor-hidden')
 
     window.addEventListener('pointermove', onMove, { passive: true })
     window.addEventListener('pointerdown', onDown, { passive: true })
     window.addEventListener('pointerup', onUp, { passive: true })
     window.addEventListener('blur', onLeave)
     window.addEventListener('focus', onEnter)
     document.addEventListener('mouseleave', onLeave)
     document.addEventListener('mouseenter', onEnter)
 
     return () => {
       window.removeEventListener('pointermove', onMove)
       window.removeEventListener('pointerdown', onDown)
       window.removeEventListener('pointerup', onUp)
       window.removeEventListener('blur', onLeave)
       window.removeEventListener('focus', onEnter)
       document.removeEventListener('mouseleave', onLeave)
       document.removeEventListener('mouseenter', onEnter)
       root.classList.remove(
         'rm-custom-cursor',
         'rm-cursor-interactive',
         'rm-cursor-down',
         'rm-cursor-hidden',
       )
       if (raf) window.cancelAnimationFrame(raf)
     }
   }, [])
 
   return (
     <>
       <div aria-hidden="true" className="rm-spotlight" />
       <div aria-hidden="true" ref={cursorRef} className="rm-cursor" />
     </>
   )
 }
