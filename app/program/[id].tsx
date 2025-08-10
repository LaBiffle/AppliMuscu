import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Calendar, ChevronRight, Dumbbell, Download, Trash2, ChartBar as BarChart3, Database, FileDown, X } from 'lucide-react-native';
import { ProgramStorage } from '@/utils/storage';
import { Program } from '@/types/program';
import { SessionStorage } from '@/utils/sessionStorage';
import { WeekData } from '@/types/session';
import { ExcelUtils } from '@/utils/excelUtils';
import { useTimer } from '@/contexts/TimerContext';
import TimerDisplay from '@/components/TimerDisplay';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [weekActionsModalVisible, setWeekActionsModalVisible] = useState(false);
  const [weekNameInputModalVisible, setWeekNameInputModalVisible] = useState(false);
  const [weekName, setWeekName] = useState('');
  const [actionType, setActionType] = useState<'save' | 'export'>('save');
  const { timerTime } = useTimer();
  const router = useRouter();

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  useEffect(() => {
    loadProgram();
    setWeekName(SessionStorage.getCurrentWeekName());
  }, [id]);

  const loadProgram = async () => {
    if (typeof id === 'string') {
      const programData = await ProgramStorage.getProgram(id);
      setProgram(programData);
    }
  };

  const getDayExerciseCount = (dayIndex: number): number => {
    if (!program) return 0;
    const dayBlocks = program.blocks[dayIndex] || [];
    return dayBlocks.reduce((total, block) => total + block.exercises.length, 0);
  };

  const getDayDescription = (dayIndex: number): string => {
    if (!program) return '';
    
    if (program.dayDescriptions && program.dayDescriptions[dayIndex]) {
      return program.dayDescriptions[dayIndex];
    }
    
    const dayBlocks = program.blocks[dayIndex] || [];
    return dayBlocks.map(block => block.name).join(', ') || 'Aucun bloc défini';
  };

  const handleModalConfirm = async () => {
    if (actionType === 'save') {
      await saveWeekDataOnly();
    } else {
      await exportAllWeeksToExcel();
    }
  };

  const saveWeekDataOnly = async () => {
    if (!program || !weekName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la semaine');
      return;
    }

    try {
      const existingWeek = await SessionStorage.findWeekDataByName(program.id, weekName.trim());
      
      if (existingWeek) {
        Alert.alert(
          'Semaine existante',
          `Une semaine nommée "${weekName.trim()}" existe déjà pour ce programme. Que voulez-vous faire ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Remplacer',
              style: 'destructive',
              onPress: async () => {
                await replaceExistingWeekOnly(existingWeek);
              }
            },
            {
              text: 'Sauvegarder comme copie',
              onPress: async () => {
                await saveAsNewWeekOnly(true);
              }
            }
          ]
        );
        return;
      }
      
      await saveAsNewWeekOnly(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les données');
      console.error('Save week data error:', error);
    }
  };

  const replaceExistingWeekOnly = async (existingWeek: WeekData) => {
    try {
      const sessions = await SessionStorage.getAllSessionsForProgram(program!.id);
      
      if (Object.keys(sessions).length === 0) {
        Alert.alert('Aucune donnée', 'Aucune session trouvée pour ce programme');
        return;
      }

      const updatedWeekData: WeekData = {
        id: existingWeek.id,
        programId: program!.id,
        programName: program!.name,
        weekName: weekName.trim(),
        date: new Date().toISOString(),
        sessions
      };

      await SessionStorage.updateWeekData(updatedWeekData);
      
      setWeekNameInputModalVisible(false);
      Alert.alert('Succès', 'Semaine remplacée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de remplacer les données');
      console.error('Replace week data error:', error);
    }
  };

  const saveAsNewWeekOnly = async (asCopy: boolean) => {
    try {
      const sessions = await SessionStorage.getAllSessionsForProgram(program!.id);
      
      if (Object.keys(sessions).length === 0) {
        Alert.alert('Aucune donnée', 'Aucune session trouvée pour ce programme');
        return;
      }

      const finalWeekName = asCopy ? `${weekName.trim()} (Copie)` : weekName.trim();
      
      const weekData: WeekData = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        programId: program!.id,
        programName: program!.name,
        weekName: finalWeekName,
        date: new Date().toISOString(),
        sessions
      };

      await SessionStorage.saveWeekData(weekData);
      
      setWeekNameInputModalVisible(false);
      const message = asCopy ? 'Semaine sauvegardée comme copie' : 'Semaine sauvegardée avec succès';
      Alert.alert('Succès', message);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les données');
      console.error('Save new week data error:', error);
    }
  };

  const exportAllWeeksToExcel = async () => {
    try {
      const allWeeksData = await SessionStorage.getAllWeekDataForProgram(program!.id);
      
      if (allWeeksData.length === 0) {
        Alert.alert('Aucune donnée', 'Aucune semaine sauvegardée trouvée pour ce programme');
        return;
      }

      const exportName = weekName.trim() || 'Export';
      ExcelUtils.exportAllWeeksData(allWeeksData, exportName);
      
      setWeekNameInputModalVisible(false);
      Alert.alert('Succès', `${allWeeksData.length} semaine(s) exportée(s) vers Excel`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
      console.error('Export all weeks error:', error);
    }
  };

  const resetWeekData = () => {
    Alert.alert(
      'Réinitialiser les données',
      'Êtes-vous sûr de vouloir supprimer toutes les données de session de ce programme ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                await SessionStorage.clearSessionData(program!.id, dayIndex);
              }
              Alert.alert('Succès', 'Toutes les données de session ont été supprimées');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer les données');
              console.error('Reset week data error:', error);
            }
          }
        }
      ]
    );
  };

  if (!program) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Programme non trouvé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/')}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{program.name}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContent}>
          <View style={styles.programInfo}>
            <Text style={styles.description}>{program.description}</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Calendar size={16} color="#22c55e" />
                <Text style={styles.statText}>{program.selectedDays.length} jours</Text>
              </View>
              <View style={styles.stat}>
                <Dumbbell size={16} color="#22c55e" />
                <Text style={styles.statText}>
                  {program.selectedDays.reduce((total, dayIndex) => total + getDayExerciseCount(dayIndex), 0)} exercices
                </Text>
                <TouchableOpacity
                  style={styles.performanceButton}
                  onPress={() => router.push(`/performance/${program.id}`)}>
                  <BarChart3 size={16} color="#22c55e" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.daysSection}>
            <Text style={styles.sectionTitle}>Jours d'entraînement</Text>
            
            {program.selectedDays.sort((a, b) => a - b).map((dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={styles.dayCard}
                onPress={() => router.push(`/session/${program.id}/${dayIndex}`)}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{days[dayIndex]}</Text>
                  <View style={styles.dayStats}>
                    <Text style={styles.exerciseCount}>
                      {getDayExerciseCount(dayIndex)} exercices
                    </Text>
                    <ChevronRight size={20} color="#6b7280" />
                  </View>
                </View>
                
                <Text style={styles.dayDescription}>
                  {getDayDescription(dayIndex)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <View style={styles.saveWeekBar}>
        <View style={styles.weekActions}>
          <TouchableOpacity
            style={styles.resetWeekButton}
            onPress={resetWeekData}>
            <Trash2 size={18} color="#ef4444" />
            <Text style={styles.resetWeekButtonText}>RAZ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.saveWeekButton}
            onPress={() => setWeekActionsModalVisible(true)}>
            <Download size={20} color="#ffffff" />
            <Text style={styles.saveWeekButtonText}>Actions semaine</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Week Actions Modal */}
      <Modal
        visible={weekActionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWeekActionsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Actions semaine</Text>
              <TouchableOpacity onPress={() => setWeekActionsModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.weekActionsContainer}>
              <TouchableOpacity
                style={styles.weekActionButton}
                onPress={() => {
                  setWeekActionsModalVisible(false);
                  setActionType('save');
                  setWeekNameInputModalVisible(true);
                }}>
                <Database size={20} color="#22c55e" />
                <Text style={styles.weekActionButtonText}>Sauvegarder en local</Text>
                <Text style={styles.weekActionSubtext}>Sauvegarde dans l'app</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.weekActionButton}
                onPress={() => {
                  setWeekActionsModalVisible(false);
                  setActionType('export');
                  setWeekNameInputModalVisible(true);
                }}>
                <FileDown size={20} color="#3b82f6" />
                <Text style={styles.weekActionButtonText}>Exporter vers Excel</Text>
                <Text style={styles.weekActionSubtext}>Export Excel de toutes les semaines</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.weekActionButton, styles.cancelActionButton]}
                onPress={() => setWeekActionsModalVisible(false)}>
                <Text style={[styles.weekActionButtonText, styles.cancelActionText]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Week Modal */}
      <Modal
        visible={weekNameInputModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWeekNameInputModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {actionType === 'save' ? 'Sauvegarder la semaine' : 'Exporter les semaines'}
            </Text>
            <Text style={styles.modalDescription}>
              {actionType === 'save' 
                ? 'Les données seront sauvegardées dans l\'application'
                : 'Toutes les semaines sauvegardées seront exportées vers Excel'
              }
            </Text>
            
            <TextInput
              style={styles.weekNameInput}
              value={weekName}
              onChangeText={setWeekName}
              placeholder={actionType === 'save' ? 'Nom de la semaine' : 'Nom du fichier d\'export'}
              placeholderTextColor="#6b7280"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setWeekNameInputModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleModalConfirm}>
                <Text style={styles.confirmButtonText}>
                  {actionType === 'save' ? 'Sauvegarder' : 'Exporter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {timerTime > 0 && (
        <View style={styles.compactTimerContainer}>
          <TimerDisplay compact={true} showControls={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '500',
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
  scrollContent: {
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 200,
  },
  programInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  description: {
    color: '#9ca3af',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  daysSection: {
    marginBottom: 32,
  },
  dayCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  dayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseCount: {
    color: '#6b7280',
    fontSize: 14,
  },
  dayDescription: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  saveWeekBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  weekActions: {
    flexDirection: 'row',
    gap: 12,
  },
  resetWeekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  resetWeekButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  saveWeekButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveWeekButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  modalDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  weekNameInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  compactTimerContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  performanceButton: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#1a2e1a',
  },
  weekActionsContainer: {
    gap: 16,
  },
  weekActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  weekActionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  weekActionSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    position: 'absolute',
    left: 52,
    bottom: 8,
  },
  cancelActionButton: {
    backgroundColor: '#1a1a1a',
  },
  cancelActionText: {
    color: '#6b7280',
  },
});
