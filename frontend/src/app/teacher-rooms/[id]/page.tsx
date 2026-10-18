// src/app/teacher-rooms/[id]/page.tsx
// ====== ALTERADO POR CLAUDE ====== (nomes traduzidos para inglês)
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
    redirect(`/teacher-rooms/${id}/disciplines?tab=${tab}`);
  }

  redirect(`/teacher-rooms/${id}/disciplines`);
}
