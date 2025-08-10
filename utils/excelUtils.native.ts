import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { Program, Block, Exercise } from '@/types/program';
import { WeekData, SessionData } from '@/types/session';
import { ImageManager } from './imageManager';

export interface ExcelExercise {
  'Nom Exercice': string;
  'Description': string;
  'Répétitions': number;
  'Type Charge': 'normal' | 'CT';
  'Charge/Pourcentage': string;
  'Type CT': string;
  'Conseils': string;
  'Repos (sec)': number;
}

export interface ExcelBlock {
  'Nom Bloc': string;
  'Description Bloc': string;
  'Séries': number;
  'Exercices': ExcelExercise[];
}

export interface ExcelProgram {
  'Nom Programme': string;
  'Description Programme': string;
  'Jours Sélectionnés': string; // "0,1,2,4" format
  'Blocs': { [dayName: string]: ExcelBlock[] };
}

export class ExcelUtils {
  static async generateTemplate(): Promise<void> {
    const templateData = {
      'Nom Programme': 'Programme Exemple',
      'Description Programme': 'Description du programme exemple',
      'Jours Sélectionnés': '0,2,4', // Lundi, Mercredi, Vendredi
      'Max DC (kg)': 100,
      'Max SDT (kg)': 120,
      'Max Squat (kg)': 110
    };

    // Exemple de structure pour chaque jour
    const exampleBlocks = [
      {
        'Nom Bloc': 'Échauffement',
        'Description Bloc': 'Préparation musculaire',
        'Séries': 2,
        'Exercices': [
          {
            'Nom Exercice': 'Pompes',
            'Description': 'Exercice de base pour les pectoraux',
            'Répétitions': 15,
            'Type Charge': 'normal',
            'Charge/Pourcentage': '20kg',
            'Type CT': '',
            'Conseils': 'Garder le dos droit',
            'Repos (sec)': 60
          },
          {
            'Nom Exercice': 'Développé Couché',
            'Description': 'Exercice principal pectoraux',
            'Répétitions': 8,
            'Type Charge': 'CT',
            'Charge/Pourcentage': '70',
            'Type CT': 'DC',
            'Conseils': 'Contrôler la descente',
            'Repos (sec)': 120
          }
        ]
      }
    ];

    const workbook = XLSX.utils.book_new();

    // Feuille d'informations générales
    const infoSheet = XLSX.utils.json_to_sheet([templateData]);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informations');

    // Feuille pour chaque jour (exemple avec Lundi)
    const mondayData: any[] = [];
    exampleBlocks.forEach(block => {
      // Ligne d'en-tête du bloc
      mondayData.push({
        'Type': 'BLOC',
        'Nom': block['Nom Bloc'],
        'Description': block['Description Bloc'],
        'Séries': block['Séries'],
        'Répétitions': '',
        'Type Charge': '',
        'Charge/Pourcentage': '',
        'Type CT': '',
        'Conseils': '',
        'Repos (sec)': ''
      });

      // Exercices du bloc
      block.Exercices.forEach(exercise => {
        mondayData.push({
          'Type': 'EXERCICE',
          'Nom': exercise['Nom Exercice'],
          'Description': exercise['Description'],
          'Séries': '',
          'Répétitions': exercise['Répétitions'],
          'Type Charge': exercise['Type Charge'],
          'Charge/Pourcentage': exercise['Charge/Pourcentage'],
          'Type CT': exercise['Type CT'],
          'Conseils': exercise['Conseils'],
          'Repos (sec)': exercise['Repos (sec)']
        });
      });

      // Ligne vide pour séparer les blocs
      mondayData.push({
        'Type': '', 'Nom': '', 'Description': '', 'Séries': '', 'Répétitions': '',
        'Type Charge': '', 'Charge/Pourcentage': '', 'Type CT': '', 'Conseils': '', 'Repos (sec)': ''
      });
    });

    const mondaySheet = XLSX.utils.json_to_sheet(mondayData);
    XLSX.utils.book_append_sheet(workbook, mondaySheet, 'Lundi');

    // Feuille d'instructions
    const instructions = [
      { 'Instructions': 'GUIDE D\'UTILISATION' },
      { 'Instructions': '' },
      { 'Instructions': '1. Remplissez la feuille "Informations" avec les détails du programme' },
      { 'Instructions': '2. Pour "Jours Sélectionnés", utilisez les numéros: 0=Lundi, 1=Mardi, 2=Mercredi, 3=Jeudi, 4=Vendredi, 5=Samedi, 6=Dimanche' },
      { 'Instructions': '3. Créez une feuille pour chaque jour sélectionné (nommée par le jour)' },
      { 'Instructions': '4. Dans chaque feuille jour:' },
      { 'Instructions': '   - Ligne BLOC: définit un nouveau bloc d\'exercices' },
      { 'Instructions': '   - Lignes EXERCICE: exercices appartenant au bloc précédent' },
      { 'Instructions': '5. Type Charge: "normal" ou "CT"' },
      { 'Instructions': '6. Si Type Charge = "CT", remplir "Type CT" avec: DC, SDT, ou Squat' },
      { 'Instructions': '7. Charge/Pourcentage: pour "normal" = poids (ex: 20kg), pour "CT" = pourcentage (ex: 70)' },
      { 'Instructions': '8. Les charges max (DC, SDT, Squat) sont incluses pour information mais ne seront pas importées' },
      { 'Instructions': '9. DESCRIPTION_JOUR: optionnel, description générale du jour d\'entraînement' }
    ];

    const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Sauvegarder le fichier
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `format_programme_sportif_${timestamp}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri);
  }

  static async exportProgram(program: Program): Promise<void> {
    const workbook = XLSX.utils.book_new();
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

    // Récupérer les charges max depuis les paramètres
    let maxWeights = { DC: 0, SDT: 0, Squat: 0 };
    try {
      const { SettingsStorage } = await import('@/utils/storage');
      const settings = await SettingsStorage.getSettings();
      maxWeights = settings.maxWeights;
    } catch (error) {
      console.log('Impossible de récupérer les charges max');
    }

    // Feuille d'informations générales
    const programInfo = {
      'Nom Programme': program.name,
      'Description Programme': program.description,
      'Jours Sélectionnés': program.selectedDays.join(','),
      'Date Création': program.createdAt,
      'Max DC (kg)': maxWeights.DC,
      'Max SDT (kg)': maxWeights.SDT,
      'Max Squat (kg)': maxWeights.Squat
    };

    const infoSheet = XLSX.utils.json_to_sheet([programInfo]);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informations');

    // Feuille pour chaque jour sélectionné
    program.selectedDays.forEach(dayIndex => {
      const dayName = days[dayIndex];
      const dayDescription = program.dayDescriptions?.[dayIndex] || '';
      const dayBlocks = program.blocks[dayIndex] || [];
      const dayData: any[] = [];

      // Ajouter la description du jour si elle existe
      if (dayDescription) {
        dayData.push({
          'Type': 'DESCRIPTION_JOUR',
          'Nom': dayDescription,
          'Description': '',
          'Séries': '',
          'Répétitions': '',
          'Type Charge': '',
          'Charge/Pourcentage': '',
          'Type CT': '',
          'Conseils': '',
          'Repos (sec)': ''
        });
        
        // Ligne vide après la description
        dayData.push({
          'Type': '', 'Nom': '', 'Description': '', 'Séries': '', 'Répétitions': '',
          'Type Charge': '', 'Charge/Pourcentage': '', 'Type CT': '', 'Conseils': '', 'Repos (sec)': ''
        });
      }

      dayBlocks.forEach(block => {
        // Ligne d'en-tête du bloc
        dayData.push({
          'Type': 'BLOC',
          'Nom': block.name,
          'Description': block.description,
          'Séries': block.series,
          'Répétitions': '',
          'Type Charge': '',
          'Charge/Pourcentage': '',
          'Type CT': '',
          'Conseils': '',
          'Repos (sec)': ''
        });

        // Exercices du bloc
        block.exercises.forEach(exercise => {
          dayData.push({
            'Type': 'EXERCICE',
            'Nom': exercise.name,
            'Description': exercise.description,
            'Séries': '',
            'Répétitions': exercise.repetitions,
            'Type Charge': exercise.chargeType,
            'Charge/Pourcentage': exercise.charge,
            'Type CT': exercise.ctType || '',
            'Conseils': exercise.advice,
            'Repos (sec)': exercise.rest
          });
        });

        // Ligne vide pour séparer les blocs
        dayData.push({
          'Type': '', 'Nom': '', 'Description': '', 'Séries': '', 'Répétitions': '',
          'Type Charge': '', 'Charge/Pourcentage': '', 'Type CT': '', 'Conseils': '', 'Repos (sec)': ''
        });
      });

      if (dayData.length > 0) {
        const daySheet = XLSX.utils.json_to_sheet(dayData);
        XLSX.utils.book_append_sheet(workbook, daySheet, dayName);
      }
    });

    // Sauvegarder le fichier
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const safeName = program.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `${safeName}_${timestamp}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri);
  }

  static async importProgram(fileUri: string): Promise<{ success: boolean; program?: Program; error?: string }> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const arrayBuffer = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0)).buffer;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Lire les informations générales
      const infoSheet = workbook.Sheets['Informations'];
      if (!infoSheet) {
        return { success: false, error: 'Feuille "Informations" manquante' };
      }

      const infoData = XLSX.utils.sheet_to_json(infoSheet);
      if (infoData.length === 0) {
        return { success: false, error: 'Données d\'information manquantes' };
      }

      const programInfo = infoData[0] as any;
      const programName = programInfo['Nom Programme'];
      const programDescription = programInfo['Description Programme'] || '';
      const selectedDaysStr = programInfo['Jours Sélectionnés'] || '';

      if (!programName) {
        return { success: false, error: 'Nom du programme manquant' };
      }

      // Parser les jours sélectionnés
      const selectedDays = selectedDaysStr.split(',')
        .map((day: string) => parseInt(day.trim()))
        .filter((day: number) => !isNaN(day) && day >= 0 && day <= 6);

      if (selectedDays.length === 0) {
        return { success: false, error: 'Aucun jour valide sélectionné' };
      }

      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const blocks: { [key: number]: Block[] } = {};
      const dayDescriptions: { [key: number]: string } = {};
      const headerKeywords = ['bloc', 'exercice', 'type', 'nom', 'description', 'series', 'repetitions'];

      // Lire chaque feuille de jour
      selectedDays.forEach(dayIndex => {
        const dayName = days[dayIndex];
        const daySheet = workbook.Sheets[dayName];
        
        if (daySheet) {
          // Lire la feuille comme tableau de tableaux pour une analyse flexible
          const sheetData = XLSX.utils.sheet_to_json(daySheet, { header: 1, defval: '' });
          
          if (sheetData.length === 0) return;
          
          // Identifier la description du jour et la ligne d'en-têtes
          let dayDescription = '';
          let headerRowIndex = -1;
          let headerMap: { [key: string]: number } = {};
          
          for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (Array.isArray(row) && row.length > 0) {
              const firstCell = String(row[0] || '');
              
              // Détecter la description du jour
              if (firstCell.startsWith('DESCRIPTION JOUR:')) {
                dayDescription = firstCell.replace('DESCRIPTION JOUR: ', '').trim();
                continue;
              }
              
              // Détecter la ligne d'en-têtes (contient plusieurs mots-clés)
              const rowString = row.join('|').toLowerCase();
              const hasRequiredHeaders = headerKeywords.some(keyword => 
                rowString.includes(keyword.toLowerCase())
              );
              
              if (hasRequiredHeaders) {
                headerRowIndex = i;
                // Créer la carte des en-têtes
                row.forEach((header, colIndex) => {
                  if (header && typeof header === 'string') {
                    headerMap[header] = colIndex;
                  }
                });
                break;
              }
            }
          }
          
          if (headerRowIndex === -1) {
            console.warn(`Aucune ligne d'en-têtes trouvée pour ${dayName}`);
            return;
          }
          
          const dayBlocks: Block[] = [];
          let currentBlock: Block | null = null;

          // Traiter les données à partir de la ligne suivant les en-têtes
          for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
            const rowData = sheetData[i];
            if (!Array.isArray(rowData) || rowData.length === 0) continue;
            
            // Convertir la ligne en objet en utilisant la carte des en-têtes
            const row: any = {};
            Object.entries(headerMap).forEach(([header, colIndex]) => {
              row[header] = rowData[colIndex] || '';
            });
            
            // Ignorer les lignes vides
            const hasData = Object.values(row).some(value => String(value).trim() !== '');
            if (!hasData) continue;
            
            if (row['Type'] === 'BLOC' || (row['Bloc'] && row['Bloc'] !== '' && !row['Bloc'].startsWith('DESCRIPTION JOUR:'))) {
              // Sauvegarder le bloc précédent s'il existe
              if (currentBlock) {
                dayBlocks.push(currentBlock);
              }

              // Créer un nouveau bloc
              const blockName = row['Type'] === 'BLOC' ? (row['Nom'] || 'Bloc sans nom') : (row['Bloc'] || 'Bloc sans nom');
              const blockDescription = row['Type'] === 'BLOC' ? (row['Description'] || '') : (row['Description Bloc'] || '');
              const blockSeries = row['Type'] === 'BLOC' ? (parseInt(row['Séries']) || 1) : (parseInt(row['Series'] || row['Séries']) || 1);
              
              currentBlock = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: blockName,
                description: blockDescription,
                series: blockSeries,
                exercises: []
              };
            } else if (row['Type'] === 'EXERCICE' || (row['Exercice'] && row['Exercice'] !== '' && currentBlock)) {
              // Ajouter l'exercice au bloc courant
              const exerciseName = row['Type'] === 'EXERCICE' ? (row['Nom'] || 'Exercice sans nom') : (row['Exercice'] || 'Exercice sans nom');
              const exerciseDescription = row['Type'] === 'EXERCICE' ? (row['Description'] || '') : (row['Description Exercice'] || '');
              const repetitions = parseInt(row['Répétitions'] || row['Repetitions'] || '10') || 10;
              const chargeType = (row['Type Charge'] === 'CT') ? 'CT' : 'normal';
              const charge = row['Charge/Pourcentage'] || row['Charge'] || '';
              const ctType = row['Type CT'] as 'DC' | 'SDT' | 'Squat' | undefined;
              const advice = row['Conseils'] || '';
              const rest = parseInt(row['Repos (sec)'] || row['Repos'] || '60') || 60;
              
              const exercise: Exercise = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: exerciseName,
                description: exerciseDescription,
                images: [],
                repetitions: repetitions,
                chargeType: chargeType,
                charge: charge,
                ctType: ctType,
                advice: advice,
                rest: rest
              };

              if (currentBlock) {
                currentBlock.exercises.push(exercise);
              }
            }
          }

          // Ajouter le dernier bloc
          if (currentBlock) {
            dayBlocks.push(currentBlock);
          }

          blocks[dayIndex] = dayBlocks;
          if (dayDescription) {
            dayDescriptions[dayIndex] = dayDescription;
          }
        }
      });

      // Créer le programme
      const program: Program = {
        id: Date.now().toString(),
        name: programName,
        description: programDescription,
        selectedDays,
        dayDescriptions,
        blocks,
        createdAt: new Date().toISOString()
      };

      return { success: true, program };

    } catch (error) {
      return { success: false, error: `Erreur lors de l'import: ${error}` };
    }
  }

  static async exportProgramWithImages(program: Program): Promise<void> {
    try {
      const zip = new JSZip();
      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      
      // Créer une copie du programme pour modifier les URIs des images
      const programCopy = JSON.parse(JSON.stringify(program));
      const imageMap: { [originalUri: string]: string } = {};
      let imageCounter = 0;

      // Récupérer les charges max depuis les paramètres
      let maxWeights = { DC: 0, SDT: 0, Squat: 0 };
      try {
        const { SettingsStorage } = await import('@/utils/storage');
        const settings = await SettingsStorage.getSettings();
        maxWeights = settings.maxWeights;
      } catch (error) {
        console.log('Impossible de récupérer les charges max');
      }

      // Traiter toutes les images et les ajouter au zip
      for (const dayIndex of program.selectedDays) {
        const dayBlocks = program.blocks[dayIndex] || [];
        for (const block of dayBlocks) {
          for (const exercise of block.exercises) {
            for (let i = 0; i < exercise.images.length; i++) {
              const imageUri = exercise.images[i];
              
              if (!imageMap[imageUri]) {
                try {
                  const base64Data = await ImageManager.readImageAsBase64(imageUri);
                  const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
                  const fileName = `image_${imageCounter}.${extension}`;
                  imageMap[imageUri] = `images/${fileName}`;
                  
                  // Ajouter l'image au zip
                  zip.file(`images/${fileName}`, base64Data, { base64: true });
                  imageCounter++;
                } catch (error) {
                  console.error('Error processing image:', imageUri, error);
                  // Garder l'URI original si l'image ne peut pas être lue
                  imageMap[imageUri] = imageUri;
                }
              }
              
              // Mettre à jour l'URI dans la copie du programme
              const copyBlock = programCopy.blocks[dayIndex].find((b: Block) => b.id === block.id);
              const copyExercise = copyBlock?.exercises.find((e: Exercise) => e.id === exercise.id);
              if (copyExercise) {
                copyExercise.images[i] = imageMap[imageUri];
              }
            }
          }
        }
      }

      // Générer le fichier Excel avec les URIs mises à jour
      const workbook = XLSX.utils.book_new();

      // Feuille d'informations générales avec charges max
      const programInfo = {
        'Nom Programme': programCopy.name,
        'Description Programme': programCopy.description,
        'Jours Sélectionnés': programCopy.selectedDays.join(','),
        'Date Création': programCopy.createdAt,
        'Max DC (kg)': maxWeights.DC,
        'Max SDT (kg)': maxWeights.SDT,
        'Max Squat (kg)': maxWeights.Squat,
        'Export Type': 'WITH_IMAGES'
      };

      const infoSheet = XLSX.utils.json_to_sheet([programInfo]);
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informations');

      // Feuille pour chaque jour sélectionné
      programCopy.selectedDays.forEach((dayIndex: number) => {
        const dayName = days[dayIndex];
        const dayDescription = programCopy.dayDescriptions?.[dayIndex] || '';
        const dayBlocks = programCopy.blocks[dayIndex] || [];
        const sheetData: any[][] = [];
        const merges: any[] = [];

        // Description du jour si elle existe
        if (dayDescription) {
          sheetData.push([`DESCRIPTION JOUR: ${dayDescription}`]);
          sheetData.push(['']); // Ligne vide
        }

        // En-têtes de colonnes
        const headers = [
          'Bloc', 'Exercice', 'Description Bloc', 'Description Exercice', 
          'Series', 'Repetitions', 'Type Charge', 'Charge/Pourcentage', 'Type CT', 'Conseils', 'Repos (sec)', 'Images'
        ];
        sheetData.push(headers);

        let currentRow = sheetData.length;

        dayBlocks.forEach((block: Block) => {
          const blockStartRow = currentRow;
          
          // Exercices du bloc
          block.exercises.forEach((exercise: Exercise) => {
            sheetData.push([
              block.name,
              exercise.name,
              block.description,
              exercise.description,
              block.series,
              exercise.repetitions,
              exercise.chargeType,
              exercise.charge,
              exercise.ctType || '',
              exercise.advice,
              exercise.rest,
              exercise.images.join(';') // Séparer les images par des points-virgules
            ]);
            currentRow++;
          });

          // Ajouter les merges pour ce bloc si plusieurs exercices
          if (block.exercises.length > 1) {
            // Merge colonne Bloc
            merges.push({
              s: { r: blockStartRow, c: 0 },
              e: { r: currentRow - 1, c: 0 }
            });
            // Merge colonne Description Bloc
            merges.push({
              s: { r: blockStartRow, c: 2 },
              e: { r: currentRow - 1, c: 2 }
            });
            // Merge colonne Series
            merges.push({
              s: { r: blockStartRow, c: 4 },
              e: { r: currentRow - 1, c: 4 }
            });
          }
        });

        if (sheetData.length > (dayDescription ? 3 : 1)) {
          const daySheet = XLSX.utils.aoa_to_sheet(sheetData);
          
          // Appliquer les merges
          if (merges.length > 0) {
            daySheet['!merges'] = merges;
          }
          
          // Définir la largeur des colonnes
          daySheet['!cols'] = [
            { width: 20 }, // Bloc
            { width: 25 }, // Exercice
            { width: 30 }, // Description Bloc
            { width: 35 }, // Description Exercice
            { width: 8 },  // Series
            { width: 12 }, // Repetitions
            { width: 12 }, // Type Charge
            { width: 15 }, // Charge/Pourcentage
            { width: 8 },  // Type CT
            { width: 30 }, // Conseils
            { width: 10 }, // Repos
            { width: 40 }  // Images
          ];
          
          XLSX.utils.book_append_sheet(workbook, daySheet, dayName);
        }
      });

      // Ajouter le fichier Excel au zip
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      zip.file(`${programCopy.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`, excelBuffer, { base64: true });

      // Sauvegarder et partager l'archive
      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      const safeName = program.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `${safeName}_with_images_${timestamp}.zip`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri);
      
    } catch (error) {
      console.error('Error exporting program with images:', error);
      throw error;
    }
  }

  static async importProgramWithImages(fileUri: string): Promise<{ success: boolean; program?: Program; error?: string }> {
    try {
      const zip = new JSZip();
      
      // Lire le fichier zip
      const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const zipContent = await zip.loadAsync(zipBase64, { base64: true });
      
      // Trouver le fichier Excel dans l'archive
      let excelFile = null;
      for (const fileName of Object.keys(zipContent.files)) {
        if (fileName.endsWith('.xlsx') && !zipContent.files[fileName].dir) {
          excelFile = zipContent.files[fileName];
          break;
        }
      }
      
      if (!excelFile) {
        return { success: false, error: 'Aucun fichier Excel trouvé dans l\'archive' };
      }

      // Lire le fichier Excel
      const excelBase64 = await excelFile.async('base64');
      const excelArrayBuffer = Uint8Array.from(atob(excelBase64), c => c.charCodeAt(0)).buffer;
      const workbook = XLSX.read(excelArrayBuffer, { type: 'array' });

      // Lire les informations générales
      const infoSheet = workbook.Sheets['Informations'];
      if (!infoSheet) {
        return { success: false, error: 'Feuille "Informations" manquante' };
      }

      const infoData = XLSX.utils.sheet_to_json(infoSheet);
      if (infoData.length === 0) {
        return { success: false, error: 'Données d\'information manquantes' };
      }

      const programInfo = infoData[0] as any;
      const programName = programInfo['Nom Programme'];
      const programDescription = programInfo['Description Programme'] || '';
      const selectedDaysStr = programInfo['Jours Sélectionnés'] || '';
      const isWithImages = programInfo['Export Type'] === 'WITH_IMAGES';

      if (!programName) {
        return { success: false, error: 'Nom du programme manquant' };
      }

      // Parser les jours sélectionnés
      const selectedDays = selectedDaysStr.split(',')
        .map((day: string) => parseInt(day.trim()))
        .filter((day: number) => !isNaN(day) && day >= 0 && day <= 6);

      if (selectedDays.length === 0) {
        return { success: false, error: 'Aucun jour valide sélectionné' };
      }

      const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
      const blocks: { [key: number]: Block[] } = {};
      const dayDescriptions: { [key: number]: string } = {};
      const programId = Date.now().toString();

      // Extraire et sauvegarder les images si c'est un export avec images
      const imageMapping: { [archivePath: string]: string } = {};
      if (isWithImages) {
        for (const fileName of Object.keys(zipContent.files)) {
          if (fileName.startsWith('images/') && !zipContent.files[fileName].dir) {
            try {
              const imageFile = zipContent.files[fileName];
              const imageBase64 = await imageFile.async('base64');
              const localFileName = fileName.replace('images/', '');
              const localPath = await ImageManager.getProgramImagePath(programId, localFileName);
              
              await FileSystem.writeAsStringAsync(localPath, imageBase64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              imageMapping[fileName] = localPath;
            } catch (error) {
              console.error('Error extracting image:', fileName, error);
            }
          }
        }
      }

      const headerKeywords = ['bloc', 'exercice', 'type', 'nom', 'description', 'series', 'repetitions'];

      // Lire chaque feuille de jour
      selectedDays.forEach(dayIndex => {
        const dayName = days[dayIndex];
        const daySheet = workbook.Sheets[dayName];
        
        if (daySheet) {
          // Lire la feuille comme tableau de tableaux pour une analyse flexible
          const sheetData = XLSX.utils.sheet_to_json(daySheet, { header: 1, defval: '' });
          
          if (sheetData.length === 0) return;
          
          // Identifier la description du jour et la ligne d'en-têtes
          let dayDescription = '';
          let headerRowIndex = -1;
          let headerMap: { [key: string]: number } = {};
          
          for (let i = 0; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (Array.isArray(row) && row.length > 0) {
              const firstCell = String(row[0] || '');
              
              // Détecter la description du jour
              if (firstCell.startsWith('DESCRIPTION JOUR:')) {
                dayDescription = firstCell.replace('DESCRIPTION JOUR: ', '').trim();
                continue;
              }
              
              // Détecter la ligne d'en-têtes (recherche des mots-clés essentiels)
              const rowString = row.join('|').toLowerCase();
              const requiredHeaders = ['bloc', 'exercice', 'series', 'repetitions'];
              const hasAllHeaders = requiredHeaders.every(header => 
                rowString.includes(header)
              );
              
              if (hasAllHeaders) {
                headerRowIndex = i;
                // Créer la carte des en-têtes
                row.forEach((header, colIndex) => {
                  if (header && typeof header === 'string') {
                    headerMap[header] = colIndex;
                  }
                });
                break;
              }
            }
          }
          
          if (headerRowIndex === -1) {
            console.warn(`Aucune ligne d'en-têtes trouvée pour ${dayName}`);
            return;
          }
          
          const dayBlocks: Block[] = [];
          let currentBlock: Block | null = null;

          // Traiter les données à partir de la ligne suivant les en-têtes
          for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
            const rowData = sheetData[i];
            if (!Array.isArray(rowData) || rowData.length === 0) continue;
            
            // Convertir la ligne en objet en utilisant la carte des en-têtes
            const row: any = {};
            Object.entries(headerMap).forEach(([header, colIndex]) => {
              row[header] = rowData[colIndex] || '';
            });
            
            // Ignorer les lignes vides
            const hasData = Object.values(row).some(value => String(value).trim() !== '');
            if (!hasData) continue;
            
            // Dans le format d'export, chaque ligne est un exercice avec les infos du bloc répétées
            const blockName = row['Bloc'] || '';
            const exerciseName = row['Exercice'] || '';
            
            if (blockName && exerciseName) {
              // Vérifier si on doit créer un nouveau bloc
              if (!currentBlock || currentBlock.name !== blockName) {
                // Sauvegarder le bloc précédent s'il existe
                if (currentBlock) {
                  dayBlocks.push(currentBlock);
                }

                // Créer un nouveau bloc
                currentBlock = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  name: blockName,
                  description: row['Description Bloc'] || '',
                  series: parseInt(row['Series']) || 1,
                  exercises: []
                };
              }

              // Traiter les images
              let exerciseImages: string[] = [];
              if (row['Images']) {
                const imagesPaths = row['Images'].split(';').filter((path: string) => path.trim());
                exerciseImages = imagesPaths.map((imagePath: string) => {
                  // Si c'est un chemin d'archive et qu'on a la correspondance locale
                  if (imageMapping[imagePath]) {
                    return imageMapping[imagePath];
                  }
                  // Sinon garder l'URI original (pour les URLs externes)
                  return imagePath;
                });
              }

              // Ajouter l'exercice au bloc courant
              const exercise: Exercise = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: exerciseName,
                description: row['Description Exercice'] || '',
                images: exerciseImages,
                repetitions: parseInt(row['Repetitions']) || 10,
                chargeType: (row['Type Charge'] === 'CT') ? 'CT' : 'normal',
                charge: row['Charge/Pourcentage'] || '',
                ctType: row['Type CT'] as 'DC' | 'SDT' | 'Squat' | undefined,
                advice: row['Conseils'] || '',
                rest: parseInt(row['Repos (sec)']) || 60
              };

              if (currentBlock) {
                currentBlock.exercises.push(exercise);
              }
            }
          }

          // Ajouter le dernier bloc
          if (currentBlock) {
            dayBlocks.push(currentBlock);
          }

          blocks[dayIndex] = dayBlocks;
          if (dayDescription) {
            dayDescriptions[dayIndex] = dayDescription;
          }
        }
      });

      // Créer le programme
      const program: Program = {
        id: programId,
        name: programName,
        description: programDescription,
        selectedDays,
        dayDescriptions,
        blocks,
        createdAt: new Date().toISOString()
      };

      return { success: true, program };

    } catch (error) {
      return { success: false, error: `Erreur lors de l'import: ${error}` };
    }
  }

  static async exportWeekData(weekData: WeekData): Promise<void> {
    const workbook = XLSX.utils.book_new();
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    // Récupérer le programme pour avoir les noms des blocs et exercices
    let program = null;
    try {
      const { ProgramStorage } = await import('@/utils/storage');
      program = await ProgramStorage.getProgram(weekData.programId);
    } catch (error) {
      console.error('Impossible de récupérer le programme:', error);
    }

    // Feuille d'informations générales
    const weekInfo = {
      'Programme': weekData.programName,
      'Semaine': weekData.weekName,
      'Date Export': weekData.date,
      'Nombre de Sessions': Object.keys(weekData.sessions).length
    };

    const infoSheet = XLSX.utils.json_to_sheet([weekInfo]);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informations');

    // Feuille unique pour toute la semaine
    const weekSheetData: any[][] = [];
    const merges: any[] = [];
    let currentRow = 0;

    // Trier les jours par ordre chronologique
    const sortedSessions = Object.entries(weekData.sessions)
      .sort(([a], [b]) => parseInt(a) - parseInt(b));

    sortedSessions.forEach(([dayIndexStr, sessionData], sessionIndex) => {
      const dayIndex = parseInt(dayIndexStr);
      const dayName = days[dayIndex];
      const dayDescription = program?.dayDescriptions?.[dayIndex] || '';
      const dayBlocks = program?.blocks[dayIndex] || [];

      
      // Ajouter le titre du jour
      weekSheetData.push([`=== ${dayName.toUpperCase()} ===`]);
      currentRow++;
      
      // Description du jour si elle existe
      if (dayDescription) {
        weekSheetData.push([dayDescription]);
        currentRow++;
      }

      // En-têtes de colonnes
      const headers = [
        'Bloc', 'Exercice', 'Description Bloc', 'Description Exercice', 
        'Series', 'Repetitions', 'Charge', 'Commentaire', 'Termine'
      ];
      weekSheetData.push(headers);
      currentRow++;

      // Données des exercices avec merge des blocs
      Object.entries(sessionData.completedSeries).forEach(([blockId, blockData]) => {
        const block = dayBlocks.find(b => b.id === blockId);
        const blockName = block?.name || `Bloc ${blockId}`;
        const blockDescription = block?.description || '';
        const blockStartRow = currentRow;
        
        Object.entries(blockData).forEach(([exerciseId, seriesCompleted]) => {
          const exercise = block?.exercises.find(e => e.id === exerciseId);
          const exerciseName = exercise?.name || `Exercice ${exerciseId}`;
          const exerciseDescription = exercise?.description || '';
          
          const charge = sessionData.charges[exerciseId] || '';
          const note = sessionData.notes[exerciseId] || '';
          const completedCount = seriesCompleted.filter(Boolean).length;
          const totalSeries = seriesCompleted.length;

          weekSheetData.push([
            blockName,
            exerciseName,
            blockDescription,
            exerciseDescription,
            `${completedCount}/${totalSeries}`,
            exercise?.repetitions || '',
            charge,
            note,
            completedCount === totalSeries ? 'OUI' : 'NON'
          ]);
          
          currentRow++;
        });

        // Ajouter les merges pour ce bloc si plusieurs exercices
        const blockExerciseCount = Object.keys(blockData).length;
        if (blockExerciseCount > 1) {
          // Merge colonne Bloc
          merges.push({
            s: { r: blockStartRow, c: 0 },
            e: { r: currentRow - 1, c: 0 }
          });
          // Merge colonne Description Bloc
          merges.push({
            s: { r: blockStartRow, c: 2 },
            e: { r: currentRow - 1, c: 2 }
          });
        }
      });

      // Ajouter des lignes vides pour séparer les jours (sauf pour le dernier)
      if (sessionIndex < sortedSessions.length - 1) {
        weekSheetData.push(['']); // Ligne vide
        weekSheetData.push(['']); // Ligne vide supplémentaire
        currentRow += 2;
      }
    });

    // Créer la feuille unique pour toute la semaine
    if (weekSheetData.length > 0) {
      const weekSheet = XLSX.utils.aoa_to_sheet(weekSheetData);
      
      // Appliquer les merges
      if (merges.length > 0) {
        weekSheet['!merges'] = merges;
      }
      
      // Définir la largeur des colonnes
      weekSheet['!cols'] = [
        { width: 20 }, // Bloc
        { width: 25 }, // Exercice
        { width: 30 }, // Description Bloc
        { width: 35 }, // Description Exercice
        { width: 10 }, // Series
        { width: 12 }, // Repetitions
        { width: 20 }, // Charge
        { width: 30 }, // Commentaire
        { width: 10 }  // Termine
      ];
      
      const safeSheetName = weekData.weekName.replace(/[:\\/\?\*\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, weekSheet, safeSheetName);
    }

    // Sauvegarder le fichier
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const fileName = `${weekData.weekName.replace(/[^a-zA-Z0-9]/g, '_')}_${weekData.programName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, excelBuffer, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Sharing.shareAsync(fileUri);
  }
}