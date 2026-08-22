"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  name: string;
  code: string;
  instructor: string | null;
  max_absences: number;
  absence_count: number;
};

type Semester = {
  id: string;
  name: string;
};

type Absence = {
  id: string;
  course_id: string;
};

export default function CoursesPage() {
  const supabase = createClient();

  const [semester, setSemester] =
    useState<Semester | null>(null);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [instructor, setInstructor] =
    useState("");
  const [maxAbsences, setMaxAbsences] =
    useState("0");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      return;
    }

    // -------------------------------------------------------
    // 1. GET ACTIVE SEMESTER
    // -------------------------------------------------------

    const {
      data: semesterData,
      error: semesterError,
    } = await supabase
      .from("semesters")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (semesterError) {
      setMessage(semesterError.message);
      return;
    }

    // -------------------------------------------------------
    // 2. NO ACTIVE SEMESTER
    // -------------------------------------------------------

    if (!semesterData) {
      setSemester(null);
      setCourses([]);

      setMessage(
        "Please create or activate a semester first."
      );

      return;
    }

    setSemester(semesterData);

    // -------------------------------------------------------
    // 3. GET COURSES FOR ACTIVE SEMESTER ONLY
    // -------------------------------------------------------

    const {
      data: courseData,
      error: courseError,
    } = await supabase
      .from("courses")
      .select(
        "id, name, code, instructor, max_absences"
      )
      .eq("user_id", user.id)
      .eq(
        "semester_id",
        semesterData.id
      )
      .order("name");

    if (courseError) {
      setMessage(courseError.message);
      return;
    }

    const coursesList =
      courseData ?? [];

    // -------------------------------------------------------
    // 4. GET ABSENCES FOR ACTIVE SEMESTER COURSES ONLY
    // -------------------------------------------------------

    let absences: Absence[] = [];

    if (coursesList.length > 0) {
      const courseIds =
        coursesList.map(
          (course) => course.id
        );

      const {
        data: absenceData,
        error: absenceError,
      } = await supabase
        .from("absences")
        .select("id, course_id")
        .eq("user_id", user.id)
        .in("course_id", courseIds);

      if (absenceError) {
        setMessage(absenceError.message);
        return;
      }

      absences =
        absenceData ?? [];
    }

    // -------------------------------------------------------
    // 5. COUNT ABSENCES FOR EACH COURSE
    // -------------------------------------------------------

    const coursesWithCounts:
      Course[] =
      coursesList.map((course) => {
        const absenceCount =
          absences.filter(
            (absence) =>
              absence.course_id ===
              course.id
          ).length;

        return {
          ...course,
          absence_count:
            absenceCount,
        };
      });

    setCourses(
      coursesWithCounts
    );
  }

  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {
    setName("");
    setCode("");
    setInstructor("");
    setMaxAbsences("0");
    setEditingId(null);
  }

  // =========================================================
  // START EDITING
  // =========================================================

  function startEditing(
    course: Course
  ) {
    setEditingId(course.id);
    setName(course.name);
    setCode(course.code);
    setInstructor(
      course.instructor ?? ""
    );
    setMaxAbsences(
      String(course.max_absences)
    );

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================================================
  // CREATE / UPDATE COURSE
  // =========================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "You are not logged in."
      );
      setLoading(false);
      return;
    }

    if (!semester) {
      setMessage(
        "Please create or activate a semester first."
      );
      setLoading(false);
      return;
    }

    const trimmedName =
      name.trim();

    const trimmedCode =
      code.trim();

    const trimmedInstructor =
      instructor.trim();

    const parsedMaxAbsences =
      Number(maxAbsences);

    if (!trimmedName) {
      setMessage(
        "Course name is required."
      );
      setLoading(false);
      return;
    }

    if (!trimmedCode) {
      setMessage(
        "Course code is required."
      );
      setLoading(false);
      return;
    }

    if (
      !Number.isInteger(
        parsedMaxAbsences
      ) ||
      parsedMaxAbsences < 0
    ) {
      setMessage(
        "Maximum allowed absences must be a non-negative whole number."
      );
      setLoading(false);
      return;
    }

    // =======================================================
    // UPDATE
    // =======================================================

    if (editingId) {
      const currentCourse =
        courses.find(
          (course) =>
            course.id ===
            editingId
        );

      if (!currentCourse) {
        setMessage(
          "Course not found."
        );
        setLoading(false);
        return;
      }

      // Don't allow changing the limit
      // below the number of absences
      // already recorded.
      if (
        parsedMaxAbsences <
        currentCourse.absence_count
      ) {
        setMessage(
          `Maximum allowed absences cannot be less than the ${currentCourse.absence_count} absences already recorded for this course.`
        );
        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("courses")
        .update({
          name: trimmedName,
          code: trimmedCode,
          instructor:
            trimmedInstructor ||
            null,
          max_absences:
            parsedMaxAbsences,
        })
        .eq("id", editingId)
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "semester_id",
          semester.id
        )
        .select(
          "id, name, code, instructor, max_absences"
        )
        .single();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setCourses(
        (currentCourses) =>
          currentCourses.map(
            (course) =>
              course.id ===
              editingId
                ? {
                    ...data,
                    absence_count:
                      course.absence_count,
                  }
                : course
          )
      );

      setMessage(
        "Course updated successfully!"
      );

      resetForm();
      setLoading(false);
      return;
    }

    // =======================================================
    // CREATE
    // =======================================================

    const {
      data,
      error,
    } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        semester_id:
          semester.id,
        name: trimmedName,
        code: trimmedCode,
        instructor:
          trimmedInstructor ||
          null,
        max_absences:
          parsedMaxAbsences,
      })
      .select(
        "id, name, code, instructor, max_absences"
      )
      .single();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const newCourse: Course = {
      ...data,
      absence_count: 0,
    };

    setCourses(
      (currentCourses) =>
        [...currentCourses, newCourse].sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        )
    );

    setMessage(
      "Course created successfully!"
    );

    resetForm();
    setLoading(false);
  }

  // =========================================================
  // DELETE COURSE
  // =========================================================

  async function handleDelete(
    course: Course
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete "${course.name}"?\n\nThis course has ${course.absence_count} recorded absence(s).`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(course.id);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "You are not logged in."
      );
      setDeletingId(null);
      return;
    }

    if (!semester) {
      setMessage(
        "There is no active semester."
      );
      setDeletingId(null);
      return;
    }

    // -------------------------------------------------------
    // Check for absence history.
    //
    // We deliberately do NOT automatically delete
    // absence records.
    // -------------------------------------------------------

    const {
      count,
      error: absenceError,
    } = await supabase
      .from("absences")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "course_id",
        course.id
      );

    if (absenceError) {
      setMessage(
        absenceError.message
      );
      setDeletingId(null);
      return;
    }

    if ((count ?? 0) > 0) {
      setMessage(
        `Cannot delete "${course.name}" because it has ${count} recorded absence(s). Edit the course instead, or remove its absence records first.`
      );
      setDeletingId(null);
      return;
    }

    // -------------------------------------------------------
    // DELETE COURSE
    // -------------------------------------------------------

    const { error } =
      await supabase
        .from("courses")
        .delete()
        .eq(
          "id",
          course.id
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "semester_id",
          semester.id
        );

    if (error) {
      console.error(
        "DELETE COURSE ERROR:",
        error
      );

      setMessage(
        `Unable to delete course: ${error.message}`
      );

      setDeletingId(null);
      return;
    }

    setCourses(
      (currentCourses) =>
        currentCourses.filter(
          (item) =>
            item.id !==
            course.id
        )
    );

    if (
      editingId === course.id
    ) {
      resetForm();
    }

    setMessage(
      "Course deleted successfully."
    );

    setDeletingId(null);
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">

      <div className="mx-auto w-full max-w-5xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">

          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Courses
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Manage courses for your active semester
          </p>

        </div>

        {/* =================================================
            ACTIVE SEMESTER
        ================================================= */}

        {semester ? (

          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 dark:shadow-none">

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Active Semester
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {semester.name}
            </h2>

          </div>

        ) : (

          <div className="mb-6 rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">

            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              No Active Semester
            </h2>

            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Create or activate a semester
              before managing courses.
            </p>

            <a
              href="/semester"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Manage Semesters
            </a>

          </div>
        )}

        {semester && (

          <div className="grid gap-6 lg:grid-cols-2">

            {/* =================================================
                ADD / EDIT COURSE
            ================================================= */}

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900 dark:shadow-none">

              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {editingId
                  ? "Edit Course"
                  : "Add Course"}
              </h2>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >

                {/* COURSE NAME */}

                <div>

                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Course Name
                  </label>

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    required
                    placeholder="e.g. Computer Networks"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
                  />

                </div>

                {/* COURSE CODE */}

                <div>

                  <label
                    htmlFor="code"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Course Code
                  </label>

                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                      )
                    }
                    required
                    placeholder="e.g. CS301"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
                  />

                </div>

                {/* INSTRUCTOR */}

                <div>

                  <label
                    htmlFor="instructor"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Instructor
                  </label>

                  <input
                    id="instructor"
                    type="text"
                    value={instructor}
                    onChange={(event) =>
                      setInstructor(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Dr. Sharma"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
                  />

                </div>

                {/* MAX ABSENCES */}

                <div>

                  <label
                    htmlFor="maxAbsences"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Maximum Allowed Absences
                  </label>

                  <input
                    id="maxAbsences"
                    type="number"
                    min="0"
                    step="1"
                    value={maxAbsences}
                    onChange={(event) =>
                      setMaxAbsences(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  />

                  {editingId && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      The limit cannot be
                      reduced below the
                      number of absences
                      already recorded.
                    </p>
                  )}

                </div>

                {/* BUTTONS */}

                <div className="flex gap-3">

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    {loading
                      ? editingId
                        ? "Saving..."
                        : "Creating..."
                      : editingId
                      ? "Save Changes"
                      : "Create Course"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setMessage("");
                      }}
                      disabled={loading}
                      className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

              {message && (
                <p className="mt-5 whitespace-pre-line rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {message}
                </p>
              )}

            </div>

            {/* =================================================
                YOUR COURSES
            ================================================= */}

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900 dark:shadow-none">

              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Your Courses
              </h2>

              {courses.length === 0 ? (

                <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">

                  <p className="text-slate-500 dark:text-slate-400">
                    No courses added yet.
                  </p>

                  <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                    Add your first course
                    using the form.
                  </p>

                </div>

              ) : (

                <div className="space-y-4">

                  {courses.map(
                    (course) => {

                      const remaining =
                        Math.max(
                          course.max_absences -
                            course.absence_count,
                          0
                        );

                      const limitReached =
                        course.absence_count >=
                        course.max_absences;

                      const gettingClose =
                        !limitReached &&
                        remaining <= 2;

                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800"
                        >

                          {/* COURSE HEADER */}

                          <div className="flex items-start justify-between gap-4">

                            <div className="min-w-0">

                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {course.name}
                              </h3>

                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Code:{" "}
                                {course.code}
                              </p>

                              {course.instructor && (
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  Instructor:{" "}
                                  {
                                    course.instructor
                                  }
                                </p>
                              )}

                            </div>

                            {/* STATUS */}

                            {limitReached ? (

                              <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                                Limit Reached
                              </span>

                            ) : gettingClose ? (

                              <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                                Getting Close
                              </span>

                            ) : (

                              <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                                Safe
                              </span>

                            )}

                          </div>

                          {/* ABSENCE INFORMATION */}

                          <div className="mt-4 space-y-2">

                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              Maximum allowed
                              absences:{" "}
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {
                                  course.max_absences
                                }
                              </span>
                            </p>

                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              Absences taken:{" "}
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {
                                  course.absence_count
                                }
                              </span>
                            </p>

                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              Remaining
                              absences:{" "}
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {remaining}
                              </span>
                            </p>

                          </div>

                          {/* LIMIT MESSAGE */}

                          {limitReached && (
                            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
                              Maximum absence
                              limit reached.
                            </div>
                          )}

                          {/* WARNING */}

                          {gettingClose && (
                            <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm font-medium text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300">
                              Warning: only{" "}
                              {remaining}{" "}
                              absence
                              {remaining === 1
                                ? ""
                                : "s"}{" "}
                              remaining.
                            </div>
                          )}

                          {/* ACTIONS */}

                          <div className="mt-5 flex gap-3">

                            <button
                              type="button"
                              onClick={() =>
                                startEditing(
                                  course
                                )
                              }
                              disabled={
                                loading ||
                                deletingId ===
                                  course.id
                              }
                              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  course
                                )
                              }
                              disabled={
                                deletingId ===
                                  course.id ||
                                loading
                              }
                              className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              {deletingId ===
                              course.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </div>
        )}

      </div>
    </main>
  );
}