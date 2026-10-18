// src/app/professor-salas/[id]/page.tsx
import { redirect } from "next/navigation";

interface RoomPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tab = resolvedSearchParams?.tab;

  if (tab) {
    redirect(`/professor-salas/${id}/disciplinas?tab=${tab}`);
  }

  redirect(`/professor-salas/${id}/disciplinas`);
}
