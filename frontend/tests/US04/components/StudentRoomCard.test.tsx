import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentRoomCard } from "@/components/features/rooms-student/StudentRoomCard";
import { makeRoom } from "../fixtures";

function renderCard(room = makeRoom(), index = 0) {
    const onEnter = vi.fn();
    const user = userEvent.setup();

    const { container } = render(<StudentRoomCard room={room} index={index} onEnter={onEnter} />);

    return { user, onEnter, room, card: container.firstElementChild as HTMLElement };
}

describe("[US04] StudentRoomCard", () => {
    it("Deve exibir o nome, o código, o tutor e o semestre da sala", () => {
        const { room } = renderCard();

        expect(screen.getByRole("heading", { name: room.name })).toBeInTheDocument();
        expect(screen.getByText(room.code)).toBeInTheDocument();
        expect(screen.getByText(`Tutor : ${room.tutor}`)).toBeInTheDocument();
        expect(screen.getByText(`Semestre: ${room.semester}`)).toBeInTheDocument();
    });

    it("Deve exibir as iniciais do tutor, sem <img>, quando não há foto", () => {
        renderCard(makeRoom({ tutorPhoto: undefined }));

        // André Silva -> AS
        expect(screen.getByText("AS")).toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("Deve exibir a foto do tutor, sem as iniciais, quando há tutorPhoto", () => {
        const room = makeRoom({ tutorPhoto: "https://img.uefs.br/andre.png" });
        renderCard(room);

        expect(screen.getByRole("img", { name: room.tutor })).toHaveAttribute("src", room.tutorPhoto);
        expect(screen.queryByText("AS")).not.toBeInTheDocument();
    });

    it("Deve exibir um marcador quando a sala não informa o tutor", () => {
        renderCard(makeRoom({ tutor: undefined }));

        // Sem tutor o código usa "?" em vez de quebrar ao calcular as iniciais
        expect(screen.getByText("?")).toBeInTheDocument();
    });

    // Os tons vêm do Figma; o índice repete a cada 3 cards (módulo)
    it.each([
        [0, "#3F4A9A"],
        [1, "#141B5E"],
        [2, "#020845"],
        [3, "#3F4A9A"],
        [4, "#141B5E"],
    ])("Deve usar o tom de fundo do índice %i (%s)", (index, color) => {
        const { card } = renderCard(makeRoom(), index);

        expect(card).toHaveStyle({ backgroundColor: color });
    });

    it("Deve chamar onEnter ao tocar no card", async () => {
        const { user, onEnter, room } = renderCard();

        await user.click(screen.getByText(room.name));

        expect(onEnter).toHaveBeenCalledTimes(1);
    });
});