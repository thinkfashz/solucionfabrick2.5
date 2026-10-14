export type CharacterState = 'idle' | 'walk' | 'inspect' | 'earthquake' | 'recovery';

export interface CharacterConfig {
  walkSpeed: number;
  pathLength: number;
  idleMinDuration: number;
  idleMaxDuration: number;
  walkMinDuration: number;
  walkMaxDuration: number;
  inspectDuration: number;
  recoveryDuration: number;
  position: [number, number, number];
  patrolStartX: number;
  patrolEndX: number;
}

export interface BehaviorState {
  currentState: CharacterState;
  stateTimer: number;
  stateDuration: number;
  targetX: number;
  currentX: number;
  lookAtTarget: [number, number, number] | null;
  headShakePhase: number;
  crouchAmount: number;
}

const DEFAULT_CONFIG: Omit<CharacterConfig, 'position' | 'patrolStartX' | 'patrolEndX'> = {
  walkSpeed: 1.2,
  pathLength: 8,
  idleMinDuration: 3,
  idleMaxDuration: 8,
  walkMinDuration: 4,
  walkMaxDuration: 10,
  inspectDuration: 3,
  recoveryDuration: 4,
};

export function createCharacterConfig(
  position: [number, number, number],
  pathLength: number = 8,
  walkSpeed: number = 1.2
): CharacterConfig {
  const halfPath = pathLength / 2;
  return {
    ...DEFAULT_CONFIG,
    position,
    walkSpeed,
    pathLength,
    patrolStartX: position[0] - halfPath,
    patrolEndX: position[0] + halfPath,
  };
}

export function getInitialBehaviorState(config: CharacterConfig): BehaviorState {
  return {
    currentState: 'idle',
    stateTimer: 0,
    stateDuration: getRandomDuration(config.idleMinDuration, config.idleMaxDuration),
    targetX: config.position[0],
    currentX: config.position[0],
    lookAtTarget: null,
    headShakePhase: 0,
    crouchAmount: 0,
  };
}

