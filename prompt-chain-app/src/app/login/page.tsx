import { LoginButton } from "@/components/login-button";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold">THP Prompt Chain Tool</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in with Google to continue. Access is restricted to matrix admins and superadmins.
        </p>
        <div className="mt-6">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
