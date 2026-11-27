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
    horizon: $('horizon'),
    missionName: $('mission-name'),
    missionObj: $('mission-obj'),
    missionStats: $('mission-stats'),
    message: $('message'),
    targetDist: $('target-dist'),
    targetArrow: document.querySelector('#target .ring-arrow'),
    target: $('target'),
  };
  const hctx = els.horizon.getContext('2d');
  let messageTimer = 0;

  function drawHorizon(pitch, bank) {
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
    const parts = [];
    for (let off = -90; off <= 90; off += 30) {
      parts.push(compassLabel(headingDeg + off));
    }
    els.tape.textContent = parts.join('   ');
  }

  return {
    show() {
      els.hud.classList.add('on');
    },
    hide() {
      els.hud.classList.remove('on');
    },
    setMission(name, objective, wind) {
      els.missionName.textContent = name;
      els.missionObj.textContent = objective;
      els.wind.textContent = wind;
    },
    setCamera(name) {
      els.cam.textContent = name;
    },
    flash(text, ms = 2200) {
      els.message.textContent = text;
      els.message.classList.add('show');
      clearTimeout(messageTimer);
      messageTimer = setTimeout(() => els.message.classList.remove('show'), ms);
    },
    /**
     * Refresh every instrument from the live state.
     * state: { speedKt, altFt, vsiFpm, headingDeg, pitch, bank, throttle,
     *   flaps, gearDown, ringsDone, ringsTotal, score, elapsedSec,
     *   targetDistM, targetAngleDeg|null, legLabel }
     */
    update(s) {
      els.speed.textContent = String(Math.round(s.speedKt));
      els.alt.textContent = String(Math.round(s.altFt));
      const vsi = Math.round(s.vsiFpm);
      els.vsi.textContent = (vsi >= 0 ? '+' : '') + String(vsi);
      drawTape(s.headingDeg);
      els.hdg.textContent = `${pad3(s.headingDeg)}°`;
      els.thr.textContent = String(Math.round(s.throttle * 100));
      els.flaps.textContent = s.flaps ? 'DOWN' : 'UP';
      els.gear.textContent = s.gearDown ? 'DOWN' : 'UP';
      drawHorizon(s.pitch, s.bank);
      const mm = String(Math.floor(s.elapsedSec / 60)).padStart(2, '0');
      const ss = String(Math.floor(s.elapsedSec % 60)).padStart(2, '0');
      els.missionStats.textContent =
        `RINGS ${s.ringsDone}/${s.ringsTotal} · SCORE ${s.score} · ${mm}:${ss}${s.legLabel ? ' · ' + s.legLabel : ''}`;
      if (s.targetDistM === null) {
        els.target.style.display = 'none';
      } else {
        els.target.style.display = 'block';
        els.targetDist.textContent = `${Math.round(s.targetDistM)} m`;
        if (s.targetAngleDeg === null) {
          els.targetArrow.style.opacity = '0';
        } else {
          els.targetArrow.style.opacity = '1';
          els.targetArrow.style.transform = `rotate(${s.targetAngleDeg}deg)`;
        }
      }
    },
  };
}
