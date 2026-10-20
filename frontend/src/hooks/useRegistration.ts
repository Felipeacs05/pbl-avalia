import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrationService } from "../services/registrationService";

type ToastState = { message: string; type: "success" | "error" } | null;

// Criamos uma interface para o Linter não reclamar do 'any'
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export function useRegistration() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast("A imagem selecionada excede o limite de 5MB.");
        setImage(null);
        e.target.value = "";
        return;
      }
      setImage(file);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setToast(null);

    if (!name || !email || !password || !confirmPassword) return showToast("Preencha todos os campos obrigatórios.");
    if (password !== confirmPassword) return showToast("As senhas não coincidem.");
    // [OPCIONAL] Validação "A foto de perfil é obrigatória." removida: a imagem agora é opcional.

    setLoading(true);
    try {
      await registrationService.createAccount({ name, email, password, image });
      showToast("Conta criada com sucesso! Redirecionando...", "success");
      
      setTimeout(() => {
        router.push("/");
      }, 2000);

    } catch (error: unknown) {
      console.error(error);
      let message = "Falha ao realizar o cadastro. Tente novamente.";

      const err = error as ApiError;
      if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      
      showToast(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    name, setName, email, setEmail, password, setPassword,
    confirmPassword, setConfirmPassword, image, toast, setToast, loading,
    handleImageChange, handleSubmit
  };
}