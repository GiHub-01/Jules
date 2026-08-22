 "use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    }
  }, []);

  function toggleDarkMode() {
    const nextDarkMode = !darkMode;

    setDarkMode(nextDarkMode);

    if (nextDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    closeMenu();
    router.push("/login");
  }

  return (
    <nav className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-6xl px-6">

        {/* TOP NAVBAR */}
        <div className="flex items-center justify-between py-4">

          {/* LOGO */}
          <a
            href="/dashboard"
            onClick={closeMenu}
            className="text-xl font-bold text-slate-900 dark:text-white"
          >
            Absent
          </a>

          {/* DESKTOP MENU */}
          <div className="hidden items-center gap-6 md:flex">

            <a
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Dashboard
            </a>

            <a
              href="/semester"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Semester
            </a>

            <a
              href="/courses"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Courses
            </a>

            <a
              href="/absences"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Absences
            </a>

            {/* DARK MODE */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* LOGOUT */}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Logout
            </button>
          </div>

          {/* MOBILE BUTTONS */}
          <div className="flex items-center gap-2 md:hidden">

            {/* DARK MODE */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* MENU BUTTON */}
            <button
              type="button"
              onClick={() =>
                setMenuOpen((current) => !current)
              }
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xl text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-slate-200 py-4 dark:border-slate-700 md:hidden">

            <div className="flex flex-col gap-2">

              <a
                href="/dashboard"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Dashboard
              </a>

              <a
                href="/semester"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Semester
              </a>

              <a
                href="/courses"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Courses
              </a>

              <a
                href="/absences"
                onClick={closeMenu}
                className="rounded-lg px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Absences
              </a>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Logout
              </button>

            </div>
          </div>
        )}

      </div>
    </nav>
  );
}