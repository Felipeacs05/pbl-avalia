// src/hooks/useEditProfile.ts
// Edição de nome e foto (US23): parte do usuário salvo pelo login e mantém a sessão em sincronia
import { useState } from "react";
import { useRouter } from "next/navigation";
import { profileService } from "@/services/profileService";
import { validateProfilePhoto } from "@/utils/profilePhoto";
import type { UpdateProfileRequest, UserProfile } from "@/types/profile";

const PROFILE_SAVED_MESSAGE = "Perfil atualizado com sucesso.";
const NAME_REQUIRED_MESSAGE = "Informe o nome.";
const DEFAULT_ERROR_MESSAGE = "Não foi possível salvar o perfil. Tente novamente.";

function readStoredUser(): UserProfile {
  if (typeof window === "undefined") return { name: "", email: "" };
  try {
    return { name: "", email: "", ...JSON.parse(localStorage.getItem("user") ?? "{}") };
  } catch {
    return { name: "", email: "" };
  }
}

export function useEditProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(readStoredUser);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile({ name, photo }: UpdateProfileRequest): Promise<void> {
    setSuccessMessage(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(NAME_REQUIRED_MESSAGE);
      return;
    }
    const photoError = photo ? validateProfilePhoto(photo) : null;
    if (photoError) {
      setError(photoError);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile({ name: trimmedName, photo });
      // Mantém id e e-mail da sessão; o backend devolve nome e foto atualizados
      const merged = { ...readStoredUser(), ...updated };
      localStorage.setItem("user", JSON.stringify(merged));
      setProfile(merged);
      setSuccessMessage(PROFILE_SAVED_MESSAGE);
    } catch (err) {
      const { status, message } = (err ?? {}) as { status?: number; message?: string };
      setError(message || DEFAULT_ERROR_MESSAGE);
      // Token revogado (senha trocada em outro lugar): o authFetch não trata 401 sozinho
      if (status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return { profile, saveProfile, isSaving, successMessage, error };
}
