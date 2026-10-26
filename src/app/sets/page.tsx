import type { Metadata } from "next";
import { SetList } from "@/components/sets/SetList";

export const metadata: Metadata = { title: "Previous problem sets" };

export default function SetsPage() {
  return (
    <div className="container page">
      <SetList />
    </div>
  );
}
