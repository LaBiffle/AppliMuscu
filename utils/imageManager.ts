import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export class ImageManager {
  private static readonly IMAGES_DIR = FileSystem.documentDirectory + 'program_images/';

  static async ensureImagesDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.IMAGES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.IMAGES_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error creating images directory:', error);
    }
  }

  static async saveImageToLocal(imageUri: string, fileName: string): Promise<string> {
    try {
      await this.ensureImagesDirectory();
      const localPath = this.IMAGES_DIR + fileName;
      
      if (Platform.OS === 'web') {
        // Sur web, copier l'image si c'est un blob ou data URI
        if (imageUri.startsWith('blob:') || imageUri.startsWith('data:')) {
          await FileSystem.copyAsync({
            from: imageUri,
            to: localPath
          });
        } else {
          // Pour les URLs externes, les télécharger
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const reader = new FileReader();
          return new Promise((resolve, reject) => {
            reader.onload = async () => {
              try {
                const base64Data = (reader.result as string).split(',')[1];
                await FileSystem.writeAsStringAsync(localPath, base64Data, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                resolve(localPath);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        // Sur mobile, copier directement
        await FileSystem.copyAsync({
          from: imageUri,
          to: localPath
        });
      }
      
      return localPath;
    } catch (error) {
      console.error('Error saving image to local:', error);
      throw error;
    }
  }

  static async readImageAsBase64(imageUri: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        if (imageUri.startsWith('data:')) {
          // Déjà en base64
          return imageUri.split(',')[1];
        } else if (imageUri.startsWith('blob:') || imageUri.startsWith('http')) {
          // Convertir blob ou URL en base64
          const response = await fetch(imageUri);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          // Fichier local
          return await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } else {
        // Sur mobile
        return await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (error) {
      console.error('Error reading image as base64:', error);
      throw error;
    }
  }

  static async cleanupProgramImages(programId: string): Promise<void> {
    try {
      const programImagesDir = this.IMAGES_DIR + `program_${programId}/`;
      const dirInfo = await FileSystem.getInfoAsync(programImagesDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(programImagesDir, { idempotent: true });
        console.log(`Cleaned up images for program ${programId}`);
      }
    } catch (error) {
      console.error('Error cleaning up program images:', error);
    }
  }

  static generateImageFileName(exerciseId: string, originalUri: string): string {
    const extension = originalUri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    return `${exerciseId}_${timestamp}.${extension}`;
  }

  static async getProgramImagePath(programId: string, fileName: string): Promise<string> {
    await this.ensureImagesDirectory();
    const programDir = this.IMAGES_DIR + `program_${programId}/`;
    
    // Créer le dossier du programme s'il n'existe pas
    const dirInfo = await FileSystem.getInfoAsync(programDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(programDir, { intermediates: true });
    }
    
    return programDir + fileName;
  }
}