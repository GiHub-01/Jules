"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Semester = {
  id: string;
  name: string;
};

type Course = {
  id: string;
  name: string;
  code: string;
  max_absences: number;
};

type Reason = {
  id: string;
  name: string;
};

type AbsenceRow = {
  id: string;
  course_id: string;
  reason_id: string | null;
  date: string;
  note: string | null;
};

type DisplayAbsence = {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  reasonId: string | null;
  reasonName: string | null;
  date: string;
  note: string | null;
};

export default function AbsencesPage() {
  const supabase = createClient();

  const [semester, setSemester] =
    useState<Semester | null>(null);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [reasons, setReasons] =
    useState<Reason[]>([]);

  const [absences, setAbsences] =
    useState<DisplayAbsence[]>([]);

  // Record/Edit form
  const [courseId, setCourseId] =
    useState("");

  const [reasonId, setReasonId] =
    useState("");

  const [customReason, setCustomReason] =
    useState("");

  const [saveReason, setSaveReason] =
    useState(true);

  const [date, setDate] =
    useState("");

  const [note, setNote] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // Delete state
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] =
    useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // LOAD DATA
  // =========================================================

  async function loadData() {
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
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (semesterError) {
      setMessage(semesterError.message);
      setLoading(false);
      return;
    }

    // -------------------------------------------------------
    // 2. LOAD SAVED REASONS
    //
    // Reasons are user-level data, not semester-level data.
    // Therefore we keep loading all saved reasons.
    // -------------------------------------------------------

    const {
      data: reasonsData,
      error: reasonsError,
    } = await supabase
      .from("absence_reasons")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");

    if (reasonsError) {
      setMessage(reasonsError.message);
      setLoading(false);
      return;
    }

    const reasonsList = reasonsData ?? [];

    setReasons(reasonsList);

    // -------------------------------------------------------
    // 3. NO ACTIVE SEMESTER
    // -------------------------------------------------------

    if (!semesterData) {
      setSemester(null);
      setCourses([]);
      setAbsences([]);

      setMessage(
        "There is no active semester. Create or activate a semester first."
      );

      setLoading(false);
      return;
    }

    // -------------------------------------------------------
    // 4. LOAD ONLY COURSES FROM ACTIVE SEMESTER
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

    const coursesList =
      coursesData ?? [];

    // -------------------------------------------------------
    // 5. LOAD ONLY ABSENCES BELONGING TO
    //    ACTIVE SEMESTER COURSES
    // -------------------------------------------------------

    let absencesList: AbsenceRow[] = [];

    if (coursesList.length > 0) {
      const courseIds =
        coursesList.map(
          (course) => course.id
        );

      const {
        data: absencesData,
        error: absencesError,
      } = await supabase
        .from("absences")
        .select(
          "id, course_id, reason_id, date, note"
        )
        .eq("user_id", user.id)
        .in("course_id", courseIds)
        .order("date", {
          ascending: false,
        });

      if (absencesError) {
        setMessage(absencesError.message);
        setLoading(false);
        return;
      }

      absencesList =
        (absencesData ?? []) as AbsenceRow[];
    }

    // -------------------------------------------------------
    // 6. BUILD DISPLAY ABSENCES
    // -------------------------------------------------------

    const displayAbsences:
      DisplayAbsence[] =
      absencesList.map((absence) => {
        const course =
          coursesList.find(
            (item) =>
              item.id ===
              absence.course_id
          );

        const reason =
          reasonsList.find(
            (item) =>
              item.id ===
              absence.reason_id
          );

        return {
          id: absence.id,
          courseId:
            absence.course_id,
          courseName:
            course?.name ??
            "Unknown course",
          courseCode:
            course?.code ?? "—",
          reasonId:
            absence.reason_id,
          reasonName:
            reason?.name ?? null,
          date: absence.date,
          note: absence.note,
        };
      });

    // -------------------------------------------------------
    // 7. SAVE CURRENT SEMESTER DATA
    // -------------------------------------------------------

    setSemester({
      id: semesterData.id,
      name: semesterData.name,
    });

    setCourses(coursesList);
    setAbsences(displayAbsences);

    setLoading(false);
  }

  // =========================================================
  // GET SELECTED COURSE
  // =========================================================

  function getSelectedCourse() {
    return courses.find(
      (course) =>
        course.id === courseId
    );
  }

  // =========================================================
  // GET ABSENCE COUNT BY COURSE
  // =========================================================

  function getAbsenceCountByCourse(
    courseIdToCheck: string
  ) {
    return absences.filter(
      (absence) =>
        absence.courseId ===
        courseIdToCheck
    ).length;
  }

  const selectedCourse =
    getSelectedCourse();

  const selectedCourseAbsences =
    selectedCourse
      ? getAbsenceCountByCourse(
          selectedCourse.id
        )
      : 0;

  const selectedCourseRemaining =
    selectedCourse
      ? Math.max(
          selectedCourse.max_absences -
            selectedCourseAbsences,
          0
        )
      : 0;

  const limitReached =
    !!selectedCourse &&
    selectedCourseAbsences >=
      selectedCourse.max_absences;

  const gettingClose =
    !!selectedCourse &&
    !limitReached &&
    selectedCourseRemaining <= 2;

  const courseStatus = limitReached
    ? "Limit Reached"
    : gettingClose
    ? "Getting Close"
    : "Safe";

  // =========================================================
  // ABSENCE SUMMARY
  // =========================================================

  const totalAbsences = absences.length;

  const coursesAtLimit = courses.filter((course) => {
    return (
      getAbsenceCountByCourse(course.id) >=
      course.max_absences
    );
  }).length;

  const coursesGettingClose = courses.filter((course) => {
    const count = getAbsenceCountByCourse(course.id);
    const remaining = Math.max(
      course.max_absences - count,
      0
    );

    return remaining > 0 && remaining <= 2;
  }).length;

  const totalRemainingAbsences = courses.reduce(
    (total, course) => {
      const count = getAbsenceCountByCourse(course.id);

      return (
        total +
        Math.max(
          course.max_absences - count,
          0
        )
      );
    },
    0
  );

  // =========================================================
  // RESET FORM
  // =========================================================

  function resetForm() {
    setCourseId("");
    setReasonId("");
    setCustomReason("");
    setDate("");
    setNote("");
    setEditingId(null);
    setMessage("");
  }

  // =========================================================
  // CREATE ABSENCE
  // =========================================================

  async function handleCreateAbsence(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // Absolutely require an active semester.
    if (!semester) {
      setMessage(
        "There is no active semester. Create or activate a semester first."
      );
      return;
    }

    if (!courseId) {
      setMessage(
        "Please select a course."
      );
      return;
    }

    if (!date) {
      setMessage(
        "Please select a date."
      );
      return;
    }

    const course = courses.find(
      (item) =>
        item.id === courseId
    );

    if (!course) {
      setMessage(
        "Please select a valid course."
      );
      return;
    }

    const currentAbsenceCount =
      getAbsenceCountByCourse(
        course.id
      );

    if (
      currentAbsenceCount >=
      course.max_absences
    ) {
      setMessage(
        `Maximum absence limit reached for ${course.name}.`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "Please log in first."
      );
      setSaving(false);
      return;
    }

    let finalReasonId:
      string | null =
      reasonId || null;

    const trimmedCustomReason =
      customReason.trim();

    let finalNote =
      note.trim() || null;

    // -------------------------------------------------------
    // CUSTOM REASON
    // -------------------------------------------------------

    if (trimmedCustomReason) {
      const existingReason =
        reasons.find(
          (reason) =>
            reason.name.toLowerCase() ===
            trimmedCustomReason.toLowerCase()
        );

      if (existingReason) {
        finalReasonId =
          existingReason.id;
      } else if (saveReason) {
        const {
          data: newReason,
          error: reasonError,
        } = await supabase
          .from("absence_reasons")
          .insert({
            user_id: user.id,
            name: trimmedCustomReason,
          })
          .select("id, name")
          .single();

        if (reasonError) {
          setMessage(
            reasonError.message
          );
          setSaving(false);
          return;
        }

        finalReasonId =
          newReason.id;

        setReasons((current) =>
          [...current, newReason].sort(
            (a, b) =>
              a.name.localeCompare(
                b.name
              )
          )
        );
      } else {
        finalReasonId = null;

        finalNote = finalNote
          ? `Reason: ${trimmedCustomReason}\n${finalNote}`
          : `Reason: ${trimmedCustomReason}`;
      }
    }

    // -------------------------------------------------------
    // INSERT ABSENCE
    // -------------------------------------------------------

    const { error } =
      await supabase
        .from("absences")
        .insert({
          user_id: user.id,
          course_id: courseId,
          reason_id: finalReasonId,
          date,
          note: finalNote,
        });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setCourseId("");
    setReasonId("");
    setCustomReason("");
    setDate("");
    setNote("");

    setMessage(
      "Absence recorded successfully!"
    );

    await loadData();

    setSaving(false);
  }

  // =========================================================
  // START EDITING
  // =========================================================

  function handleStartEdit(
    absence: DisplayAbsence
  ) {
    setEditingId(absence.id);

    setCourseId(
      absence.courseId
    );

    setReasonId(
      absence.reasonId ?? ""
    );

    setCustomReason("");
    setDate(absence.date);
    setNote(absence.note ?? "");

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================================================
  // CANCEL EDIT
  // =========================================================

  function handleCancelEdit() {
    resetForm();
  }

  // =========================================================
  // UPDATE ABSENCE
  // =========================================================

  async function handleUpdateAbsence(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!semester) {
      setMessage(
        "There is no active semester. Activate a semester first."
      );
      return;
    }

    if (!editingId) {
      return;
    }

    if (!courseId) {
      setMessage(
        "Please select a course."
      );
      return;
    }

    if (!date) {
      setMessage(
        "Please select a date."
      );
      return;
    }

    const course = courses.find(
      (item) =>
        item.id === courseId
    );

    if (!course) {
      setMessage(
        "Please select a valid course."
      );
      return;
    }

    // The current absence is excluded
    // from the target course count.
    const absenceCountForTargetCourse =
      absences.filter(
        (absence) =>
          absence.courseId ===
            course.id &&
          absence.id !== editingId
      ).length;

    if (
      absenceCountForTargetCourse >=
      course.max_absences
    ) {
      setMessage(
        `Maximum absence limit reached for ${course.name}.`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "Please log in first."
      );
      setSaving(false);
      return;
    }

    let finalReasonId:
      string | null =
      reasonId || null;

    const trimmedCustomReason =
      customReason.trim();

    let finalNote =
      note.trim() || null;

    // -------------------------------------------------------
    // CUSTOM REASON
    // -------------------------------------------------------

    if (trimmedCustomReason) {
      const existingReason =
        reasons.find(
          (reason) =>
            reason.name.toLowerCase() ===
            trimmedCustomReason.toLowerCase()
        );

      if (existingReason) {
        finalReasonId =
          existingReason.id;
      } else if (saveReason) {
        const {
          data: newReason,
          error: reasonError,
        } = await supabase
          .from("absence_reasons")
          .insert({
            user_id: user.id,
            name: trimmedCustomReason,
          })
          .select("id, name")
          .single();

        if (reasonError) {
          setMessage(
            reasonError.message
          );
          setSaving(false);
          return;
        }

        finalReasonId =
          newReason.id;

        setReasons((current) =>
          [...current, newReason].sort(
            (a, b) =>
              a.name.localeCompare(
                b.name
              )
          )
        );
      } else {
        finalReasonId = null;

        finalNote = finalNote
          ? `Reason: ${trimmedCustomReason}\n${finalNote}`
          : `Reason: ${trimmedCustomReason}`;
      }
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const { error } =
      await supabase
        .from("absences")
        .update({
          course_id: courseId,
          reason_id: finalReasonId,
          date,
          note: finalNote,
        })
        .eq("id", editingId)
        .eq("user_id", user.id);

    if (error) {
      console.error(
        "UPDATE ABSENCE ERROR:",
        error
      );

      setMessage(
        `Unable to update absence: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Absence updated successfully!"
    );

    resetForm();

    await loadData();

    setSaving(false);
  }

  // =========================================================
  // DELETE ABSENCE
  // =========================================================

  async function handleDeleteAbsence(
    absenceId: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this absence?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(absenceId);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please log in first.");
      setDeletingId(null);
      return;
    }

    const { error } =
      await supabase
        .from("absences")
        .delete()
        .eq("id", absenceId)
        .eq("user_id", user.id);

    if (error) {
      console.error(
        "DELETE ABSENCE ERROR:",
        error
      );

      setMessage(
        `Unable to delete absence: ${error.message}`
      );

      setDeletingId(null);
      return;
    }

    setAbsences((current) =>
      current.filter(
        (absence) =>
          absence.id !== absenceId
      )
    );

    if (editingId === absenceId) {
      resetForm();
    }

    setMessage(
      "Absence deleted successfully."
    );

    setDeletingId(null);
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-slate-500 dark:text-slate-400">
            Loading absences...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">

      <div className="mx-auto w-full max-w-6xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-10">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                Absences
              </h1>

              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Record and manage your absences
              </p>
            </div>

            {semester && (
              <div className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                {semester.name} · Active
              </div>
            )}

          </div>

        </div>

        {/* =================================================
            ABSENCE SUMMARY
        ================================================= */}

        {semester && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total Absences
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {totalAbsences}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Remaining Absences
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {totalRemainingAbsences}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Across all courses
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Getting Close
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {coursesGettingClose}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                2 or fewer remaining
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Limit Reached
              </p>

              <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                {coursesAtLimit}
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Courses at maximum
              </p>
            </div>

          </div>
        )}

        {/* =================================================
            NO ACTIVE SEMESTER
        ================================================= */}

        {!semester ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">

            <div className="mx-auto max-w-lg">

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                No Active Semester
              </h2>

              <p className="mt-3 text-slate-500 dark:text-slate-400">
                There is currently no active semester.
                Your previous semester absences are
                preserved, but they are not shown here.
              </p>

              <a
                href="/semester"
                className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Manage Semesters
              </a>

            </div>

          </div>
        ) : (

          <div className="grid gap-6 md:grid-cols-2">

            {/* =================================================
                RECORD / EDIT ABSENCE
            ================================================= */}

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">

              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {editingId
                  ? "Edit Absence"
                  : "Record Absence"}
              </h2>

              <form
                onSubmit={
                  editingId
                    ? handleUpdateAbsence
                    : handleCreateAbsence
                }
                className="space-y-5"
              >

                {/* COURSE */}

                <div>

                  <label
                    htmlFor="course"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Course
                  </label>

                  <select
                    id="course"
                    value={courseId}
                    onChange={(event) =>
                      setCourseId(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  >

                    <option value="">
                      Select a course
                    </option>

                    {courses.map(
                      (course) => {
                        const count =
                          getAbsenceCountByCourse(
                            course.id
                          );

                        const adjustedCount =
                          editingId &&
                          course.id ===
                            courseId
                            ? Math.max(
                                count - 1,
                                0
                              )
                            : count;

                        const remaining =
                          Math.max(
                            course.max_absences -
                              adjustedCount,
                            0
                          );

                        return (
                          <option
                            key={
                              course.id
                            }
                            value={
                              course.id
                            }
                          >
                            {course.name} (
                            {course.code}) —{" "}
                            {remaining}{" "}
                            remaining
                          </option>
                        );
                      }
                    )}

                  </select>

                  {courses.length === 0 && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      No courses found for{" "}
                      {semester.name}.
                      Add a course first.
                    </p>
                  )}

                  {/* SELECTED COURSE STATUS */}

                  {selectedCourse && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">

                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Maximum allowed:{" "}
                        <strong className="text-slate-900 dark:text-slate-100">
                          {
                            selectedCourse.max_absences
                          }
                        </strong>
                      </p>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Absences taken:{" "}
                        <strong className="text-slate-900 dark:text-slate-100">
                          {editingId
                            ? Math.max(
                                selectedCourseAbsences -
                                  (selectedCourse.id ===
                                  absences.find(
                                    (
                                      absence
                                    ) =>
                                      absence.id ===
                                      editingId
                                  )?.courseId
                                    ? 1
                                    : 0),
                                0
                              )
                            : selectedCourseAbsences}
                        </strong>
                      </p>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Remaining:{" "}
                        <strong className="text-slate-900 dark:text-slate-100">
                          {editingId &&
                          selectedCourse.id ===
                            absences.find(
                              (
                                absence
                              ) =>
                                absence.id ===
                                editingId
                            )?.courseId
                            ? selectedCourse.max_absences -
                              Math.max(
                                selectedCourseAbsences -
                                  1,
                                0
                              )
                            : selectedCourseRemaining}
                        </strong>
                      </p>

                      {!limitReached &&
                        !gettingClose && (
                          <p className="mt-3 text-sm font-semibold text-green-600 dark:text-green-400">
                            🟢{" "}
                            {courseStatus}
                          </p>
                        )}

                      {gettingClose && (
                        <p className="mt-3 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                          🟡{" "}
                          {courseStatus}
                        </p>
                      )}

                      {limitReached && (
                        <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">
                          🔴{" "}
                          {courseStatus}
                        </p>
                      )}

                      {limitReached && (
                        <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
                          Maximum absence
                          limit reached
                          for this course.
                        </p>
                      )}

                      {gettingClose && (
                        <p className="mt-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          Warning: only{" "}
                          {
                            selectedCourseRemaining
                          }{" "}
                          {selectedCourseRemaining ===
                          1
                            ? "absence"
                            : "absences"}{" "}
                          remaining.
                        </p>
                      )}

                    </div>
                  )}

                </div>

                {/* DATE */}

                <div>

                  <label
                    htmlFor="date"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Date
                  </label>

                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(
                        event.target.value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  />

                </div>

                {/* SAVED REASON */}

                <div>

                  <label
                    htmlFor="reason"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Select Saved Reason
                  </label>

                  <select
                    id="reason"
                    value={reasonId}
                    onChange={(event) => {
                      setReasonId(
                        event.target.value
                      );
                      setCustomReason("");
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
                  >

                    <option value="">
                      Select a saved reason
                    </option>

                    {reasons.map(
                      (reason) => (
                        <option
                          key={reason.id}
                          value={reason.id}
                        >
                          {reason.name}
                        </option>
                      )
                    )}

                  </select>

                  {reasons.length ===
                    0 && (
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      No saved reasons
                      yet. You can write
                      a new reason below.
                    </p>
                  )}

                </div>

                {/* CUSTOM REASON */}

                <div>

                  <label
                    htmlFor="customReason"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Write a New Reason
                  </label>

                  <input
                    id="customReason"
                    type="text"
                    value={customReason}
                    onChange={(event) => {
                      setCustomReason(
                        event.target.value
                      );
                      setReasonId("");
                    }}
                    placeholder="e.g. Medical appointment"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
                  />

                  <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">

                    <input
                      type="checkbox"
                      checked={saveReason}
                      onChange={(event) =>
                        setSaveReason(
                          event.target.checked
                        )
                      }
                      className="accent-slate-900 dark:accent-slate-400"
                    />

                    Save this reason
                    for future use

                  </label>

                </div>

                {/* NOTE */}

                <div>

                  <label
                    htmlFor="note"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Note
                  </label>

                  <textarea
                    id="note"
                    value={note}
                    onChange={(event) =>
                      setNote(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional note"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
                  />

                </div>

                {/* BUTTONS */}

                <div className="flex gap-3">

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      courses.length ===
                        0 ||
                      (!editingId &&
                        limitReached)
                    }
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {saving
                      ? editingId
                        ? "Saving Changes..."
                        : "Saving..."
                      : editingId
                      ? "Save Changes"
                      : limitReached
                      ? "Absence Limit Reached"
                      : "Record Absence"}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={
                        handleCancelEdit
                      }
                      disabled={saving}
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
                CURRENT SEMESTER ABSENCES
            ================================================= */}

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">

              <div className="mb-6">

                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  Your Absences
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Showing absences only for{" "}
                  <strong>
                    {semester.name}
                  </strong>
                </p>

              </div>

              {absences.length ===
              0 ? (

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No absences recorded for
                  the current semester.
                </p>

              ) : (

                <div className="space-y-4">

                  {absences.map(
                    (absence) => (
                      <div
                        key={absence.id}
                        className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800"
                      >

                        <div className="flex items-start justify-between gap-4">

                          {/* ABSENCE INFORMATION */}

                          <div className="min-w-0">

                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                              {
                                absence.courseName
                              }
                            </h3>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Code:{" "}
                              {
                                absence.courseCode
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Date:{" "}
                              {absence.date}
                            </p>

                            {absence.reasonName && (
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Reason:{" "}
                                {
                                  absence.reasonName
                                }
                              </p>
                            )}

                            {absence.note && (
                              <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                                Note:{" "}
                                {absence.note}
                              </p>
                            )}

                          </div>

                          {/* ACTION BUTTONS */}

                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">

                            <button
                              type="button"
                              onClick={() =>
                                handleStartEdit(
                                  absence
                                )
                              }
                              disabled={
                                saving ||
                                deletingId ===
                                  absence.id
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteAbsence(
                                  absence.id
                                )
                              }
                              disabled={
                                deletingId ===
                                  absence.id ||
                                saving
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              {deletingId ===
                              absence.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </div>

                        </div>

                      </div>
                    )
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