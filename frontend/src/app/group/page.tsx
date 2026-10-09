'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  UserPlus, 
  UserMinus, 
  Users, 
  Eye, 
  CheckCircle2 
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  avatar: string;
  groupId: string | null;
}

interface Group {
  id: string;
  name: string;
}

const INITIAL_GROUPS: Group[] = [
  { id: 'g1', name: 'Grupo 1 - Alpha' },
  { id: 'g2', name: 'Grupo 2 - Beta' },
];

const INITIAL_STUDENTS: Student[] = [
  { id: 's1', name: 'Ana Beatriz Souza', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', groupId: 'g1' },
  { id: 's2', name: 'Carlos Eduardo Lima', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', groupId: 'g1' },
  { id: 's3', name: 'Gabriel Santos', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', groupId: 'g2' },
  { id: 's4', name: 'Mariana Duarte', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', groupId: null },
  { id: 's5', name: 'Lucas Pinheiro', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', groupId: null },
  { id: 's6', name: 'Juliana Rocha', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', groupId: null },
];

export default function GroupManagementPrototypePage() {
  const [roleView, setRoleView] = useState<'tutor' | 'student'>('tutor');
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('g1');
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  // Adicionar aluno ao grupo selecionado
  const handleAddToGroup = (studentId: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, groupId: selectedGroupId } : student
      )
    );
  };

  // Remover aluno do grupo (volta para "Sem Grupo")
  const handleRemoveFromGroup = (studentId: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, groupId: null } : student
      )
    );
  };

  // Criar novo grupo
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    const newId = `g_${Date.now()}`;
    const created: Group = { id: newId, name: newGroupName.trim() };
    setGroups([...groups, created]);
    setSelectedGroupId(newId);
    setNewGroupName('');
    setIsCreatingGroup(false);
  };

  // Filtragem em tempo real
  const unallocatedStudents = students.filter(
    (s) => s.groupId === null && s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allocatedStudents = students.filter(
    (s) => s.groupId === selectedGroupId && s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-gray-800 flex justify-center p-0 md:p-6">
      <main className="w-full max-w-md bg-white min-h-screen md:min-h-[850px] md:rounded-[2.5rem] shadow-xl flex flex-col justify-between overflow-hidden relative border border-gray-100">
        
        {/* BARRA SUPERIOR (HEADER) */}
        <div>
          <div className="p-5 pb-3 flex items-center justify-between">
            <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-4 py-1.5 rounded-full">
              TEC499 - 2026.2
            </div>
            {/* Alternador de papel (Tutor vs Aluno) para homologação rápida */}
            <button 
              onClick={() => setRoleView(roleView === 'tutor' ? 'student' : 'tutor')}
              className="text-xs bg-gray-800 text-white px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1 hover:bg-gray-700 transition-all"
            >
              <Eye size={14} />
              {roleView === 'tutor' ? 'Ver Aluno' : 'Ver Tutor'}
            </button>
          </div>

          <div className="px-6 pt-1 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {roleView === 'tutor' ? 'Gestão de Grupos' : 'Meu Grupo'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {roleView === 'tutor' 
                ? 'Organize as equipes de trabalho para as avaliações da sala.' 
                : 'Membros alocados com você para as atividades do semestre.'}
            </p>
          </div>

          {/* VISÃO DO TUTOR (GESTOR) */}
          {roleView === 'tutor' ? (
            <div className="px-6 space-y-4">
              
              {/* Seletor de Grupos e Criação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Selecione o Grupo</span>
                  <button 
                    onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                    className="text-xs text-[#4354A0] font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Novo Grupo
                  </button>
                </div>

                {isCreatingGroup && (
                  <form onSubmit={handleCreateGroup} className="flex gap-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Nome do grupo (ex: Grupo 3)"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4354A0]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-[#4354A0] text-white text-xs px-3 py-2 rounded-xl font-semibold hover:bg-[#34427e]"
                    >
                      Salvar
                    </button>
                  </form>
                )}

                {/* Abas horizontais dos Grupos */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`text-xs px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                        selectedGroupId === group.id
                          ? 'bg-[#2E3A70] text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barra de Busca em Tempo Real */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar aluno por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4354A0]"
                />
              </div>

              {/* LISTA 1: ALOCADOS NO GRUPO ATIVO */}
              <section className="bg-[#2E3A70] text-white p-4 rounded-[1.5rem] shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Alocados em {activeGroup?.name}
                  </h2>
                  <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                    {allocatedStudents.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {allocatedStudents.length === 0 ? (
                    <p className="text-xs text-gray-300 py-3 text-center">Nenhum aluno neste grupo ainda.</p>
                  ) : (
                    allocatedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between bg-white/10 hover:bg-white/15 p-2 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={student.avatar} alt={student.name} className="w-7 h-7 rounded-full object-cover" />
                          <span className="text-xs font-medium">{student.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromGroup(student.id)}
                          aria-label={`Remover ${student.name} do grupo`}
                          className="w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* LISTA 2: SEM GRUPO (DISPONÍVEIS) */}
              <section className="bg-gray-50 border border-gray-200 p-4 rounded-[1.5rem]">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-sm font-bold text-gray-800 tracking-wide flex items-center gap-1.5">
                    <Users size={16} className="text-gray-500" />
                    Alunos Sem Grupo
                  </h2>
                  <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                    {unallocatedStudents.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {unallocatedStudents.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">Todos os alunos estão alocados.</p>
                  ) : (
                    unallocatedStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-xl shadow-2xs hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <img src={student.avatar} alt={student.name} className="w-7 h-7 rounded-full object-cover" />
                          <span className="text-xs font-medium text-gray-800">{student.name}</span>
                        </div>
                        <button
                          onClick={() => handleAddToGroup(student.id)}
                          aria-label={`Adicionar ${student.name} ao grupo`}
                          className="w-7 h-7 rounded-full bg-[#4354A0]/10 hover:bg-[#4354A0] text-[#4354A0] hover:text-white flex items-center justify-center transition-colors"
                        >
                          <UserPlus size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : (
            
            /* VISÃO DO ALUNO (SOMENTE LEITURA) */
            <div className="px-6 space-y-4 animate-fadeIn">
              <div className="bg-[#2E3A70] text-white p-5 rounded-[1.5rem] shadow-sm">
                <span className="text-[11px] uppercase tracking-wider text-gray-300 font-semibold block mb-1">
                  Sua Equipe de Trabalho
                </span>
                <h2 className="text-lg font-bold">Grupo 1 - Alpha</h2>
                <hr className="border-white/20 my-3" />
                <p className="text-xs text-gray-200">
                  Total de integrantes: 2 membros
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[1.5rem] p-4 shadow-sm">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Integrantes</h3>
                <div className="space-y-3">
                  {students.filter(s => s.groupId === 'g1').map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                      <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover shadow-2xs" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                        <span className="text-[11px] text-gray-400">Aluno regular</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE NAVEGAÇÃO FIXA (CONFORME FIGMA) */}
        <footer className="border-t border-gray-100 p-3 bg-white/95 backdrop-blur-xs flex justify-around items-center">
          <div className="flex flex-col items-center gap-0.5 text-gray-400 cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center">📚</div>
            <span className="text-[10px] font-medium">Matéria</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[#2E3A70] cursor-pointer">
            <div className="w-5 h-5 flex items-center justify-center font-bold">👥</div>
            <span className="text-[10px] font-bold">Pessoas</span>
          </div>
        </footer>

      </main>
    </div>
  );
}