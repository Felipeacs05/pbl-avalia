// src/components/features/session-roles/SessionRoleBadge.tsx

// Badge colorida do papel aparece na hora em que o papel é atribuído.
import React from "react";
import type { SessionRole } from "../../../types/sessionRole";
import { SESSION_ROLE_LABELS, SESSION_ROLE_STYLES } from "./sessionRoleOptions";

export function SessionRoleBadge({ role }: { role: SessionRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5 whitespace-nowrap ${SESSION_ROLE_STYLES[role].badge}`}
    >
      {SESSION_ROLE_LABELS[role]}
    </span>
  );
}
