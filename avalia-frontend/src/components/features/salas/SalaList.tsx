import { Sala } from "../../../types/sala";
import { SalaCard } from "./SalaCard";

interface SalaListProps {
    salas: Sala[];
    onEntrar: (sala: Sala) => void;
    onEditar: (sala: Sala) => void;
    onCompartilhar: (sala: Sala) => void;
}

export function SalaList({ salas, onEntrar, onEditar, onCompartilhar }: SalaListProps) {
    return (
    <div className="space-y-4">
        {salas.map((sala) => (
        <SalaCard
            key={sala.id}
            sala={sala}
            onEntrar={() => onEntrar(sala)}
            onEditar={() => onEditar(sala)}
            onCompartilhar={() => onCompartilhar(sala)}
        />
        ))}
    </div>
    );
}