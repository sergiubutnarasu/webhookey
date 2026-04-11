"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ActivatePage() {
  const router = useRouter();
  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        await createApiClient().getMe();
        setCheckingSession(false);
      } catch (e) {
        router.push("/auth/login?returnTo=/auth/activate");
      }
    }
    checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await createApiClient().activateDevice(userCode);
      if (data.approved) {
        router.push("/");
      } else {
        setError("Failed to activate device");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Checking session...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">Activate Device</CardTitle>
          <CardDescription className="text-center">
            Enter the device code shown on your CLI to approve it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive text-sm mb-4 text-center">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm mb-4 text-center">{success}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceCode">Device Code</Label>
              <Input
                id="deviceCode"
                type="text"
                value={userCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUserCode(e.target.value.toUpperCase())
                }
                className="font-mono"
                placeholder="XXXX-XXXX"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Activating..." : "Activate"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
