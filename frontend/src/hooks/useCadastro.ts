import { useState } from "react";
import { useRouter } from "next/navigation"; // 1. Importação obrigatória no Next.js
import { cadastroService } from "../services/cadastroService";

type ToastState = { message: string; type: "success" | "error" } | null;

export function useCadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [imagem, setImagem] = useState<File | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter(); // 2. Inicialização do router

  const mostrarToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        mostrarToast("A imagem selecionada excede o limite de 5MB.");
        setImagem(null);
        e.target.value = "";
        return;
      }
      setImagem(file);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setToast(null);

    if (!nome || !email || !senha || !confirmarSenha) return mostrarToast("Preencha todos os campos obrigatórios.");
    if (senha !== confirmarSenha) return mostrarToast("As senhas não coincidem.");
    if (!imagem) return mostrarToast("A foto de perfil é obrigatória.");

    setLoading(true);
    try {
      await cadastroService.criarConta({ nome, email, senha, imagem });
      mostrarToast("Conta criada com sucesso! Redirecionando...", "success");
      
      setTimeout(() => {
        router.push("/"); // 3. Correção: Substitui o window.location.href
      }, 2000);

    } catch (error) {
      console.error(error); // 4. Correção: Usamos a variável 'error' para log no terminal
      mostrarToast("Erro 400: Falha ao enviar os dados.");
    } finally {
      setLoading(false);
    }
  };

  return {
    nome, setNome, email, setEmail, senha, setSenha,
    confirmarSenha, setConfirmarSenha, imagem, toast, setToast, loading,
    handleImageChange, handleSubmit
  };
}