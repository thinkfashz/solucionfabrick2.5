/**
 * Comportamiento "consciente" de los maniquíes del comparador sísmico.
 *
 * FSM + navegación 2D (X/Z) con steering simple, puntos de interés asignados por
 * personaje, coordinación mutua (evitar choques, conversar cara a cara y ir a
 * resguardos distintos) y reacción prioritaria al sismo.
 *
 * Sin LLM: sólo reglas y utilidades con aleatoriedad controlada. La lógica vive
 * en refs y se ejecuta por frame desde <AnimatedFigure/> (sin re-renders).
 *
 * Convención de ejes: el maniquí del GLB mira hacia +Z local cuando su rotación
 * es 0, por lo que la orientación del cuerpo es  yaw = atan2(dx, dz).
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CharacterState =
  | 'idle'       // de pie: mira alrededor, respira (Idle_Loop / variante talking)
  | 'wander'     // pasea entre puntos de interés (Walk_Loop)
  | 'inspect'    // observa una casa y gesticula (Idle_Talking_Loop)
  | 'enterHouse' // camina a su puerta y entra al interior
  | 'inside'     // deambula dentro de su casa
  | 'exitHouse'  // sale por la puerta al exterior
  | 'talk'       // conversa cara a cara con el otro personaje
  | 'rest'       // descansa: quieto, respiración lenta
  | 'alert'      // presiente el sismo: mira/señala al cielo
  | 'earthquake' // prioridad máxima: corre al resguardo y se agacha
  | 'recovery';  // se levanta, verifica al compañero y vuelve a la calma

export type SpeedProfile = 'none' | 'walk' | 'jog' | 'crouch';

/** Punto de interés (POI) con clave única para coordinar destinos. */
export interface PointOfInterest {
  key: string;
  x: number;
  z: number;
  /** Punto de mira opcional (p. ej. el cielo sobre la casa). */
  look?: [number, number, number];
}

export interface CharacterConfig {
  // --- API original (conservada) ---
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
  // --- Ampliación consciente ---
  index: 0 | 1;
  jogSpeed: number;
  crouchSpeed: number;
  /** Centro de la casa propia [x, z]. */
  homeCenter: [number, number];
  /** Umbral de la puerta propia [x, z] (también es el resguardo por defecto). */
  homeDoor: [number, number];
  /** Punto de resguardo durante el sismo (umbral propio por defecto). */
  shelterPoint: [number, number];
  /** Waypoints interiores aproximados de la casa propia. */
  interiorPoints: PointOfInterest[];
  /** Puntos de interés exteriores asignados a este personaje. */
  poi: PointOfInterest[];
}

/** Instantánea mínima del otro personaje para coordinarse (mutable, por frame). */
export interface PartnerSnapshot {
  state: CharacterState;
  x: number;
  z: number;
  destKey: string | null;
  moving: boolean;
  crouch: number;
}

export interface BehaviorState {
  currentState: CharacterState;
  index: 0 | 1;
  stateTimer: number;
  stateDuration: number;
  /** Sub-fase dentro del estado (entrar/estar dentro, correr/agachado, etc.). */
  phase: number;
  phaseTimer: number;
  /** Posición 2D real del personaje (x, y base, z). */
  position: [number, number, number];
  /** Destino de navegación (x, z). */
  target: [number, number];
  /** Punto intermedio para rodear las casas (x, z). */
  via: [number, number] | null;
  /** Clave del destino actual (para no pisar los destinos del compañero). */
  destKey: string | null;
  /** Velocidad actual (vx, vz) en m/s. */
  velocity: [number, number];
  currentSpeed: number;
  moving: boolean;
  /** Orientación del cuerpo en radianes (yaw del grupo). */
  yaw: number;
  turnRate: number;
  lookAtTarget: [number, number, number] | null;
  headShakePhase: number;
  crouchAmount: number;
  /** Balanceo lateral producido por la sacudida (x, z). */
  sway: [number, number];
  idleVariant: 'idle' | 'talking';
  /** Turno de habla observado (para alternar quién habla en una conversación). */
  lastTurn: number;
  /** Mensaje de la burbuja de diálogo (null = sin burbuja). */
  message: string | null;
  messageTimer: number;
}

// ---------------------------------------------------------------------------
// Constantes de escena
// ---------------------------------------------------------------------------

const HOUSE_X = 5.1; // |x| del centro de cada casa
const DEFAULT_DEPTH_M = 8; // preset familiar 6×8 (mejorable pasando houseDoor desde el shell)
const ALERT_PROGRESS_END = 0.07; // fracción del avance en la que aún sólo hay "alerta"
const WALK_NOMINAL_SPEED = 1.1; // velocidad nominal del clip Walk_Loop (m/s)
const JOG_NOMINAL_SPEED = 2.7; // velocidad nominal del clip Jog_Fwd_Loop (m/s)
const TALK_TURN_SECONDS = 1.7; // duración de cada turno de palabra
const ARRIVE_RADIUS = 0.45; // radio de llegada a un waypoint
const AVOID_RADIUS = 0.95; // radio de esquiva del compañero

