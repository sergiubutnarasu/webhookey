import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <AppSidebar />

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-4 border-b border-[rgba(255,255,255,0.05)] bg-[#08090a]/95 backdrop-blur px-4 md:hidden">
        <MobileNav />
        <span className="text-sm font-semibold tracking-tight text-[#f7f8f8]">Webhookey</span>
      </header>

      {/* Main content area */}
      <main className="md:pl-60">
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
