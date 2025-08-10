import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionData, WeekData } from '@/types/session';

const SESSION_KEY_PREFIX = 'session_';
const WEEK_DATA_KEY = 'week_data';

export class SessionStorage {
  static async saveSessionData(programId: string, dayIndex: number, data: Partial<SessionData>): Promise<void> {
    try {
      const sessionKey = `${SESSION_KEY_PREFIX}${programId}_${dayIndex}`;
      
      const sessionData: SessionData = {
        programId,
        dayIndex,
        date: new Date().toISOString(),
        completedSeries: data.completedSeries || {},
        notes: data.notes || {},
        charges: data.charges || {},
      };

      await AsyncStorage.setItem(sessionKey, JSON.stringify(sessionData));
      console.log(`Session data saved for key: ${sessionKey}`);
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  static async getSessionData(programId: string, dayIndex: number): Promise<SessionData | null> {
    try {
      const sessionKey = `${SESSION_KEY_PREFIX}${programId}_${dayIndex}`;
      const data = await AsyncStorage.getItem(sessionKey);
      const result = data ? JSON.parse(data) : null;
      console.log(`Session data loaded for key: ${sessionKey}`, result ? 'Found' : 'Not found');
      return result;
    } catch (error) {
      console.error('Error loading session data:', error);
      return null;
    }
  }

  static async saveWeekData(weekData: WeekData): Promise<void> {
    try {
      const existingWeeks = await this.getAllWeekData();
      const updatedWeeks = [...existingWeeks, weekData];
      await AsyncStorage.setItem(WEEK_DATA_KEY, JSON.stringify(updatedWeeks));
    } catch (error) {
      console.error('Error saving week data:', error);
    }
  }

  static async getAllWeekData(): Promise<WeekData[]> {
    try {
      const data = await AsyncStorage.getItem(WEEK_DATA_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading week data:', error);
      return [];
    }
  }

  static async getAllSessionsForProgram(programId: string): Promise<{ [dayIndex: number]: SessionData }> {
    try {
      const sessions: { [dayIndex: number]: SessionData } = {};
      
      // Check for sessions for days 0-6 (Monday-Sunday)
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const sessionData = await this.getSessionData(programId, dayIndex);
        if (sessionData) {
          sessions[dayIndex] = sessionData;
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Error loading all sessions for program:', error);
      return {};
    }
  }

  static getCurrentWeekName(): string {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };
    return `Semaine ${formatDate(startOfWeek)}-${formatDate(endOfWeek)}`;
  }

  static async clearSessionData(programId: string, dayIndex: number): Promise<void> {
    try {
      const sessionKey = `${SESSION_KEY_PREFIX}${programId}_${dayIndex}`;
      await AsyncStorage.removeItem(sessionKey);
      console.log(`Session data cleared for key: ${sessionKey}`);
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  }
}