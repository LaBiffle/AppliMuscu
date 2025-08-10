import AsyncStorage from '@react-native-async-storage/async-storage';
import { Program } from '@/types/program';
import { AppSettings } from '@/types/settings';
import { ImageManager } from './imageManager';

const PROGRAMS_KEY = 'jojocoach_programs';
const SETTINGS_KEY = 'jojocoach_settings';

export class ProgramStorage {
  static async getPrograms(): Promise<Program[]> {
    try {
      const data = await AsyncStorage.getItem(PROGRAMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading programs:', error);
      return [];
    }
  }

  static async saveProgram(program: Program): Promise<boolean> {
    try {
      const programs = await this.getPrograms();
      
      // Check for duplicate names
      const existingProgram = programs.find(p => p.name.toLowerCase() === program.name.toLowerCase());
      if (existingProgram) {
        return false; // Program with same name already exists
      }

      programs.push(program);
      await AsyncStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
      return true;
    } catch (error) {
      console.error('Error saving program:', error);
      return false;
    }
  }

  static async updateProgram(programId: string, updatedProgram: Program): Promise<boolean> {
    try {
      const programs = await this.getPrograms();
      const index = programs.findIndex(p => p.id === programId);
      
      if (index === -1) return false;

      // Check for duplicate names (excluding current program)
      const duplicateName = programs.find(p => 
        p.id !== programId && p.name.toLowerCase() === updatedProgram.name.toLowerCase()
      );
      if (duplicateName) {
        return false;
      }

      // Ensure dayDescriptions exists for backward compatibility
      if (!updatedProgram.dayDescriptions) {
        updatedProgram.dayDescriptions = {};
      }

      programs[index] = updatedProgram;
      await AsyncStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
      return true;
    } catch (error) {
      console.error('Error updating program:', error);
      return false;
    }
  }

  static async deleteProgram(programId: string): Promise<boolean> {
    try {
      // Nettoyer les images du programme avant de le supprimer
      await ImageManager.cleanupProgramImages(programId);
      
      const programs = await this.getPrograms();
      const filteredPrograms = programs.filter(p => p.id !== programId);
      await AsyncStorage.setItem(PROGRAMS_KEY, JSON.stringify(filteredPrograms));
      return true;
    } catch (error) {
      console.error('Error deleting program:', error);
      return false;
    }
  }

  static async getProgram(programId: string): Promise<Program | null> {
    try {
      const programs = await this.getPrograms();
      const program = programs.find(p => p.id === programId) || null;
      
      // Ensure dayDescriptions exists for backward compatibility
      if (program && !program.dayDescriptions) {
        program.dayDescriptions = {};
      }
      
      return program;
    } catch (error) {
      console.error('Error getting program:', error);
      return null;
    }
  }
}

export class SettingsStorage {
  static async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      const defaultSettings: AppSettings = {
        maxWeights: { DC: 0, SDT: 0, Squat: 0 },
        importExportEnabled: false,
        theme: 'dark-green',
      };
      
      return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        maxWeights: { DC: 0, SDT: 0, Squat: 0 },
        importExportEnabled: false,
        theme: 'dark-green',
      };
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
}