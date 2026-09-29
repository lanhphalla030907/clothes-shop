import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export interface DragScrollProps {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void
  onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void
}

export interface DragScroll {
  ref: React.RefObject<HTMLDivElement | null>
  props: DragScrollProps
  /** True once the pointer has travelled far enough to count as a drag. */
  isDragging: () => boolean
  /** Nudge the rail by roughly one screenful, for the arrow controls. */
  scrollByPage: (direction: 1 | -1) => void
}

/** Scrolls to whichever child card sits closest to the current position. */
const settleOnNearestCard = (el: HTMLDivElement) => {
  const cards = Array.from(el.children) as HTMLElement[]
  if (!cards.length) return

  const target = cards.reduce((best, card) => {
    const distance = Math.abs(card.offsetLeft - el.scrollLeft)
    return distance < best.distance ? { distance, left: card.offsetLeft } : best
  }, { distance: Number.POSITIVE_INFINITY, left: el.scrollLeft })

  if (Math.abs(target.left - el.scrollLeft) < 1) return
  el.scrollTo({ left: target.left, behavior: 'smooth' })
}

/**
 * Turns a horizontally scrollable element into a drag-to-scroll surface.
 *
 * Touch and pen keep their native momentum scrolling, so only a mouse press
 * becomes a drag and cards stay clickable.
 *
 * Deliberately no CSS `scroll-snap` and no pointer capture. Snapping fights
 * programmatic scrolling — Chrome pins the rail at its snap point and the
 * drag never moves it — and capturing the pointer drops the later moves and
 * the matching `pointerup`. Instead the rail settles onto the nearest card
 * programmatically once the drag ends.
 */
export const useDragScroll = (): DragScroll => {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 })

  const isDragging = () => state.current.moved > 4

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (event.pointerType !== 'mouse' || event.button !== 0 || !el) return

    state.current = { active: true, startX: event.clientX, startScroll: el.scrollLeft, moved: 0 }
    el.dataset.dragging = 'true'
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el || !state.current.active) return

    const delta = event.clientX - state.current.startX
    state.current.moved = Math.max(state.current.moved, Math.abs(delta))
    el.scrollLeft = state.current.startScroll - delta
  }

  const endDrag = () => {
    const el = ref.current
    if (!el || !state.current.active) return

    state.current.active = false
    delete el.dataset.dragging
    if (state.current.moved > 4) settleOnNearestCard(el)
  }

  /** Swallow the click that ends a drag so it never opens a product. */
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isDragging()) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const scrollByPage = (direction: 1 | -1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return {
    ref,
    isDragging,
    scrollByPage,
    props: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  }
}
