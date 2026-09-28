import React from "react";
import { Presentation, GraduationCap, User, Plus } from "lucide-react";
import { PrimaryButton } from "../../ui/PrimaryButton";
import Link from "next/link";

interface BottomTabBarProps {
  onCriarSala: () => void;
  // ====== ALTERADO POR CLAUDE ======
  abaAtiva?: "professor" | "aluno";
}

export function BottomTabBar({ onCriarSala, abaAtiva = "professor" }: BottomTabBarProps) {
  // ====== ALTERADO POR CLAUDE ======
  const isAluno = abaAtiva === "aluno";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 pt-3 pb-4 px-4 z-50">
      
      <div className="mb-3">
        {/* ====== ALTERADO POR CLAUDE ====== */}
        <PrimaryButton icon={isAluno ? undefined : <Plus size={20} strokeWidth={3} />} onClick={onCriarSala}>
          {isAluno ? "Entrar em sala" : "Criar nova sala"}
        </PrimaryButton>
      </div>

      <div className="grid grid-cols-3 text-center">
        {/* ====== ALTERADO POR CLAUDE ====== */}
        {isAluno ? (
          <Link
            href="/professor"
            className="flex flex-col items-center justify-center text-gray-400 hover:text-[#757DC3] transition-colors"
          >
            <Presentation size={20} className="mb-1" />
            <span className="text-[10px] font-semibold">Professor</span>
          </Link>
        ) : (
          <button className="flex flex-col items-center justify-center text-[#4354A0]">
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <Presentation size={16} />
            </div>
            <span className="text-[10px] font-bold">Professor</span>
          </button>
        )}

        {/* ====== ALTERADO POR CLAUDE ====== */}
        {isAluno ? (
          <button className="flex flex-col items-center justify-center text-[#4354A0]">
            <div className="w-10 h-7 bg-[#CDD3EE] rounded-full flex items-center justify-center mb-0.5">
              <GraduationCap size={16} />
            </div>
            <span className="text-[10px] font-bold">Aluno</span>
          </button>
        ) : (
          <Link
            href="/aluno"
            className="flex flex-col items-center justify-center text-gray-400 hover:text-[#757DC3] transition-colors"
          >
            <GraduationCap size={20} className="mb-1" />
            <span className="text-[10px] font-semibold">Aluno</span>
          </Link>
        )}

        <button className="flex flex-col items-center justify-center text-gray-400 hover:text-[#757DC3] transition-colors">
          <User size={20} className="mb-1" />
          <span className="text-[10px] font-semibold">Perfil</span>
        </button>
      </div>
    </div>
  );
}