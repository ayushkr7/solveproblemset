import type { Metadata } from "next";
import { CreateSetForm } from "@/components/create/CreateSetForm";

export const metadata: Metadata = { title: "Create a problem set" };

export default function CreatePage() {
  return (
    <div className="container page">
      <header className="page-head">
        <div className="page-head__meta">
          <span className="label">§ Create</span>
          <span className="label">New problem set</span>
        </div>
        <h1 className="page-head__title">
          Draft a <span className="serif-accent">practice set.</span>
        </h1>
        <p className="page-head__lede">
          Name it, choose a source, then set the difficulty mix, or a rating range for Codeforces. Problems are drawn at
          random and ordered Easy → Medium → Hard.
        </p>
      </header>
      <CreateSetForm />
    </div>
  );
}
