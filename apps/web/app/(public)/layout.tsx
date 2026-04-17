import { Radio } from "lucide-react"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 public-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-indigo">
            <Radio className="h-4.5 w-4.5 text-accent-indigo-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Webhookey</span>
        </div>
        {children}
      </div>
    </main>
  )
}
