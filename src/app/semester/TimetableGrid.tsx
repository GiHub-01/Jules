 "use client";

import { useState } from "react";

import type {
  TimetableCourse,
  TimetableEntry,
} from "./timetable-types";

type TimetableGridProps = {
  entries: TimetableEntry[];
  courses: TimetableCourse[];
  onEdit: (entry: TimetableEntry) => void;
  onDelete: (entry: TimetableEntry) => void;
};

type PositionedEntry = {
  entry: TimetableEntry;
  column: number;
  totalColumns: number;
};

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 18 * 60;
const TOTAL_MINUTES =
  DAY_END_MINUTES - DAY_START_MINUTES;

const HALF_HOUR_HEIGHT = 64;

const TOTAL_HEIGHT =
  (TOTAL_MINUTES / 30) *
  HALF_HOUR_HEIGHT;

const TIME_COLUMN_WIDTH = 88;
const DAY_COLUMN_MIN_WIDTH = 158;

function timeToMinutes(time: string) {
  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function formatTime(time: string) {
  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(
  startTime: string,
  endTime: string
) {
  return `${formatTime(startTime)} – ${formatTime(
    endTime
  )}`;
}

function getCourse(
  courses: TimetableCourse[],
  courseId: string
) {
  return courses.find(
    (course) => course.id === courseId
  );
}

function getDayLabel(day: number) {
  return (
    DAYS.find((item) => item.value === day)
      ?.label ?? "Unknown Day"
  );
}

function getEntryStyle(entry: TimetableEntry) {
  const start = timeToMinutes(
    entry.start_time
  );

  const end = timeToMinutes(
    entry.end_time
  );

  const clampedStart = Math.max(
    start,
    DAY_START_MINUTES
  );

  const clampedEnd = Math.min(
    Math.max(end, clampedStart + 15),
    DAY_END_MINUTES
  );

  const top =
    ((clampedStart - DAY_START_MINUTES) /
      TOTAL_MINUTES) *
    100;

  const height =
    ((clampedEnd - clampedStart) /
      TOTAL_MINUTES) *
    100;

  return {
    top: `${top}%`,
    height: `${height}%`,
  };
}

function getDayEntries(
  entries: TimetableEntry[],
  day: number
) {
  return entries
    .filter(
      (entry) =>
        entry.day_of_week === day
    )
    .sort((a, b) => {
      const startDifference =
        timeToMinutes(a.start_time) -
        timeToMinutes(b.start_time);

      if (startDifference !== 0) {
        return startDifference;
      }

      return (
        timeToMinutes(b.end_time) -
        timeToMinutes(a.end_time)
      );
    });
}

/**
 * Detect overlapping classes and assign each class
 * to a horizontal column.
 *
 * Example:
 *
 * 9:00 ┌──────────┬──────────┐
 *      │ Class A  │ Class B  │
 *      │          │          │
 * 10:00└──────────┴──────────┘
 *
 * Non-overlapping classes use the full width.
 */
function positionOverlappingEntries(
  entries: TimetableEntry[]
): PositionedEntry[] {
  if (entries.length === 0) {
    return [];
  }

  const sortedEntries = [...entries].sort(
    (a, b) => {
      const startDifference =
        timeToMinutes(a.start_time) -
        timeToMinutes(b.start_time);

      if (startDifference !== 0) {
        return startDifference;
      }

      return (
        timeToMinutes(b.end_time) -
        timeToMinutes(a.end_time)
      );
    }
  );

  const groups: TimetableEntry[][] = [];

  let currentGroup: TimetableEntry[] = [];
  let currentGroupEnd = -1;

  for (const entry of sortedEntries) {
    const start = timeToMinutes(
      entry.start_time
    );

    const end = timeToMinutes(
      entry.end_time
    );

    if (
      currentGroup.length === 0 ||
      start < currentGroupEnd
    ) {
      currentGroup.push(entry);
      currentGroupEnd = Math.max(
        currentGroupEnd,
        end
      );
    } else {
      groups.push(currentGroup);

      currentGroup = [entry];
      currentGroupEnd = end;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const positioned: PositionedEntry[] = [];

  for (const group of groups) {
    if (group.length === 1) {
      positioned.push({
        entry: group[0],
        column: 0,
        totalColumns: 1,
      });

      continue;
    }

    /**
     * Each item in this array represents the end time
     * of the class currently occupying that column.
     */
    const columnEndTimes: number[] = [];

    const temporaryPositions: {
      entry: TimetableEntry;
      column: number;
    }[] = [];

    for (const entry of group) {
      const start = timeToMinutes(
        entry.start_time
      );

      const end = timeToMinutes(
        entry.end_time
      );

      let availableColumn = -1;

      for (
        let column = 0;
        column < columnEndTimes.length;
        column++
      ) {
        if (
          columnEndTimes[column] <= start
        ) {
          availableColumn = column;
          break;
        }
      }

      if (availableColumn === -1) {
        availableColumn =
          columnEndTimes.length;

        columnEndTimes.push(end);
      } else {
        columnEndTimes[
          availableColumn
        ] = end;
      }

      temporaryPositions.push({
        entry,
        column: availableColumn,
      });
    }

    const totalColumns =
      columnEndTimes.length;

    for (const item of temporaryPositions) {
      positioned.push({
        entry: item.entry,
        column: item.column,
        totalColumns,
      });
    }
  }

  return positioned;
}

function getGridTemplateColumns() {
  return `${TIME_COLUMN_WIDTH}px repeat(6, minmax(${DAY_COLUMN_MIN_WIDTH}px, 1fr))`;
}

export default function TimetableGrid({
  entries,
  courses,
  onEdit,
  onDelete,
}: TimetableGridProps) {
  const [selectedEntry, setSelectedEntry] =
    useState<TimetableEntry | null>(null);

  const selectedCourse = selectedEntry
    ? getCourse(
        courses,
        selectedEntry.course_id
      )
    : null;

  function closeDetails() {
    setSelectedEntry(null);
  }

  function handleEdit() {
    if (!selectedEntry) {
      return;
    }

    const entry = selectedEntry;

    setSelectedEntry(null);

    onEdit(entry);
  }

  function handleDelete() {
    if (!selectedEntry) {
      return;
    }

    const entry = selectedEntry;

    setSelectedEntry(null);

    onDelete(entry);
  }

  if (entries.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-xl dark:bg-slate-700">
            📅
          </div>

          <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Your timetable is empty
          </h4>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Add your weekly classes to see your
            complete semester schedule here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* HEADER */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Weekly Schedule
              </h4>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Your classes from Monday to Saturday
              </p>
            </div>

            <div className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {entries.length}{" "}
              {entries.length === 1
                ? "class"
                : "classes"}
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="overflow-auto">
          <div className="min-w-[1040px]">
            {/* DAY HEADER */}
            <div
              className="grid border-b border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              style={{
                gridTemplateColumns:
                  getGridTemplateColumns(),
              }}
            >
              {/* TIME HEADER */}
              <div className="flex h-16 items-center justify-center border-r border-slate-200 px-2 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Time
                </span>
              </div>

              {/* DAYS */}
              {DAYS.map((day) => (
                <div
                  key={day.value}
                  className="flex h-16 items-center justify-center border-r border-slate-200 px-2 last:border-r-0 dark:border-slate-700"
                >
                  <div className="text-center text-sm font-bold text-slate-800 dark:text-slate-100">
                    <span className="hidden sm:inline">
                      {day.label}
                    </span>

                    <span className="sm:hidden">
                      {day.short}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TIMETABLE BODY */}
            <div
              className="grid"
              style={{
                gridTemplateColumns:
                  getGridTemplateColumns(),
              }}
            >
              {/* TIME COLUMN */}
              <div
                className="relative border-r border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900"
                style={{
                  height: `${TOTAL_HEIGHT}px`,
                }}
              >
                {Array.from(
                  {
                    length:
                      (DAY_END_MINUTES -
                        DAY_START_MINUTES) /
                        60 +
                      1,
                  },
                  (_, index) => {
                    const minutes =
                      DAY_START_MINUTES +
                      index * 60;

                    const top =
                      ((minutes -
                        DAY_START_MINUTES) /
                        TOTAL_MINUTES) *
                      100;

                    const label =
                      formatTime(
                        `${String(
                          Math.floor(
                            minutes / 60
                          )
                        ).padStart(
                          2,
                          "0"
                        )}:${String(
                          minutes % 60
                        ).padStart(
                          2,
                          "0"
                        )}:00`
                      );

                    return (
                      <div
                        key={minutes}
                        className="absolute left-0 right-0"
                        style={{
                          top: `${top}%`,
                        }}
                      >
                        <span className="-translate-y-1/2 block px-2 text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {/* DAY COLUMNS */}
              {DAYS.map((day) => {
                const dayEntries =
                  getDayEntries(
                    entries,
                    day.value
                  );

                const positionedEntries =
                  positionOverlappingEntries(
                    dayEntries
                  );

                return (
                  <div
                    key={day.value}
                    className="relative border-r border-slate-200 last:border-r-0 dark:border-slate-700"
                    style={{
                      height: `${TOTAL_HEIGHT}px`,
                    }}
                  >
                    {/* 30-MINUTE GRID */}
                    {Array.from(
                      {
                        length:
                          TOTAL_MINUTES /
                            30 +
                          1,
                      },
                      (_, index) => {
                        const top =
                          (index /
                            (TOTAL_MINUTES /
                              30)) *
                          100;

                        const isHour =
                          index % 2 === 0;

                        return (
                          <div
                            key={index}
                            className={`absolute left-0 right-0 border-t ${
                              isHour
                                ? "border-slate-200 dark:border-slate-700"
                                : "border-slate-100 dark:border-slate-800"
                            }`}
                            style={{
                              top: `${top}%`,
                            }}
                          />
                        );
                      }
                    )}

                    {/* CLASSES */}
                    {positionedEntries.map(
                      ({
                        entry,
                        column,
                        totalColumns,
                      }) => {
                        const course =
                          getCourse(
                            courses,
                            entry.course_id
                          );

                        const width =
                          100 /
                          totalColumns;

                        const left =
                          column * width;

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() =>
                              setSelectedEntry(
                                entry
                              )
                            }
                            className="absolute overflow-hidden rounded-xl border border-slate-300 bg-slate-100 p-2.5 text-left shadow-sm transition duration-150 hover:z-20 hover:-translate-y-px hover:border-slate-400 hover:shadow-md focus:z-20 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:focus:ring-slate-500"
                            style={{
                              ...getEntryStyle(
                                entry
                              ),
                              left: `calc(${left}% + 4px)`,
                              width: `calc(${width}% - 8px)`,
                            }}
                            title="Click to view class details"
                          >
                            <div className="flex h-full min-h-0 flex-col">
                              {/* COURSE NAME */}
                              <div className="truncate text-sm font-bold leading-5 text-slate-900 dark:text-slate-50">
                                {course?.name ??
                                  "Unknown Course"}
                              </div>

                              {/* COURSE CODE */}
                              {course?.code && (
                                <div className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                  {course.code}
                                </div>
                              )}

                              {/* TIME */}
                              <div className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {formatTimeRange(
                                  entry.start_time,
                                  entry.end_time
                                )}
                              </div>

                              {/* VENUE */}
                              {entry.venue && (
                                <div className="mt-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {entry.venue}
                                </div>
                              )}

                              {/* NOTES PREVIEW */}
                              {entry.notes && (
                                <div className="mt-1 truncate text-[10px] text-slate-400 dark:text-slate-500">
                                  {entry.notes}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click a class to view details and
            manage it.
          </p>

          <p className="hidden text-xs font-medium text-slate-400 sm:block dark:text-slate-500">
            8:00 AM – 6:00 PM
          </p>
        </div>
      </div>

      {/* CLASS DETAILS MODAL */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="timetable-details-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0">
                <h3
                  id="timetable-details-title"
                  className="truncate text-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  {selectedCourse?.name ??
                    "Unknown Course"}
                </h3>

                {selectedCourse?.code && (
                  <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {selectedCourse.code}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                ×
              </button>
            </div>

            {/* MODAL CONTENT */}
            <div className="space-y-4 px-5 py-5">
              {/* DAY */}
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Day
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {getDayLabel(
                    selectedEntry.day_of_week
                  )}
                </p>
              </div>

              {/* TIME */}
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Time
                </p>

                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {formatTimeRange(
                    selectedEntry.start_time,
                    selectedEntry.end_time
                  )}
                </p>
              </div>

              {/* VENUE */}
              {selectedEntry.venue && (
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Venue / Classroom
                  </p>

                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {selectedEntry.venue}
                  </p>
                </div>
              )}

              {/* FACULTY */}
              {selectedCourse?.instructor && (
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Faculty / Instructor
                  </p>

                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                    {selectedCourse.instructor}
                  </p>
                </div>
              )}

              {/* ADDITIONAL INFORMATION */}
              {selectedEntry.notes && (
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Additional Information
                  </p>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {selectedEntry.notes}
                  </p>
                </div>
              )}
            </div>

            {/* MODAL ACTIONS */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-700 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl border border-red-200 px-5 py-3 font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>

              <button
                type="button"
                onClick={handleEdit}
                className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
