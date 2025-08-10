import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause, RotateCcw } from 'lucide-react-native';

interface FloatingTimerProps {
  timerTime: number;
  timerRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onPress: () => void;
}

export default function FloatingTimer({
  timerTime,
  timerRunning,
  onStart,
  onPause,
  onReset,
  onPress,
}: FloatingTimerProps) {
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.timerContent}>
        <Text style={styles.timerText}>{formatTime(timerTime)}</Text>
        <View style={styles.controls}>
          {!timerRunning ? (
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={(e) => {
                e.stopPropagation();
                onStart();
              }}>
              <Play size={16} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={(e) => {
                e.stopPropagation();
                onPause();
              }}>
              <Pause size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.controlButton, styles.resetButton]} 
            onPress={(e) => {
              e.stopPropagation();
              onReset();
            }}>
            <RotateCcw size={14} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    zIndex: 1000,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: '#2a2a2a',
  },
});