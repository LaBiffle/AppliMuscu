export interface Exercise {
  id: string;
  name: string;
  description: string;
  images: string[];
  repetitions: number;
  chargeType: 'CT' | 'normal';
  charge: string; // For CT: percentage, for normal: manual input
  ctType?: 'DC' | 'SDT' | 'Squat'; // Only for CT type
  advice: string;
  rest: number; // in seconds
}

export interface Block {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  series: number;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  selectedDays: number[]; // 0-6 for Monday-Sunday
  dayDescriptions: { [dayIndex: number]: string }; // Description for each selected day
  blocks: { [dayIndex: number]: Block[] };
  createdAt: string;
}

export interface SessionData {
  programId: string;
  dayIndex: number;
  date: string;
  completedSeries: { [blockId: string]: { [exerciseId: string]: boolean[] } };
  notes: { [exerciseId: string]: string };
  charges: { [exerciseId: string]: string };
}