function getRandomDuration(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandomIdleVariant(): 'idle' | 'talking' {
  return Math.random() < 0.3 ? 'talking' : 'idle';
}

export function updateBehavior(
  state: BehaviorState,
  config: CharacterConfig,
  delta: number,
  playing: boolean,
  visualProgress: number,
  shakeIntensity: number
): BehaviorState {
  const newState = { ...state };
  newState.stateTimer += delta;

  if (playing) {
    if (newState.currentState !== 'earthquake' && newState.currentState !== 'recovery') {
      newState.currentState = 'earthquake';
      newState.stateTimer = 0;
      newState.stateDuration = config.recoveryDuration + 2;
      newState.lookAtTarget = null;
      newState.crouchAmount = 0;
    }
  }

  switch (newState.currentState) {
    case 'earthquake': {
      newState.crouchAmount = Math.min(1, newState.crouchAmount + delta * 3);
      newState.headShakePhase += delta * 8 * (1 + shakeIntensity * 2);
      const targetX = config.position[0] + Math.sin(newState.headShakePhase) * 0.3 * shakeIntensity;
      newState.currentX += (targetX - newState.currentX) * delta * 5;
      
      if (newState.stateTimer >= newState.stateDuration || !playing) {
        newState.currentState = 'recovery';
        newState.stateTimer = 0;
        newState.stateDuration = config.recoveryDuration;
        newState.crouchAmount = 1;
      }
      break;
    }

    case 'recovery': {
      newState.crouchAmount = Math.max(0, newState.crouchAmount - delta * 0.8);
      newState.headShakePhase += delta * 4;
      if (newState.stateTimer >= newState.stateDuration) {
        newState.currentState = 'idle';
        newState.stateTimer = 0;
        newState.stateDuration = getRandomDuration(config.idleMinDuration, config.idleMaxDuration);
        newState.headShakePhase = 0;
      }
      break;
    }

    case 'idle': {
      newState.crouchAmount = Math.max(0, newState.crouchAmount - delta * 2);
      newState.headShakePhase = 0;
      
      if (newState.stateTimer >= newState.stateDuration) {
        const nextAction = Math.random();
        if (nextAction < 0.4) {
          newState.currentState = 'walk';
          newState.stateTimer = 0;
          newState.stateDuration = getRandomDuration(config.walkMinDuration, config.walkMaxDuration);
          newState.targetX = Math.random() < 0.5 ? config.patrolStartX : config.patrolEndX;
        } else if (nextAction < 0.7) {
          newState.currentState = 'inspect';
          newState.stateTimer = 0;
          newState.stateDuration = config.inspectDuration;
          const houseX = config.position[0] < 0 ? -5.1 : 5.1;
          newState.lookAtTarget = [houseX, 1.5, 0];
        } else {
          newState.currentState = 'idle';
          newState.stateTimer = 0;
          newState.stateDuration = getRandomDuration(config.idleMinDuration, config.idleMaxDuration);
        }
      }
      break;
    }

    case 'walk': {
      newState.crouchAmount = Math.max(0, newState.crouchAmount - delta * 2);
      newState.headShakePhase = 0;
      const direction = newState.targetX > newState.currentX ? 1 : -1;
      newState.currentX += direction * config.walkSpeed * delta;
      
      const reachedTarget = direction > 0 
        ? newState.currentX >= newState.targetX 
        : newState.currentX <= newState.targetX;
      
      if (reachedTarget || newState.stateTimer >= newState.stateDuration) {
        newState.currentX = newState.targetX;
        newState.currentState = 'idle';
        newState.stateTimer = 0;
        newState.stateDuration = getRandomDuration(config.idleMinDuration, config.idleMaxDuration);
      }
      break;
    }

    case 'inspect': {
      newState.crouchAmount = Math.max(0, newState.crouchAmount - delta * 2);
      newState.headShakePhase = 0;
      
      if (newState.stateTimer >= newState.stateDuration) {
        newState.currentState = 'idle';
        newState.stateTimer = 0;
        newState.stateDuration = getRandomDuration(config.idleMinDuration, config.idleMaxDuration);
        newState.lookAtTarget = null;
      }
      break;
    }
  }

  return newState;
}

export function getAnimationForState(
  behaviorState: BehaviorState,
  availableAnimations: Set<string>
): { clip: string; weight: number; speed: number; crossFadeDuration: number } {
  const { currentState, crouchAmount } = behaviorState;

  if (currentState === 'earthquake') {
    return {
      clip: availableAnimations.has('Crouch_Idle_Loop') ? 'Crouch_Idle_Loop' : 'Crouch_Fwd_Loop',
      weight: crouchAmount,
      speed: 1,
      crossFadeDuration: 0.3,
    };
  }

  if (currentState === 'recovery') {
    return {
      clip: availableAnimations.has('Crouch_Idle_Loop') ? 'Crouch_Idle_Loop' : 'Crouch_Fwd_Loop',
      weight: crouchAmount,
      speed: 1,
      crossFadeDuration: 0.4,
    };
  }

  if (currentState === 'walk') {
    return {
      clip: 'Walk_Loop',
      weight: 1,
      speed: 1,
      crossFadeDuration: 0.4,
    };
  }

  if (currentState === 'inspect') {
    return {
      clip: availableAnimations.has('Idle_Talking_Loop') ? 'Idle_Talking_Loop' : 'Idle_Loop',
      weight: 1,
      speed: 1,
      crossFadeDuration: 0.5,
    };
  }

  const idleVariant = pickRandomIdleVariant();
  const idleClip = idleVariant === 'talking' && availableAnimations.has('Idle_Talking_Loop')
    ? 'Idle_Talking_Loop'
    : 'Idle_Loop';
  
  return {
    clip: idleClip,
    weight: 1,
    speed: 1,
    crossFadeDuration: 0.5,
  };
}

export function getHeadRotation(behaviorState: BehaviorState, shakeIntensity: number): [number, number, number] {
  const { currentState, headShakePhase, lookAtTarget, currentX } = behaviorState;
  
  if (currentState === 'earthquake') {
    const shakeY = Math.sin(headShakePhase) * 0.4 * (1 + shakeIntensity);
    const shakeZ = Math.cos(headShakePhase * 1.3) * 0.2 * (1 + shakeIntensity);
    return [shakeY, 0, shakeZ];
  }
  
  if (currentState === 'recovery') {
    const shakeY = Math.sin(headShakePhase) * 0.2;
    return [shakeY, 0, 0];
  }
  
  if (currentState === 'inspect' && lookAtTarget) {
    const dx = lookAtTarget[0] - currentX;
    const dz = lookAtTarget[2] - 6.5;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance > 0.1) {
      const yaw = Math.atan2(dx, dz);
      return [0, yaw * 0.5, 0];
    }
  }
  
  if (currentState === 'idle') {
    const slowYaw = Math.sin(behaviorState.stateTimer * 0.3) * 0.15;
    return [0, slowYaw, 0];
  }
  
  return [0, 0, 0];
}

export function getBodyRotation(behaviorState: BehaviorState, shakeIntensity: number): [number, number, number] {
  const { currentState, headShakePhase, crouchAmount } = behaviorState;
  
  if (currentState === 'earthquake') {
    const leanX = Math.sin(headShakePhase * 0.7) * 0.15 * shakeIntensity;
    const leanZ = Math.cos(headShakePhase) * 0.1 * shakeIntensity;
    return [leanX * crouchAmount, 0, leanZ * crouchAmount];
  }
  
  if (currentState === 'recovery') {
    return [crouchAmount * 0.1, 0, 0];
  }
  
  return [0, 0, 0];
}