import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogCtx {
  open: boolean
  setOpen: (v: boolean) => void
}

const Ctx = createContext<DialogCtx>({ open: false, setOpen: () => {} })

function Dialog({ open: controlledOpen, onOpenChange, children }: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  children: ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = useCallback((v: boolean) => {
    setInternalOpen(v)
    onOpenChange?.(v)
  }, [onOpenChange])

  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}

function DialogTrigger({ children, asChild, ...props }: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = useContext(Ctx)
  if (asChild) return <span onClick={() => setOpen(true)} {...(props as HTMLAttributes<HTMLSpanElement>)}>{children}</span>
  return <button onClick={() => setOpen(true)} {...props}>{children}</button>
}

function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useContext(Ctx)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={() => setOpen(false)} />
      <div className={cn(
        'relative z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}>
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}

function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription }
