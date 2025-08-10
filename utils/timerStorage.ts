import AsyncStorage from '@react-native-async-storage/async-storage';

const TIMER_KEY = 'global_timer_state';

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedTime: number;
  programId?: string;
  dayIndex?: number;
}

export class TimerStorage {
  static async saveTimerState(state: TimerState): Promise<void> {
    try {
      await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }

  static async getTimerState(): Promise<TimerState | null> {
    try {
      const data = await AsyncStorage.getItem(TIMER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading timer state:', error);
      return null;
    }
  }

  static async clearTimerState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TIMER_KEY);
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  }
}