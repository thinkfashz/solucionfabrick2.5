import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface NPCState {
  id: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  state: 'idle' | 'walking' | 'alert' | 'shelter' | 'interacting';
  animationTime: number;
  awarenessRadius: number;
  shelterPosition: THREE.Vector3;
  lastInteractionTime: number;
  isHumanLike: boolean;
}

export function MetalconNPC({ 
  position, 
  houseDimensions,
  emergencyState,
  onNPCInteraction 
}: { 
  position: THREE.Vector3; 
  houseDimensions: { width: number; depth: number; height: number };
  emergencyState: any;
  onNPCInteraction?: (npcId: string, interaction: string) => void;
}) {
  const [npcState, setNPCState] = useState<NPCState>({
    id: Math.random().toString(36).substr(2, 9),
    position: position.clone(),
    targetPosition: position.clone(),
    state: 'idle',
    animationTime: Math.random() * 1000,
    awarenessRadius: 3.5,
    shelterPosition: new THREE.Vector3(0, 0, 0),
    lastInteractionTime: 0,
    isHumanLike: true
  });

  const meshRef = useRef<THREE.Mesh | null>(null);
  const walkPathRef = useRef<THREE.Vector3[] | null>(null);
  const lastKnownPosition = useRef<THREE.Vector3>(position.clone());

  // Human-like behavior and decision making
  useEffect(() => {
    const behaviors = {
      idle: () => {
        if (Math.random() < 0.001) {
          setNPCState(prev => ({
            ...prev,
            state: 'walking',
            targetPosition: calculateSafeTarget(npcState.position, houseDimensions)
          }));
        }
      },
      walking: () => {
        const distance = npcState.position.distanceTo(npcState.targetPosition);
        if (distance < 0.5) {
          if (Math.random() < 0.7) {
            setNPCState(prev => ({ ...prev, state: 'idle' }));
          } else {
            setNPCState(prev => ({
              ...prev,
              state: 'interacting',
              lastInteractionTime: Date.now()
            }));
          }
        } else {
          const moveSpeed = 0.02 + Math.random() * 0.02;
          const direction = npcState.targetPosition.clone().sub(npcState.position).normalize();
          npcState.position.addScaledVector(direction, moveSpeed);
          
          if (Math.random() < 0.1) {
            npcState.position.add(new THREE.Vector3(
              (Math.random() - 0.5) * 0.1,
              0,
              (Math.random() - 0.5) * 0.1
            ));
          }
        }
      },
      alert: () => {
        if (emergencyState?.npcState === 'shelter') {
          if (npcState.shelterPosition.lengthSq() > 0) {
            const distance = npcState.position.distanceTo(npcState.shelterPosition);
            if (distance < 1.0) {
              setNPCState(prev => ({ ...prev, state: 'shelter' }));
            } else {
              const moveSpeed = 0.03;
              const direction = npcState.shelterPosition.clone().sub(npcState.position).normalize();
              npcState.position.addScaledVector(direction, moveSpeed);
            }
          } else {
            const shelterX = (Math.random() - 0.5) * (houseDimensions.width * 0.4);
            const shelterZ = -houseDimensions.depth * 0.5 - Math.random() * 2;
            npcState.shelterPosition.set(shelterX, 0, shelterZ);
            setNPCState(prev => ({ ...prev, state: 'shelter' }));
          }
        } else if (emergencyState?.phase === 'alert') {
          setNPCState(prev => ({ 
            ...prev, 
            animationTime: prev.animationTime + 50,
            targetPosition: prev.position.clone().add(
              new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
              )
            )
          }));
        }
      },
      shelter: () => {
        if (npcState.shelterPosition.lengthSq() > 0) {
          const distance = npcState.position.distanceTo(npcState.shelterPosition);
          if (distance > 0.3) {
            const moveSpeed = 0.02;
            const direction = npcState.shelterPosition.clone().sub(npcState.position).normalize();
            npcState.position.addScaledVector(direction, moveSpeed);
          }
          
          if (Date.now() - npcState.lastInteractionTime > 5000) {
            setNPCState(prev => ({ 
              ...prev, 
              lastInteractionTime: Date.now(),
              state: Math.random() < 0.3 ? 'interacting' : 'alert'
            }));
          }
        }
      },
      interacting: () => {
        const interactionDuration = 3000 + Math.random() * 4000;
        if (Date.now() - npcState.lastInteractionTime > interactionDuration) {
          setNPCState(prev => ({ ...prev, state: 'idle' }));
        }
        npcState.position.y = 0.1 + Math.sin(Date.now() / 500) * 0.05;
      }
    };

    const timer = setInterval(() => {
      if (npcState.isHumanLike) {
        behaviors[npcState.state]();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [npcState, houseDimensions, emergencyState]);

  useEffect(() => {
    if (npcState.state === 'walking') {
      walkPathRef.current = [...(walkPathRef.current || []), npcState.position.clone()];
      if (walkPathRef.current.length > 20) {
        walkPathRef.current.shift();
      }
    }
  }, [npcState.position, npcState.state]);

  useEffect(() => {
    if (meshRef.current) {
      if (npcState.state === 'walking') {
        const angle = Math.atan2(
          npcState.targetPosition.x - npcState.position.x,
          npcState.targetPosition.z - npcState.position.z
        );
        meshRef.current.rotation.y = angle;
      } else if (npcState.state === 'interacting') {
        meshRef.current.rotation.y = Math.sin(Date.now() / 300) * 0.3;
      } else {
        meshRef.current.rotation.y = 0;
      }
    }
  }, [npcState.state, npcState.position, npcState.targetPosition]);

  const getNPCColor = () => {
    switch (npcState.state) {
      case 'alert': return '#FF6B6B';
      case 'shelter': return '#4ECDC4';
      case 'interacting': return '#FFD93D';
      case 'walking': return '#95E77E';
      default: return '#FFE5B4';
    }
  };

  return (
    <mesh ref={meshRef} position={npcState.position}>
      <boxGeometry args={[0.3, 0.92, 0.3]} />
      <meshStandardMaterial 
        color={getNPCColor()} 
        metalness={0.1} 
        roughness={0.8}
        emissive={npcState.state === 'alert' ? '#FF6B6B' : '#000000'}
        emissiveIntensity={npcState.state === 'alert' ? 0.3 : 0.1}
      />
    </mesh>
  );
}

function calculateSafeTarget(position: THREE.Vector3, dimensions: { width: number; depth: number; height: number }): THREE.Vector3 {
  const randomPoints = Array.from({ length: 4 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 4;
    return new THREE.Vector3(
      position.x + Math.cos(angle) * 2.5,
      0,
      position.z + Math.sin(angle) * 2.5
    );
  });

  const safePoints = randomPoints.filter(point => 
    point.x > -dimensions.width/2 + 1 &&
    point.x < dimensions.width/2 - 1 &&
    point.z > -dimensions.depth/2 + 1 &&
    point.z < dimensions.depth/2 - 1
  );

  return safePoints.length > 0 ? 
    safePoints[Math.floor(Math.random() * safePoints.length)] : 
    position.clone();
}