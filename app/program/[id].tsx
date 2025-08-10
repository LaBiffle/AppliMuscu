import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WeekData, TrainingSession } from '../../types/session';
import { Program } from '../../types/program';
import { 
  getWeekSessions, 
  deleteSession 
} from '../../utils/sessionStorage';
import { ProgramStorage } from '../../utils/storage';
import { exportWeekToExcel, exportAllWeeksData } from '../../utils/excelUtils';

export default function ProgramDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingWeek, setExportingWeek] = useState<number | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Program | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProgramData();
    }, [id])
  );

  const loadProgramData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const programData = await ProgramStorage.getProgram(id);
      setProgram(programData);

      if (programData) {
        // Charger les données de toutes les semaines
        const weeks: WeekData[] = [];
        for (let week = 1; week <= programData.totalWeeks; week++) {
          const sessions = await getWeekSessions(id, week);
          const completedSessions = sessions.filter(s => s.completed).length;
          weeks.push({
            weekNumber: week,
            sessions,
            isCompleted: completedSessions >= programData.daysPerWeek,
          });
        }
        setWeekData(weeks);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du programme');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgramData();
    setRefreshing(false);
  };

  const handleExportWeek = async (weekNumber: number) => {
    if (!program) return;

    try {
      setExportingWeek(weekNumber);
      const weekToExport = weekData.find(w => w.weekNumber === weekNumber);
      if (weekToExport && weekToExport.sessions.length > 0) {
        await exportWeekToExcel(weekToExport, program.name, weekNumber);
        Alert.alert('Succès', 'Export Excel terminé avec succès !');
      } else {
        Alert.alert('Information', 'Aucune session trouvée pour cette semaine');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'export Excel');
    } finally {
      setExportingWeek(null);
    }
  };

  const handleExportAllWeeks = async () => {
    if (!program) return;

    try {
      setExportingAll(true);
      await exportAllWeeksData(id, program.name);
      Alert.alert('Succès', 'Export complet terminé avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export complet:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'export complet');
    } finally {
      setExportingAll(false);
    }
  };

  const handleEditProgram = () => {
    if (program) {
      setEditedProgram({ ...program });
      setEditModalVisible(true);
    }
  };

  const saveEditedProgram = async () => {
    if (!editedProgram) return;

    try {
      await ProgramStorage.updateProgram(editedProgram.id, editedProgram);
      setProgram(editedProgram);
      setEditModalVisible(false);
      Alert.alert('Succès', 'Programme modifié avec succès');
      loadProgramData();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde du programme');
    }
  };

  const handleDeleteProgram = () => {
    Alert.alert(
      'Supprimer le programme',
      'Êtes-vous sûr de vouloir supprimer ce programme ? Cette action supprimera également toutes les sessions associées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProgramStorage.deleteProgram(id);
              router.back();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le programme');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      'Supprimer la session',
      'Êtes-vous sûr de vouloir supprimer cette session ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(sessionId);
              loadProgramData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la session');
            }
          },
        },
      ]
    );
  };

  const startWeek = (weekNumber: number) => {
    router.push(`/training/${id}/${weekNumber}`);
  };

  const viewSession = (session: TrainingSession) => {
    router.push(`/session-details/${session.id}`);
  };

  const getProgressPercentage = (completedSessions: number, totalDays: number) => {
    return totalDays > 0 ? (completedSessions / totalDays) * 100 : 0;
  };

  const getTotalStats = () => {
    const totalSessions = weekData.reduce((sum, week) => sum + week.sessions.length, 0);
    const completedSessions = weekData.reduce(
      (sum, week) => sum + week.sessions.filter(s => s.completed).length, 
      0
    );
    const totalWeeksCompleted = weekData.filter(week => week.isCompleted).length;
    
    return {
      totalSessions,
      completedSessions,
      totalWeeksCompleted,
      progressPercentage: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!program) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Programme non trouvé</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = getTotalStats();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{program.name}</Text>
          <TouchableOpacity 
            style={styles.editButton} 
            onPress={handleEditProgram}
          >
            <Ionicons name="create-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>
          {program.totalWeeks} semaines • {program.daysPerWeek} jours/semaine
        </Text>
        
        {program.description && (
          <Text style={styles.description}>{program.description}</Text>
        )}
      </View>

      {/* Stats générales */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Progression générale</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedSessions}</Text>
            <Text style={styles.statLabel}>Sessions réalisées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalWeeksCompleted}</Text>
            <Text style={styles.statLabel}>Semaines terminées</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(stats.progressPercentage)}%</Text>
            <Text style={styles.statLabel}>Progression</Text>
          </View>
        </View>
      </View>

      {/* Section Export */}
      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Export des données</Text>
        <TouchableOpacity 
          style={[styles.exportAllButton, exportingAll && styles.buttonDisabled]}
          onPress={handleExportAllWeeks}
          disabled={exportingAll}
        >
          {exportingAll ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.loadingButtonText}>Export en cours...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.exportAllButtonText}>
                Exporter tout le programme
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Progression par semaine */}
      <View style={styles.weeksContainer}>
        <Text style={styles.sectionTitle}>Détail par semaine</Text>
        
        {weekData.map((week) => {
          const completedCount = week.sessions.filter(s => s.completed).length;
          const progressPct = getProgressPercentage(completedCount, program.daysPerWeek);
          
          return (
            <View key={week.weekNumber} style={styles.weekCard}>
              <View style={styles.weekHeader}>
                <View style={styles.weekTitleContainer}>
                  <Text style={styles.weekTitle}>Semaine {week.weekNumber}</Text>
                  <View style={[
                    styles.statusBadge,
                    week.isCompleted ? styles.completedBadge : styles.incompleteBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      week.isCompleted ? styles.completedText : styles.incompleteText
                    ]}>
                      {week.isCompleted ? 'Terminée' : 'En cours'}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {completedCount} / {program.daysPerWeek} jours réalisés
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { width: `${progressPct}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>{Math.round(progressPct)}%</Text>
                  </View>
                </View>
              </View>

              {/* Sessions de la semaine */}
              {week.sessions.length > 0 && (
                <View style={styles.sessionsContainer}>
                  <Text style={styles.sessionsTitle}>Sessions :</Text>
                  {week.sessions.map((session, index) => (
                    <TouchableOpacity
                      key={session.id}
                      style={[
                        styles.sessionItem,
                        session.completed ? styles.sessionCompleted : styles.sessionIncomplete
                      ]}
                      onPress={() => viewSession(session)}
                    >
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionDay}>
                          {session.dayName || `Jour ${session.dayNumber}`}
                        </Text>
                        <Text style={styles.sessionDate}>
                          {new Date(session.date).toLocaleDateString('fr-FR')}
                        </Text>
                        {session.exercises.length > 0 && (
                          <Text style={styles.exerciseCount}>
                            {session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                      <View style={styles.sessionActions}>
                        <Ionicons 
                          name={session.completed ? "checkmark-circle" : "time-outline"} 
                          size={20} 
                          color={session.completed ? "#4CAF50" : "#FF9800"} 
                        />
                        <TouchableOpacity
                          style={styles.deleteSessionButton}
                          onPress={() => handleDeleteSession(session.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF5252" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.weekActions}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => startWeek(week.weekNumber)}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons 
                      name={week.sessions.length > 0 ? "play-outline" : "add-outline"} 
                      size={18} 
                      color="white" 
                    />
                    <Text style={styles.startButtonText}>
                      {week.sessions.length > 0 ? 'Continuer' : 'Commencer'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {week.sessions.length > 0 && (
                  <TouchableOpacity
                    style={[styles.exportButton, exportingWeek === week.weekNumber && styles.buttonDisabled]}
                    onPress={() => handleExportWeek(week.weekNumber)}
                    disabled={exportingWeek === week.weekNumber}
                  >
                    {exportingWeek === week.weekNumber ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Ionicons name="download-outline" size={16} color="white" />
                        <Text style={styles.exportButtonText}>Export</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProgram}>
          <View style={styles.buttonContent}>
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
            <Text style={styles.deleteButtonText}>Supprimer le programme</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal d'édition */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.cancelButton}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier le programme</Text>
            <TouchableOpacity onPress={saveEditedProgram}>
              <Text style={styles.saveButton}>Sauver</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du programme</Text>
              <TextInput
                style={styles.textInput}
                value={editedProgram?.name || ''}
                onChangeText={(text) => 
                  setEditedProgram(prev => prev ? { ...prev, name: text } : null)
                }
                placeholder="Nom du programme"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editedProgram?.description || ''}
                onChangeText={(text) => 
                  setEditedProgram(prev => prev ? { ...prev, description: text } : null)
                }
                placeholder="Description du programme"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre de semaines</Text>
              <TextInput
                style={styles.textInput}
                value={editedProgram?.totalWeeks.toString() || ''}
                onChangeText={(text) => {
                  const number = parseInt(text) || 1;
                  setEditedProgram(prev => prev ? { ...prev, totalWeeks: number } : null);
                }}
                placeholder="Nombre de semaines"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Jours par semaine</Text>
              <TextInput
                style={styles.textInput}
                value={editedProgram?.daysPerWeek.toString() || ''}
                onChangeText={(text) => {
                  const number = parseInt(text) || 1;
                  setEditedProgram(prev => prev ? { ...prev, daysPerWeek: number } : null);
                }}
                placeholder="Jours par semaine"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  editButton: {
    padding: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 5,
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  exportSection: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportAllButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  exportAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeksContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  weekCard: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekHeader: {
    marginBottom: 15,
  },
  weekTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  completedBadge: {
    backgroundColor: '#E8F5E8',
  },
  incompleteBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedText: {
    color: '#4CAF50',
  },
  incompleteText: {
    color: '#FF9800',
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    minWidth: 35,
    textAlign: 'right',
  },
  sessionsContainer: {
    marginBottom: 15,
  },
  sessionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sessionCompleted: {
    backgroundColor: '#F0F8F0',
    borderColor: '#C8E6C9',
  },
  sessionIncomplete: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDay: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sessionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  exerciseCount: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteSessionButton: {
    padding: 4,
  },
  weekActions: {
    flexDirection: 'row',
    gap: 10,
  },
  startButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  deleteButton: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  deleteButtonText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
