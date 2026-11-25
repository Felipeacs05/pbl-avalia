// src/types/profile.ts
// Edição de perfil (US23)

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  profilePictureUrl?: string | null;
}

export interface UpdateProfileRequest {
  name: string;
  photo: File | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileMessageResponse {
  message: string;
}

export interface ProfileServiceError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}
