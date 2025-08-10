import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Plus, RotateCcw, Settings as SettingsIcon, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ProgramStorage } from '@/utils/storage';
import { Program } from '@/types/program';
import { useTimer } from '@/contexts/TimerContext';
import TimerDisplay from '@/components/TimerDisplay';

export default function HomeScreen() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const { timerTime } = useTimer();
  const router = useRouter();

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    const storedPrograms = await ProgramStorage.getPrograms();
    setPrograms(storedPrograms);
  };

  const deleteProgram = async (programId: string) => {
    Alert.alert(
      'Supprimer le programme',
      'Êtes-vous sûr de vouloir supprimer ce programme ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await ProgramStorage.deleteProgram(programId);
            loadPrograms();
          },
        },
      ]
    );
  };

  const getDayIndicators = (program: Program) => {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    return days.map((day, index) => (
      <View
        key={index}
        style={[
          styles.dayIndicator,
          program.selectedDays.includes(index) && styles.dayIndicatorActive,
        ]}>
        <Text
          style={[
            styles.dayText,
            program.selectedDays.includes(index) && styles.dayTextActive,
          ]}>
          {day}
        </Text>
      </View>
    ));
  };

  const getTotalExercises = (program: Program): number => {
    return program.selectedDays.reduce((total, dayIndex) => {
      const dayBlocks = program.blocks[dayIndex] || [];
      return total + dayBlocks.reduce((blockTotal, block) => blockTotal + block.exercises.length, 0);
    }, 0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>🏋️</Text>
          </View>
          <Text style={styles.appName}>JojoCoach</Text>
        </View>
      </View>

      {/* Programs List */}
      <ScrollView style={styles.programsList} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {programs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun programme créé</Text>
            <Text style={styles.emptySubtext}>Appuyez sur + pour créer votre premier programme</Text>
          </View>
        ) : (
          programs.map((program) => (
            <TouchableOpacity
              key={program.id}
              style={styles.programCard}
              onPress={() => router.push(`/program/${program.id}`)}>
              <View style={styles.programHeader}>
                <Text style={styles.programName}>{program.name}</Text>
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => router.push(`/edit-program/${program.id}`)}>
                  <SettingsIcon size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.programDescription}>{program.description}</Text>
              
              <View style={styles.programInfo}>
                <View style={styles.dayIndicators}>
                  {getDayIndicators(program)}
                </View>
                <View style={styles.exerciseCount}>
                  <Calendar size={16} color="#6b7280" />
                  <Text style={styles.exerciseCountText}>
                    {getTotalExercises(program)} exercices
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadPrograms}>
          <RotateCcw size={24} color="#22c55e" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/create')}>
          <Plus size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Timer compact si actif */}
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
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    fontSize: 20,
    color: '#000000',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  programsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 80, // Espace pour le bouton fixe
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  programCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  programName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  settingsButton: {
    padding: 4,
  },
  programDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
    lineHeight: 20,
  },
  programInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  dayIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayIndicatorActive: {
    backgroundColor: '#22c55e',
  },
  dayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  dayTextActive: {
    color: '#ffffff',
  },
  exerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseCountText: {
    fontSize: 12,
    color: '#6b7280',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  refreshButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  compactTimerContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
});