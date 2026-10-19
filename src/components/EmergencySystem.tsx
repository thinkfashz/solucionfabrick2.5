import React, { useState, useEffect, useRef } from 'react';
import type { Scene } from 'three';

interface EmergencyState {
  isActive: boolean;
  phase: 'pending' | 'alert' | 'emergency' | 'recovery';
  startTime: number;
  intensity: number;
  sirenActive: boolean;
  alarmLights: boolean;
  vibrationPattern: number[];
  npcState: 'normal' | 'alert' | 'shelter' | 'recovering';
}

export function EmergencySystem({ scene, onEmergencyStart }: { 
  scene: Scene;
  onEmergencyStart?: () => void;
}) {
  const [emergencyState, setEmergencyState] = useState<EmergencyState>({
    isActive: false,
    phase: 'pending',
    startTime: 0,
    intensity: 0,
    sirenActive: false,
    alarmLights: false,
    vibrationPattern: [],
    npcState: 'normal'
  });

  const sirenAudioRef = useRef<HTMLAudioElement>();
  const alarmLightsRef = useRef<NodeJS.Timeout[]>([]);
  const vibrationIntervalRef = useRef<NodeJS.Timeout>();

  // Emergency trigger - starts within 5 seconds
  useEffect(() => {
    const triggerEmergency = () => {
      if (!emergencyState.isActive) {
        const startDelay = Math.random() * 5000; // Random delay up to 5 seconds
        setTimeout(() => {
          setEmergencyState(prev => ({
            ...prev,
            isActive: true,
            phase: 'alert',
            startTime: Date.now(),
            intensity: Math.random() * 0.8 + 0.2,
            sirenActive: true,
            alarmLights: true,
            vibrationPattern: [100, 50, 200, 50, 300, 100, 400],
            npcState: 'alert'
          }));
          onEmergencyStart?.();
        }, startDelay);
      }
    };

    // Trigger emergency after 10 seconds as fallback
    const fallbackTimer = setTimeout(triggerEmergency, 10000);

    // Random emergency chances
    const randomTriggers = [
      setTimeout(triggerEmergency, 15000),
      setTimeout(triggerEmergency, 25000),
      setTimeout(triggerEmergency, 35000)
    ];

    return () => {
      clearTimeout(fallbackTimer);
      randomTriggers.forEach(clearTimeout);
    };
  }, [emergencyState.isActive]);

  // Siren and alarm lights management
  useEffect(() => {
    if (emergencyState.sirenActive) {
      const audio = new Audio('/sounds/emergency-siren.mp3');
      audio.loop = true;
      audio.volume = 0.7;
      audio.play();
      sirenAudioRef.current = audio;

      const blinkInterval = setInterval(() => {
        setEmergencyState(prev => ({
          ...prev,
          alarmLights: !prev.alarmLights
        }));
      }, 200);

      alarmLightsRef.current.push(blinkInterval);

      if ('vibrate' in navigator) {
        const vibrateInterval = setInterval(() => {
          if (emergencyState.phase === 'emergency' || emergencyState.phase === 'alert') {
            navigator.vibrate(emergencyState.vibrationPattern);
          }
        }, 500);
        vibrationIntervalRef.current = vibrateInterval;
      }

      return () => {
        audio.pause();
        alarmLightsRef.current.forEach(clearInterval);
        clearInterval(vibrationIntervalRef.current);
      };
    }
  }, [emergencyState.sirenActive, emergencyState.phase, emergencyState.vibrationPattern]);

  // Update emergency phases
  useEffect(() => {
    if (emergencyState.isActive) {
      const updatePhase = () => {
        const elapsed = Date.now() - emergencyState.startTime;
        let newPhase: EmergencyState['phase'];
        let newNPCState: EmergencyState['npcState'];

        if (elapsed < 3000) {
          newPhase = 'alert';
          newNPCState = 'alert';
        } else if (elapsed < 8000) {
          newPhase = 'emergency';
          newNPCState = 'shelter';
        } else if (elapsed < 15000) {
          newPhase = 'recovery';
          newNPCState = 'recovering';
        } else {
          newPhase = 'recovery';
          newNPCState = 'normal';
        }

        setEmergencyState(prev => ({
          ...prev,
          phase: newPhase,
          npcState: newNPCState
        }));
      };

      const interval = setInterval(updatePhase, 500);
      return () => clearInterval(interval);
    }
  }, [emergencyState.isActive, emergencyState.startTime]);

  return null;
}