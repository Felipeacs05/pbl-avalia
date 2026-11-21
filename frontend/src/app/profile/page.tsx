// src/app/profile/page.tsx
"use client";

import React from "react";
import { ProfilePanel } from "@/components/features/profile/ProfilePanel";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 flex justify-center">
      <div className="w-full max-w-md py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Meu perfil</h1>
        <ProfilePanel />
      </div>
    </main>
  );
}
