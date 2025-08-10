import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimerContextType {
  timerTime: number;
  timerRunning: boolean;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  resetAndStartTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const TIMER_STORAGE_KEY = 'persistent_timer';

interface TimerData {
  startTime: number | null;
  elapsedTime: number;
  isRunning: boolean;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timerTime, setTimerTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Charger l'état du timer au démarrage
  useEffect(() => {
    loadTimerState();
  }, []);

  // Sauvegarder l'état du timer à chaque changement
  useEffect(() => {
    saveTimerState();
  }, [timerTime, timerRunning]);

  // Gérer l'intervalle du timer
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = Date.now();
          const elapsed = now - startTimeRef.current;
          setTimerTime(elapsed);
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerRunning]);

  const loadTimerState = async () => {
    try {
      const data = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
      if (data) {
        const timerData: TimerData = JSON.parse(data);
        
        if (timerData.isRunning && timerData.startTime) {
          // Calculer le temps écoulé depuis le démarrage
          const now = Date.now();
          const totalElapsed = timerData.elapsedTime + (now - timerData.startTime);
          setTimerTime(totalElapsed);
          setTimerRunning(true);
          startTimeRef.current = now - totalElapsed;
        } else {
          setTimerTime(timerData.elapsedTime);
          setTimerRunning(false);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du timer:', error);
    }
  };

  const saveTimerState = async () => {
    try {
      const timerData: TimerData = {
        startTime: timerRunning ? (startTimeRef.current || Date.now()) : null,
        elapsedTime: timerTime,
        isRunning: timerRunning,
      };
      await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerData));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du timer:', error);
    }
  };

  const startTimer = () => {
    if (!timerRunning) {
      const now = Date.now();
      startTimeRef.current = now - timerTime;
      setTimerRunning(true);
    }
  };

  const pauseTimer = () => {
    setTimerRunning(false);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerTime(0);
    startTimeRef.current = null;
  };

  const resetAndStartTimer = () => {
    setTimerRunning(false);
    setTimerTime(0);
    startTimeRef.current = null;
    
    // Démarrer après un court délai
    setTimeout(() => {
      const now = Date.now();
      startTimeRef.current = now;
      setTimerRunning(true);
    }, 50);
  };

  return (
    <TimerContext.Provider
      value={{
        timerTime,
        timerRunning,
        startTimer,
        pauseTimer,
        resetTimer,
        resetAndStartTimer,
      }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}