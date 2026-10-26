import type { Metadata } from "next";
import { SetDetail } from "@/components/set-detail/SetDetail";

export const metadata: Metadata = { title: "Problem set" };

export default async function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SetDetail id={decodeURIComponent(id)} />;
}