/** Límites del área caminable (evita que se pierdan fuera de cámara). */
const BOUNDS = { minX: -8.4, maxX: 8.4, minZ: -4.4, maxZ: 8.3 };

/** Frases cortas en español para las burbujas de diálogo. */
const LINES: Record<string, string[]> = {
  alert: ['¿Sientes eso?', 'Algo se mueve…'],
  quake: ['¡Cuidado!', '¡Salgamos!'],
  cover: ['Agáchate', 'Bajo el dintel'],
  recovery: ['Está bien', '¿Estás bien?'],
  inspect: ['Revisemos la casa', 'Mira ese muro'],
  enter: ['Revisemos la casa', 'Entro y vuelvo'],
  exit: ['Ya salgo', 'Todo en orden'],
  talk: ['¿Sientes eso?', 'Revisemos la casa', 'Está bien', 'Todo en orden', 'Salgamos'],
};

const DEFAULT_CONFIG: Omit<
  CharacterConfig,
  'position' | 'patrolStartX' | 'patrolEndX' | 'index' | 'jogSpeed' | 'crouchSpeed' | 'homeCenter' | 'homeDoor' | 'shelterPoint' | 'interiorPoints' | 'poi'
> = {
  walkSpeed: 1.2,
  pathLength: 8,
  idleMinDuration: 3,
  idleMaxDuration: 8,
  walkMinDuration: 4,
  walkMaxDuration: 10,
  inspectDuration: 3,
  recoveryDuration: 4,
};

// ---------------------------------------------------------------------------
// Utilidades numéricas
// ---------------------------------------------------------------------------

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}

/** Normaliza un ángulo al rango (-π, π]. */
function wrapAngle(a: number): number {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}

/** Interpolación angular por el camino más corto. */
function lerpAngle(a: number, b: number, t: number): number {
  return a + wrapAngle(b - a) * t;
}

function distTo(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(bx - ax, bz - az);
}

function pickLine(list: string[], index: number, salt = 0): string {
  return list[(index + salt) % list.length];
}

// ---------------------------------------------------------------------------
// Canal de coordinación entre los dos personajes
// ---------------------------------------------------------------------------

const snapshots: Array<PartnerSnapshot | null> = [null, null];

/** Publica el estado propio (una vez por frame, desde AnimatedFigure). */
export function publishCharacterSnapshot(index: 0 | 1, snapshot: PartnerSnapshot | null): void {
  snapshots[index] = snapshot;
}

/** Lee la instantánea del otro personaje. */
export function readPartnerSnapshot(index: 0 | 1): PartnerSnapshot | null {
  return snapshots[index === 0 ? 1 : 0];
}

// ---------------------------------------------------------------------------
// Configuración por personaje (roles y POI distintos según el índice)
// ---------------------------------------------------------------------------

export function createCharacterConfig(
  position: [number, number, number],
  pathLength: number = 8,
  walkSpeed: number = 1.2,
  overrides?: Partial<CharacterConfig>
): CharacterConfig {
  const halfPath = pathLength / 2;
  // El personaje de la izquierda (x<0) cuida la casa Metalcon; el otro, la de madera.
  const index: 0 | 1 = position[0] < 0 ? 0 : 1;
  const sign = index === 0 ? -1 : 1;
  const homeX = sign * HOUSE_X;
  const homeDoor: [number, number] = [homeX, DEFAULT_DEPTH_M / 2 + 0.5];

  const config: CharacterConfig = {
    ...DEFAULT_CONFIG,
    position,
    walkSpeed,
    pathLength,
    patrolStartX: position[0] - halfPath,
    patrolEndX: position[0] + halfPath,
    index,
    jogSpeed: 2.4 + Math.random() * 0.6,
    crouchSpeed: 0.5,
    homeCenter: [homeX, 0],
    homeDoor,
    shelterPoint: homeDoor,
    interiorPoints: [],
    poi: [],
  };
  if (overrides) Object.assign(config, overrides);

  // Derivamos la profundidad desde la puerta (zDoor = profundidad/2 + 0.5).
  const [doorX, doorZ] = config.homeDoor;
  const backWallZ = -(doorZ - 0.5);

  // Interior aproximado: se entra en línea recta por la puerta y se deambula
  // dentro, sin cruzar muros (desplazamientos laterales moderados).
  config.interiorPoints = [
    { key: `in-${index}-a`, x: doorX, z: doorZ - 1.6 },
    { key: `in-${index}-b`, x: doorX - sign * 1.1, z: Math.max(backWallZ + 1.1, doorZ - 2.9) },
    { key: `in-${index}-c`, x: doorX + sign * 1.1, z: Math.max(backWallZ + 1.1, doorZ - 4.1) },
  ];

  // Puntos de interés exteriores con roles distintos por personaje.
  config.poi = [
    { key: `front-${index}`, x: homeX + sign * 1.3, z: doorZ + 1.7, look: [homeX, 1.8, 0] },
    { key: `door-${index}`, x: doorX, z: doorZ + 0.9, look: [homeX, 1.6, 0] },
    { key: `path-${index}`, x: sign * 1.35, z: 3.7 },
    { key: `sky-${index}`, x: sign * 3.2, z: 7.4, look: [homeX, 5.2, 0] },
    { key: `stroll-${index}`, x: sign * 7.6, z: 5.9 },
    { key: `neighbor-${index}`, x: -sign * 3.9, z: doorZ + 2.2, look: [-sign * HOUSE_X, 1.8, 0] },
  ];

  return config;
}

