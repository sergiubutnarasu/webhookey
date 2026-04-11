"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "lib/api";
import { createChannelSchema, type CreateChannelFormData } from "lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      router.refresh();
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
      const channel = await createApiClient().createChannel(
        data.name,
        data.generateSecret ?? true,
        data.retentionDays,
      );

      if (!channel.secret && channel.id) {
        router.refresh();
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
    <main className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-pastel"
        >
          ← Back to channels
        </Link>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="p-6">
          <CardTitle className="text-xl font-semibold tracking-tight">
            New Channel
          </CardTitle>
          <CardDescription>
            Create a new webhook channel to receive events.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {errors.root && (
            <p className="text-sm text-destructive mb-4">
              {errors.root.message}
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Channel"
                {...register("name")}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="retentionDays">Retention days (optional)</Label>
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
                <p className="text-sm text-destructive">
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
                className="text-sm font-normal cursor-pointer"
              >
                Disable secret generation
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Channel"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!createdChannel?.secret}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Channel Created</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-red-500 font-medium">
                Save your secret — it won't be shown again!
              </p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
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
    </main>
  );
}
