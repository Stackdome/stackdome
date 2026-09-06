import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5

/** How long the exit animation runs, after which the toast leaves the store. */
const TOAST_REMOVE_DELAY = 250

/**
 * **A toast dismisses itself, and how long it stays is a function of how much
 * there is to read.**
 *
 * A fixed number is wrong at both ends: "Secret created" holds the screen long
 * after it has been read, and a sentence naming three affected stacks is gone
 * before it has. The reading-time guideline behind WCAG 2.2.1's discussion of
 * notifications is **~1 second per three words over a 3 second base**, and that
 * is what this is, clamped so nothing flashes and nothing squats.
 *
 * The clamp matters more than the formula. 4s is about the floor at which a
 * message registers at all; past 10s a toast has stopped reporting and started
 * sitting there.
 */
const MIN_DURATION = 4_000
const MAX_DURATION = 10_000

function wordCount(node: React.ReactNode): number {
  // Only a string can be counted. Anything else keeps its own counsel, and the
  // base time covers it.
  return typeof node === "string" ? node.trim().split(/\s+/).filter(Boolean).length : 0
}

export function readingDuration(title?: React.ReactNode, description?: React.ReactNode): number {
  const words = wordCount(title) + wordCount(description)
  const ms = 3_000 + (words / 3) * 1_000
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(ms)))
}

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function generateId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action

      // Closing only marks it closed, so the exit animation can run. Queue the
      // removal too, or the store keeps every toast ever raised and the
      // `TOAST_LIMIT` slice starts evicting live toasts to make room for dead
      // ones.
      if (toastId === undefined) {
        state.toasts.forEach((t) => queueRemoval(t.id))
        return {
          ...state,
          toasts: state.toasts.map((t) => ({
            ...t,
            open: false,
          })),
        }
      }

      queueRemoval(toastId)
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        ),
      }
    }

    case actionTypes.REMOVE_TOAST: {
      const { toastId } = action

      // Remove all toasts if toastId is not provided
      if (toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }

      // Remove specific toast if toastId is provided
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      }
    }
  }
}

/** One pending removal per toast, so a double dismiss cannot stack timers. */
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()

function queueRemoval(toastId: string) {
  if (removalTimers.has(toastId)) return
  removalTimers.set(
    toastId,
    setTimeout(() => {
      removalTimers.delete(toastId)
      dispatch({ type: actionTypes.REMOVE_TOAST, toastId })
    }, TOAST_REMOVE_DELAY),
  )
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = generateId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    })

  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      /**
       * **A toast carrying an action never times out.** The clock is there to
       * clear a message that has been read; a control has to be *found* and
       * *pressed*, and a timer racing the pointer is the failure WCAG 2.2.1 is
       * about. A caller that hands the toast something to do has said the user
       * still has a move to make, so the toast waits.
       *
       * An explicit `duration` from the caller still wins over both.
       */
      duration: props.duration ?? (props.action ? Infinity : readingDuration(props.title, props.description)),
      // Radix runs the clock and pauses it on hover, focus and window blur,
      // then calls this — which routes into `DISMISS_TOAST` and queues removal.
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  }
}

export { useToast, toast }
