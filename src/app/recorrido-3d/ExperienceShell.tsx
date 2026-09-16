"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import ReferenceHouse from "./ReferenceHouse";
import "./experience-shell.css";

type LightMode = "day" | "sunset" | "night";
type Soil = "rock" | "firm" | "soft";

const SOIL: Record<Soil, { label: string; factor: number; mmiBoost: number }> = {
  rock: { label: "Roca / suelo muy firme", factor: 0.78, mmiBoost: -0.7 },
  firm: { label: "Suelo firme", factor: 1, mmiBoost: 0 },
  soft: { label: "Suelo blando", factor: 1.22, mmiBoost: 0.8 },
};

const MMI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function estimateMmi(magnitude: number, depthKm: number, distanceKm: number, soil: Soil) {
  const hypocentralDistance = Math.sqrt(depthKm ** 2 + distanceKm ** 2);
  const distanceLoss = Math.log10(hypocentralDistance + 12) * 2.05;
  return Math.min(12, Math.max(1, 2.3 + (magnitude - 4) * 1.48 + (2.8 - distanceLoss) + SOIL[soil].mmiBoost));
}

function level(score: number) {
  if (score >= 0.76) return "Crítico";
  if (score >= 0.56) return "Alto";
  if (score >= 0.34) return "Moderado";
  return "Bajo";
}

