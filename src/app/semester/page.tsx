  "use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  TimetableEntry,
  TimetableCourse,
} from "./timetable-types";
import TimetableForm from "./TimetableForm";
import TimetableGrid from "./TimetableGrid";

type Semester = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type Course = {
  id: string;
  name: string;
  code: string;
  instructor: string | null;
  max_absences: number;
};

type Absence = {
  id: string;
  course_id: string;
};

type TimetableDaySchedule = {
  day: number;
  startTime: string;
  endTime: string;
  venue: string;
};

export default function SemesterPage() {
  const supabase = createClient();

  const [semester, setSemester] =
    useState<Semester | null>(null);

  const [semesters, setSemesters] =
    useState<Semester[]>([]);

  const [selectedSemester, setSelectedSemester] =
    useState<Semester | null>(null);

  const [selectedCourses, setSelectedCourses] =
    useState<Course[]>([]);

  const [selectedAbsences, setSelectedAbsences] =
    useState<Absence[]>([]);

  const [timetableEntries, setTimetableEntries] =
    useState<TimetableEntry[]>([]);

  const [timetableCourses, setTimetableCourses] =
    useState<TimetableCourse[]>([]);

  const [timetableLoading, setTimetableLoading] =
    useState(false);

const [showTimetableForm, setShowTimetableForm] =
  useState(false);

const [editingTimetableEntry, setEditingTimetableEntry] =
  useState<TimetableEntry | null>(null);

const [timetableCourseId, setTimetableCourseId] =
  useState("");

const [timetableDays, setTimetableDays] =
  useState<number[]>([]);

const [timetableStartTime, setTimetableStartTime] =
  useState("");

const [timetableEndTime, setTimetableEndTime] =
  useState("");

const [timetableVenue, setTimetableVenue] =
  useState("");

const [timetableNotes, setTimetableNotes] =
  useState("");

const [timetableSaving, setTimetableSaving] =
  useState(false);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(false);

  const [activatingId, setActivatingId] =
    useState<string | null>(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  // =========================================================
  // LOAD ALL SEMESTERS
  // =========================================================

  async function loadSemesters() {
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("semesters")
      .select(
        "id, name, start_date, end_date, is_active"
      )
      .eq("user_id", user.id)
      .order("start_date", {
        ascending: false,
        nullsFirst: false,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    const semesterList = data ?? [];

    setSemesters(semesterList);

    const activeSemester =
      semesterList.find(
        (item) => item.is_active
      ) ?? null;

    setSemester(activeSemester);

    if (activeSemester) {
      await loadTimetable(activeSemester.id);

      const {
        data: activeCourseData,
        error: activeCourseError,
      } = await supabase
        .from("courses")
        .select(
          "id, name, code, instructor, max_absences"
        )
        .eq("user_id", user.id)
        .eq("semester_id", activeSemester.id)
        .order("name");

      if (activeCourseError) {
        setMessage(
          `Failed to load current semester courses: ${activeCourseError.message}`
        );
        setSelectedCourses([]);
      } else {
        setSelectedCourses(activeCourseData ?? []);
      }
    } else {
      setTimetableEntries([]);
      setTimetableCourses([]);
      setSelectedCourses([]);
    }
  }

  // =========================================================
  // LOAD TIMETABLE FOR SEMESTER
  // =========================================================

  async function loadTimetable(semesterId: string) {
    setTimetableLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTimetableLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("timetable_entries")
      .select(
        `
          id,
          user_id,
          semester_id,
          course_id,
          day_of_week,
          start_time,
          end_time,
          venue,
          notes,
          created_at,
          courses (
            id,
            name,
            code,
            instructor
          )
        `
      )
      .eq("user_id", user.id)
      .eq("semester_id", semesterId)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      setMessage(
        `Failed to load timetable: ${error.message}`
      );
      setTimetableLoading(false);
      return;
    }

    const entries: TimetableEntry[] = [];
    const courses: TimetableCourse[] = [];

    for (const item of data ?? []) {
      const course = item.courses as
        | TimetableCourse
        | TimetableCourse[]
        | null;

      const normalizedCourse = Array.isArray(course)
        ? course[0]
        : course;

      entries.push({
        id: item.id,
        user_id: item.user_id,
        semester_id: item.semester_id,
        course_id: item.course_id,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        venue: item.venue,
        notes: item.notes,
        created_at: item.created_at,
      });

      if (
        normalizedCourse &&
        !courses.some(
          (existing) =>
            existing.id === normalizedCourse.id
        )
      ) {
        courses.push(normalizedCourse);
      }
    }

    setTimetableEntries(entries);
    setTimetableCourses(courses);
    setTimetableLoading(false);
  }

  // =========================================================
  // TIMETABLE CRUD
  // =========================================================

  async function addTimetableEntry(
    semesterId: string,
    courseId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    venue: string,
    notes: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      return false;
    }

    if (endTime <= startTime) {
      setMessage("End time must be later than start time.");
      return false;
    }

    const { error } = await supabase
      .from("timetable_entries")
      .insert({
        user_id: user.id,
        semester_id: semesterId,
        course_id: courseId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        venue: venue.trim() || null,
        notes: notes.trim() || null,
      });

    if (error) {
      setMessage(
        `Failed to add timetable entry: ${error.message}`
      );
      return false;
    }

    await loadTimetable(semesterId);
    return true;
  }

  async function handleAddTimetable(
    courseId: string,
    schedules: TimetableDaySchedule[],
    notes: string
  ) {
    if (!semester) {
      setMessage("No active semester found.");
      return false;
    }

    if (schedules.length === 0) {
      setMessage("Please select at least one day.");
      return false;
    }

    setTimetableSaving(true);
    setMessage("");

    try {
      for (const schedule of schedules) {
        const success = await addTimetableEntry(
          semester.id,
          courseId,
          schedule.day,
          schedule.startTime,
          schedule.endTime,
          schedule.venue,
          notes
        );

        if (!success) {
          return false;
        }
      }

      setMessage(
        "Class added to timetable successfully."
      );
      return true;
    } finally {
      setTimetableSaving(false);
    }
  }

  function getDayName(day: number) {
    const names: Record<number, string> = {
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
    };

    return names[day] ?? "selected day";
  }

  function handleEditTimetable(
    entry: TimetableEntry
  ) {
    setEditingTimetableEntry(entry);
    setShowTimetableForm(true);
    setMessage("");
  }

  function handleCancelTimetableForm() {
    setShowTimetableForm(false);
    setEditingTimetableEntry(null);
  }

  async function handleTimetableSubmit(
    courseId: string,
    schedules: TimetableDaySchedule[],
    notes: string
  ) {
    if (!semester) {
      setMessage("No active semester found.");
      return false;
    }

    if (schedules.length === 0) {
      setMessage("Please select at least one day.");
      return false;
    }

    setTimetableSaving(true);
    setMessage("");

    try {
      if (editingTimetableEntry) {
        const firstSchedule = schedules[0];

        const updated = await updateTimetableEntry(
          editingTimetableEntry.id,
          semester.id,
          courseId,
          firstSchedule.day,
          firstSchedule.startTime,
          firstSchedule.endTime,
          firstSchedule.venue,
          notes
        );

        if (!updated) {
          return false;
        }

        for (const schedule of schedules.slice(1)) {
          const success = await addTimetableEntry(
            semester.id,
            courseId,
            schedule.day,
            schedule.startTime,
            schedule.endTime,
            schedule.venue,
            notes
          );

          if (!success) {
            return false;
          }
        }

        setMessage(
          "Timetable class updated successfully."
        );
        return true;
      }

      return await handleAddTimetable(
        courseId,
        schedules,
        notes
      );
    } finally {
      setTimetableSaving(false);
    }
  }

  async function handleDeleteTimetable(
    entry: TimetableEntry
  ) {
    if (!semester) {
      setMessage("No active semester found.");
      return;
    }

    const course = timetableCourses.find(
      (item) => item.id === entry.course_id
    );

    const confirmed = window.confirm(
      `Delete "${course?.name ?? "this class"}" from the ${getDayName(
        entry.day_of_week
      )} timetable?\n\nThis cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setTimetableSaving(true);
    setMessage("");

    try {
      const success = await deleteTimetableEntry(
        entry.id,
        semester.id
      );

      if (success) {
        setMessage(
          "Timetable class deleted successfully."
        );
      }
    } finally {
      setTimetableSaving(false);
    }
  }

  async function updateTimetableEntry(
    entryId: string,
    semesterId: string,
    courseId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    venue: string,
    notes: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      return false;
    }

    if (endTime <= startTime) {
      setMessage("End time must be later than start time.");
      return false;
    }

    const { error } = await supabase
      .from("timetable_entries")
      .update({
        semester_id: semesterId,
        course_id: courseId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        venue: venue.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (error) {
      setMessage(
        `Failed to update timetable entry: ${error.message}`
      );
      return false;
    }

    await loadTimetable(semesterId);
    return true;
  }

  async function deleteTimetableEntry(
    entryId: string,
    semesterId: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      return false;
    }

    const { error } = await supabase
      .from("timetable_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);

    if (error) {
      setMessage(
        `Failed to delete timetable entry: ${error.message}`
      );
      return false;
    }

    await loadTimetable(semesterId);
    return true;
  }

  // =========================================================
  // VALIDATE DATES
  // =========================================================

  function validateDates() {
    if (
      startDate &&
      endDate &&
      endDate < startDate
    ) {
      setMessage(
        "End date cannot be before the start date."
      );

      return false;
    }

    return true;
  }

  // =========================================================
  // START EDIT
  // =========================================================

  function handleStartEdit() {
    if (!semester) return;

    setName(semester.name);
    setStartDate(semester.start_date || "");
    setEndDate(semester.end_date || "");

    setMessage("");
    setEditing(true);
    setCreating(false);
    setViewing(false);
  }

  // =========================================================
  // CANCEL EDIT
  // =========================================================

  function handleCancelEdit() {
    setEditing(false);

    setName("");
    setStartDate("");
    setEndDate("");

    setMessage("");
  }

  // =========================================================
  // UPDATE SEMESTER
  // =========================================================

  async function handleUpdateSemester(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!semester) return;

    if (!name.trim()) {
      setMessage(
        "Semester name cannot be empty."
      );
      return;
    }

    if (!validateDates()) {
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("semesters")
      .update({
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .eq("id", semester.id)
      .eq("user_id", user.id)
      .select(
        "id, name, start_date, end_date, is_active"
      )
      .single();

    if (error) {
      setMessage(
        `Failed to update semester: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setSemester(data);

    setSemesters((current) =>
      current.map((item) =>
        item.id === data.id ? data : item
      )
    );

    setName("");
    setStartDate("");
    setEndDate("");

    setEditing(false);

    setMessage(
      "Semester updated successfully!"
    );

    setLoading(false);
  }

  // =========================================================
  // END ACTIVE SEMESTER
  // =========================================================

  async function handleEndSemester() {
    if (!semester) return;

    const confirmed = window.confirm(
      `Are you sure you want to end "${semester.name}"?\n\nYour courses and absence records will NOT be deleted. The semester will only become inactive.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    const {
      error,
    } = await supabase
      .from("semesters")
      .update({
        is_active: false,
      })
      .eq("id", semester.id)
      .eq("user_id", user.id);

    if (error) {
      setMessage(
        `Failed to end semester: ${error.message}`
      );
      setLoading(false);
      return;
    }

    const endedSemester = {
      ...semester,
      is_active: false,
    };

    setSemester(null);

    setSemesters((current) =>
      current.map((item) =>
        item.id === semester.id
          ? endedSemester
          : item
      )
    );

    setEditing(false);
    setCreating(false);

    setName("");
    setStartDate("");
    setEndDate("");

    setMessage(
      `${semester.name} has been ended. Your historical data is preserved.`
    );

    setLoading(false);
  }

  // =========================================================
  // START CREATE
  // =========================================================

  function handleStartCreating() {
    setName("");
    setStartDate("");
    setEndDate("");

    setMessage("");
    setCreating(true);
    setEditing(false);
    setViewing(false);
  }

  // =========================================================
  // CANCEL CREATE
  // =========================================================

  function handleCancelCreating() {
    setCreating(false);

    setName("");
    setStartDate("");
    setEndDate("");

    setMessage("");
  }

  // =========================================================
  // CREATE NEW SEMESTER
  // =========================================================

  async function handleCreateSemester(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage(
        "Semester name cannot be empty."
      );
      return;
    }

    if (!validateDates()) {
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    // Safety check: do not create another
    // active semester.
    const {
      data: activeSemester,
      error: activeError,
    } = await supabase
      .from("semesters")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (activeError) {
      setMessage(
        `Unable to check active semester: ${activeError.message}`
      );
      setLoading(false);
      return;
    }

    if (activeSemester) {
      setMessage(
        "You already have an active semester. End it before creating a new one."
      );

      setLoading(false);

      await loadSemesters();

      setCreating(false);

      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("semesters")
      .insert({
        user_id: user.id,
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: true,
      })
      .select(
        "id, name, start_date, end_date, is_active"
      )
      .single();

    if (error) {
      setMessage(
        `Failed to create semester: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setSemester(data);

    setSemesters((current) => [
      data,
      ...current,
    ]);

    setName("");
    setStartDate("");
    setEndDate("");

    setCreating(false);
    setEditing(false);
    setViewing(false);

    setMessage(
      "New semester created successfully!"
    );

    setLoading(false);
  }

  // =========================================================
  // VIEW OLD SEMESTER
  // =========================================================

  async function handleViewSemester(
    semesterToView: Semester
  ) {
    setLoading(true);
    setMessage("");

    setSelectedSemester(semesterToView);
    setSelectedCourses([]);
    setSelectedAbsences([]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    // Load courses belonging to this semester.
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
        semesterToView.id
      )
      .order("name");

    if (courseError) {
      setMessage(courseError.message);
      setLoading(false);
      return;
    }

    const courses = courseData ?? [];

    setSelectedCourses(courses);

    // Load absences for courses in this semester.
    if (courses.length > 0) {
      const courseIds = courses.map(
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
        setLoading(false);
        return;
      }

      setSelectedAbsences(
        absenceData ?? []
      );
    }

    setViewing(true);
    setEditing(false);
    setCreating(false);

    setLoading(false);
  }

  // =========================================================
  // CLOSE SEMESTER VIEW
  // =========================================================

  function handleCloseView() {
    setViewing(false);
    setSelectedSemester(null);
    setSelectedCourses([]);
    setSelectedAbsences([]);
    setMessage("");
  }

  // =========================================================
  // ACTIVATE OLD SEMESTER
  // =========================================================

  async function handleActivateSemester(
    semesterToActivate: Semester
  ) {
    if (semesterToActivate.is_active) {
      return;
    }

    const currentActive =
      semesters.find(
        (item) => item.is_active
      );

    let confirmedMessage =
      `Activate "${semesterToActivate.name}"?`;

    if (currentActive) {
      confirmedMessage =
        `"${currentActive.name}" is currently active.\n\nActivating "${semesterToActivate.name}" will make "${currentActive.name}" inactive.\n\nYour courses and absences will be preserved.\n\nContinue?`;
    }

    const confirmed = window.confirm(
      confirmedMessage
    );

    if (!confirmed) {
      return;
    }

    setActivatingId(
      semesterToActivate.id
    );
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setActivatingId(null);
      return;
    }

    /*
     * Step 1:
     * Deactivate the currently active semester.
     */
    const {
      error: deactivateError,
    } = await supabase
      .from("semesters")
      .update({
        is_active: false,
      })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      setMessage(
        `Failed to switch semester: ${deactivateError.message}`
      );

      setActivatingId(null);
      return;
    }

    /*
     * Step 2:
     * Activate the selected semester.
     */
    const {
      data: activatedSemester,
      error: activateError,
    } = await supabase
      .from("semesters")
      .update({
        is_active: true,
      })
      .eq(
        "id",
        semesterToActivate.id
      )
      .eq("user_id", user.id)
      .select(
        "id, name, start_date, end_date, is_active"
      )
      .single();

    if (activateError) {
      setMessage(
        `The old semester was deactivated, but the selected semester could not be activated: ${activateError.message}`
      );

      setActivatingId(null);

      await loadSemesters();

      return;
    }

    /*
     * Update local state.
     */
    setSemesters((current) =>
      current.map((item) => {
        if (
          item.id ===
          activatedSemester.id
        ) {
          return activatedSemester;
        }

        return {
          ...item,
          is_active: false,
        };
      })
    );

    setSemester(activatedSemester);

    setViewing(false);
    setSelectedSemester(null);
    setSelectedCourses([]);
    setSelectedAbsences([]);

    setMessage(
      `${activatedSemester.name} is now the active semester.`
    );

    setActivatingId(null);
  }

  // =========================================================
  // GET ABSENCE COUNT FOR COURSE
  // =========================================================

  function getCourseAbsenceCount(
    courseId: string
  ) {
    return selectedAbsences.filter(
      (absence) =>
        absence.course_id === courseId
    ).length;
  }

  // =========================================================
  // HISTORICAL SEMESTER SUMMARY
  // =========================================================

  function getSelectedTotalAbsences() {
    return selectedAbsences.length;
  }

  function getSelectedTotalAllowedAbsences() {
    return selectedCourses.reduce(
      (total, course) =>
        total + course.max_absences,
      0
    );
  }

  // =========================================================
  // FORM
  // =========================================================

  function renderSemesterForm() {
    const isEditing = editing;

    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900 dark:shadow-none">

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {isEditing
              ? "Edit Semester"
              : "Create Semester"}
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isEditing
              ? "Update your current semester details."
              : "Create a new active semester."}
          </p>
        </div>

        <form
          onSubmit={
            isEditing
              ? handleUpdateSemester
              : handleCreateSemester
          }
          className="space-y-5"
        >

          {/* NAME */}

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Semester Name
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder="e.g. Semester 5"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
            />
          </div>

          {/* START DATE */}

          <div>
            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Start Date
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          {/* END DATE */}

          <div>
            <label
              htmlFor="endDate"
              className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              End Date
            </label>

            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400"
            />
          </div>

          {/* BUTTONS */}

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {loading
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                ? "Save Changes"
                : "Create Semester"}
            </button>

            <button
              type="button"
              onClick={
                isEditing
                  ? handleCancelEdit
                  : handleCancelCreating
              }
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

          </div>
        </form>

        {message && (
          <p className="mt-5 whitespace-pre-line rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {message}
          </p>
        )}
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-slate-950">

      <div className="mx-auto w-full max-w-5xl">

        {/* HEADER */}

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Semester
          </h1>

          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Create, manage, and view your semesters
          </p>
        </div>

        {/* GLOBAL MESSAGE */}

        {message && !editing && !creating && !viewing && (
          <div className="mb-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {message}
          </div>
        )}

        {/* =================================================
            EDIT / CREATE FORM
        ================================================= */}

        {editing || creating ? (
          renderSemesterForm()
        ) : viewing ? (

          /* =================================================
             SEMESTER HISTORY VIEW
          ================================================= */

          <div className="space-y-6">

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Semester Details
                  </p>

                  <h2 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedSemester?.name}
                  </h2>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Inactive
                </span>

              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Start Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {selectedSemester?.start_date ||
                      "Not set"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    End Date
                  </p>

                  <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                    {selectedSemester?.end_date ||
                      "Not set"}
                  </p>
                </div>

              </div>

              {/* HISTORICAL SUMMARY */}

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Semester Summary
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">

                  {/* COURSES */}

                  <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Courses
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {selectedCourses.length}
                    </p>
                  </div>

                  {/* TOTAL ABSENCES */}

                  <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Total Absences
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {getSelectedTotalAbsences()}
                    </p>
                  </div>

                  {/* TOTAL ALLOWED */}

                  <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Total Allowed
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {getSelectedTotalAllowedAbsences()}
                    </p>
                  </div>

                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={handleCloseView}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ← Back
                </button>

                {selectedSemester && (
                  <button
                    type="button"
                    onClick={() =>
                      handleActivateSemester(
                        selectedSemester
                      )
                    }
                    disabled={
                      activatingId ===
                      selectedSemester.id
                    }
                    className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    {activatingId ===
                    selectedSemester.id
                      ? "Activating..."
                      : "Activate Semester"}
                  </button>
                )}

              </div>
            </div>

            {/* COURSES IN OLD SEMESTER */}

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                Courses
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Courses belonging to this semester
              </p>

              {selectedCourses.length === 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No courses were added to this semester.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">

                  {selectedCourses.map(
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

                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800"
                        >

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                {course.name}
                              </h3>

                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Code: {course.code}
                              </p>

                              {course.instructor && (
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                  Instructor:{" "}
                                  {course.instructor}
                                </p>
                              )}
                            </div>

                            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {absenceCount}{" "}
                              {absenceCount === 1
                                ? "absence"
                                : "absences"}
                            </span>

                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Maximum
                              </p>

                              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {course.max_absences}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Taken
                              </p>

                              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {absenceCount}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Remaining
                              </p>

                              <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                {remaining}
                              </p>
                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              )}

            </div>
          </div>

        ) : (

          /* =================================================
             NORMAL SEMESTER PAGE
          ================================================= */

          <div className="space-y-8">

            {/* ACTIVE SEMESTER */}

            {semester ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Current Semester
                    </p>

                    <h2 className="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                      {semester.name}
                    </h2>
                  </div>

                  <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                    Active
                  </span>

                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">

                  <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Start Date
                    </p>

                    <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                      {semester.start_date ||
                        "Not set"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      End Date
                    </p>

                    <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                      {semester.end_date ||
                        "Not set"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 font-medium text-green-600 dark:text-green-400">
                      Active
                    </p>
                  </div>

                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={handleStartEdit}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    Edit Semester
                  </button>

                  <button
                    type="button"
                    onClick={handleEndSemester}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-red-300 px-4 py-3 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    {loading
                      ? "Ending..."
                      : "End Semester"}
                  </button>

                </div>

                {/* =================================================
                    CURRENT SEMESTER TIMETABLE
                ================================================= */}

                <div className="mt-8 border-t border-slate-200 pt-8 dark:border-slate-700">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                        Current Semester Timetable
                      </h3>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Manage your weekly class schedule.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (showTimetableForm) {
                          handleCancelTimetableForm();
                        } else {
                          setEditingTimetableEntry(null);
                          setShowTimetableForm(true);
                          setMessage("");
                        }
                      }}
                      className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      {showTimetableForm
                        ? "Close"
                        : "+ Add Class"}
                    </button>

                  </div>

                  {showTimetableForm && (
                    <TimetableForm
                      courses={selectedCourses}
                      initialEntry={editingTimetableEntry}
                      onSubmit={handleTimetableSubmit}
                      onCancel={handleCancelTimetableForm}
                    />
                  )}

                  <div className="mt-6">
                    {timetableLoading ? (
                      <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Loading timetable...
                        </p>
                      </div>
                    ) : (
                      <TimetableGrid
                        entries={timetableEntries}
                        courses={timetableCourses}
                        onEdit={handleEditTimetable}
                        onDelete={handleDeleteTimetable}
                      />
                    )}
                  </div>

                </div>

              </div>
            ) : (
              /* NO ACTIVE SEMESTER */

              <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">

                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  No Active Semester
                </h2>

                <p className="mx-auto mt-3 max-w-lg text-slate-500 dark:text-slate-400">
                  There is currently no active semester.
                  Create a new semester or activate one
                  from your previous semesters.
                </p>

                <button
                  type="button"
                  onClick={handleStartCreating}
                  className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Create New Semester
                </button>

              </div>
            )}

            {/* =================================================
                PREVIOUS SEMESTERS
            ================================================= */}

            <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    Previous Semesters
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    View your old semesters and reactivate one
                    if necessary.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {
                    semesters.filter(
                      (item) =>
                        !item.is_active
                    ).length
                  }{" "}
                  inactive
                </span>

              </div>

              {semesters.filter(
                (item) => !item.is_active
              ).length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-5 dark:bg-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No previous semesters yet.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">

                  {semesters
                    .filter(
                      (item) =>
                        !item.is_active
                    )
                    .map((oldSemester) => (
                      <div
                        key={oldSemester.id}
                        className="rounded-xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-800"
                      >

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                          <div>
                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {oldSemester.name}
                              </h3>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                Inactive
                              </span>

                            </div>

                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                              {oldSemester.start_date ||
                                "No start date"}{" "}
                              →{" "}
                              {oldSemester.end_date ||
                                "No end date"}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">

                            <button
                              type="button"
                              onClick={() =>
                                handleViewSemester(
                                  oldSemester
                                )
                              }
                              disabled={
                                loading ||
                                activatingId !== null
                              }
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleActivateSemester(
                                  oldSemester
                                )
                              }
                              disabled={
                                loading ||
                                activatingId !== null
                              }
                              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                            >
                              {activatingId ===
                              oldSemester.id
                                ? "Activating..."
                                : "Activate"}
                            </button>

                          </div>

                        </div>

                      </div>
                    ))}

                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </main>
  );
}


