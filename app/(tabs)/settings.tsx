import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Download, Upload, FileText, Palette, Package } from 'lucide-react-native';
import { SettingsStorage, ProgramStorage } from '@/utils/storage';
import { AppSettings } from '@/types/settings';
import { ExcelUtils } from '@/utils/excelUtils';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    maxWeights: { DC: 0, SDT: 0, Squat: 0 },
    importExportEnabled: false,
    theme: 'dark-green',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const storedSettings = await SettingsStorage.getSettings();
    setSettings(storedSettings);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await SettingsStorage.saveSettings(updatedSettings);
  };

  const updateMaxWeight = (type: 'DC' | 'SDT' | 'Squat', value: string) => {
    const numValue = parseFloat(value) || 0;
    updateSettings({
      maxWeights: { ...settings.maxWeights, [type]: numValue }
    });
  };

  const showAcronymInfo = () => {
    Alert.alert(
      'Acronymes',
      'CT : Complex Training\nBs : Bi-set\nSDT : Soulevé De Terre\nDC : Développé Couché',
      [{ text: 'OK' }]
    );
  };

  const importProgram = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        let importResult;
        
        // Déterminer le type de fichier
        const isZipFile = file.name.endsWith('.zip') || file.mimeType === 'application/zip';
        
        if (isZipFile) {
          // Import avec images
          if (Platform.OS === 'web') {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileObj = new File([blob], file.name, { type: 'application/zip' });
            importResult = await ExcelUtils.importProgramWithImages(fileObj);
          } else {
            importResult = await ExcelUtils.importProgramWithImages(file.uri);
          }
        } else {
          // Import Excel classique
          if (Platform.OS === 'web') {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileObj = new File([blob], file.name, { type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            importResult = await ExcelUtils.importProgram(fileObj);
          } else {
            importResult = await ExcelUtils.importProgram(file.uri);
          }
        }
        
        if (importResult.success && importResult.program) {
          // Vérifier si un programme avec le même nom existe déjà
          const existingPrograms = await ProgramStorage.getPrograms();
          const duplicateProgram = existingPrograms.find(p => 
            p.name.toLowerCase() === importResult.program!.name.toLowerCase()
          );
          
          if (duplicateProgram) {
            Alert.alert(
              'Programme existant',
              `Un programme nommé "${importResult.program.name}" existe déjà. Voulez-vous le remplacer ?`,
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Remplacer',
                  style: 'destructive',
                  onPress: async () => {
                    await ProgramStorage.updateProgram(duplicateProgram.id, importResult.program!);
                    Alert.alert('Succès', 'Programme importé et remplacé avec succès');
                  }
                },
                {
                  text: 'Dupliquer',
                  onPress: async () => {
                    const newProgram = {
                      ...importResult.program!,
                      name: `${importResult.program!.name} (Copie)`,
                      id: Date.now().toString()
                    };
                    await ProgramStorage.saveProgram(newProgram);
                    Alert.alert('Succès', 'Programme importé comme copie avec succès');
                  }
                }
              ]
            );
          } else {
            const success = await ProgramStorage.saveProgram(importResult.program);
            if (success) {
              Alert.alert('Succès', 'Programme importé avec succès');
            } else {
              Alert.alert('Erreur', 'Erreur lors de la sauvegarde du programme');
            }
          }
        } else {
          Alert.alert('Erreur d\'import', importResult.error || 'Erreur inconnue');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'importer le fichier');
      console.error('Import error:', error);
    }
  };

  const downloadTemplate = () => {
    try {
      if (Platform.OS === 'web') {
        ExcelUtils.generateTemplate();
      } else {
        ExcelUtils.generateTemplate().then(() => {
          // Template généré et partagé sur mobile
        }).catch((error: any) => {
          Alert.alert('Erreur', 'Impossible de générer le template');
          console.error('Template generation error:', error);
        });
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de générer le template');
      console.error('Template generation error:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Max Weights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Charges Maximales</Text>
          <Text style={styles.sectionDescription}>
            Ces valeurs seront utilisées pour calculer les charges en mode CT (Complex Training)
          </Text>

          <View style={styles.weightInput}>
            <Text style={styles.weightLabel}>Développé Couché (DC)</Text>
            <TextInput
              style={styles.input}
              value={settings.maxWeights.DC.toString()}
              onChangeText={(text) => updateMaxWeight('DC', text)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6b7280"
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <View style={styles.weightInput}>
            <Text style={styles.weightLabel}>Soulevé de Terre (SDT)</Text>
            <TextInput
              style={styles.input}
              value={settings.maxWeights.SDT.toString()}
              onChangeText={(text) => updateMaxWeight('SDT', text)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6b7280"
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <View style={styles.weightInput}>
            <Text style={styles.weightLabel}>Squat</Text>
            <TextInput
              style={styles.input}
              value={settings.maxWeights.Squat.toString()}
              onChangeText={(text) => updateMaxWeight('Squat', text)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6b7280"
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          <TouchableOpacity style={styles.infoButton} onPress={showAcronymInfo}>
            <FileText size={20} color="#22c55e" />
            <Text style={styles.infoButtonText}>Voir tous les acronymes</Text>
          </TouchableOpacity>
        </View>

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thème</Text>
          <View style={styles.themeOption}>
            <Palette size={20} color="#22c55e" />
            <Text style={styles.themeText}>Sombre Vert (par défaut)</Text>
          </View>
        </View>

        {/* Import/Export Section */}
        <View style={styles.section}>
          <View style={styles.switchContainer}>
            <Text style={styles.sectionTitle}>Import/Export Excel</Text>
            <Switch
              value={settings.importExportEnabled}
              onValueChange={(value) => updateSettings({ importExportEnabled: value })}
              trackColor={{ false: '#2a2a2a', true: '#22c55e' }}
              thumbColor={settings.importExportEnabled ? '#ffffff' : '#6b7280'}
            />
          </View>

          <Text style={styles.sectionDescription}>
            Activez cette option pour importer et exporter vos programmes depuis/vers des fichiers Excel
          </Text>

          {settings.importExportEnabled && (
            <View style={styles.importExportActions}>
              <TouchableOpacity style={styles.actionButton} onPress={importProgram}>
                <Upload size={20} color="#22c55e" />
                <Text style={styles.actionButtonText}>Importer un programme</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={downloadTemplate}>
                <Download size={20} color="#22c55e" />
                <Text style={styles.actionButtonText}>Télécharger le format type</Text>
              </TouchableOpacity>

              <Text style={styles.importNote}>
                Formats supportés : .xlsx (données seules) et .zip (données + images)
              </Text>

              <Text style={styles.importNote}>
                Les programmes importés seront vérifiés pour éviter les doublons
              </Text>
            </View>
          )}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <Text style={styles.appInfo}>JojoCoach v1.0.0</Text>
          <Text style={styles.appInfo}>Application de coaching sportif</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  weightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  weightLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    width: 80,
    textAlign: 'center',
    marginRight: 8,
  },
  weightUnit: {
    color: '#9ca3af',
    fontSize: 16,
    width: 20,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  infoButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '500',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  themeText: {
    color: '#ffffff',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  importExportActions: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  importNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  appInfo: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 4,
  },
});