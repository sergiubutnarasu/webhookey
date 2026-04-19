"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Radio } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { cn } from "@/lib/utils"

const navItems = [
  {
    label: "Channels",
    href: "/",
    icon: Radio,
    matchExact: true,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 hidden md:flex flex-col bg-[#08090a] border-r border-[rgba(255,255,255,0.05)]">
      {/* Branding */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6366f1]">
          <Radio className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-[#f7f8f8]">Webhookey</span>
      </div>

      {/* Navigation — whisper hover, active bg tint */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.matchExact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal text-[#8a8f98] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#d0d6e0] transition-[background,color] duration-150",
                isActive && "bg-[rgba(255,255,255,0.08)] text-[#f7f8f8] font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section with separator */}
      <div className="px-3 pb-4">
        <div className="h-px bg-[rgba(255,255,255,0.05)] mb-3" />
        <UserMenu />
      </div>
    </aside>
  )
}
