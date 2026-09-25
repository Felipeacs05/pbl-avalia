import { LoginAuth } from "@/components/features/auth/LoginAuth";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Acessar Conta</h1>
        
        
        <LoginAuth />
      </div>
    </main>
  );
}