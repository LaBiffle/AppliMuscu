export interface SessionData {
  programId: string;
  dayIndex: number;
  date: string;
  completedSeries: { [blockId: string]: { [exerciseId: string]: boolean[] } };
  notes: { [exerciseId: string]: string };
  charges: { [exerciseId: string]: string };
}

export interface WeekData {
  id: string; // Identifiant unique pour la semaine
  programId: string;
  programName: string;
  weekName: string;
  date: string;
  sessions: { [dayIndex: number]: SessionData };
}