export default function ExperienceShell() {
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState<LightMode>("day");
  const [magnitude, setMagnitude] = useState(7.2);
  const [depthKm, setDepthKm] = useState(28);
  const [distanceKm, setDistanceKm] = useState(35);
  const [duration, setDuration] = useState(22);
  const [soil, setSoil] = useState<Soil>("firm");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const analysis = useMemo(() => {
    const estimatedMmi = estimateMmi(magnitude, depthKm, distanceKm, soil);
    const mag = clamp((magnitude - 4) / 5.5);
    const intensity = clamp((estimatedMmi - 1) / 11);
    const shallow = clamp(1 - depthKm / 150);
    const distance = clamp(1 - distanceKm / 250);
    const time = clamp((duration - 5) / 55);
    const hazard = clamp((mag * 0.34 + intensity * 0.38 + shallow * 0.1 + distance * 0.08 + time * 0.06 + 0.04) * SOIL[soil].factor);
    const damage = Math.round(clamp((hazard - 0.18) / 0.72) * 100);
    const drift = Math.round(Math.pow(hazard, 1.58) * 1.9 * 100) / 100;
    const pga = Math.round((0.015 + Math.pow(hazard, 1.72) * 0.72) * 100) / 100;
    const roof = clamp(hazard * 0.92);
    const openings = clamp(hazard * 1.08);
    const sanitary = clamp(hazard * 0.78);
    const support = Math.round(clamp(1 - hazard * 0.62 + 0.08) * 100);
    return { estimatedMmi, hazard, damage, drift, pga, roof, openings, sanitary, support };
  }, [magnitude, depthKm, distanceKm, duration, soil]);

  useEffect(() => {
    if (!playing) return;
    setProgress(0);
    const started = performance.now();
    const visualMs = Math.max(8000, Math.min(18000, duration * 360));
    let raf = 0;
    const tick = (now: number) => {
      const next = clamp((now - started) / visualMs);
      setProgress(next);
      if (next >= 1) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  const shake = 1 + analysis.hazard * 12;
  const speed = Math.max(70, 250 - magnitude * 19);
  const sceneStyle = { "--sf-shake": `${shake}px`, "--sf-speed": `${speed}ms` } as CSSProperties;
  const mmiRoman = MMI[Math.min(11, Math.max(0, Math.round(analysis.estimatedMmi) - 1))];
  const priority = analysis.damage >= 75 ? "Evacuar y aislar zonas dañadas" : analysis.damage >= 45 ? "Inspección profesional antes de reocupar" : analysis.damage >= 20 ? "Revisar uniones, vanos y terminaciones" : "Inspección visual preventiva";

  return (
    <div className={`sf-experience sf-light-${light}`}>
      <div className={`sf-scene ${playing ? "is-quaking" : ""}`} style={sceneStyle}>
        <ReferenceHouse />
      </div>

      {(playing || progress > 0) && analysis.damage >= 18 ? (
        <div className="sf-damage-map" aria-hidden="true">
          <span className="sf-damage-pin pin-roof" style={{ opacity: 0.25 + analysis.roof * 0.75 }}><b>Techumbre</b><small>{level(analysis.roof)}</small></span>
          <span className="sf-damage-pin pin-openings" style={{ opacity: 0.25 + analysis.openings * 0.75 }}><b>Vanos / uniones</b><small>{level(analysis.openings)}</small></span>
          <span className="sf-damage-pin pin-sanitary" style={{ opacity: 0.25 + analysis.sanitary * 0.75 }}><b>Red sanitaria</b><small>{level(analysis.sanitary)}</small></span>
        </div>
      ) : null}

      <button className="sf-lab-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <img src="/brand/soluciones-fabrick-mobile.svg" alt="" />
        <span><small>FABRICK LAB</small>Sismo · ambiente</span>
        <b>{open ? "×" : "＋"}</b>
      </button>

      {open ? (
        <aside className="sf-lab" aria-label="Simulador sísmico y ambiente del recorrido">
          <header>
            <img src="/brand/soluciones-fabrick-mobile.svg" alt="Soluciones Fabrick" />
            <div><small>RECORRIDO 3D · LAB</small><strong>Casa + simulación sísmica</strong></div>
            <button aria-label="Cerrar laboratorio" onClick={() => setOpen(false)}>×</button>
          </header>

          <section>
            <h2>Ambiente</h2>
            <div className="sf-segmented">
              {(["day", "sunset", "night"] as LightMode[]).map((mode) => <button key={mode} aria-pressed={light === mode} onClick={() => setLight(mode)}>{mode === "day" ? "Día" : mode === "sunset" ? "Atardecer" : "Noche"}</button>)}
            </div>
          </section>

          <section>
            <div className="sf-section-title"><h2>Terremoto</h2><span>MMI {mmiRoman}</span></div>
            <label>Magnitud <b>{magnitude.toFixed(1)}</b><input type="range" min="4" max="9.5" step="0.1" value={magnitude} onChange={(event) => setMagnitude(Number(event.target.value))} /></label>
            <label>Profundidad <b>{depthKm} km</b><input type="range" min="5" max="150" step="1" value={depthKm} onChange={(event) => setDepthKm(Number(event.target.value))} /></label>
            <label>Distancia epicentral <b>{distanceKm} km</b><input type="range" min="0" max="250" step="5" value={distanceKm} onChange={(event) => setDistanceKm(Number(event.target.value))} /></label>
            <label>Duración <b>{duration} s</b><input type="range" min="5" max="60" step="1" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
            <label>Suelo<select value={soil} onChange={(event) => setSoil(event.target.value as Soil)}><option value="rock">Roca / muy firme</option><option value="firm">Firme</option><option value="soft">Blando</option></select></label>
            <button className="sf-play" onClick={() => setPlaying((value) => !value)}>{playing ? "Pausar simulación" : progress > 0 ? "Repetir simulación" : "Reproducir simulación"}</button>
            <div className="sf-progress"><i style={{ width: `${progress * 100}%` }} /></div>
          </section>

          <section className="sf-results">
            <h2>Lectura del escenario</h2>
            <div className="sf-metrics"><article><small>Daño visual</small><strong>{analysis.damage}%</strong></article><article><small>PGA proxy</small><strong>{analysis.pga} g</strong></article><article><small>Deriva proxy</small><strong>{analysis.drift}%</strong></article><article><small>Soporte</small><strong>{analysis.support}%</strong></article></div>
            <p><b>Prioridad:</b> {priority}.</p>
            <ul><li>Vanos y uniones: {level(analysis.openings)}</li><li>Techumbre y cielos: {level(analysis.roof)}</li><li>Red sanitaria: {level(analysis.sanitary)}</li></ul>
          </section>

          <details>
            <summary>Guía rápida de controles</summary>
            <p><b>Girar:</b> arrastra sobre la vivienda. <b>Zoom:</b> rueda, pinza o botones +/−. <b>Cámaras:</b> usa ‹ Recorrer ›. <b>Capas:</b> Ajustes permite explotar estructura, terminaciones y redes. <b>Sismo:</b> configura escenario y pulsa reproducir; los marcadores rojos muestran zonas de atención visual.</p>
          </details>

          <p className="sf-disclaimer">Modelo educativo/comercial. MMI, PGA proxy, deriva, soporte y daño son referencias visuales; no sustituyen cálculo estructural, estudio de suelo, NCh433/DS61, inspección profesional ni evaluación de habitabilidad post-sismo. No representa una probabilidad de supervivencia.</p>
        </aside>
      ) : null}
    </div>
  );
}
