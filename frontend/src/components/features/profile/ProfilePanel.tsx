// src/components/features/profile/ProfilePanel.tsx
"use client";

import React from "react";
import { useEditProfile } from "@/hooks/useEditProfile";
import { useChangePassword } from "@/hooks/useChangePassword";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";

// Liga os hooks de perfil e de senha aos dois formulários da página /profile
export function ProfilePanel() {
  const { profile, saveProfile, isSaving, successMessage, error } = useEditProfile();
  const password = useChangePassword();

  return (
    <div className="w-full space-y-8">
      <section className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Dados do perfil</h2>
        <ProfileForm
          name={profile.name}
          email={profile.email}
          photoUrl={profile.profilePictureUrl}
          isSaving={isSaving}
          successMessage={successMessage}
          error={error}
          onSubmit={saveProfile}
        />
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Alterar senha</h2>
        <ChangePasswordForm
          isSubmitting={password.isSubmitting}
          successMessage={password.successMessage}
          error={password.error}
          onSubmit={password.changePassword}
        />
      </section>
    </div>
  );
}
