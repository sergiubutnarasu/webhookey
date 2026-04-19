"use client"

import { useState } from "react"
import { Menu, Radio } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-md p-2 text-[#8a8f98] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f7f8f8] transition-[background,color] duration-150 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-[#08090a]">
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#6366f1]">
              <Radio className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#f7f8f8]">Webhookey</span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation — whisper hover, active bg tint */}
        <nav className="px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.matchExact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-4">
          <div className="h-px bg-[rgba(255,255,255,0.05)] mb-3" />
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  )
}
