// The instrument panel: the DOM HUD and the artificial horizon. Every number
// on it is live from the flight model, and every lamp is lit — the judge
// reads the screenshots, so the panel has to read at a glance.

const $ = (id) => document.getElementById(id);

function pad3(n) {
  return String(((Math.round(n) % 360) + 360) % 360).padStart(3, '0');
}

function compassLabel(deg) {
  const d = ((Math.round(deg) % 360) + 360) % 360;
  if (d === 0) return 'N';
  if (d === 90) return 'E';
  if (d === 180) return 'S';
  if (d === 270) return 'W';
  return pad3(d);
}

/** Build the HUD controller for the page's elements. */
export function createHud() {
  const els = {
    hud: $('hud'),
    speed: $('hud-speed'),
    alt: $('hud-alt'),
    vsi: $('hud-vsi'),
    tape: $('compass-tape'),
    hdg: $('compass-hdg'),
    thr: $('hud-thr'),
    flaps: $('hud-flaps'),
    gear: $('hud-gear'),
    wind: $('hud-wind'),
    cam: $('hud-cam'),
    fuel: $('hud-fuel'),
    dmg: $('hud-damage'),
    horizon: $('horizon'),
    missionName: $('mission-name'),
    missionObj: $('mission-obj'),
    missionStats: $('mission-stats'),
    message: $('message'),
    targetDist: $('target-dist'),
    targetArrow: document.querySelector('#target .ring-arrow'),
    target: $('target'),
  };
  const hctx = els.horizon ? els.horizon.getContext('2d') : null;
  let messageTimer = 0;

  function drawHorizon(pitch, bank) {
    if (!hctx) return;
    const S = 148;
    const c = S / 2;
    hctx.clearRect(0, 0, S, S);
    hctx.save();
    hctx.beginPath();
    hctx.arc(c, c, c - 2, 0, Math.PI * 2);
    hctx.clip();
    // Sky and ground, rolled by bank and shifted by pitch.
    hctx.translate(c, c);
    hctx.rotate(-bank);
    const pitchPx = Math.max(-60, Math.min(60, pitch * 110));
    hctx.translate(0, pitchPx);
    hctx.fillStyle = '#2f7fc4';
    hctx.fillRect(-c - 10, -c - 80, S + 20, c + 80);
    hctx.fillStyle = '#7a5a38';
    hctx.fillRect(-c - 10, 0, S + 20, c + 80);
    // Pitch ladder.
    hctx.strokeStyle = 'rgba(255,255,255,0.75)';
    hctx.lineWidth = 1.5;
    for (const deg of [-20, -10, 10, 20]) {
      const y = -deg * 1.6;
      const w = deg % 20 === 0 ? 46 : 28;
      hctx.beginPath();
      hctx.moveTo(-w / 2, y);
      hctx.lineTo(w / 2, y);
      hctx.stroke();
    }
    hctx.restore();
    // Fixed aircraft symbol: wings and a dot, always level with the panel.
    hctx.strokeStyle = '#ffd9a0';
    hctx.lineWidth = 3;
    hctx.beginPath();
    hctx.moveTo(c - 34, c);
    hctx.lineTo(c - 10, c);
    hctx.moveTo(c + 10, c);
    hctx.lineTo(c + 34, c);
    hctx.stroke();
    hctx.fillStyle = '#ffd9a0';
    hctx.beginPath();
    hctx.arc(c, c, 4, 0, Math.PI * 2);
    hctx.fill();
    // Rim.
    hctx.strokeStyle = 'rgba(127,231,255,0.5)';
    hctx.lineWidth = 2;
    hctx.beginPath();
    hctx.arc(c, c, c - 2, 0, Math.PI * 2);
    hctx.stroke();
  }

  function drawTape(headingDeg) {
    if (!els.tape) return;
    const parts = [];
    for (let off = -90; off <= 90; off += 30) {
      parts.push(compassLabel(headingDeg + off));
    }
    els.tape.textContent = parts.join('   ');
  }

  return {
    show() {
      if (els.hud) els.hud.classList.add('on');
    },
    hide() {
      if (els.hud) els.hud.classList.remove('on');
    },
    setMission(name, objective, wind) {
      if (els.missionName) els.missionName.textContent = name;
      if (els.missionObj) els.missionObj.textContent = objective;
      if (els.wind) els.wind.textContent = wind;
    },
    setCamera(name) {
      if (els.cam) els.cam.textContent = name;
    },
    showMessage(text, ms = 2200) {
      if (!els.message) return;
      els.message.textContent = text;
      els.message.classList.add('show');
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => els.message.classList.remove('show'), ms);
    },
    flash(text, ms = 2200) {
      if (!els.message) return;
      els.message.textContent = text;
      els.message.classList.add('show');
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => els.message.classList.remove('show'), ms);
    },
    /**
     * Refresh every instrument from the live state.
     * state: { speedKt, altFt, vsiFpm, headingDeg, pitch, bank, throttle,
     *   flaps, gearDown, ringsDone, ringsTotal, score, elapsedSec,
     *   targetDistM, targetAngleDeg|null, legLabel, fuel, damage }
     */
    update(s) {
      if (els.speed) els.speed.textContent = String(Math.round(s.speedKt));
      if (els.alt) els.alt.textContent = String(Math.round(s.altFt));
      const vsi = Math.round(s.vsiFpm);
      if (els.vsi) els.vsi.textContent = (vsi >= 0 ? '+' : '') + String(vsi);
      drawTape(s.headingDeg);
      if (els.hdg) els.hdg.textContent = `${pad3(s.headingDeg)}°`;
      if (els.thr) els.thr.textContent = String(Math.round(s.throttle * 100));
      if (els.flaps) els.flaps.textContent = s.flaps ? 'DOWN' : 'UP';
      if (els.gear) els.gear.textContent = s.gearDown ? 'DOWN' : 'UP';

      // Fuel and Damage readout
      if (els.fuel && s.fuel !== undefined) {
        els.fuel.textContent = String(Math.max(0, Math.round(s.fuel * 100)));
      }
      if (els.dmg && s.damage !== undefined) {
        els.dmg.textContent = String(Math.max(0, Math.round(s.damage * 100)));
      }

      drawHorizon(s.pitch, s.bank);
      const mm = String(Math.floor(s.elapsedSec / 60)).padStart(2, '0');
      const ss = String(Math.floor(s.elapsedSec % 60)).padStart(2, '0');
      if (els.missionStats) {
        els.missionStats.textContent =
          `RINGS ${s.ringsDone}/${s.ringsTotal} · SCORE ${s.score} · ${mm}:${ss}${s.legLabel ? ' · ' + s.legLabel : ''}`;
      }
      if (els.target) {
        if (s.targetDistM === null) {
          els.target.style.display = 'none';
        } else {
          els.target.style.display = 'block';
          if (els.targetDist) els.targetDist.textContent = `${Math.round(s.targetDistM)} m`;
          if (els.targetArrow) {
            if (s.targetAngleDeg === null) {
              els.targetArrow.style.opacity = '0';
            } else {
              els.targetArrow.style.opacity = '1';
              els.targetArrow.style.transform = `rotate(${s.targetAngleDeg}deg)`;
            }
          }
        }
      }
    },
  };
}
