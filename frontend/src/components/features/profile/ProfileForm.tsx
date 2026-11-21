// src/components/features/profile/ProfileForm.tsx
"use client";

import React, { useState } from "react";
import { LoginButton } from "@/components/ui/LoginButton";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";

interface ProfileFormProps {
  name: string;
  email: string;
  photoUrl?: string | null;
  isSaving?: boolean;
  successMessage: string | null;
  error: string | null;
  onSubmit: (values: { name: string; photo: File | null }) => Promise<void>;
}

const inputClassName =
  "w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#757DC3] text-black placeholder-gray-500 disabled:opacity-60";

// Dados cadastrais: nome e foto podem mudar; o e-mail identifica a conta e fica só para leitura
export function ProfileForm({ name, email, photoUrl, isSaving = false, successMessage, error, onSubmit }: ProfileFormProps) {
  const [currentName, setCurrentName] = useState(name);
  const [photo, setPhoto] = useState<File | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = currentName.trim();
    if (isSaving || !trimmedName) return;
    void onSubmit({ name: trimmedName, photo });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Dados do perfil" className="space-y-4 w-full">
      <ProfilePhotoUpload name={currentName} photoUrl={photoUrl} isUploading={isSaving} onChange={setPhoto} />

      {error && (
        <div role="alert" className="p-3 text-xs text-red-600 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {successMessage && (
        <div role="status" className="p-3 text-sm text-green-800 bg-green-50 rounded-lg border border-green-200">
          {successMessage}
        </div>
      )}

      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
        <input
          id="profile-name"
          type="text"
          value={currentName}
          onChange={(e) => setCurrentName(e.target.value)}
          disabled={isSaving}
          className={inputClassName}
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">E-mail</span>
        <p className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500">{email}</p>
      </div>

      <LoginButton text="Salvar" type="submit" disabled={isSaving} />
    </form>
  );
}
