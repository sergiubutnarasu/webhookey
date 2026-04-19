"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogOut, Settings } from "lucide-react"
import { createApiClient } from "@/lib/api"
import { logout } from "@/app/auth/logout/actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserProfile {
  id: string
  email: string
  name: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function UserMenu() {
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    createApiClient()
      .getMe()
      .then(setUser)
      .catch(() => {
        // Silently fail - user will see fallback avatar
      })
  }, [])

  const initials = user ? getInitials(user.name) : "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm hover:bg-[rgba(255,255,255,0.05)] transition-[background] duration-150 focus:outline-none">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-[rgba(99,102,241,0.15)] text-[#818cf8] text-[11px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="text-sm font-medium text-[#f7f8f8] truncate w-full">
              {user?.name || "Loading..."}
            </span>
            <span className="text-xs text-[#6a6b6c] truncate w-full">
              {user?.email || ""}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-[#1b1c1e] border-[rgba(255,255,255,0.08)]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-[#f7f8f8]">{user?.name}</p>
            <p className="text-xs text-[#6a6b6c]">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/profile" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-[#ef4444] focus:text-[#ef4444] cursor-pointer"
          onSelect={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