export function getInitialBehaviorState(config: CharacterConfig): BehaviorState {
  return {
    currentState: 'idle',
    index: config.index,
    stateTimer: 0,
    stateDuration: rand(config.idleMinDuration, config.idleMaxDuration),
    phase: 0,
    phaseTimer: 0,
    position: [config.position[0], config.position[1], config.position[2]],
    target: [config.position[0], config.position[2]],
    via: null,
    destKey: null,
    velocity: [0, 0],
    currentSpeed: 0,
    moving: false,
    // Arranca mirando hacia las casas (-Z), como el group inicial del componente.
    yaw: Math.PI,
    turnRate: 0,
    lookAtTarget: null,
    headShakePhase: 0,
    crouchAmount: 0,
    sway: [0, 0],
    idleVariant: 'idle',
    lastTurn: -1,
    message: null,
    messageTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers de transición
// ---------------------------------------------------------------------------

function enterState(state: BehaviorState, next: CharacterState, duration: number): void {
  state.currentState = next;
  state.stateTimer = 0;
  state.stateDuration = duration;
  state.phase = 0;
  state.phaseTimer = 0;
  state.lookAtTarget = null;
  state.lastTurn = -1;
}

function setMessage(state: BehaviorState, message: string, duration: number): void {
  state.message = message;
  state.messageTimer = duration;
}

function pickIdleVariant(state: BehaviorState): void {
  state.idleVariant = Math.random() < 0.35 ? 'talking' : 'idle';
}

function distToTarget(state: BehaviorState, x: number, z: number): number {
  return distTo(state.position[0], state.position[2], x, z);
}

function distToPartner(state: BehaviorState, partner: PartnerSnapshot): number {
  return distTo(state.position[0], state.position[2], partner.x, partner.z);
}

/** Frena el personaje de forma suave (decaimiento exponencial). */
function stopMoving(state: BehaviorState, delta: number): void {
  const damp = Math.min(1, delta * 7);
  state.velocity[0] -= state.velocity[0] * damp;
  state.velocity[1] -= state.velocity[1] * damp;
  state.currentSpeed = Math.hypot(state.velocity[0], state.velocity[1]);
  if (state.currentSpeed < 0.06) {
    state.velocity[0] = 0;
    state.velocity[1] = 0;
    state.currentSpeed = 0;
    state.moving = false;
  }
}

/** Gira el cuerpo hacia un punto (se usa cuando el personaje está quieto). */
function faceToward(state: BehaviorState, tx: number, tz: number, delta: number, rate = 4.5): void {
  if (distToTarget(state, tx, tz) < 0.05) return;
  const desired = Math.atan2(tx - state.position[0], tz - state.position[2]);
  const step = lerpAngle(state.yaw, desired, Math.min(1, delta * rate)) - state.yaw;
  state.yaw += step;
  state.turnRate = delta > 0 ? step / delta : 0;
}

/**
 * Define un destino evitando que el tramo recto atraviese el volumen de una casa:
 * si hay que cruzar de zona, se rodea por el camino frontal (z ≈ 5.7).
 */
function setDestination(
  state: BehaviorState,
  x: number,
  z: number,
  key: string | null,
  look?: [number, number, number]
): void {
  state.target = [x, z];
  state.destKey = key;
  const crossesZones =
    Math.sign(state.position[0]) !== Math.sign(x) &&
    Math.abs(state.position[0]) > 1.8 &&
    Math.abs(x) > 1.8 &&
    Math.min(state.position[2], z) < 5.2;
  state.via = crossesZones ? [Math.sign(x) * 1.2, 5.7] : null;
  if (look) state.lookAtTarget = look;
}

/**
 * Steering 2D: acelera/frena suavemente hacia el destino, esquiva al compañero,
 * orienta el cuerpo hacia la dirección real de desplazamiento y escala la
 * velocidad de los clips de locomoción.
 * Devuelve `true` cuando llegó al destino.
 */
function navigate(
  state: BehaviorState,
  config: CharacterConfig,
  delta: number,
  tx: number,
  tz: number,
  profile: SpeedProfile,
  partner: PartnerSnapshot | null,
  avoidCollision = true
): boolean {
  // Primero el punto intermedio (rodeo), si existe.
  let ax = tx;
  let az = tz;
  if (state.via) {
    if (distToTarget(state, state.via[0], state.via[1]) < 0.55) state.via = null;
    else {
      ax = state.via[0];
      az = state.via[1];
    }
  }

  const dx = ax - state.position[0];
  const dz = az - state.position[2];
  const dist = Math.hypot(dx, dz);
  const maxSpeed = profile === 'jog' ? config.jogSpeed : profile === 'crouch' ? config.crouchSpeed : config.walkSpeed;

  if (dist <= ARRIVE_RADIUS) {
    stopMoving(state, delta);
    if (dist < 0.18) {
      state.position[0] = ax;
      state.position[2] = az;
    }
    return true;
  }

  // Frenado progresivo al acercarse (sin estamparse contra el destino).
  const arriveSpeed = Math.min(maxSpeed, dist * 1.7);
  let desiredX = (dx / dist) * arriveSpeed;
  let desiredZ = (dz / dist) * arriveSpeed;

  // Esquiva suave del compañero (se desactiva si está agachado o en "talk").
  if (partner && avoidCollision && partner.crouch < 0.5 && state.currentState !== 'talk') {
    const pdx = state.position[0] - partner.x;
    const pdz = state.position[2] - partner.z;
    const pd = Math.hypot(pdx, pdz);
    if (pd > 0.001 && pd < AVOID_RADIUS) {
      const push = ((AVOID_RADIUS - pd) / AVOID_RADIUS) * maxSpeed * 0.9;
      desiredX += (pdx / pd) * push;
      desiredZ += (pdz / pd) * push;
    }
  }

  const accel = profile === 'jog' ? 7 : 5;
  const t = Math.min(1, delta * accel);
  state.velocity[0] += (desiredX - state.velocity[0]) * t;
  state.velocity[1] += (desiredZ - state.velocity[1]) * t;

  state.position[0] += state.velocity[0] * delta;
  state.position[2] += state.velocity[1] * delta;
  state.currentSpeed = Math.hypot(state.velocity[0], state.velocity[1]);
  state.moving = state.currentSpeed > 0.12;

  // Orientación del cuerpo hacia la dirección de movimiento.
  if (state.currentSpeed > 0.18) {
    const desiredYaw = Math.atan2(state.velocity[0], state.velocity[1]);
    const step = lerpAngle(state.yaw, desiredYaw, Math.min(1, delta * 6)) - state.yaw;
    state.yaw += step;
    state.turnRate = delta > 0 ? step / delta : 0;
  } else {
    state.turnRate *= Math.max(0, 1 - delta * 6);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Arranque de estados
// ---------------------------------------------------------------------------

function startWander(state: BehaviorState, config: CharacterConfig, partner: PartnerSnapshot | null): void {
  // Evita pisar el destino que ya está usando el compañero.
  const options = config.poi.filter((p) => !(partner && partner.destKey === p.key && partner.moving));
  const pool = options.length ? options : config.poi;
  const poi = pool[Math.floor(Math.random() * pool.length)];
  enterState(state, 'wander', rand(config.walkMinDuration, config.walkMaxDuration) + 5);
  setDestination(state, poi.x, poi.z, poi.key, poi.look);
}

function startInspect(state: BehaviorState, config: CharacterConfig): void {
  enterState(state, 'inspect', rand(config.inspectDuration, config.inspectDuration * 2.2));
  state.lookAtTarget = [config.homeCenter[0], 1.8, config.homeCenter[1]];
  setMessage(state, pickLine(LINES.inspect, state.index, Math.floor(Math.random() * 2)), 2.4);
}

function startEnterHouse(state: BehaviorState, config: CharacterConfig): void {
  enterState(state, 'enterHouse', 26);
  setDestination(state, config.homeDoor[0], config.homeDoor[1] + 0.85, `door-${state.index}`);
  setMessage(state, pickLine(LINES.enter, state.index, Math.floor(Math.random() * 2)), 2.2);
}

function startTalk(state: BehaviorState, partner: PartnerSnapshot): void {
  enterState(state, 'talk', rand(9, 14));
  // Punto de encuentro: el punto medio entre ambos.
  const mx = (state.position[0] + partner.x) / 2;
  const mz = (state.position[2] + partner.z) / 2;
  setDestination(state, mx, mz, 'talk');
}

function enterAlert(state: BehaviorState, config: CharacterConfig): void {
  enterState(state, 'alert', 3.4);
  state.lookAtTarget = [config.homeCenter[0], 5.2, config.homeCenter[1]];
  state.destKey = null;
  setMessage(state, pickLine(LINES.alert, state.index), 2.8);
}

function enterEarthquake(state: BehaviorState, config: CharacterConfig): void {
  enterState(state, 'earthquake', 60);
  state.crouchAmount = 0;
  // Cada personaje se resguarda en el umbral de SU casa (resguardos distintos).
  const [sx, sz] = config.shelterPoint;
  state.via = null;
  setDestination(state, sx, sz + 0.55, `shelter-${state.index}`);
  state.via = null; // desde el frente se entra recto por la puerta
  setMessage(state, pickLine(LINES.quake, state.index), 2.6);
}

function enterRecovery(state: BehaviorState, config: CharacterConfig, partner: PartnerSnapshot | null): void {
  enterState(state, 'recovery', config.recoveryDuration * 2.4);
  state.destKey = null;
  state.lookAtTarget = partner
    ? [partner.x, 1.5, partner.z]
    : [config.homeCenter[0], 1.6, config.homeCenter[1]];
  setMessage(state, pickLine(LINES.recovery, state.index), 3);
}

/** Elige qué hace el personaje al terminar su tiempo en reposo. */
function chooseNextAction(state: BehaviorState, config: CharacterConfig, partner: PartnerSnapshot | null): void {
  const partnerFree = !partner || ['idle', 'wander', 'inspect', 'rest'].includes(partner.state);
  const r = Math.random();
  if (partner && partnerFree && r < 0.1) {
    startTalk(state, partner);
    return;
  }
  if (r < 0.26) {
    startEnterHouse(state, config);
    return;
  }
  if (r < 0.46) {
    startWander(state, config, partner);
    return;
  }
  if (r < 0.62) {
    startInspect(state, config);
    return;
  }
  if (r < 0.73) {
    enterState(state, 'rest', rand(5, 9));
    state.lookAtTarget = null;
    return;
  }
  enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
  pickIdleVariant(state);
}

// ---------------------------------------------------------------------------
// Bucle de comportamiento
// ---------------------------------------------------------------------------

/**
 * Actualiza la FSM y la navegación del personaje.
 * `delta` en 0 significa "sólo evalúa transiciones" (llamada desde render).
 */
export function updateBehavior(
  state: BehaviorState,
  config: CharacterConfig,
  delta: number,
  playing: boolean,
  visualProgress: number,
  shakeIntensity: number,
  partner: PartnerSnapshot | null = null
): BehaviorState {
  const dtReal = Math.min(Math.max(delta, 0), 0.1);
  // Durante el sismo todo ocurre un poco más rápido a medida que avanza la sacudida:
  // la duración total de la coreografía queda ligada a visualProgress.
  const urgency = playing ? 1 + clamp(visualProgress) * 0.6 : 1;
  const dt = dtReal * urgency;

  if (dtReal > 0) {
    state.stateTimer += dt;
    state.phaseTimer += dt;
  }

  // Temporizador de la burbuja de diálogo (tiempo real).
  if (state.messageTimer > 0) {
    state.messageTimer -= dtReal;
    if (state.messageTimer <= 0) {
      state.messageTimer = 0;
      state.message = null;
    }
  }

  // La fase de temblor siempre avanza (temblor proporcional a la intensidad).
  state.headShakePhase += dtReal * (playing ? 8 : 2.5) * (1 + shakeIntensity * 2);

  // --- 1) Prioridad absoluta: la simulación en curso -----------------------
  if (playing) {
    const quakeFlow = state.currentState === 'earthquake' || state.currentState === 'recovery';
    if (!quakeFlow) {
      if (visualProgress < ALERT_PROGRESS_END) {
        if (state.currentState !== 'alert') enterAlert(state, config);
      } else if (state.currentState !== 'earthquake') {
        enterEarthquake(state, config);
      }
    }
  } else {
    if (state.currentState === 'earthquake') {
      enterRecovery(state, config, partner);
    } else if (state.currentState === 'alert') {
      enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
      pickIdleVariant(state);
    }
  }

  // --- 2) El compañero acepta la conversación si está libre ----------------
  if (
    partner &&
    partner.state === 'talk' &&
    state.currentState !== 'talk' &&
    ['idle', 'wander', 'inspect', 'rest'].includes(state.currentState)
  ) {
    startTalk(state, partner);
  }

  // --- 3) Lógica por estado ------------------------------------------------
  switch (state.currentState) {
    case 'idle': {
      stopMoving(state, dt);
      state.crouchAmount = Math.max(0, state.crouchAmount - dtReal * 2);
      // Mirada suave alrededor; si hay punto de mira, gira el cuerpo hacia él.
      if (state.lookAtTarget) faceToward(state, state.lookAtTarget[0], state.lookAtTarget[2], dt);
      if (state.stateTimer >= state.stateDuration) chooseNextAction(state, config, partner);
      break;
    }

    case 'wander': {
      state.crouchAmount = Math.max(0, state.crouchAmount - dtReal * 2);
      const arrived = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner);
      if (arrived) {
        // Conserva la mirada al punto de interés mientras descansa allí.
        const look = state.lookAtTarget;
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
        state.lookAtTarget = look;
        state.destKey = null;
        pickIdleVariant(state);
      } else if (state.stateTimer >= state.stateDuration) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
        state.destKey = null;
      }
      break;
    }

    case 'inspect': {
      stopMoving(state, dt);
      if (state.lookAtTarget) faceToward(state, state.lookAtTarget[0], state.lookAtTarget[2], dt);
      if (state.stateTimer >= state.stateDuration) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
        pickIdleVariant(state);
      }
      break;
    }

    case 'enterHouse': {
      if (state.phase === 0) {
        const atDoor = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner);
        if (atDoor) {
          const inside = config.interiorPoints[0];
          state.phase = 1;
          state.phaseTimer = 0;
          setDestination(state, inside.x, inside.z, inside.key, [inside.x, 1.5, inside.z + 1]);
        }
      } else {
        const arrived = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner, false);
        if (arrived) {
          enterState(state, 'inside', rand(8, 14));
          state.destKey = null;
        }
      }
      if (state.stateTimer >= state.stateDuration) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
        state.destKey = null;
      }
      break;
    }

    case 'inside': {
      if (state.phase === 0) {
        const arrived = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner, false);
        if (arrived) {
          state.phase = 1;
          state.phaseTimer = 0;
          state.lookAtTarget = [config.homeCenter[0], 1.5, config.homeCenter[1]];
        }
      } else {
        stopMoving(state, dt);
        if (state.lookAtTarget) faceToward(state, state.lookAtTarget[0], state.lookAtTarget[2], dt, 2.5);
        if (state.phaseTimer > rand(2.2, 4)) {
          // Deambula a otro punto interior…
          const options = config.interiorPoints.filter((p) => p.key !== state.destKey);
          const poi = options[Math.floor(Math.random() * options.length)];
          state.phase = 0;
          state.phaseTimer = 0;
          setDestination(state, poi.x, poi.z, poi.key, [poi.x, 1.5, poi.z + 1]);
        }
      }
      if (state.stateTimer >= state.stateDuration) {
        // …o decide salir.
        enterState(state, 'exitHouse', 22);
        setDestination(state, config.homeDoor[0], config.homeDoor[1] + 0.4, `door-out-${state.index}`);
        setMessage(state, pickLine(LINES.exit, state.index), 2);
      }
      break;
    }

    case 'exitHouse': {
      if (state.phase === 0) {
        const atDoor = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner, false);
        if (atDoor) {
          state.phase = 1;
          state.phaseTimer = 0;
          setDestination(state, config.homeDoor[0], config.homeDoor[1] + 1.8, null);
        }
      } else {
        const arrived = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner);
        if (arrived) {
          enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
          pickIdleVariant(state);
        }
      }
      if (state.stateTimer >= state.stateDuration) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
      }
      break;
    }

    case 'talk': {
      if (!partner) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
        break;
      }
      if (state.phase === 0) {
        const arrived = navigate(state, config, dt, state.target[0], state.target[1], 'walk', partner);
        const close = distToPartner(state, partner) < 2.4;
        if ((arrived && close) || distToPartner(state, partner) < 1.5) {
          state.phase = 1;
          state.phaseTimer = 0;
          stopMoving(state, dt);
          state.lookAtTarget = [partner.x, 1.5, partner.z];
        }
      } else {
        stopMoving(state, dt);
        if (partner) faceToward(state, partner.x, partner.z, dt);
        // Turnos de palabra alternados (el índice desfasa a uno y otro).
        const turn = Math.floor((state.stateTimer + state.index * 0.85) / TALK_TURN_SECONDS);
        if (turn !== state.lastTurn) {
          state.lastTurn = turn;
          setMessage(state, pickLine(LINES.talk, state.index, turn), TALK_TURN_SECONDS * 0.9);
        }
        const tooFar = distToPartner(state, partner) > 4.2;
        const partnerLeft = partner.state !== 'talk' && state.phaseTimer > 2;
        if (tooFar || partnerLeft || state.stateTimer >= state.stateDuration) {
          enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
          pickIdleVariant(state);
        }
      }
      if (state.stateTimer >= state.stateDuration) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
      }
      break;
    }

    case 'rest': {
      stopMoving(state, dt);
      state.crouchAmount = Math.max(0, state.crouchAmount - dtReal * 2);
      if (state.stateTimer >= state.stateDuration) {
        enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
        pickIdleVariant(state);
      }
      break;
    }

    case 'alert': {
      // Señala el cielo sobre su casa: presienten la llegada del sismo.
      stopMoving(state, dt);
      if (state.lookAtTarget) faceToward(state, state.lookAtTarget[0], state.lookAtTarget[2], dt, 3);
      // Se mantiene alerta hasta que el sismo se manifieste (gestionado arriba).
      if (state.stateTimer >= state.stateDuration) state.stateTimer = 0;
      break;
    }

    case 'earthquake': {
      if (state.phase === 0) {
        // Fase 1: correr al resguardo más cercano (el umbral de su casa).
        const arrived = navigate(state, config, dt, state.target[0], state.target[1], 'jog', partner, false);
        if (arrived || state.phaseTimer > 4.5) {
          state.phase = 1;
          state.phaseTimer = 0;
          stopMoving(state, dt);
          setMessage(state, pickLine(LINES.cover, state.index), 2.4);
        }
      }
      if (state.phase === 1) {
        // Fase 2: agachado, protegiendo la cabeza, temblando con la sacudida.
        stopMoving(state, dt);
        state.crouchAmount = Math.min(1, state.crouchAmount + dtReal * 3);
        const s = shakeIntensity;
        state.sway[0] = Math.sin(state.headShakePhase) * 0.05 * s;
        state.sway[1] = Math.cos(state.headShakePhase * 1.27) * 0.04 * s;
      }
      if (state.stateTimer >= state.stateDuration) enterRecovery(state, config, partner);
      break;
    }

    case 'recovery': {
      state.crouchAmount = Math.max(0, state.crouchAmount - dtReal * 1.2);
      state.sway[0] *= Math.max(0, 1 - dtReal * 6);
      state.sway[1] *= Math.max(0, 1 - dtReal * 6);
      if (state.phase === 0) {
        // Se levanta y mira hacia el compañero / la otra casa.
        stopMoving(state, dt);
        if (state.lookAtTarget) faceToward(state, state.lookAtTarget[0], state.lookAtTarget[2], dt, 2.5);
        if (state.phaseTimer > 1.8) {
          state.phase = 1;
          state.phaseTimer = 0;
        }
      } else {
        // Verifica que el otro esté bien: se acerca si está lejos.
        if (partner && distToPartner(state, partner) > 2.8) {
          const px = state.position[0] + (partner.x - state.position[0]) * 0.75;
          const pz = state.position[2] + (partner.z - state.position[2]) * 0.75;
          navigate(state, config, dt, px, pz, 'walk', partner);
          if (partner) state.lookAtTarget = [partner.x, 1.5, partner.z];
        } else {
          stopMoving(state, dt);
          if (partner) faceToward(state, partner.x, partner.z, dt, 3);
        }
        if (state.stateTimer >= state.stateDuration) {
          enterState(state, 'idle', rand(config.idleMinDuration, config.idleMaxDuration));
          pickIdleVariant(state);
        }
      }
      break;
    }
  }

  // --- 4) Límites del área y decaimiento del balanceo ----------------------
  state.position[0] = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, state.position[0]));
  state.position[2] = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, state.position[2]));
  if (state.currentState !== 'earthquake') {
    const decay = Math.max(0, 1 - dtReal * 6);
    state.sway[0] *= decay;
    state.sway[1] *= decay;
  }

  return state;
}

