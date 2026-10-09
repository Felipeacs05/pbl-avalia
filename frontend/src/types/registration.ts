export interface RegistrationData {
    name: string;
    email: string;
    password: string;
    //Foto de perfil deixou de ser obrigatória
    image?: File | null;
}