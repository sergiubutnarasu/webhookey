"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "lib/api";
import { updateProfileSchema, updatePasswordSchema, type UpdateProfileFormData, type UpdatePasswordFormData } from "lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Profile form
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

  // Password form
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
    // Load user data
    const loadUser = async () => {
      try {
        const userData = await createApiClient().getMe();
        setUser(userData);
        setProfileValue("name", userData.name);
      } catch (e: any) {
        // Not authenticated, redirect to login
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
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Profile Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-sm">
                Profile updated successfully!
              </div>
            )}
            {profileErrors.root && (
              <p className="text-destructive text-sm mb-4 text-center">
                {profileErrors.root.message}
              </p>
            )}
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  {...registerProfile("name")}
                  aria-invalid={profileErrors.name ? "true" : "false"}
                />
                {profileErrors.name && (
                  <p className="text-destructive text-sm">{profileErrors.name.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isProfileSubmitting}>
                {isProfileSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </section>

          {/* Divider */}
          <div className="border-t" />

          {/* Password Section */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-sm">
                Password updated successfully!
              </div>
            )}
            {passwordErrors.root && (
              <p className="text-destructive text-sm mb-4 text-center">
                {passwordErrors.root.message}
              </p>
            )}
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...registerPassword("currentPassword")}
                  aria-invalid={passwordErrors.currentPassword ? "true" : "false"}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-destructive text-sm">{passwordErrors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerPassword("newPassword")}
                  aria-invalid={passwordErrors.newPassword ? "true" : "false"}
                />
                {passwordErrors.newPassword && (
                  <p className="text-destructive text-sm">{passwordErrors.newPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
