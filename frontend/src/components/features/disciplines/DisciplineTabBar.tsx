import React from "react";
import { BookOpen, Users, Plus } from "lucide-react";
import { PrimaryButton } from "../../ui/PrimaryButton";

// src/components/features/disciplines/DisciplineTabBar.tsx

interface DisciplineTabBarProps {
  activeTab: "subject" | "people";
  onTabChange: (tab: "subject" | "people") => void;
  onNewProblem?: () => void;
  actionButton?: React.ReactNode;
}

export function DisciplineTabBar({
  activeTab,
  onTabChange,
  onNewProblem,
  actionButton,
}: DisciplineTabBarProps) {
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
      <div className="grid grid-cols-2 text-center w-full">
        {/* Subject tab */}
        <button
          onClick={() => onTabChange("subject")}
          className={`flex flex-col items-center justify-center transition-colors cursor-pointer py-1 ${activeTab === "subject"
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
            className={`text-[10px] ${activeTab === "subject" ? "font-bold" : "font-semibold"
              }`}
          >
            Matéria
          </span>
        </button>

        {/* People tab */}
        <button
          onClick={() => onTabChange("people")}
          className={`flex flex-col items-center justify-center transition-colors cursor-pointer py-1 ${activeTab === "people"
              ? "text-[#4354A0]"
              : "text-gray-400 hover:text-[#757DC3]"
            }`}
        >
          {activeTab === "people" ? (
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <Users size={16} />
            </div>
          ) : (
            <Users size={20} className="mb-1" />
          )}
          <span
            className={`text-[10px] ${activeTab === "people" ? "font-bold" : "font-semibold"
              }`}
          >
            Pessoas
          </span>
        </button>
      </div>
    </div>
  );
}
