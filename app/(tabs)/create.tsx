import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Save, Plus, Trash2, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ProgramStorage } from '@/utils/storage';
import { Program, Block, Exercise } from '@/types/program';
import ImagePicker from '@/components/ImagePicker';

export default function CreateProgramScreen() {
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayDescriptions, setDayDescriptions] = useState<{ [key: number]: string }>({});
  const [blocks, setBlocks] = useState<{ [key: number]: Block[] }>({});
  const router = useRouter();

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
      const newBlocks = { ...blocks };
      const newDayDescriptions = { ...dayDescriptions };
      delete newBlocks[dayIndex];
      delete newDayDescriptions[dayIndex];
      setBlocks(newBlocks);
      setDayDescriptions(newDayDescriptions);
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
      setDayDescriptions(prev => ({ ...prev, [dayIndex]: '' }));
    }
  };

  const updateDayDescription = (dayIndex: number, description: string) => {
    setDayDescriptions(prev => ({ ...prev, [dayIndex]: description }));
  };

  const addBlock = (dayIndex: number) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      name: '',
      description: '',
      exercises: [],
      series: 1,
    };

    setBlocks(prev => ({
      ...prev,
      [dayIndex]: [...(prev[dayIndex] || []), newBlock],
    }));
  };

  const updateBlock = (dayIndex: number, blockIndex: number, field: keyof Block, value: any) => {
    setBlocks(prev => {
      const dayBlocks = [...(prev[dayIndex] || [])];
      dayBlocks[blockIndex] = { ...dayBlocks[blockIndex], [field]: value };
      return { ...prev, [dayIndex]: dayBlocks };
    });
  };

  const deleteBlock = (dayIndex: number, blockIndex: number) => {
    setBlocks(prev => {
      const dayBlocks = [...(prev[dayIndex] || [])];
      dayBlocks.splice(blockIndex, 1);
      return { ...prev, [dayIndex]: dayBlocks };
    });
  };

  const addExercise = (dayIndex: number, blockIndex: number) => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: '',
      description: '',
      images: [],
      repetitions: 10,
      chargeType: 'normal',
      charge: '',
      advice: '',
      rest: 60,
    };

    setBlocks(prev => {
      const dayBlocks = [...(prev[dayIndex] || [])];
      const block = { ...dayBlocks[blockIndex] };
      block.exercises = [...block.exercises, newExercise];
      dayBlocks[blockIndex] = block;
      return { ...prev, [dayIndex]: dayBlocks };
    });
  };

  const updateExercise = (dayIndex: number, blockIndex: number, exerciseIndex: number, field: keyof Exercise, value: any) => {
    setBlocks(prev => {
      const dayBlocks = [...(prev[dayIndex] || [])];
      const block = { ...dayBlocks[blockIndex] };
      const exercises = [...block.exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], [field]: value };
      block.exercises = exercises;
      dayBlocks[blockIndex] = block;
      return { ...prev, [dayIndex]: dayBlocks };
    });
  };

  const deleteExercise = (dayIndex: number, blockIndex: number, exerciseIndex: number) => {
    setBlocks(prev => {
      const dayBlocks = [...(prev[dayIndex] || [])];
      const block = { ...dayBlocks[blockIndex] };
      block.exercises = block.exercises.filter((_, i) => i !== exerciseIndex);
      dayBlocks[blockIndex] = block;
      return { ...prev, [dayIndex]: dayBlocks };
    });
  };

  const saveProgram = async () => {
    if (!programName.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour le programme');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un jour');
      return;
    }

    const program: Program = {
      id: Date.now().toString(),
      name: programName,
      description: programDescription,
      selectedDays,
      dayDescriptions,
      blocks,
      createdAt: new Date().toISOString(),
    };

    const success = await ProgramStorage.saveProgram(program);
    
    if (success) {
      Alert.alert('Succès', 'Programme créé avec succès', [
        { text: 'OK', onPress: () => router.push('/') }
      ]);
    } else {
      Alert.alert('Erreur', 'Un programme avec ce nom existe déjà');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <View style={styles.header}>
        <Text style={styles.title}>Nouveau Programme</Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveProgram}>
          <Save size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollContentWrapper}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nom du programme"
            placeholderTextColor="#6b7280"
            value={programName}
            onChangeText={setProgramName}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description du programme"
            placeholderTextColor="#6b7280"
            value={programDescription}
            onChangeText={setProgramDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Day Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jours d'entraînement</Text>
          <View style={styles.daysContainer}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  selectedDays.includes(index) && styles.dayButtonActive,
                ]}
                onPress={() => toggleDay(index)}>
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(index) && styles.dayButtonTextActive,
                  ]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Blocks for selected days */}
        {selectedDays.sort((a, b) => a - b).map((dayIndex) => (
          <View key={dayIndex} style={styles.section}>
            <View style={styles.dayHeader}>
              <Calendar size={20} color="#22c55e" />
              <Text style={styles.dayTitle}>{days[dayIndex]}</Text>
            </View>

            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              value={dayDescriptions[dayIndex] || ''}
              onChangeText={(text) => updateDayDescription(dayIndex, text)}
              placeholder={`Description pour ${days[dayIndex]}`}
              placeholderTextColor="#6b7280"
            />

            <TouchableOpacity
              style={styles.addBlockButton}
              onPress={() => addBlock(dayIndex)}>
              <Plus size={20} color="#22c55e" />
              <Text style={styles.addBlockText}>Ajouter un bloc</Text>
            </TouchableOpacity>

            {(blocks[dayIndex] || []).map((block, blockIndex) => (
              <View key={block.id} style={styles.blockContainer}>
                <View style={styles.blockHeader}>
                  <TextInput
                    style={styles.blockNameInput}
                    value={block.name}
                    onChangeText={(text) => updateBlock(dayIndex, blockIndex, 'name', text)}
                    placeholder={`Bloc ${blockIndex + 1}`}
                    placeholderTextColor="#6b7280"
                  />
                  <TouchableOpacity
                    onPress={() => deleteBlock(dayIndex, blockIndex)}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, { marginBottom: 12 }]}
                  value={block.description}
                  onChangeText={(text) => updateBlock(dayIndex, blockIndex, 'description', text)}
                  placeholder="Description du bloc"
                  placeholderTextColor="#6b7280"
                />

                <View style={styles.seriesContainer}>
                  <Text style={styles.seriesLabel}>Nombre de séries :</Text>
                  <TextInput
                    style={styles.seriesInput}
                    value={block.series.toString()}
                    onChangeText={(text) => updateBlock(dayIndex, blockIndex, 'series', parseInt(text) || 1)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#6b7280"
                  />
                </View>

                <TouchableOpacity
                  style={styles.addExerciseButton}
                  onPress={() => addExercise(dayIndex, blockIndex)}>
                  <Plus size={16} color="#22c55e" />
                  <Text style={styles.addExerciseText}>Ajouter un exercice</Text>
                </TouchableOpacity>

                {block.exercises.map((exercise, exerciseIndex) => (
                  <View key={exercise.id} style={styles.exerciseContainer}>
                    <View style={styles.exerciseHeader}>
                      <TextInput
                        style={styles.exerciseNameInput}
                        value={exercise.name}
                        onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'name', text)}
                        placeholder={`Exercice ${exerciseIndex + 1}`}
                        placeholderTextColor="#6b7280"
                      />
                      <TouchableOpacity
                        onPress={() => deleteExercise(dayIndex, blockIndex, exerciseIndex)}>
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.input, { marginBottom: 8 }]}
                      value={exercise.description}
                      onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'description', text)}
                      placeholder="Description de l'exercice"
                      placeholderTextColor="#6b7280"
                    />

                    {/* Images */}
                    <ImagePicker
                      images={exercise.images}
                      onImagesChange={(images) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'images', images)}
                    />
                    <View style={styles.exerciseRow}>
                      <View style={styles.exerciseField}>
                        <Text style={styles.fieldLabel}>Répétitions</Text>
                        <TextInput
                          style={styles.smallInput}
                          value={exercise.repetitions.toString()}
                          onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'repetitions', parseInt(text) || 0)}
                          keyboardType="numeric"
                          placeholder="10"
                          placeholderTextColor="#6b7280"
                        />
                      </View>

                      <View style={styles.exerciseField}>
                        <Text style={styles.fieldLabel}>Repos (sec)</Text>
                        <TextInput
                          style={styles.smallInput}
                          value={exercise.rest.toString()}
                          onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'rest', parseInt(text) || 0)}
                          keyboardType="numeric"
                          placeholder="60"
                          placeholderTextColor="#6b7280"
                        />
                      </View>
                    </View>

                    {/* Charge Type Selection */}
                    <View style={styles.chargeTypeContainer}>
                      <Text style={styles.fieldLabel}>Type de charge</Text>
                      <View style={styles.chargeTypeButtons}>
                        <TouchableOpacity
                          style={[
                            styles.chargeTypeButton,
                            exercise.chargeType === 'normal' && styles.chargeTypeButtonActive,
                          ]}
                          onPress={() => updateExercise(dayIndex, blockIndex, exerciseIndex, 'chargeType', 'normal')}>
                          <Text style={[
                            styles.chargeTypeButtonText,
                            exercise.chargeType === 'normal' && styles.chargeTypeButtonTextActive,
                          ]}>Normal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.chargeTypeButton,
                            exercise.chargeType === 'CT' && styles.chargeTypeButtonActive,
                          ]}
                          onPress={() => updateExercise(dayIndex, blockIndex, exerciseIndex, 'chargeType', 'CT')}>
                          <Text style={[
                            styles.chargeTypeButtonText,
                            exercise.chargeType === 'CT' && styles.chargeTypeButtonTextActive,
                          ]}>CT</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* CT Options */}
                    {exercise.chargeType === 'CT' && (
                      <View style={styles.ctContainer}>
                        <Text style={styles.fieldLabel}>Type CT</Text>
                        <View style={styles.ctTypeButtons}>
                          {(['DC', 'SDT', 'Squat'] as const).map((ctType) => (
                            <TouchableOpacity
                              key={ctType}
                              style={[
                                styles.ctTypeButton,
                                exercise.ctType === ctType && styles.ctTypeButtonActive,
                              ]}
                              onPress={() => updateExercise(dayIndex, blockIndex, exerciseIndex, 'ctType', ctType)}>
                              <Text style={[
                                styles.ctTypeButtonText,
                                exercise.ctType === ctType && styles.ctTypeButtonTextActive,
                              ]}>{ctType}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={styles.percentageContainer}>
                          <Text style={styles.fieldLabel}>Pourcentage (%)</Text>
                          <TextInput
                            style={styles.percentageInput}
                            value={exercise.charge}
                            onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'charge', text)}
                            keyboardType="numeric"
                            placeholder="70"
                            placeholderTextColor="#6b7280"
                          />
                        </View>
                      </View>
                    )}

                    {/* Normal Charge */}
                    {exercise.chargeType === 'normal' && (
                      <View style={styles.normalChargeContainer}>
                        <Text style={styles.fieldLabel}>Charge (optionnel)</Text>
                        <TextInput
                          style={styles.input}
                          value={exercise.charge}
                          onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'charge', text)}
                          placeholder="Ex: 20kg, 15 reps, etc."
                          placeholderTextColor="#6b7280"
                        />
                      </View>
                    )}

                    {/* Advice */}
                    <View style={styles.adviceContainer}>
                      <Text style={styles.fieldLabel}>Conseils</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={exercise.advice}
                        onChangeText={(text) => updateExercise(dayIndex, blockIndex, exerciseIndex, 'advice', text)}
                        placeholder="Conseils pour cet exercice..."
                        placeholderTextColor="#6b7280"
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                    </View>
                ))}
              </View>
            ))}
          </View>
        ))}
        
        {/* Espace vide pour permettre le scroll au-delà du clavier */}
        <View style={styles.bottomSpacer} />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentWrapper: {
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 300,
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
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  dayButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  dayButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#ffffff',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBlockText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  blockContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  blockNameInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  seriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  seriesLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginRight: 8,
  },
  seriesInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
    width: 60,
    textAlign: 'center',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  addExerciseText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNameInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseField: {
    flex: 1,
  },
  fieldLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  smallInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  chargeTypeContainer: {
    marginBottom: 12,
  },
  chargeTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chargeTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  chargeTypeButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  chargeTypeButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  chargeTypeButtonTextActive: {
    color: '#ffffff',
  },
  ctContainer: {
    marginBottom: 12,
  },
  ctTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  ctTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3a3a3a',
    borderWidth: 1,
    borderColor: '#4a4a4a',
  },
  ctTypeButtonActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  ctTypeButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  ctTypeButtonTextActive: {
    color: '#ffffff',
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
    width: 80,
    textAlign: 'center',
  },
  normalChargeContainer: {
    marginBottom: 12,
  },
  adviceContainer: {
    marginBottom: 12,
  },
});