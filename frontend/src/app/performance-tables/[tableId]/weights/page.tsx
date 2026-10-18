// src/app/performance-tables/[tableId]/weights/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { CriteriaWeightsPage } from "@/components/features/performance-tables/CriteriaWeightsPage";

export default function PerformanceTableWeightsPage() {
  const params = useParams();
  const router = useRouter();

  const tableId = String(params.tableId);

  return (
    <CriteriaWeightsPage
      performanceTableId={tableId}
      onBack={() => router.back()}
    />
  );
}
