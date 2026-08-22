export type TimetableEntry = {
  id: string;
  user_id: string;
  semester_id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  venue: string | null;
  notes: string | null;
  created_at: string;
};

export type TimetableCourse = {
  id: string;
  name: string;
  code: string;
  instructor: string | null;
};