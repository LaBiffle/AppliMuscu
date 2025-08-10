import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ChartBar as BarChart3 } from 'lucide-react-native';
import { Program, Block, Exercise } from '@/types/program';
import { AppSettings } from '@/types/settings';
import { SessionStorage } from '@/utils/sessionStorage';
import { ProgramStorage, SettingsStorage } from '@/utils/storage';
import { useTimer } from '@/contexts/TimerContext';
import TimerDisplay from '@/components/TimerDisplay';

export default function SessionScreen() {
  const { programId, dayIndex } = useLocalSearchParams();
  const [program, setProgram] = useState<Program | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [completedSeries, setCompletedSeries] = useState<{ [key: string]: boolean[] }>({});
  const [charges, setCharges] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [collapsedBlocks, setCollapsedBlocks] = useState<{ [blockId: string]: boolean }>({});
  const { resetAndStartTimer } = useTimer();
  const router = useRouter();

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  useEffect(() => {
    loadData();
  }, [programId, dayIndex]);

  useEffect(() => {
    if (programId && dayIndex !== undefined) {
      saveSessionData();
    }
  }, [completedSeries, charges, notes, programId, dayIndex]);

  const loadData = async () => {
    if (typeof programId === 'string') {
      const programData = await ProgramStorage.getProgram(programId);
      const settingsData = await SettingsStorage.getSettings();
      setProgram(programData);
      setSettings(settingsData);
      
      if (programData) {
        await initializeSession(programData, settingsData);
      }
    }
  };

  const initializeSession = async (program: Program, settings: AppSettings) => {
    const dayIdx = parseInt(typeof dayIndex === 'string' ? dayIndex : '0');
    const dayBlocks = program.blocks[dayIdx] || [];
    
    // Initialiser tous les blocs comme réduits par défaut
    const defaultCollapsed: { [blockId: string]: boolean } = {};
    dayBlocks.forEach(block => {
      defaultCollapsed[block.id] = true;
    });
    setCollapsedBlocks(defaultCollapsed);
    
    // Essayer de charger les données de session sauvegardées
    let savedSessionData = null;
    try {
      savedSessionData = await SessionStorage.getSessionData(program.id, dayIdx);
    } catch (error) {
      console.log('Aucune donnée de session sauvegardée trouvée');
    }
    
    // Créer la structure par défaut pour les séries et charges par bloc
    const defaultSeries: { [blockId: string]: { [exerciseId: string]: boolean[] } } = {};
    const defaultCharges: { [key: string]: string } = {};
    
    dayBlocks.forEach(block => {
      defaultSeries[block.id] = {};
      (block.exercises || []).forEach(exercise => {
        // Utiliser les données sauvegardées si disponibles, sinon valeurs par défaut
        if (savedSessionData?.completedSeries?.[block.id]?.[exercise.id]) {
          defaultSeries[block.id][exercise.id] = savedSessionData.completedSeries[block.id][exercise.id];
        } else {
          defaultSeries[block.id][exercise.id] = new Array(block.series).fill(false);
        }
        
        // Pour les charges, utiliser les données sauvegardées ou calculer
        if (savedSessionData?.charges?.[exercise.id]) {
          defaultCharges[exercise.id] = savedSessionData.charges[exercise.id];
        } else if (exercise.chargeType === 'CT' && exercise.ctType) {
          const maxWeight = settings.maxWeights[exercise.ctType];
          if (maxWeight === 0) {
            defaultCharges[exercise.id] = 'Max non défini';
          } else {
            const percentage = parseFloat(exercise.charge) || 0;
            const calculatedCharge = (maxWeight * percentage / 100).toFixed(1);
            defaultCharges[exercise.id] = `${calculatedCharge} kg (${percentage}% de ${maxWeight}kg)`;
          }
        } else {
          defaultCharges[exercise.id] = exercise.charge || '';
        }
      });
    });
    
    setCompletedSeries(defaultSeries);
    setCharges(defaultCharges);
    setNotes(savedSessionData?.notes || {});
  };

  const saveSessionData = async () => {
    if (!programId || dayIndex === undefined || !program) return;
    
    const dayIdx = parseInt(typeof dayIndex === 'string' ? dayIndex : '0');
    
    try {
      await SessionStorage.saveSessionData(programId as string, dayIdx, {
        completedSeries,
        charges,
        notes,
      });
      console.log('Session data saved successfully');
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  };

  const toggleSeries = (exerciseId: string, seriesIndex: number) => {
    // Trouver le bloc qui contient cet exercice
    if (!program) return;
    const dayIdx = parseInt(typeof dayIndex === 'string' ? dayIndex : '0');
    const dayBlocks = program.blocks[dayIdx] || [];
    
    let targetBlockId = '';
    dayBlocks.forEach(block => {
      if (block.exercises.some(ex => ex.id === exerciseId)) {
        targetBlockId = block.id;
      }
    });
    
    if (targetBlockId) {
      setCompletedSeries(prev => ({
        ...prev,
        [targetBlockId]: {
          ...prev[targetBlockId],
          [exerciseId]: (prev[targetBlockId]?.[exerciseId] || []).map((completed, index) => 
            index === seriesIndex ? !completed : completed
          ),
        }
      }));
      
      // Réinitialiser et démarrer le timer automatiquement
      resetAndStartTimer();
    }
  };

  const updateCharge = (exerciseId: string, charge: string) => {
    setCharges(prev => ({ ...prev, [exerciseId]: charge }));
  };

  const updateNote = (exerciseId: string, note: string) => {
    setNotes(prev => ({ ...prev, [exerciseId]: note }));
  };

  const openImageGallery = (images: string[], startIndex: number = 0) => {
    if (images.length === 0) {
      Alert.alert('Info', 'Aucune image disponible pour cet exercice');
      return;
    }
    setSelectedImages(images);
    setCurrentImageIndex(startIndex);
    setImageModalVisible(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % selectedImages.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + selectedImages.length) % selectedImages.length);
  };

  const getChargeDisplayValue = (exercise: Exercise): string => {
    if (exercise.chargeType === 'CT' && exercise.ctType && settings) {
      const maxWeight = settings.maxWeights[exercise.ctType];
      if (maxWeight === 0) {
        return 'Max non défini';
      }
      const percentage = parseFloat(exercise.charge) || 0;
      const calculatedCharge = (maxWeight * percentage / 100).toFixed(1);
      return `${calculatedCharge} kg (${percentage}%)`;
    }
    return charges[exercise.id] || '';
  };

  const isChargeEditable = (exercise: Exercise): boolean => {
    return exercise.chargeType !== 'CT';
  };

  const toggleBlockCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };
  
  if (!program || !settings) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Chargement...</Text>
      </View>
    );
  }

  const dayIdx = parseInt(typeof dayIndex === 'string' ? dayIndex : '0');
  const dayBlocks = program.blocks[dayIdx] || [];
  const dayName = days[dayIdx];

  const dayDescription = program.dayDescriptions?.[dayIdx];

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive">
        
        {/* Header intégré dans le contenu */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push(`/program/${programId}`)}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{program.name}</Text>
          <Text style={styles.dayTitle}>{dayName}</Text>
          {dayDescription && (
            <Text style={styles.dayDescription}>{dayDescription}</Text>
          )}
        </View>

        {dayBlocks.map((block, blockIndex) => (
          <View key={block.id} style={styles.blockContainer}>
            <TouchableOpacity 
              style={styles.blockHeader}
              onPress={() => toggleBlockCollapse(block.id)}>
              <View style={styles.blockTitleContainer}>
                <Text style={styles.blockName}>{block.name}</Text>
                {collapsedBlocks[block.id] ? (
                  <ChevronDown size={20} color="#ffffff" />
                ) : (
                  <ChevronUp size={20} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>
            
            {block.description ? (
              <Text style={styles.blockDescription}>{block.description}</Text>
            ) : null}

            {!collapsedBlocks[block.id] && (
              <>
                <View style={styles.seriesIndicator}>
                  <Text style={styles.seriesText}>Séries ({block.series}) :</Text>
                  <View style={styles.seriesButtons}>
                    {Array.from({ length: block.series }, (_, seriesIndex) => {
                      const allExercisesCompleted = (block.exercises || []).every(exercise => 
                        (completedSeries[block.id]?.[exercise.id] || [])[seriesIndex]
                      );
                      
                      return (
                        <TouchableOpacity
                          key={seriesIndex}
                          onPress={() => {
                            // Toggle cette série pour tous les exercices du bloc
                            (block.exercises || []).forEach(exercise => {
                              toggleSeries(exercise.id, seriesIndex);
                            });
                          }}
                          style={[
                            styles.seriesButton,
                            allExercisesCompleted && styles.seriesButtonCompleted,
                          ]}>
                          <Text style={[
                            styles.seriesButtonText,
                            allExercisesCompleted && styles.seriesButtonTextCompleted,
                          ]}>
                            {seriesIndex + 1}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {(block.exercises || []).map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseContainer}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <TouchableOpacity
                        style={styles.performanceButton}
                        onPress={() => router.push(`/performance/${programId}?exerciseId=${exercise.id}`)}>
                        <BarChart3 size={16} color="#22c55e" />
                      </TouchableOpacity>
                      {exercise.images.length > 0 && (
                        <View style={styles.exerciseImageContainer}>
                          <TouchableOpacity
                            onPress={() => openImageGallery(exercise.images, 0)}>
                            {exercise.images[0].toLowerCase().endsWith('.gif') ? (
                              <Image 
                                source={{ uri: exercise.images[0] }} 
                                style={styles.exerciseCoverImage}
                                resizeMode="cover"
                              />
                            ) : (
                            <>
                              <Image 
                                source={{ uri: exercise.images[0] }} 
                                style={styles.exerciseCoverImage}
                                resizeMode="cover"
                              />
                              {exercise.images.length > 1 && (
                                <View style={styles.imageCountBadge}>
                                  <Text style={styles.imageCountText}>+{exercise.images.length - 1}</Text>
                                </View>
                              )}
                            </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {exercise.description ? (
                      <Text style={styles.exerciseDescription}>{exercise.description}</Text>
                    ) : null}

                    <View style={styles.exerciseDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Répétitions</Text>
                        <Text style={styles.detailValue}>{exercise.repetitions}</Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Repos</Text>
                        <Text style={styles.detailValue}>{exercise.rest}s</Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Charge</Text>
                        {exercise.chargeType === 'CT' ? (
                          <Text style={styles.chargeDisplay}>{getChargeDisplayValue(exercise)}</Text>
                        ) : (
                          <TextInput
                            style={styles.chargeInput}
                            value={charges[exercise.id] || ''}
                            onChangeText={(text) => updateCharge(exercise.id, text)}
                            placeholder="Saisie manuelle"
                            placeholderTextColor="#6b7280"
                          />
                        )}
                      </View>
                    </View>

                    {exercise.advice ? (
                      <View style={styles.adviceContainer}>
                        <Text style={styles.adviceLabel}>Conseils :</Text>
                        <Text style={styles.adviceText}>{exercise.advice}</Text>
                      </View>
                    ) : null}

                    <TextInput
                      style={styles.notesInput}
                      value={notes[exercise.id] || ''}
                      onChangeText={(text) => updateNote(exercise.id, text)}
                      placeholder="Commentaires..."
                      placeholderTextColor="#6b7280"
                      multiline
                    />
                  </View>
                ))}
              </>
            )}
          </View>
        ))}
        
        {/* Espace vide pour permettre le scroll au-delà du clavier */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Image Gallery Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.imageModalContainer}>
          <View style={styles.imageModalHeader}>
            <Text style={styles.imageModalTitle}>
              {currentImageIndex + 1} / {selectedImages.length}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setImageModalVisible(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.imageModalContent}>
            {selectedImages.length > 0 && (
              <Image 
                source={{ uri: selectedImages[currentImageIndex] }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}

            {selectedImages.length > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.navigationButton, styles.previousButton]}
                  onPress={previousImage}>
                  <ChevronLeft size={32} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.navigationButton, styles.nextButton]}
                  onPress={nextImage}>
                  <ChevronRight size={32} color="#ffffff" />
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.imageModalFooter}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailContainer}>
              {selectedImages.map((imageUri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}>
                  <Image 
                    source={{ uri: imageUri }} 
                    style={[
                      styles.thumbnail,
                      index === currentImageIndex && styles.activeThumbnail
                    ]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Timer Bar */}
      <TimerDisplay />
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
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  dayTitle: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: '600',
  },
  dayDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bottomSpacer: {
    height: 300,
  },
  blockContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  blockHeader: {
    marginBottom: 8,
  },
  blockTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  blockDescription: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  seriesIndicator: {
    marginBottom: 16,
  },
  seriesText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  seriesButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seriesButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seriesButtonCompleted: {
    backgroundColor: '#22c55e',
  },
  seriesButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  seriesButtonTextCompleted: {
    color: '#ffffff',
  },
  exerciseContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  performanceButton: {
    marginRight: 8,
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#1a2e1a',
  },
  exerciseImageContainer: {
    position: 'relative',
  },
  exerciseCoverImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  imageCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  imageCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  exerciseDescription: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 18,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  chargeDisplay: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: '#1a2e1a',
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  chargeInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
  },
  exerciseSeriesContainer: {
    marginBottom: 8,
  },
  exerciseSeriesHeader: {
    marginBottom: 8,
  },
  exerciseSeriesLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  exerciseSeriesScrollView: {
    flexGrow: 0,
  },
  exerciseSeriesButtons: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 20,
  },
  exerciseSeriesButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseSeriesButtonCompleted: {
    backgroundColor: '#22c55e',
  },
  adviceContainer: {
    marginBottom: 8,
  },
  adviceLabel: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  adviceText: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
  },
  notesInput: {
    backgroundColor: '#3a3a3a',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
    height: 40,
    textAlignVertical: 'top',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  imageModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height * 0.6,
  },
  navigationButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25,
  },
  previousButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  imageModalFooter: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  thumbnailContainer: {
    flexGrow: 0,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    opacity: 0.6,
  },
  activeThumbnail: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});