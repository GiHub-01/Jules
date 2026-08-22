 "use client";

import { useEffect, useMemo, useState } from "react";

import type { TimetableEntry } from "./timetable-types";

type Course = {
  id: string;
  name: string;
  code: string;
};

export type TimetableDaySchedule = {
  day: number;
  startTime: string;
  endTime: string;
  venue: string;
};

type TimetableFormProps = {
  courses: Course[];
  onSubmit: (
    courseId: string,
    schedules: TimetableDaySchedule[],
    notes: string
  ) => Promise<boolean>;
  onCancel: () => void;
  initialEntry?: TimetableEntry | null;
};

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "10:00";

function getTimeValue(
  value: string | null | undefined
) {
  return value ? value.slice(0, 5) : "";
}

function getInitialSchedule(
  entry: TimetableEntry | null
): TimetableDaySchedule[] {
  if (!entry) {
    return [];
  }

  return [
    {
      day: entry.day_of_week,
      startTime: getTimeValue(entry.start_time),
      endTime: getTimeValue(entry.end_time),
      venue: entry.venue ?? "",
    },
  ];
}

export default function TimetableForm({
  courses,
  onSubmit,
  onCancel,
  initialEntry = null,
}: TimetableFormProps) {
  const isEditing = Boolean(initialEntry);

  const [courseId, setCourseId] = useState(
    initialEntry?.course_id ?? ""
  );

  const [schedules, setSchedules] = useState<
    TimetableDaySchedule[]
  >(() => getInitialSchedule(initialEntry));

  const [notes, setNotes] = useState(
    initialEntry?.notes ?? ""
  );

  const [saving, setSaving] = useState(false);

  const selectedDays = useMemo(
    () => schedules.map((schedule) => schedule.day),
    [schedules]
  );

  useEffect(() => {
    setCourseId(initialEntry?.course_id ?? "");

    setSchedules(
      getInitialSchedule(initialEntry)
    );

    setNotes(initialEntry?.notes ?? "");
  }, [initialEntry]);

  function addDay(day: number) {
    setSchedules((current) => [
      ...current,
      {
        day,
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        venue: "",
      },
    ]);
  }

  function removeDay(day: number) {
    setSchedules((current) =>
      current.filter(
        (schedule) => schedule.day !== day
      )
    );
  }

  function toggleDay(day: number) {
    if (selectedDays.includes(day)) {
      removeDay(day);
    } else {
      addDay(day);
    }
  }

  function updateSchedule(
    day: number,
    field: "startTime" | "endTime" | "venue",
    value: string
  ) {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.day === day
          ? {
              ...schedule,
              [field]: value,
            }
          : schedule
      )
    );
  }

  function copyTimeToAllDays() {
    if (schedules.length < 2) {
      return;
    }

    const first = schedules[0];

    setSchedules((current) =>
      current.map((schedule) => ({
        ...schedule,
        startTime: first.startTime,
        endTime: first.endTime,
      }))
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!courseId) {
      return;
    }

    if (schedules.length === 0) {
      return;
    }

    for (const schedule of schedules) {
      if (
        !schedule.startTime ||
        !schedule.endTime
      ) {
        return;
      }

      if (
        schedule.endTime <=
        schedule.startTime
      ) {
        return;
      }
    }

    setSaving(true);

    try {
      const success = await onSubmit(
        courseId,
        schedules,
        notes
      );

      if (success) {
        if (!isEditing) {
          setCourseId("");
          setSchedules([]);
          setNotes("");
        }

        onCancel();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {isEditing
            ? "Edit Timetable Class"
            : "Add Class to Timetable"}
        </h3>

        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {isEditing
            ? "Update this timetable entry."
            : "Select one or more days. Each selected day can have its own time."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* COURSE */}
        <div>
          <label
            htmlFor="timetable-course"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Course
          </label>

          <select
            id="timetable-course"
            value={courseId}
            onChange={(event) =>
              setCourseId(event.target.value)
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">
              Select a course
            </option>

            {courses.map((course) => (
              <option
                key={course.id}
                value={course.id}
              >
                {course.code} — {course.name}
              </option>
            ))}
          </select>
        </div>

        {/* DAYS */}
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Day(s)
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DAYS.map((day) => {
              const selected =
                selectedDays.includes(
                  day.value
                );

              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() =>
                    toggleDay(day.value)
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            You can use the same time on every day or
            set a different time for each day.
          </p>
        </div>

        {/* PER-DAY SCHEDULES */}
        {schedules.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Class Times
                </h4>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Set the time independently for each
                  selected day.
                </p>
              </div>

              {schedules.length > 1 && (
                <button
                  type="button"
                  onClick={copyTimeToAllDays}
                  className="w-fit rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Copy first time to all
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {schedules.map((schedule) => {
                const day = DAYS.find(
                  (item) =>
                    item.value === schedule.day
                );

                return (
                  <div
                    key={schedule.day}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h5 className="font-medium text-slate-900 dark:text-slate-100">
                        {day?.label ??
                          "Selected day"}
                      </h5>

                      <button
                        type="button"
                        onClick={() =>
                          removeDay(
                            schedule.day
                          )
                        }
                        disabled={
                          schedules.length === 1
                        }
                        className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`start-${schedule.day}`}
                          className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          Start Time
                        </label>

                        <input
                          id={`start-${schedule.day}`}
                          type="time"
                          value={
                            schedule.startTime
                          }
                          onChange={(event) =>
                            updateSchedule(
                              schedule.day,
                              "startTime",
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`end-${schedule.day}`}
                          className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          End Time
                        </label>

                        <input
                          id={`end-${schedule.day}`}
                          type="time"
                          value={
                            schedule.endTime
                          }
                          onChange={(event) =>
                            updateSchedule(
                              schedule.day,
                              "endTime",
                              event.target.value
                            )
                          }
                          required
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label
                        htmlFor={`venue-${schedule.day}`}
                        className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        Venue / Classroom
                      </label>

                      <input
                        id={`venue-${schedule.day}`}
                        type="text"
                        value={schedule.venue}
                        onChange={(event) =>
                          updateSchedule(
                            schedule.day,
                            "venue",
                            event.target.value
                          )
                        }
                        placeholder="e.g. LHC-204"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NOTES */}
        <div>
          <label
            htmlFor="timetable-notes"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Additional Information
          </label>

          <textarea
            id="timetable-notes"
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            rows={3}
            placeholder="Optional notes"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              saving || schedules.length === 0
            }
            className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {saving
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
                ? "Save Changes"
                : "Add to Timetable"}
          </button>
        </div>
      </form>
    </div>
  );
}

