import React from "react";
import { BookOpen, Users } from "lucide-react";

// src/components/features/disciplinas/DisciplinaTabBar.tsx

interface DisciplinaTabBarProps {
  activeTab: "materia" | "pessoas";
  onTabChange: (tab: "materia" | "pessoas") => void;
}

export function DisciplinaTabBar({
  activeTab,
  onTabChange,
}: DisciplinaTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 pt-3 pb-4 px-4 z-50">
      <div className="grid grid-cols-2 text-center max-w-md mx-auto">
        {/* Tab Matéria */}
        <button
          onClick={() => onTabChange("materia")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "materia"
              ? "text-[#4354A0]"
              : "text-gray-400 hover:text-[#757DC3]"
          }`}
        >
          {activeTab === "materia" ? (
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <BookOpen size={16} />
            </div>
          ) : (
            <BookOpen size={20} className="mb-1" />
          )}
          <span
            className={`text-[10px] ${
              activeTab === "materia" ? "font-bold" : "font-semibold"
            }`}
          >
            Matéria
          </span>
        </button>

        {/* Tab Pessoas */}
        <button
          onClick={() => onTabChange("pessoas")}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === "pessoas"
              ? "text-[#4354A0]"
              : "text-gray-400 hover:text-[#757DC3]"
          }`}
        >
          {activeTab === "pessoas" ? (
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <Users size={16} />
            </div>
          ) : (
            <Users size={20} className="mb-1" />
          )}
          <span
            className={`text-[10px] ${
              activeTab === "pessoas" ? "font-bold" : "font-semibold"
            }`}
          >
            Pessoas
          </span>
        </button>
      </div>
    </div>
  );
}
