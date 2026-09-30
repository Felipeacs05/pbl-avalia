import { useState } from "react";
import { useRouter } from "next/navigation";
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

  const router = useRouter();

  const mostrarToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        mostrarToast("A imagem excede o limite de 5MB.");
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
        router.push("/");
      }, 2000);

    } catch (err: unknown) {
      // Padrão rigoroso de extração de erro do Axios (idêntico ao useAuth)
      let mensagem = 'Erro ao realizar o cadastro. Tente novamente mais tarde.';

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        mensagem = (err as { response: { data: { message: string } } }).response.data.message;
      }

      console.error("Falha na API de Cadastro:", err);
      mostrarToast(mensagem);
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