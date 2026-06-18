import type { Metadata } from "next";
import { LoginForm } from "@/components/dealers/LoginForm";

export const metadata: Metadata = {
  title: "Dealer sign in",
  description: "Sign in to the 88 Title dealer portal.",
  robots: { index: false, follow: false },
};

export default async function DealerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const redirectedFrom =
    typeof params.redirectedFrom === "string"
      ? params.redirectedFrom
      : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-plate">
        Dealer portal
      </p>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Sign in</h1>
      <p className="mt-2 leading-relaxed text-fog">
        Access your dealership&rsquo;s transactions and file new ones.
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

      <div className="mt-6 rounded-2xl border-2 border-ink bg-white p-6 sm:p-7">
        <LoginForm redirectedFrom={redirectedFrom} />
      </div>

      <p className="mt-8 text-xs leading-relaxed text-fog">
        Dealer accounts are set up by 88 Title staff. Need access? Call the
        office and we&rsquo;ll get you set up.
      </p>
    </div>
  );
}
