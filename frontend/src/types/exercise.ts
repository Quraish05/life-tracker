/** An exercise log entry as returned by the backend. */
export type ExerciseLog = {
  id: number;
  log_date: string;
  name: string;
  note: string | null;
  created_at: string;
};
