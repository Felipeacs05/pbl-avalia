import React from "react";
import { AvaliaLogo } from "@/components/ui/AvaliaLogo";

interface AuthCardLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function AuthCardLayout({ title, children }: AuthCardLayoutProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg flex flex-col items-center w-full max-w-md">
        <AvaliaLogo size="md" className="mb-3" />
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
