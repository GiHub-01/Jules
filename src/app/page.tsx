 export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">
            Absent
          </h1>

          <p className="mt-2 text-slate-500">
            Academic Absence Management
          </p>
        </div>

        <div className="space-y-4">
 <a
  href="/login"
  className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center font-medium text-white transition hover:bg-slate-800"
>
  Login
</a>

  <a
  href="/signup"
  className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-50"
>
  Create Account
</a>
        </div>
      </div>
    </main>
  );
}
