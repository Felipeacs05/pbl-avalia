import { redirect } from "next/navigation";

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;
  redirect(`/professor-salas/${id}/disciplinas`);
}
