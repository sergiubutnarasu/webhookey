"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "lib/api";
import { signupSchema, type SignupFormData } from "lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      await createApiClient().signup(data.email, data.password, data.name);
      router.push("/");
    } catch (e: any) {
      setError("root", {
        message: e.message || "Signup failed",
      });
    }
  };

  return (
    <div className="bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-lg p-8">
      <h1 className="text-lg font-semibold text-[#f7f8f8] text-center mb-6">Create an account</h1>
      {errors.root && (
        <p className="text-sm text-[#ef4444] mb-4 text-center">
          {errors.root.message}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[13px] font-medium text-[#d0d6e0]">Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register("name")}
            aria-invalid={errors.name ? "true" : "false"}
          />
          {errors.name && (
            <p className="text-sm text-[#ef4444]">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-medium text-[#d0d6e0]">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            aria-invalid={errors.email ? "true" : "false"}
          />
          {errors.email && (
            <p className="text-sm text-[#ef4444]">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[13px] font-medium text-[#d0d6e0]">Password</Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            aria-invalid={errors.password ? "true" : "false"}
          />
          {errors.password && (
            <p className="text-sm text-[#ef4444]">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 text-sm" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#8a8f98]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#818cf8] hover:text-[#6366f1] transition-[color] duration-150">
          Sign in
        </Link>
      </p>
    </div>
  );
}
