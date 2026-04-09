"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "lib/api";

export default function ActivatePage() {
  const router = useRouter();
  const [userCode, setUserCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

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

    try {
      const data = await createApiClient().activateDevice(userCode);
      if (data.approved) {
        router.push("/");
      } else {
        setError("Failed to activate device");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    }
  }

  if (checkingSession) {
    return (
      <main className="p-8 max-w-md mx-auto">
        <p>Checking session...</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Activate Device</h1>
      <p className="text-gray-600 mb-4">
        Enter the device code shown on your CLI to approve it.
      </p>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Device Code</label>
          <input
            type="text"
            value={userCode}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUserCode(e.target.value.toUpperCase())
            }
            className="border p-2 w-full rounded font-mono"
            placeholder="XXXX-XXXX"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          Activate
        </button>
      </form>
    </main>
  );
}
