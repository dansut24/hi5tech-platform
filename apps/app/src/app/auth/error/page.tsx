export const dynamic = "force-dynamic";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const message = String(sp.message || "Unable to confirm your account.");

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="hi5-panel w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-extrabold">Unable to confirm account</h1>

        <p className="mt-3 text-sm opacity-75">
          {message}
        </p>

        <p className="mt-5 text-xs opacity-60">
          Please request a new signup email and try again.
        </p>
      </div>
    </div>
  );
}
