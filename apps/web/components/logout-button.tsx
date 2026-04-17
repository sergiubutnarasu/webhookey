"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/auth/logout/actions";

export function LogoutButton(): JSX.Element {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" size="sm" className="gap-2">
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </form>
  );
}
