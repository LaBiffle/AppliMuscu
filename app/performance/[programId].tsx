import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, ChartBar as BarChart3, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Program } from '@/types/program';
import { ProgramStorage } from '@/utils/storage';
import { getPerformanceData, PerformanceDataPoint } from '@/utils/performanceUtils';
import PerformanceGraph from '@/components/PerformanceGraph';

export default function PerformanceScreen() {
  const { programId, exerciseId } = useLocalSearchParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<'charge' | 'repetitions'>('charge');
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([]);
  const [exerciseDropdownOpen, setExerciseDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadProgram();
  }, [programId]);

  useEffect(() => {
    if (exerciseId && typeof exerciseId === 'string') {
      setSelectedExerciseId(exerciseId);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (program) {
      loadPerformanceData();
    }
  }, [program, selectedExerciseId, selectedMetric]);

  const loadProgram = async () => {
    if (typeof programId === 'string') {
      const programData = await ProgramStorage.getProgram(programId);
      setProgram(programData);
      setLoading(false);
    }
  };

  const loadPerformanceData = async () => {
    if (!program) return;

    try {
      const data = await getPerformanceData(
        program.id,
        selectedExerciseId === 'all' ? undefined : selectedExerciseId,
        selectedMetric
      );
      setPerformanceData(data);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setPerformanceData([]);
    }
  };

  const getAllExercises = () => {
    if (!program) return [];
    
    const exercises: { id: string; name: string; dayName: string }[] = [];
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    program.selectedDays.forEach(dayIndex => {
      const dayBlocks = program.blocks[dayIndex] || [];
      dayBlocks.forEach(block => {
        block.exercises.forEach(exercise => {
          exercises.push({
            id: exercise.id,
            name: exercise.name,
            dayName: days[dayIndex]
          });
        });
      });
    });
    
    return exercises;
  };

  const getSelectedExerciseName = () => {
    if (selectedExerciseId === 'all') return 'Tous les exercices';
    
    const exercises = getAllExercises();
    const exercise = exercises.find(ex => ex.id === selectedExerciseId);
    return exercise ? `${exercise.name} (${exercise.dayName})` : 'Exercice inconnu';
  };

  const getPerformanceStats = () => {
    if (performanceData.length === 0) {
      return { trend: 'stable', change: 0, latest: 0, best: 0 };
    }

    const values = performanceData.map(d => d.value);
    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : latest;
    const best = Math.max(...values);
    const change = latest - previous;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';

    return { trend, change, latest, best };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Performances</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (!program) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Performances</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Programme non trouvé</Text>
        </View>
      </View>
    );
  }

  const exercises = getAllExercises();
  const stats = getPerformanceStats();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Performances</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.programInfo}>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.programDescription}>Suivi des performances</Text>
        </View>

        {/* Exercise Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercice</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setExerciseDropdownOpen(!exerciseDropdownOpen)}>
            <Text style={styles.dropdownText}>{getSelectedExerciseName()}</Text>
            <ChevronDown 
              size={20} 
              color="#6b7280" 
              style={[
                styles.dropdownIcon,
                exerciseDropdownOpen && styles.dropdownIconOpen
              ]} 
            />
          </TouchableOpacity>

          {exerciseDropdownOpen && (
           <ScrollView style={styles.dropdownMenu} nestedScrollEnabled={true}>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedExerciseId === 'all' && styles.dropdownItemActive
                ]}
                onPress={() => {
                  setSelectedExerciseId('all');
                  setExerciseDropdownOpen(false);
                }}>
                <Text style={[
                  styles.dropdownItemText,
                  selectedExerciseId === 'all' && styles.dropdownItemTextActive
                ]}>Tous les exercices</Text>
              </TouchableOpacity>

              {exercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.dropdownItem,
                    selectedExerciseId === exercise.id && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    setSelectedExerciseId(exercise.id);
                    setExerciseDropdownOpen(false);
                  }}>
                  <Text style={[
                    styles.dropdownItemText,
                    selectedExerciseId === exercise.id && styles.dropdownItemTextActive
                  ]}>
                    {exercise.name} ({exercise.dayName})
                  </Text>
                </TouchableOpacity>
              ))}
           </ScrollView>
          )}
        </View>

        {/* Metric Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métrique</Text>
          <View style={styles.metricButtons}>
            <TouchableOpacity
              style={[
                styles.metricButton,
                selectedMetric === 'charge' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('charge')}>
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'charge' && styles.metricButtonTextActive
              ]}>Charges</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.metricButton,
                selectedMetric === 'repetitions' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('repetitions')}>
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'repetitions' && styles.metricButtonTextActive
              ]}>Répétitions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Performance Stats */}
        {performanceData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistiques</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Dernière valeur</Text>
                <Text style={styles.statValue}>
                  {stats.latest} {selectedMetric === 'charge' ? 'kg' : 'reps'}
                </Text>
                <View style={styles.trendContainer}>
                  {stats.trend === 'up' && <TrendingUp size={16} color="#22c55e" />}
                  {stats.trend === 'down' && <TrendingDown size={16} color="#ef4444" />}
                  <Text style={[
                    styles.trendText,
                    stats.trend === 'up' && styles.trendTextUp,
                    stats.trend === 'down' && styles.trendTextDown
                  ]}>
                    {stats.change > 0 ? '+' : ''}{stats.change}
                  </Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Meilleure performance</Text>
                <Text style={styles.statValue}>
                  {stats.best} {selectedMetric === 'charge' ? 'kg' : 'reps'}
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Nombre de semaines</Text>
                <Text style={styles.statValue}>{performanceData.length}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Performance Graph */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Évolution</Text>
          {performanceData.length > 0 ? (
            <PerformanceGraph 
              data={performanceData}
              metric={selectedMetric}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <BarChart3 size={48} color="#6b7280" />
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
              <Text style={styles.noDataSubtext}>
                Complétez des sessions d'entraînement et sauvegardez des données de semaine pour voir les graphiques
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
  },
  programInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  programName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  programDescription: {
    color: '#9ca3af',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dropdownText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  dropdownIcon: {
    transform: [{ rotate: '0deg' }],
  },
  dropdownIconOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    maxHeight: 200,
   overflow: 'hidden',
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  dropdownItemActive: {
    backgroundColor: '#22c55e',
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 16,
  },
  dropdownItemTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  metricButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  metricButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  metricButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  metricButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  trendTextUp: {
    color: '#22c55e',
  },
  trendTextDown: {
    color: '#ef4444',
  },
  noDataContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  noDataText: {
    color: '#6b7280',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataSubtext: {
    color: '#4b5563',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});