import { useEffect } from "react"

interface ScrollSnapshot {
  body: Partial<CSSStyleDeclaration>
  rootOverflow: string
  scrollY: number
}

let lockCount = 0
let snapshot: ScrollSnapshot | null = null

function acquireScrollLock() {
  if (typeof document === "undefined") return () => {}

  lockCount += 1
  if (lockCount === 1) {
    const body = document.body
    const root = document.documentElement
    snapshot = {
      body: {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      },
      rootOverflow: root.style.overflow,
      scrollY: window.scrollY,
    }
    const scrollbarWidth = window.innerWidth - root.clientWidth
    body.style.position = "fixed"
    body.style.top = `-${snapshot.scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    body.style.overflow = "hidden"
    root.style.overflow = "hidden"
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
    window.dispatchEvent(new Event("sesi:travar-scroll"))
  }

  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount > 0 || !snapshot) return

    const { body, rootOverflow, scrollY } = snapshot
    const element = document.body
    element.style.position = body.position ?? ""
    element.style.top = body.top ?? ""
    element.style.left = body.left ?? ""
    element.style.right = body.right ?? ""
    element.style.width = body.width ?? ""
    element.style.overflow = body.overflow ?? ""
    element.style.paddingRight = body.paddingRight ?? ""
    document.documentElement.style.overflow = rootOverflow
    snapshot = null
    window.scrollTo(0, scrollY)
    window.dispatchEvent(new Event("sesi:liberar-scroll"))
  }
}

export function useBodyScrollLock(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    return acquireScrollLock()
  }, [ativo])
}
