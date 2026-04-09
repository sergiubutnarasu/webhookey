"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createApiClient } from "lib/api";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await createApiClient().signup(email, password, name);
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Signup failed");
    }
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<{ value: string }>) =>
              setName(e.target.value)
            }
            className="border p-2 w-full rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<{ value: string }>) =>
              setEmail(e.target.value)
            }
            className="border p-2 w-full rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<{ value: string }>) =>
              setPassword(e.target.value)
            }
            className="border p-2 w-full rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        >
          Sign Up
        </button>
      </form>
      <p className="mt-4 text-center">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-blue-500">
          Login
        </Link>
      </p>
    </main>
  );
}
