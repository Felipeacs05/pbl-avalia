'use client';

import React from "react";
import { BookOpen, Users, User, Plus } from "lucide-react";
import { PrimaryButton } from "../../ui/PrimaryButton";
import { useRouter } from "next/navigation";

interface DisciplineTabBarProps {
  activeTab: "subject" | "groups" | "people";
  roomId: string;
  onTabChange?: (tab: "subject" | "groups" | "people") => void;
  onNewProblem?: () => void;
  actionButton?: React.ReactNode;
}

export function DisciplineTabBar({
  activeTab,
  roomId,
  onTabChange,
  onNewProblem,
  actionButton,
}: DisciplineTabBarProps) {
  const router = useRouter();

  const handleTabClick = (tab: "subject" | "groups" | "people") => {
    if (onTabChange) {
      onTabChange(tab);
      return;
    }

    if (tab === "subject") {
      router.push(`/professor-salas/${roomId}/disciplinas`);
    } else if (tab === "groups") {
      router.push(`/professor-salas/${roomId}/groups`);
    } else if (tab === "people") {
      // Carômetro ainda em desenvolvimento por outro membro: não altera rota
      return;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 pt-3 pb-4 px-5 z-50">
      {actionButton ? (
        <div className="mb-3 w-full">{actionButton}</div>
      ) : onNewProblem ? (
        <div className="mb-3 w-full">
          <PrimaryButton
            icon={<Plus size={20} strokeWidth={3} />}
            onClick={onNewProblem}
          >
            Novo Problema
          </PrimaryButton>
        </div>
      ) : null}

      <div className="grid grid-cols-3 text-center w-full">
        {/* Aba Matéria */}
        <button
          onClick={() => handleTabClick("subject")}
          className={`flex flex-col items-center justify-center transition-colors cursor-pointer py-1 ${
            activeTab === "subject"
              ? "text-[#4354A0]"
              : "text-gray-400 hover:text-[#757DC3]"
          }`}
        >
          {activeTab === "subject" ? (
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <BookOpen size={16} />
            </div>
          ) : (
            <BookOpen size={20} className="mb-1" />
          )}
          <span
            className={`text-[10px] ${
              activeTab === "subject" ? "font-bold" : "font-semibold"
            }`}
          >
            Matéria
          </span>
        </button>

        {/* Aba Grupos */}
        <button
          onClick={() => handleTabClick("groups")}
          className={`flex flex-col items-center justify-center transition-colors cursor-pointer py-1 ${
            activeTab === "groups"
              ? "text-[#4354A0]"
              : "text-gray-400 hover:text-[#757DC3]"
          }`}
        >
          {activeTab === "groups" ? (
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <Users size={16} />
            </div>
          ) : (
            <Users size={20} className="mb-1" />
          )}
          <span
            className={`text-[10px] ${
              activeTab === "groups" ? "font-bold" : "font-semibold"
            }`}
          >
            Grupos
          </span>
        </button>

        {/* Aba Pessoas (Carômetro) */}
        <button
          onClick={() => handleTabClick("people")}
          className={`flex flex-col items-center justify-center transition-colors cursor-pointer py-1 ${
            activeTab === "people"
              ? "text-[#4354A0]"
              : "text-gray-400 hover:text-[#757DC3]"
          }`}
        >
          {activeTab === "people" ? (
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <User size={16} />
            </div>
          ) : (
            <User size={20} className="mb-1" />
          )}
          <span
            className={`text-[10px] ${
              activeTab === "people" ? "font-bold" : "font-semibold"
            }`}
          >
            Pessoas
          </span>
        </button>
      </div>
    </div>
  );
}