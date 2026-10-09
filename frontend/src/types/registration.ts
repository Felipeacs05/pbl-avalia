export interface RegistrationData {
    name: string;
    email: string;
    password: string;
    // [OPCIONAL] Foto de perfil deixou de ser obrigatória (diretriz do PO: obrigatoriedade "invasiva").
    image?: File | null;
}