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
        <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-clean hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent-indigo focus:ring-offset-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent-indigo text-accent-indigo-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="text-sm font-medium truncate w-full">
              {user?.name || "Loading..."}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full">
              {user?.email || ""}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
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
          className="text-destructive focus:text-destructive cursor-pointer"
          onSelect={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
