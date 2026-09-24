import React from "react";
import { Presentation, GraduationCap, User, Plus } from "lucide-react";
import { PrimaryButton } from "../../ui/PrimaryButton";

interface BottomTabBarProps {
  onCriarSala: () => void;
}

export function BottomTabBar({ onCriarSala }: BottomTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 pt-3 pb-4 px-4 z-50">
      
      <div className="mb-3">
        <PrimaryButton icon={<Plus size={20} strokeWidth={3} />} onClick={onCriarSala}>
          Criar nova sala
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-3 text-center">
        <button className="flex flex-col items-center justify-center text-[#4354A0]">
          <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
            <Presentation size={16} />
          </div>
          <span className="text-[10px] font-bold">Professor</span>
        </button>

        <button className="flex flex-col items-center justify-center text-gray-400 hover:text-[#757DC3] transition-colors">
          <GraduationCap size={20} className="mb-1" />
          <span className="text-[10px] font-semibold">Aluno</span>
        </button>

        <button className="flex flex-col items-center justify-center text-gray-400 hover:text-[#757DC3] transition-colors">
          <User size={20} className="mb-1" />
          <span className="text-[10px] font-semibold">Perfil</span>
        </button>
      </div>
    </div>
  );
}