// ---------------------------------------------------------------------------
// Animación
// ---------------------------------------------------------------------------

function isSpeaking(state: BehaviorState): boolean {
  return Math.floor((state.stateTimer + state.index * 0.85) / TALK_TURN_SECONDS) % 2 === 0;
}

function pickClip(available: Set<string>, names: string[]): string {
  return names.find((n) => available.has(n)) ?? names[names.length - 1];
}

/** Clip, peso, escala de tiempo y fundido adecuados para cada estado. */
export function getAnimationForState(
  behaviorState: BehaviorState,
  availableAnimations: Set<string>
): { clip: string; weight: number; speed: number; crossFadeDuration: number } {
  const state = behaviorState;
  const walkClip = pickClip(availableAnimations, ['Walk_Loop', 'Jog_Fwd_Loop']);
  const jogClip = pickClip(availableAnimations, ['Jog_Fwd_Loop', 'Walk_Loop']);
  const crouchClip = pickClip(availableAnimations, ['Crouch_Idle_Loop', 'Crouch_Fwd_Loop']);
  const talkClip = pickClip(availableAnimations, ['Idle_Talking_Loop', 'Idle_Loop']);
  const idleClip =
    state.idleVariant === 'talking' && availableAnimations.has('Idle_Talking_Loop')
      ? 'Idle_Talking_Loop'
      : pickClip(availableAnimations, ['Idle_Loop']);
  const walkSpeedRatio = Math.min(1.6, Math.max(0.65, state.currentSpeed / WALK_NOMINAL_SPEED));
  const jogSpeedRatio = Math.min(1.4, Math.max(0.7, state.currentSpeed / JOG_NOMINAL_SPEED));

  switch (state.currentState) {
    case 'earthquake': {
      if (state.phase === 0) {
        return { clip: jogClip, weight: 1, speed: jogSpeedRatio, crossFadeDuration: 0.25 };
      }
      return { clip: crouchClip, weight: 1, speed: 1, crossFadeDuration: 0.35 };
    }
    case 'recovery': {
      if (state.crouchAmount > 0.4) {
        return { clip: crouchClip, weight: 1, speed: 1, crossFadeDuration: 0.4 };
      }
      return state.moving
        ? { clip: walkClip, weight: 1, speed: walkSpeedRatio, crossFadeDuration: 0.4 }
        : { clip: idleClip, weight: 1, speed: 1, crossFadeDuration: 0.5 };
    }
    case 'talk': {
      // Alterna quién habla (Idle_Talking_Loop) y quién escucha (Idle_Loop).
      return isSpeaking(state)
        ? { clip: talkClip, weight: 1, speed: 1, crossFadeDuration: 0.35 }
        : { clip: pickClip(availableAnimations, ['Idle_Loop', 'Idle_Talking_Loop']), weight: 1, speed: 0.92, crossFadeDuration: 0.4 };
    }
    case 'alert': {
      return { clip: talkClip, weight: 1, speed: 0.95, crossFadeDuration: 0.4 };
    }
    case 'inspect': {
      return { clip: talkClip, weight: 1, speed: 0.9, crossFadeDuration: 0.5 };
    }
    case 'rest': {
      return { clip: pickClip(availableAnimations, ['Idle_Loop']), weight: 1, speed: 0.72, crossFadeDuration: 0.6 };
    }
    case 'wander':
    case 'enterHouse':
    case 'inside':
    case 'exitHouse': {
      return state.moving
        ? { clip: walkClip, weight: 1, speed: walkSpeedRatio, crossFadeDuration: 0.35 }
        : { clip: idleClip, weight: 1, speed: 1, crossFadeDuration: 0.5 };
    }
    default: {
      return { clip: idleClip, weight: 1, speed: 1, crossFadeDuration: 0.5 };
    }
  }
}

