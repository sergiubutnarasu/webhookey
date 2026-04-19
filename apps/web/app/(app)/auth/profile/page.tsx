"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "@/lib/api";
import { updateProfileSchema, updatePasswordSchema, type UpdateProfileFormData, type UpdatePasswordFormData } from "lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    setError: setProfileError,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: "" },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    setError: setPasswordError,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await createApiClient().getMe();
        setUser(userData);
        setProfileValue("name", userData.name);
      } catch (e: any) {
        router.push("/auth/login?returnTo=/auth/profile");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router, setProfileValue]);

  const onSubmitProfile = async (data: UpdateProfileFormData) => {
    try {
      setProfileSuccess(false);
      const updatedUser = await createApiClient().updateProfile(data.name);
      setUser(updatedUser);
      setProfileSuccess(true);
    } catch (e: any) {
      setProfileError("root", {
        message: e.message || "Failed to update profile",
      });
    }
  };

  const onSubmitPassword = async (data: UpdatePasswordFormData) => {
    try {
      setPasswordSuccess(false);
      await createApiClient().updatePassword(data.currentPassword, data.newPassword);
      resetPassword();
      setPasswordSuccess(true);
    } catch (e: any) {
      setPasswordError("root", {
        message: e.message || "Failed to update password",
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg">
        <p className="text-[#8a8f98] text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#f7f8f8] mb-8">Profile</h1>

      {/* Profile card */}
      <div className="bg-[#101111] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 mb-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#6a6b6c] mb-4">Profile Information</h2>
        {profileSuccess && (
          <div className="mb-4 p-3 bg-[rgba(16,185,129,0.15)] text-[#3ecf8e] rounded-md text-sm">
            Profile updated successfully!
          </div>
        )}
        {profileErrors.root && (
          <p className="text-sm text-[#ef4444] mb-4">
            {profileErrors.root.message}
          </p>
        )}
        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px] font-medium text-[#d0d6e0]">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-[rgba(255,255,255,0.03)]"
            />
            <p className="text-xs text-[#6a6b6c]">
              Email cannot be changed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[13px] font-medium text-[#d0d6e0]">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              {...registerProfile("name")}
              aria-invalid={profileErrors.name ? "true" : "false"}
            />
            {profileErrors.name && (
              <p className="text-sm text-[#ef4444]">{profileErrors.name.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 text-sm" disabled={isProfileSubmitting}>
            {isProfileSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>

      {/* Password card */}
      <div className="bg-[#101111] border border-[rgba(255,255,255,0.08)] rounded-lg p-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#6a6b6c] mb-4">Password</h2>
        {passwordSuccess && (
          <div className="mb-4 p-3 bg-[rgba(16,185,129,0.15)] text-[#3ecf8e] rounded-md text-sm">
            Password updated successfully!
          </div>
        )}
        {passwordErrors.root && (
          <p className="text-sm text-[#ef4444] mb-4">
            {passwordErrors.root.message}
          </p>
        )}
        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-[13px] font-medium text-[#d0d6e0]">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...registerPassword("currentPassword")}
              aria-invalid={passwordErrors.currentPassword ? "true" : "false"}
            />
            {passwordErrors.currentPassword && (
              <p className="text-sm text-[#ef4444]">{passwordErrors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-[13px] font-medium text-[#d0d6e0]">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...registerPassword("newPassword")}
              aria-invalid={passwordErrors.newPassword ? "true" : "false"}
            />
            {passwordErrors.newPassword && (
              <p className="text-sm text-[#ef4444]">{passwordErrors.newPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white h-9 text-sm" disabled={isPasswordSubmitting}>
            {isPasswordSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
