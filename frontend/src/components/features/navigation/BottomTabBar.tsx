import React from "react";
import { Presentation, GraduationCap, User } from "lucide-react";

export function BottomTabBar() {
  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-t border-gray-200 pt-3 pb-4 px-4">
      <div className="grid grid-cols-3 text-center max-w-md mx-auto">
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