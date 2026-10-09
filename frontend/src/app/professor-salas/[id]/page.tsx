import { redirect } from "next/navigation";

// src/app/group/page.tsx

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;
  redirect(`/professor-salas/${id}/disciplinas`);
}
