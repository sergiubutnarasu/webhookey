"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "lib/api";
import { activateDeviceSchema, type ActivateDeviceFormData } from "lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function ActivateForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ActivateDeviceFormData>({
    resolver: zodResolver(activateDeviceSchema),
    defaultValues: {
      userCode: "",
    },
  });

  useEffect(() => {
    async function checkSession() {
      try {
        await createApiClient().getMe();
      } catch (e) {
        router.push("/auth/login?returnTo=/auth/activate");
      }
    }
    checkSession();
  }, [router]);

  const onSubmit = async (data: ActivateDeviceFormData) => {
    try {
      const result = await createApiClient().activateDevice(data.userCode);
      if (result.approved) {
        router.push("/");
      } else {
        setError("root", {
          message: "Failed to activate device",
        });
      }
    } catch (e: any) {
      setError("root", {
        message: e.message || "An error occurred",
      });
    }
  };

  return (
    <div className="bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-lg p-8">
      <h1 className="text-lg font-semibold text-[#f7f8f8] text-center mb-2">Activate Device</h1>
      <p className="text-sm text-[#8a8f98] text-center mb-6">
        Enter the device code shown on your CLI to approve it.
      </p>
      {errors.root && (
        <p className="text-sm text-[#ef4444] mb-4 text-center">
          {errors.root.message}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userCode" className="text-[13px] font-medium text-[#d0d6e0]">Device Code</Label>
          <Input
            id="userCode"
            type="text"
            placeholder="XXXX-XXXX"
            className="font-mono uppercase"
            {...register("userCode", {
              onChange: (e) => {
                const value = e.target.value.toUpperCase();
                e.target.value = value;
              },
            })}
            aria-invalid={errors.userCode ? "true" : "false"}
          />
          {errors.userCode && (
            <p className="text-sm text-[#ef4444]">{errors.userCode.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 text-sm" disabled={isSubmitting}>
          {isSubmitting ? "Activating..." : "Activate"}
        </Button>
      </form>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateForm />
    </Suspense>
  );
}
