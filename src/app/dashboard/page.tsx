export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Welcome to your Absent dashboard
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Semester
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage your current semester
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Courses
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Manage your courses
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Absences
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Track your absences
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}