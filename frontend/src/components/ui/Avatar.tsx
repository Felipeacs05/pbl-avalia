// src/components/ui/Avatar.tsx
"use client";

import React, { useState } from "react";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string;
  /** Texto alternativo. Deixe vazio quando o nome já aparece ao lado da foto. */
  alt?: string;
  /** Classes de tamanho do Tailwind. */
  sizeClassName?: string;
  /** Foto desfocada e em tons de cinza (ex.: item inativo). */
  dimmed?: boolean;
}

export function Avatar({
  src,
  alt = "",
  sizeClassName = "w-12 h-12",
  dimmed = false,
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={`${sizeClassName} relative shrink-0 overflow-hidden rounded-full border-2 border-white/40 bg-[#2D3A74] flex items-center justify-center`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-[filter] ${
            dimmed ? "blur-[2px] grayscale" : ""
          }`}
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <User className="text-white/80" size={22} aria-hidden="true" />
      )}
    </div>
  );
}