// ---------------------------------------------------------------------------
// Rotaciones de cabeza y torso
// ---------------------------------------------------------------------------

/** Yaw relativo a la orientación del cuerpo para mirar un punto (limitado). */
function headYawTo(state: BehaviorState, tx: number, tz: number, limit = 0.85): number {
  const world = Math.atan2(tx - state.position[0], tz - state.position[2]);
  return Math.max(-limit, Math.min(limit, wrapAngle(world - state.yaw)));
}

export function getHeadRotation(
  behaviorState: BehaviorState,
  shakeIntensity: number
): [number, number, number] {
  const state = behaviorState;
  const t = state.stateTimer;
  const sh = Math.max(0, shakeIntensity);

  switch (state.currentState) {
    case 'earthquake': {
      if (state.phase === 1) {
        // Agachado protegiendo la cabeza: inclinada hacia abajo + temblor.
        return [
          0.38 + Math.sin(state.headShakePhase) * 0.12 * sh,
          Math.sin(state.headShakePhase * 0.9) * 0.3 * sh,
          Math.cos(state.headShakePhase * 1.3) * 0.22 * sh,
        ];
      }
      // Corriendo al resguardo: mirada al frente, tensa.
      return [0.08 + Math.sin(state.headShakePhase) * 0.1 * sh, 0, 0];
    }
    case 'recovery': {
      const yaw = state.lookAtTarget ? headYawTo(state, state.lookAtTarget[0], state.lookAtTarget[2]) * 0.8 : Math.sin(t * 0.6) * 0.3;
      return [0.04, yaw, Math.sin(state.headShakePhase) * 0.06];
    }
    case 'alert': {
      // Mira al cielo (pitch negativo = hacia arriba).
      const yaw = state.lookAtTarget ? headYawTo(state, state.lookAtTarget[0], state.lookAtTarget[2]) * 0.7 : 0;
      return [-0.38 + Math.sin(t * 3.1) * 0.05, yaw, Math.sin(t * 2.2) * 0.04];
    }
    case 'talk': {
      const speaking = isSpeaking(state);
      const nod = Math.sin(t * (speaking ? 6.2 : 2.6)) * (speaking ? 0.1 : 0.05);
      const yaw = state.lookAtTarget ? headYawTo(state, state.lookAtTarget[0], state.lookAtTarget[2]) * 0.85 : 0;
      return [nod, yaw, Math.sin(t * 1.7) * 0.03];
    }
    case 'inspect': {
      const yaw = state.lookAtTarget ? headYawTo(state, state.lookAtTarget[0], state.lookAtTarget[2]) * 0.8 : 0;
      return [-0.06 + Math.sin(t * 1.1) * 0.03, yaw, 0];
    }
    case 'rest': {
      return [0.12, Math.sin(t * 0.35) * 0.2, Math.sin(t * 0.5) * 0.03];
    }
    case 'idle': {
      // Mirar alrededor con balanceo suave.
      return [Math.sin(t * 0.42) * 0.05, Math.sin(t * 0.3) * 0.3, Math.sin(t * 0.21) * 0.04];
    }
    default: {
      // Al caminar: mirada hacia el destino + balanceo natural.
      const yaw = state.lookAtTarget ? headYawTo(state, state.lookAtTarget[0], state.lookAtTarget[2]) * 0.3 : Math.sin(t * 1.6) * 0.05;
      return [0, yaw, Math.sin(t * 2.1) * 0.03];
    }
  }
}

