"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type Course = {
  id: string;
  name: string;
  code: string;
  max_absences: number;
};

type Absence = {
  id: string;
  course_id: string;
  date: string;
  note: string | null;
};

type CourseStatus = {
  label: string;
  icon: string;
  className: string;
};

export default function DashboardPage() {
  const supabase = createClient();

  const [semester, setSemester] =
    useState<Semester | null>(null);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [absences, setAbsences] =
    useState<Absence[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [showRecentAbsences, setShowRecentAbsences] =
    useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please log in first.");
      setLoading(false);
      return;
    }

    // -------------------------------------------------------
    // 1. LOAD ACTIVE SEMESTER
    // -------------------------------------------------------

    const {
      data: semesterData,
      error: semesterError,
    } = await supabase
      .from("semesters")
      .select(
        "id, name, start_date, end_date"
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (semesterError) {
      setMessage(semesterError.message);
      setLoading(false);
      return;
    }

    // -------------------------------------------------------
    // 2. NO ACTIVE SEMESTER
    // -------------------------------------------------------

    if (!semesterData) {
      setSemester(null);
      setCourses([]);
      setAbsences([]);

      setMessage(
        "There is no active semester. Create or activate a semester to start tracking your attendance."
      );

      setLoading(false);
      return;
    }

    // -------------------------------------------------------
    // 3. LOAD COURSES FROM ACTIVE SEMESTER ONLY
    // -------------------------------------------------------

    const {
      data: coursesData,
      error: coursesError,
    } = await supabase
      .from("courses")
      .select(
        "id, name, code, max_absences"
      )
      .eq("user_id", user.id)
      .eq(
        "semester_id",
        semesterData.id
      )
      .order("name");

    if (coursesError) {
      setMessage(coursesError.message);
      setLoading(false);
      return;
    }

    const currentCourses =
      coursesData ?? [];

    // -------------------------------------------------------
    // 4. LOAD ABSENCES FOR ACTIVE SEMESTER COURSES ONLY
    // -------------------------------------------------------

    let currentAbsences: Absence[] = [];

    if (currentCourses.length > 0) {
      const courseIds =
        currentCourses.map(
          (course) => course.id
        );

      const {
        data: absencesData,
        error: absencesError,
      } = await supabase
        .from("absences")
        .select(
          "id, course_id, date, note"
        )
        .eq("user_id", user.id)
        .in(
          "course_id",
          courseIds
        )
        .order("date", {
          ascending: false,
        });

      if (absencesError) {
        setMessage(
          absencesError.message
        );
        setLoading(false);
        return;
      }

      currentAbsences =
        absencesData ?? [];
    }

    // -------------------------------------------------------
    // 5. SAVE CURRENT SEMESTER DATA
    // -------------------------------------------------------

    setSemester({
      id: semesterData.id,
      name: semesterData.name,
      start_date:
        semesterData.start_date,
      end_date:
        semesterData.end_date,
    });

    setCourses(currentCourses);
    setAbsences(currentAbsences);

    setLoading(false);
  }

  // =========================================================
  // COURSE HELPERS
  // =========================================================

  function getCourseName(
    courseId: string
  ) {
    const course = courses.find(
      (item) =>
        item.id === courseId
    );

    return (
      course?.name ??
      "Unknown course"
    );
  }

  function getCourseCode(
    courseId: string
  ) {
    const course = courses.find(
      (item) =>
        item.id === courseId
    );

    return course?.code ?? "—";
  }

  function getCourseAbsenceCount(
    courseId: string
  ) {
    return absences.filter(
      (absence) =>
        absence.course_id ===
        courseId
    ).length;
  }

  // =========================================================
  // COURSE STATUS
  // =========================================================

  function getCourseStatus(
    course: Course
  ): CourseStatus {
    const absenceCount =
      getCourseAbsenceCount(
        course.id
      );

    const remaining =
      Math.max(
        course.max_absences -
          absenceCount,
        0
      );

    if (remaining === 0) {
      return {
        label: "Limit Reached",
        icon: "🔴",
        className:
          "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
      };
    }

    if (remaining <= 2) {
      return {
        label: "Getting Close",
        icon: "🟡",
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
      };
    }

    return {
      label: "Safe",
      icon: "🟢",
      className:
        "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    };
  }

  // =========================================================
  // SEMESTER HEALTH
  // =========================================================

  const safeCourses =
    courses.filter((course) => {
      const remaining =
        Math.max(
          course.max_absences -
            getCourseAbsenceCount(
              course.id
            ),
          0
        );

      return remaining > 2;
    });

  const warningCourses =
    courses.filter((course) => {
      const remaining =
        Math.max(
          course.max_absences -
            getCourseAbsenceCount(
              course.id
            ),
          0
        );

      return (
        remaining >= 1 &&
        remaining <= 2
      );
    });

  const limitReachedCourses =
    courses.filter((course) => {
      const remaining =
        Math.max(
          course.max_absences -
            getCourseAbsenceCount(
              course.id
            ),
          0
        );

      return remaining === 0;
    });

  function getOverallHealth() {
    if (
      limitReachedCourses.length >
      0
    ) {
      return {
        title: "Attention Needed",
        icon: "🔴",
        description:
          "One or more courses have reached their maximum absence limit.",
        className:
          "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300",
      };
    }

    if (
      warningCourses.length > 0
    ) {
      return {
        title: "Be Careful",
        icon: "🟡",
        description:
          "You are getting close to the absence limit in one or more courses.",
        className:
          "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/40 dark:border-yellow-900 dark:text-yellow-300",
      };
    }

    if (courses.length > 0) {
      return {
        title: "Good",
        icon: "🟢",
        description:
          "Your current absence allowance looks comfortable across all courses.",
        className:
          "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300",
      };
    }

    return {
      title: "No Courses",
      icon: "ℹ️",
      description:
        "Add courses to start tracking your semester health.",
      className:
        "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
    };
  }

  const overallHealth =
    getOverallHealth();

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-slate-500 dark:text-slate-400">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">

      <div className="mx-auto w-full max-w-6xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-10">

          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Dashboard
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Welcome to your Absent dashboard
          </p>

        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="mb-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {message}
          </div>
        )}

        {/* =================================================
            CURRENT SEMESTER
        ================================================= */}

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Current Semester
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {semester?.name ??
                  "No active semester"}
              </h2>

              {semester && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {semester.start_date ??
                    "No start date"}{" "}
                  →{" "}
                  {semester.end_date ??
                    "No end date"}
                </p>
              )}

            </div>

            <a
              href="/semester"
              className="w-fit rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Manage Semester
            </a>

          </div>

        </div>

        {/* =================================================
            COURSE SUMMARY
        ================================================= */}

        <div className="mb-8">
          <a
            href="/courses"
            className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-slate-900 dark:shadow-none dark:hover:bg-slate-800"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Courses
            </p>

            <p className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-100">
              {courses.length}
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage your courses →
            </p>
          </a>
        </div>

        {/* =================================================
            SEMESTER HEALTH
        ================================================= */}

        {semester && (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">

            <div className="mb-6">

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Semester Health
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                A quick overview of your current
                absence situation.
              </p>

            </div>

            {/* OVERALL HEALTH */}

            <div
              className={`mb-6 rounded-xl border p-5 ${overallHealth.className}`}
            >

              <div className="flex items-start gap-4">

                <span className="text-3xl">
                  {overallHealth.icon}
                </span>

                <div>

                  <h3 className="text-lg font-semibold">
                    {overallHealth.title}
                  </h3>

                  <p className="mt-1 text-sm">
                    {overallHealth.description}
                  </p>

                </div>

              </div>

            </div>

            {/* HEALTH COUNTS */}

            <div className="grid gap-4 sm:grid-cols-3">

              {/* SAFE */}

              <div className="rounded-xl bg-green-50 p-5 dark:bg-green-950/30">

                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  🟢 Safe
                </p>

                <p className="mt-2 text-3xl font-bold text-green-800 dark:text-green-200">
                  {safeCourses.length}
                </p>

                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  {safeCourses.length === 1
                    ? "course"
                    : "courses"}
                </p>

              </div>

              {/* WARNING */}

              <div className="rounded-xl bg-yellow-50 p-5 dark:bg-yellow-950/30">

                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  🟡 Getting Close
                </p>

                <p className="mt-2 text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                  {warningCourses.length}
                </p>

                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  {warningCourses.length === 1
                    ? "course"
                    : "courses"}
                </p>

              </div>

              {/* LIMIT */}

              <div className="rounded-xl bg-red-50 p-5 dark:bg-red-950/30">

                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  🔴 Limit Reached
                </p>

                <p className="mt-2 text-3xl font-bold text-red-800 dark:text-red-200">
                  {limitReachedCourses.length}
                </p>

                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {limitReachedCourses.length === 1
                    ? "course"
                    : "courses"}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            ATTENDANCE OVERVIEW
        ================================================= */}

        {semester && (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">

            <div className="mb-6">

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Attendance Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                See your absence allowance for each course.
              </p>

            </div>

            {courses.length === 0 ? (

              <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No courses added for this semester.
                </p>

                <a
                  href="/courses"
                  className="mt-3 inline-block text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Add courses →
                </a>

              </div>

            ) : (

              <div className="space-y-4">

                {courses.map(
                  (course) => {

                    const absenceCount =
                      getCourseAbsenceCount(
                        course.id
                      );

                    const remaining =
                      Math.max(
                        course.max_absences -
                          absenceCount,
                        0
                      );

                    const status =
                      getCourseStatus(
                        course
                      );

                    const percentage =
                      course.max_absences >
                      0
                        ? Math.min(
                            (absenceCount /
                              course.max_absences) *
                              100,
                            100
                          )
                        : 0;

                    return (
                      <div
                        key={course.id}
                        className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800"
                      >

                        {/* COURSE NAME + STATUS */}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                          <div>

                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                              {course.name}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {course.code}
                            </p>

                          </div>

                          <span
                            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {status.icon}{" "}
                            {status.label}
                          </span>

                        </div>

                        {/* PROGRESS BAR */}

                        <div className="mt-5">

                          <div className="mb-2 flex items-center justify-between text-sm">

                            <span className="text-slate-500 dark:text-slate-400">
                              Absences used
                            </span>

                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {absenceCount} /{" "}
                              {course.max_absences}
                            </span>

                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">

                            <div
                              className={`h-full rounded-full transition-all ${
                                remaining === 0
                                  ? "bg-red-500"
                                  : remaining <= 2
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>

                        {/* REMAINING ABSENCES */}

                        <div className="mt-4 flex items-center justify-between">

                          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {remaining}{" "}
                            {remaining === 1
                              ? "absence"
                              : "absences"}{" "}
                            remaining
                          </p>

                          {remaining === 0 && (
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                              No more absences
                            </p>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            )}

          </div>
        )}

        {/* =================================================
            RECOVERY RECOMMENDATIONS
        ================================================= */}

        {semester &&
          courses.length > 0 && (
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">

              <div className="mb-6">

                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Recovery Recommendations
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Simple guidance based on your
                  current absence limits.
                </p>

              </div>

              <div className="space-y-4">

                {limitReachedCourses.map(
                  (course) => (
                    <div
                      key={`limit-${course.id}`}
                      className="rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30"
                    >

                      <div className="flex items-start gap-4">

                        <span className="text-2xl">
                          🔴
                        </span>

                        <div>

                          <h3 className="font-semibold text-red-800 dark:text-red-300">
                            {course.name}
                          </h3>

                          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                            You have reached the maximum
                            absence limit. Avoid further
                            absences in this course.
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

                {warningCourses.map(
                  (course) => {

                    const remaining =
                      Math.max(
                        course.max_absences -
                          getCourseAbsenceCount(
                            course.id
                          ),
                        0
                      );

                    return (
                      <div
                        key={`warning-${course.id}`}
                        className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-900 dark:bg-yellow-950/30"
                      >

                        <div className="flex items-start gap-4">

                          <span className="text-2xl">
                            🟡
                          </span>

                          <div>

                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                              {course.name}
                            </h3>

                            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                              Only{" "}
                              <span className="font-semibold">
                                {remaining}
                              </span>{" "}
                              {remaining === 1
                                ? "absence"
                                : "absences"}{" "}
                              remaining. Try to avoid
                              unnecessary absences.
                            </p>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

                {safeCourses.length > 0 &&
                  limitReachedCourses.length === 0 &&
                  warningCourses.length === 0 && (

                    <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/30">

                      <div className="flex items-start gap-4">

                        <span className="text-2xl">
                          🟢
                        </span>

                        <div>

                          <h3 className="font-semibold text-green-800 dark:text-green-300">
                            You're doing well
                          </h3>

                          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                            All of your courses currently
                            have a comfortable absence
                            allowance.
                          </p>

                        </div>

                      </div>

                    </div>

                  )}

              </div>

            </div>
          )}

        {/* =================================================
            RECENT ABSENCES
        ================================================= */}

        <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900 dark:shadow-none">

          <button
            type="button"
            onClick={() =>
              setShowRecentAbsences(
                (current) => !current
              )
            }
            className="flex w-full items-center justify-between p-6 text-left"
            aria-expanded={showRecentAbsences}
          >
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Recent Absences
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {absences.length === 0
                  ? "No absences recorded for the current semester."
                  : `${Math.min(absences.length, 5)} recent ${Math.min(absences.length, 5) === 1 ? "absence" : "absences"}`}
              </p>
            </div>

            <span className="ml-4 text-xl text-slate-500 dark:text-slate-400">
              {showRecentAbsences ? "▲" : "▼"}
            </span>
          </button>

          {showRecentAbsences && (
            <div className="border-t border-slate-200 px-6 pb-6 pt-4 dark:border-slate-700">

              {absences.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No absences recorded for the current semester.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {absences
                    .slice(0, 5)
                    .map((absence) => (
                      <div
                        key={absence.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {getCourseName(absence.course_id)}
                          </p>

                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {getCourseCode(absence.course_id)}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {absence.date}
                          </p>

                          {absence.note && (
                            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                              {absence.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <a
                href="/absences"
                className="mt-4 inline-block text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                View all absences →
              </a>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}