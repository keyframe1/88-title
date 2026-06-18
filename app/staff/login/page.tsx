import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/dealers/LoginForm";

export const metadata: Metadata = {
  title: "Staff sign in",
  description: "Sign in to the 88 Title staff console.",
  robots: { index: false, follow: false },
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // Default straight to the queue so a staffer landing here directly (no
  // redirectedFrom) ends up in the console after sign-in.
  const redirectedFrom =
    typeof params.redirectedFrom === "string"
      ? params.redirectedFrom
      : "/staff/queue";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-white">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Staff
      </span>
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">Staff sign in</h1>
      <p className="mt-2 leading-relaxed text-fog">
        Sign in to manage the check-in queue and dealer transactions.
      </p>

      {error === "auth" ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-plate/30 bg-plate/5 px-4 py-3 text-sm text-plate"
        >
          That sign-in link is invalid or has expired. Enter your email below to
          get a new one.
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border-2 border-ink bg-white">
        <div className="bg-ink px-6 py-3">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">
            88 Title back office
          </p>
        </div>
        <div className="p-6 sm:p-7">
          <LoginForm
            redirectedFrom={redirectedFrom}
            emailPlaceholder="you@88title.com"
          />
        </div>
      </div>

      <p className="mt-8 text-xs leading-relaxed text-fog">
        Staff access only. Dealers, sign in at the{" "}
        <Link
          href="/dealers/login"
          className="font-semibold text-ink underline-offset-4 transition-colors hover:text-plate hover:underline"
        >
          dealer portal
        </Link>
        .
      </p>
    </div>
  );
}
