// src/components/features/profile/ProfilePhotoUpload.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { getInitials } from "@/components/ui/Avatar";
import { validateProfilePhoto } from "@/utils/profilePhoto";

interface ProfilePhotoUploadProps {
  name: string;
  photoUrl?: string | null;
  isUploading?: boolean;
  /** Foto escolhida e válida, ou null quando a seleção foi recusada. */
  onChange: (file: File | null) => void;
}

// Preview instantâneo da foto escolhida e o loading visual do envio. Arquivo fora da regra (JPG/PNG até 5MB)
// é recusado na hora e a seleção anterior é descartada.
export function ProfilePhotoUpload({ name, photoUrl, isUploading = false, onChange }: ProfilePhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Libera a URL do preview ao sair da tela
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function replacePreview(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreviewUrl(url);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateProfilePhoto(file);
    if (validationError) {
      setError(validationError);
      replacePreview(null);
      onChange(null);
      return;
    }
    setError(null);
    replacePreview(URL.createObjectURL(file));
    onChange(file);
  }

  const shownUrl = previewUrl ?? photoUrl ?? null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 rounded-full overflow-hidden bg-[#2D3A74] flex items-center justify-center">
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl font-bold text-white">{getInitials(name)}</span>
        )}
        {isUploading && (
          <div
            role="progressbar"
            aria-label="Enviando foto"
            className="absolute inset-0 bg-black/50 flex items-center justify-center"
          >
            <div className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      <label
        htmlFor="profile-photo"
        className={`flex items-center gap-1 text-sm font-semibold text-[#182860] ${
          isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:text-[#757DC3] hover:underline"
        }`}
      >
        <Camera size={16} />
        Alterar foto de perfil
      </label>
      <input
        id="profile-photo"
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        disabled={isUploading}
        className="sr-only"
      />
      <p className="text-xs text-gray-500">JPG ou PNG, até 5MB</p>

      {error && (
        <div role="alert" className="p-3 text-xs text-red-600 bg-red-100 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
