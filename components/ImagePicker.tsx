import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal, Dimensions } from 'react-native';
import { Plus, X, Move, RotateCw } from 'lucide-react-native';
import * as ImagePickerLib from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface ImagePickerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  coverImageIndex?: number;
  onCoverImageChange?: (index: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ImagePicker({ 
  images, 
  onImagesChange, 
  coverImageIndex = 0, 
  onCoverImageChange 
}: ImagePickerProps) {
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  const requestPermission = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'L\'accès à la galerie photo est nécessaire pour ajouter des images.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePickerLib.launchImageLibraryAsync({
        mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        onImagesChange([...images, ...newImages]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const removeImage = (index: number) => {
    Alert.alert(
      'Supprimer l\'image',
      'Êtes-vous sûr de vouloir supprimer cette image ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newImages = images.filter((_, i) => i !== index);
            onImagesChange(newImages);
            
            // Adjust cover image index if necessary
            if (onCoverImageChange) {
              if (index === coverImageIndex && newImages.length > 0) {
                onCoverImageChange(0);
              } else if (index < coverImageIndex) {
                onCoverImageChange(coverImageIndex - 1);
              }
            }
          },
        },
      ]
    );
  };

  const setCoverImage = (index: number) => {
    if (onCoverImageChange) {
      onCoverImageChange(index);
    }
  };

  const openImageEditor = (imageUri: string) => {
    setEditingImage(imageUri);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const saveEditedImage = async () => {
    if (!editingImage) return;

    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        editingImage,
        [
          { resize: { width: 400 } },
          { crop: { 
            originX: Math.max(0, -imagePosition.x), 
            originY: Math.max(0, -imagePosition.y), 
            width: 400, 
            height: 400 
          }},
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const imageIndex = images.indexOf(editingImage);
      if (imageIndex !== -1) {
        const newImages = [...images];
        newImages[imageIndex] = manipulatedImage.uri;
        onImagesChange(newImages);
      }

      setEditingImage(null);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'image modifiée');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Images de l'exercice</Text>
        <TouchableOpacity style={styles.addButton} onPress={pickImage}>
          <Plus size={20} color="#22c55e" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {images.length > 0 && (
        <View style={styles.imagesGrid}>
          {images.map((imageUri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.image} />
              
              {/* Cover image indicator */}
              {index === coverImageIndex && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Couverture</Text>
                </View>
              )}

              {/* Image actions */}
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setCoverImage(index)}>
                  <Text style={styles.actionButtonText}>Couverture</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openImageEditor(imageUri)}>
                  <Move size={16} color="#22c55e" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => removeImage(index)}>
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {images.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucune image ajoutée</Text>
          <Text style={styles.emptySubtext}>Appuyez sur "Ajouter" pour sélectionner des images</Text>
        </View>
      )}

      {/* Image Editor Modal */}
      <Modal
        visible={editingImage !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingImage(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.editorContainer}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>Redimensionner l'image</Text>
              <TouchableOpacity onPress={() => setEditingImage(null)}>
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {editingImage && (
              <View style={styles.imageEditor}>
                <View style={styles.canvasContainer}>
                  <Image
                    source={{ uri: editingImage }}
                    style={[
                      styles.editableImage,
                      {
                        transform: [
                          { scale: imageScale },
                          { translateX: imagePosition.x },
                          { translateY: imagePosition.y },
                        ],
                      },
                    ]}
                  />
                  <View style={styles.cropOverlay} />
                </View>

                <View style={styles.editorControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setImageScale(Math.max(0.5, imageScale - 0.1))}>
                    <Text style={styles.controlButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.scaleText}>{Math.round(imageScale * 100)}%</Text>
                  
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => setImageScale(Math.min(3, imageScale + 0.1))}>
                    <Text style={styles.controlButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.editorActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditingImage(null)}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveEditedImage}>
                    <Text style={styles.saveButtonText}>Sauvegarder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 2,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#22c55e',
    fontSize: 8,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#4b5563',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: screenWidth - 40,
    maxHeight: '80%',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageEditor: {
    alignItems: 'center',
  },
  canvasContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  editableImage: {
    width: 200,
    height: 200,
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  editorControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scaleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#22c55e',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});