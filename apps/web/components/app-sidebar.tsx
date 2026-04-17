"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Radio } from "lucide-react"
import { Separator } from "@/components/ui/separator"
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r glass-sidebar flex flex-col">
      {/* Branding */}
      <div className="flex h-14 items-center gap-2.5 px-5 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo">
          <Radio className="h-4 w-4 text-accent-indigo-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Webhookey</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-clean accent-bar-left",
                isActive
                  ? "bg-accent text-foreground active"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="px-3 pb-4">
        <Separator className="mb-3" />
        <UserMenu />
      </div>
    </aside>
  )
}
