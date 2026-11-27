import { AvaliaLogo } from "@/components/ui/AvaliaLogo";

export function RoomsHeader() {
  return (
    <header className="w-full flex flex-col items-center justify-center mb-8">
      <div className="w-44 sm:w-52 flex flex-col items-center gap-1">
        <AvaliaLogo size="lg" />
        <h1 className="w-full pl-[23.4%] text-center whitespace-nowrap text-xl sm:text-2xl font-bold text-[#182860] tracking-tight leading-tight">
          Suas salas
        </h1>
      </div>
    </header>
  );
}
