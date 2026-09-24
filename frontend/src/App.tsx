import React, { useState } from 'react';

interface AlunoChamada {
  id: number;
  nome: string;
  matricula: string;
  presente: boolean;
}

export function App() {
  const [alunos, setAlunos] = useState<AlunoChamada[]>([
    { id: 1, nome: 'Ana Silva', matricula: '2023101', presente: true },
    { id: 2, nome: 'Carlos Souza', matricula: '2023102', presente: false },
    { id: 3, nome: 'Beatriz Lima', matricula: '2023103', presente: true },
  ]);

  const togglePresenca = (id: number) => {
    setAlunos(prev =>
      prev.map(aluno =>
        aluno.id === id ? { ...aluno, presente: !aluno.presente } : aluno
      )
    );
  };

  // @ts-ignore
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header Mobile First */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Avalia-system</h1>
          <p className="text-xs text-slate-500">PBL — Sessão Tutorial</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          Sessão Aberta
        </span>
      </header>

      {/* Conteúdo Principal Responsivo */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Registro de Chamada</h2>
          <p className="text-xs text-slate-500 mt-1">
            Toque no aluno para alternar presença em tempo real sem recarregar a tela.
          </p>
        </div>

        {/* Lista de Alunos (Mobile-First Card / List) */}
        <div className="space-y-2">
          {alunos.map(aluno => (
            <button
              key={aluno.id}
              onClick={() => togglePresenca(aluno.id)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                aluno.presente
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div>
                <p className="font-semibold text-sm">{aluno.nome}</p>
                <p className="text-xs opacity-75">Matrícula: {aluno.matricula}</p>
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-md ${
                  aluno.presente ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                }`}
              >
                {aluno.presente ? 'Presente' : 'Ausente'}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
