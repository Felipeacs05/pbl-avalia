import { useState } from "react";
import { useRouter } from "next/navigation"; // 1. Importação obrigatória no Next.js
import { registrationService } from "../services/registrationService";

//src/hooks/useRegistration.ts

type ToastState = { message: string; type: "success" | "error" } | null;

export function useRegistration() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter(); // 2. Inicialização do router

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
    if (!image) return showToast("A foto de perfil é obrigatória.");

    setLoading(true);
    try {
      await registrationService.createAccount({ name, email, password, image });
      showToast("Conta criada com sucesso! Redirecionando...", "success");
      
      setTimeout(() => {
        router.push("/"); // 3. Correção: Substitui o window.location.href
      }, 2000);

    } catch (error: unknown) {
      console.error(error);
      let message = 'Falha ao realizar o cadastro. Tente novamente.';

      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as any).response?.data?.message === 'string'
      ) {
        message = (error as any).response.data.message;
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