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

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-clean md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo">
              <Radio className="h-4 w-4 text-accent-indigo-foreground" />
            </div>
            Webhookey
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
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
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-4">
          <Separator className="mb-3" />
          <UserMenu />
        </div>
      </SheetContent>
    </Sheet>
  )
}
