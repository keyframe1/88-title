import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/components/dealers/UpdatePasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Dealer portal
      </p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
        Set a new password
      </h1>
      <p className="mt-2 leading-relaxed text-fog">
        Choose a new password for your dealership account.
      </p>

      <div className="mt-6 rounded-2xl border-2 border-ink bg-white p-6 sm:p-7">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