export function getBodyRotation(
  behaviorState: BehaviorState,
  shakeIntensity: number
): [number, number, number] {
  const state = behaviorState;
  const sh = Math.max(0, shakeIntensity);
  // Inclinación al girar (banking): proporcional a la velocidad de giro.
  const bank = Math.max(-0.16, Math.min(0.16, -state.turnRate * 0.06));
  const leanForward = Math.min(0.09, state.currentSpeed * 0.03);

  switch (state.currentState) {
    case 'earthquake': {
      if (state.phase === 1) {
        // Encorvado protegiéndose + balanceo con la sacudida.
        return [
          0.12 * state.crouchAmount + Math.sin(state.headShakePhase * 0.7) * 0.14 * sh * state.crouchAmount,
          0,
          Math.cos(state.headShakePhase) * 0.11 * sh * state.crouchAmount,
        ];
      }
      return [0.06, 0, bank];
    }
    case 'recovery': {
      return [state.crouchAmount * 0.12, 0, 0];
    }
    case 'alert': {
      return [-0.05, 0, Math.sin(state.stateTimer * 2) * 0.02];
    }
    case 'talk': {
      return [0, 0, Math.sin(state.stateTimer * 2.2) * 0.03];
    }
    case 'wander':
    case 'enterHouse':
    case 'inside':
    case 'exitHouse': {
      return [leanForward, 0, bank];
    }
    default: {
      return [0, 0, 0];
    }
  }
}
