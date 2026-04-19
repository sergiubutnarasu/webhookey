import { Radio } from "lucide-react"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-[#08090a] public-bg-dark">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#6366f1]">
            <Radio className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-[#f7f8f8]">Webhookey</span>
        </div>
        {children}
      </div>
    </main>
  )
}
