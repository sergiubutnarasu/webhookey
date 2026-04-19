"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createChannelAction } from "./actions";
import { createChannelSchema, type CreateChannelFormData } from "lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

export default function NewChannelPage() {
  const router = useRouter();
  const [createdChannel, setCreatedChannel] = useState<null | {
    id: string;
    secret: string;
    name: string;
  }>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateChannelFormData>({
    resolver: zodResolver(createChannelSchema),
    defaultValues: {
      name: "",
      generateSecret: true,
      retentionDays: undefined,
    },
  });

  const disableSecret = watch("generateSecret") === false;

  const handleCloseModal = () => {
    if (createdChannel) {
      router.push(`/channels/${createdChannel.id}`);
    }
  };

  const copySecret = () => {
    if (createdChannel?.secret) {
      navigator.clipboard.writeText(createdChannel.secret);
    }
  };

  const onSubmit = async (data: CreateChannelFormData) => {
    try {
      const channel = await createChannelAction(
        data.name,
        data.generateSecret ?? true,
        data.retentionDays,
      );

      if (!channel.secret && channel.id) {
        router.push(`/channels/${channel.id}`);
        return;
      }

      setCreatedChannel({
        id: channel.id,
        secret: channel.secret,
        name: channel.name,
      });
    } catch (e: any) {
      setError("root", {
        message: e.message || "Failed to create channel",
      });
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#f7f8f8] mb-1">New Channel</h1>
      <p className="text-sm text-[#8a8f98] mb-8">Create a webhook endpoint to receive events.</p>

      <div className="space-y-6">
        {errors.root && (
          <p className="text-sm text-[#ef4444]">
            {errors.root.message}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[13px] font-medium text-[#d0d6e0]">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="My Channel"
              {...register("name")}
              aria-invalid={errors.name ? "true" : "false"}
            />
            {errors.name && (
              <p className="text-sm text-[#ef4444]">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retentionDays" className="text-[13px] font-medium text-[#d0d6e0]">Retention days (optional)</Label>
            <Input
              id="retentionDays"
              type="number"
              placeholder="Leave empty for no expiration"
              {...register("retentionDays", {
                setValueAs: (v: string) =>
                  v === "" ? undefined : Number(v),
              })}
              aria-invalid={errors.retentionDays ? "true" : "false"}
            />
            {errors.retentionDays && (
              <p className="text-sm text-[#ef4444]">
                {errors.retentionDays.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="disableSecret"
              checked={disableSecret}
              onCheckedChange={(checked) => {
                register("generateSecret").onChange({
                  target: { name: "generateSecret", value: !checked },
                });
              }}
            />
            <Label
              htmlFor="disableSecret"
              className="text-sm font-normal text-[#8a8f98] cursor-pointer"
            >
              Disable secret generation
            </Label>
          </div>

          <Button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 text-sm" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Channel"}
          </Button>
        </form>
      </div>

      <AlertDialog
        open={!!createdChannel?.secret}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Channel Created</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-[#ef4444] font-medium">
                Save your secret &mdash; it won&apos;t be shown again!
              </p>
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] p-3 rounded-md font-mono text-sm break-all text-[#f7f8f8]">
                {createdChannel?.secret}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" onClick={copySecret}>
              Copy Secret
            </Button>
            <AlertDialogAction onClick={handleCloseModal}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
