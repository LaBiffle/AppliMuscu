import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Play, Pause, RotateCcw } from 'lucide-react-native';
import { useTimer } from '@/contexts/TimerContext';

interface TimerDisplayProps {
  showControls?: boolean;
  compact?: boolean;
}

export default function TimerDisplay({ showControls = true, compact = false }: TimerDisplayProps) {
  const { timerTime, timerRunning, startTimer, pauseTimer, resetTimer } = useTimer();

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTimerText}>{formatTime(timerTime)}</Text>
        {timerRunning && <View style={styles.runningIndicator} />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timerText}>{formatTime(timerTime)}</Text>
      {showControls && (
        <View style={styles.controls}>
          {!timerRunning ? (
            <TouchableOpacity style={styles.controlButton} onPress={startTimer}>
              <Play size={20} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.controlButton} onPress={pauseTimer}>
              <Pause size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.resetButton} onPress={resetTimer}>
            <RotateCcw size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  compactTimerText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginRight: 8,
  },
  runningIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
});