import { NewJobForm } from "./NewJobForm";

export default function NewJobPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">New job</h1>
      <NewJobForm />
    </div>
  );
}
