import { createContext, useContext, useState, type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const TabsCtx = createContext<{ value: string; setValue: (v: string) => void }>({ value: '', setValue: () => {} })

function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  children: ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(defaultValue ?? '')
  const value = controlledValue ?? internal
  const setValue = (v: string) => { setInternal(v); onValueChange?.(v) }

  return (
    <TabsCtx.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  )
}

function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ value, className, ...props }: HTMLAttributes<HTMLButtonElement> & { value: string }) {
  const { value: current, setValue } = useContext(TabsCtx)
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        current === value && 'bg-background text-foreground shadow-sm',
        className
      )}
      onClick={() => setValue(value)}
      {...props}
    />
  )
}

function TabsContent({ value, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value: current } = useContext(TabsCtx)
  if (current !== value) return null
  return <div className={cn('mt-2', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
