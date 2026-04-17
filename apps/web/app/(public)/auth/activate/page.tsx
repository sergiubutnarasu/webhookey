"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "lib/api";
import { activateDeviceSchema, type ActivateDeviceFormData } from "lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="shadow-elevated">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center">Activate Device</CardTitle>
        <CardDescription className="text-center">
          Enter the device code shown on your CLI to approve it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errors.root && (
          <p className="text-destructive text-sm mb-4 text-center">
            {errors.root.message}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userCode">Device Code</Label>
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
              <p className="text-destructive text-sm">{errors.userCode.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Activating..." : "Activate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateForm />
    </Suspense>
  );
}
