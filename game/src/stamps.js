 // Samudra Sky Post — Postmaster's Stamp Book
 // Twelve collectible philatelic stamps awarded for notable achievements across island mail runs.
 // Self-contained, no DOM, no external dependencies.
 
 export const STAMP_DEFINITIONS = [
   {
     id: 'gannet',
     name: 'The Gannet',
     title: 'First Sortie Flight',
     condition: 'Complete any mail run without crashing.',
     ink: '#38bdf8',
     motif: 'gannet',
   },
   {
     id: 'ring',
     name: 'Ring Master',
     title: 'Clean Ring Course',
     condition: 'Clear all rings on a course.',
     ink: '#fbbf24',
     motif: 'ring',
   },
   {
     id: 'lighthouse',
     name: 'Beacon Landing',
     title: 'Butter Smooth Touchdown',
     condition: 'Touch down with a BUTTER landing grade.',
     ink: '#fde047',
     motif: 'lighthouse',
   },
   {
     id: 'jetty',
     name: 'Solid Berth',
     title: 'Safe Harbor',
     condition: 'Stick the landing with FIRM or better grade without crashing.',
     ink: '#34d399',
     motif: 'jetty',
   },
   {
     id: 'mail-sack',
     name: 'Mail Sack',
     title: 'Pristine Cargo',
     condition: 'Finish a run with zero airframe damage taken.',
     ink: '#f97316',
     motif: 'mail-sack',
   },
   {
     id: 'palm',
     name: 'Island Reserve',
     title: 'Fuel Miser',
     condition: 'Finish a run with at least 60% fuel remaining in the tanks.',
     ink: '#4ade80',
     motif: 'palm',
   },
   {
     id: 'storm-cloud',
     name: 'Storm Runner',
     title: 'Squall Conqueror',
     condition: 'Complete the storm mail run.',
     ink: '#a78bfa',
     motif: 'storm-cloud',
   },
   {
     id: 'moon',
     name: 'Night Watch',
     title: 'Twilight Navigation',
     condition: 'Complete a dusk or night mail run.',
     ink: '#c084fc',
     motif: 'moon',
   },
   {
     id: 'compass-rose',
     name: 'Compass Rose',
     title: 'Record Breaker',
     condition: 'Beat your previous personal best score on the run.',
     ink: '#f43f5e',
     motif: 'compass-rose',
   },
   {
     id: 'volcano',
     name: 'Fire & Ash',
     title: 'Through the Gauntlet',
     condition: 'Survive and complete a run after sustaining at least 25% damage.',
     ink: '#ef4444',
     motif: 'volcano',
   },
   {
     id: 'canoe',
     name: 'Outrigger Canoe',
     title: 'Island Hopper',
     condition: 'Complete a multi-leg postal route (Twin Isles).',
     ink: '#2dd4bf',
     motif: 'canoe',
   },
   {
     id: 'rooftop',
     name: 'Post Office Roof',
     title: 'Sky Postmaster Rating',
     condition: 'Achieve a score of 1200 or higher on any run.',
     ink: '#e879f9',
     motif: 'rooftop',
   },
 ];
 
 export class StampBook {
   constructor(storageKey = 'samudra-stamp-book') {
     this.storageKey = storageKey;
     this.stamps = new Map();
     for (const def of STAMP_DEFINITIONS) {
       this.stamps.set(def.id, { ...def, awardedAt: null });
     }
     this.load();
   }
 
   load() {
     try {
       if (typeof window !== 'undefined' && window.localStorage) {
         const raw = window.localStorage.getItem(this.storageKey);
         if (raw) {
           const parsed = JSON.parse(raw);
           if (parsed && typeof parsed === 'object') {
             for (const [id, stamp] of this.stamps.entries()) {
               if (parsed[id]) {
                 stamp.awardedAt = parsed[id].awardedAt || Date.now();
               }
             }
           }
         }
       }
     } catch {
       // Storage unavailable or disabled
     }
   }
 
   save() {
     try {
       if (typeof window !== 'undefined' && window.localStorage) {
         const out = {};
         for (const [id, stamp] of this.stamps.entries()) {
           if (stamp.awardedAt) {
             out[id] = { awardedAt: stamp.awardedAt };
           }
         }
         window.localStorage.setItem(this.storageKey, JSON.stringify(out));
       }
     } catch {
       // Storage quota or disabled
     }
   }
 
   has(id) {
     const stamp = this.stamps.get(id);
     return Boolean(stamp && stamp.awardedAt);
   }
 
   get(id) {
     return this.stamps.get(id) || null;
   }
 
   getAll() {
     return Array.from(this.stamps.values());
   }
 
   award(id) {
     const stamp = this.stamps.get(id);
     if (!stamp) return false;
     if (stamp.awardedAt) return false;
     stamp.awardedAt = Date.now();
     this.save();
     return true;
   }
 
   awardFor(run = {}, score = 0) {
     const newlyAwarded = [];
     const crashed = Boolean(run.crashed);
     const ringsHit = Number(run.ringsHit ?? 0);
     const ringsTotal = Number(run.ringsTotal ?? 0);
     const landingGrade = String(run.landingGrade || '').toUpperCase();
     const fuelLeft = Number(run.fuelLeft ?? 0);
     const fuelPct = fuelLeft <= 1 ? fuelLeft * 100 : fuelLeft;
     const damage = Number(run.damage ?? 0);
     const damagePct = damage <= 1 ? damage * 100 : damage;
     const timeOfDay = run.timeOfDay || run.mission?.timeOfDay || '';
     const legsCount = Array.isArray(run.mission?.legs) ? run.mission.legs.length : 1;
     const isBestBeaten = Boolean(run.isBestBeaten || (run.previousBest !== undefined && score > run.previousBest));
 
     const check = (id, conditionMet) => {
       if (conditionMet && this.award(id)) {
         newlyAwarded.push(this.get(id));
       }
     };
 
     if (!crashed) {
       check('gannet', true);
 
       if (ringsTotal > 0 && ringsHit >= ringsTotal) {
         check('ring', true);
       }
 
       if (landingGrade === 'BUTTER') {
         check('lighthouse', true);
       }
 
       if (landingGrade === 'BUTTER' || landingGrade === 'FIRM') {
         check('jetty', true);
       }
 
       if (damagePct <= 0.5) {
         check('mail-sack', true);
       }
 
       if (fuelPct >= 59.5) {
         check('palm', true);
       }
 
       if (timeOfDay === 'storm' || run.mission?.id === 'storm-post') {
         check('storm-cloud', true);
       }
 
       if (timeOfDay === 'dusk' || timeOfDay === 'night' || run.mission?.id === 'dusk-delivery') {
         check('moon', true);
       }
 
       if (isBestBeaten) {
         check('compass-rose', true);
       }
 
       if (damagePct >= 24.5) {
         check('volcano', true);
       }
 
       if (legsCount > 1 || run.mission?.id === 'twin-isles') {
         check('canoe', true);
       }
 
       if (score >= 1200) {
         check('rooftop', true);
       }
     }
 
     return newlyAwarded;
   }
 
   render(ctx, stamp, x = 0, y = 0, width = 96, height = 112) {
     if (!ctx) return;
     const def = typeof stamp === 'string' ? this.get(stamp) : stamp;
     if (!def) return;
 
     ctx.save();
     ctx.translate(x, y);
 
     const r = 3;
     const toothPitch = 8;
     ctx.fillStyle = '#0a1a2b';
     ctx.strokeStyle = def.ink || '#7fe7ff';
     ctx.lineWidth = 1.5;
 
     ctx.beginPath();
     ctx.rect(0, 0, width, height);
     ctx.fill();
     ctx.stroke();
 
     ctx.fillStyle = 'rgba(6, 18, 30, 0.9)';
     for (let px = 6; px < width - 4; px += toothPitch) {
       ctx.beginPath();
       ctx.arc(px, 0, r, 0, Math.PI * 2);
       ctx.fill();
       ctx.beginPath();
       ctx.arc(px, height, r, 0, Math.PI * 2);
       ctx.fill();
     }
     for (let py = 6; py < height - 4; py += toothPitch) {
       ctx.beginPath();
       ctx.arc(0, py, r, 0, Math.PI * 2);
       ctx.fill();
       ctx.beginPath();
       ctx.arc(width, py, r, 0, Math.PI * 2);
       ctx.fill();
     }
 
     const pad = 6;
     ctx.strokeStyle = def.ink || '#7fe7ff';
     ctx.lineWidth = 1;
     ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);
 
     ctx.fillStyle = def.ink || '#7fe7ff';
     ctx.font = '700 7px monospace';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'top';
     ctx.fillText('SAMUDRA POST', width / 2, pad + 3);
 
     const cx = width / 2;
     const cy = height * 0.46;
     drawStampMotif(ctx, def.motif, cx, cy, def.ink || '#7fe7ff');
 
     ctx.fillStyle = '#eaf6ff';
     ctx.font = '700 8px sans-serif';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'bottom';
     ctx.fillText(def.name.toUpperCase(), cx, height - pad - 12);
 
     ctx.fillStyle = def.ink || '#7fe7ff';
     ctx.font = '6px monospace';
     ctx.fillText(def.motif.toUpperCase(), cx, height - pad - 4);
 
     ctx.restore();
   }
 }
 
 function drawStampMotif(ctx, motif, cx, cy, ink) {
   ctx.save();
   ctx.strokeStyle = ink;
   ctx.fillStyle = ink;
   ctx.lineWidth = 1.6;
   ctx.lineCap = 'round';
   ctx.lineJoin = 'round';
 
   switch (motif) {
     case 'gannet': {
       ctx.beginPath();
       ctx.moveTo(cx - 16, cy + 2);
       ctx.quadraticCurveTo(cx - 7, cy - 12, cx, cy - 4);
       ctx.quadraticCurveTo(cx + 7, cy - 12, cx + 16, cy + 2);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.ellipse(cx, cy + 2, 2.5, 7, 0, 0, Math.PI * 2);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx, cy + 9);
       ctx.lineTo(cx, cy + 14);
       ctx.stroke();
       break;
     }
 
     case 'lighthouse': {
       ctx.beginPath();
       ctx.moveTo(cx - 6, cy + 14);
       ctx.lineTo(cx - 3, cy - 6);
       ctx.lineTo(cx + 3, cy - 6);
       ctx.lineTo(cx + 6, cy + 14);
       ctx.closePath();
       ctx.stroke();
 
       ctx.strokeRect(cx - 5, cy - 10, 10, 4);
 
       ctx.beginPath();
       ctx.moveTo(cx - 7, cy - 8);
       ctx.lineTo(cx - 16, cy - 13);
       ctx.moveTo(cx + 7, cy - 8);
       ctx.lineTo(cx + 16, cy - 13);
       ctx.stroke();
       break;
     }
 
     case 'ring': {
       ctx.beginPath();
       ctx.arc(cx, cy, 12, 0, Math.PI * 2);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.arc(cx, cy, 5, 0, Math.PI * 2);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx - 16, cy);
       ctx.lineTo(cx - 12, cy);
       ctx.moveTo(cx + 12, cy);
       ctx.lineTo(cx + 16, cy);
       ctx.moveTo(cx, cy - 16);
       ctx.lineTo(cx, cy - 12);
       ctx.moveTo(cx, cy + 12);
       ctx.lineTo(cx, cy + 16);
       ctx.stroke();
       break;
     }
 
     case 'storm-cloud': {
       ctx.beginPath();
       ctx.arc(cx - 6, cy - 2, 7, Math.PI * 0.7, Math.PI * 1.9);
       ctx.arc(cx + 4, cy - 5, 8, Math.PI * 1.1, Math.PI * 2.1);
       ctx.arc(cx + 10, cy + 1, 5, Math.PI * 1.5, Math.PI * 0.3);
       ctx.lineTo(cx - 11, cy + 6);
       ctx.closePath();
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx - 2, cy + 6);
       ctx.lineTo(cx - 5, cy + 11);
       ctx.lineTo(cx, cy + 11);
       ctx.lineTo(cx - 3, cy + 17);
       ctx.stroke();
       break;
     }
 
     case 'palm': {
       ctx.beginPath();
       ctx.moveTo(cx, cy + 14);
       ctx.quadraticCurveTo(cx - 3, cy + 3, cx, cy - 4);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx, cy - 4);
       ctx.quadraticCurveTo(cx - 10, cy - 10, cx - 14, cy - 2);
       ctx.moveTo(cx, cy - 4);
       ctx.quadraticCurveTo(cx + 10, cy - 10, cx + 14, cy - 2);
       ctx.moveTo(cx, cy - 4);
       ctx.quadraticCurveTo(cx - 5, cy - 14, cx - 3, cy - 15);
       ctx.moveTo(cx, cy - 4);
       ctx.quadraticCurveTo(cx + 5, cy - 14, cx + 3, cy - 15);
       ctx.stroke();
       break;
     }
 
     case 'jetty': {
       ctx.beginPath();
       ctx.moveTo(cx - 14, cy + 2);
       ctx.lineTo(cx + 14, cy + 2);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx - 8, cy + 2);
       ctx.lineTo(cx - 8, cy + 12);
       ctx.moveTo(cx, cy + 2);
       ctx.lineTo(cx, cy + 12);
       ctx.moveTo(cx + 8, cy + 2);
       ctx.lineTo(cx + 8, cy + 12);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx - 14, cy + 14);
       ctx.lineTo(cx - 4, cy + 14);
       ctx.moveTo(cx + 2, cy + 14);
       ctx.lineTo(cx + 14, cy + 14);
       ctx.stroke();
       break;
     }
 
     case 'mail-sack': {
       ctx.beginPath();
       ctx.moveTo(cx - 2, cy - 10);
       ctx.lineTo(cx - 5, cy - 14);
       ctx.lineTo(cx + 5, cy - 14);
       ctx.lineTo(cx + 2, cy - 10);
       ctx.closePath();
       ctx.stroke();
 
       ctx.beginPath();
       ctx.ellipse(cx, cy + 2, 10, 11, 0, 0, Math.PI * 2);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx - 4, cy);
       ctx.lineTo(cx + 4, cy + 4);
       ctx.moveTo(cx + 4, cy);
       ctx.lineTo(cx - 4, cy + 4);
       ctx.stroke();
       break;
     }
 
     case 'compass-rose': {
       ctx.beginPath();
       ctx.moveTo(cx, cy - 14);
       ctx.lineTo(cx + 3, cy - 4);
       ctx.lineTo(cx + 14, cy);
       ctx.lineTo(cx + 3, cy + 4);
       ctx.lineTo(cx, cy + 14);
       ctx.lineTo(cx - 3, cy + 4);
       ctx.lineTo(cx - 14, cy);
       ctx.lineTo(cx - 3, cy - 4);
       ctx.closePath();
       ctx.stroke();
 
       ctx.beginPath();
       ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
       ctx.fill();
       break;
     }
 
     case 'volcano': {
       ctx.beginPath();
       ctx.moveTo(cx - 15, cy + 13);
       ctx.lineTo(cx - 4, cy - 4);
       ctx.lineTo(cx + 4, cy - 4);
       ctx.lineTo(cx + 15, cy + 13);
       ctx.closePath();
       ctx.stroke();
 
       ctx.beginPath();
       ctx.arc(cx - 2, cy - 9, 3, 0, Math.PI * 2);
       ctx.arc(cx + 4, cy - 12, 3.5, 0, Math.PI * 2);
       ctx.stroke();
       break;
     }
 
     case 'canoe': {
       ctx.beginPath();
       ctx.moveTo(cx - 14, cy);
       ctx.quadraticCurveTo(cx, cy + 7, cx + 14, cy);
       ctx.quadraticCurveTo(cx, cy + 3, cx - 14, cy);
       ctx.stroke();
 
       ctx.beginPath();
       ctx.moveTo(cx - 6, cy + 2);
       ctx.lineTo(cx - 6, cy + 10);
       ctx.moveTo(cx + 6, cy + 2);
       ctx.lineTo(cx + 6, cy + 10);
       ctx.moveTo(cx - 12, cy + 10);
       ctx.lineTo(cx + 12, cy + 10);
       ctx.stroke();
       break;
     }
 
     case 'moon': {
       ctx.beginPath();
       ctx.arc(cx, cy, 11, Math.PI * 0.4, Math.PI * 1.8);
       ctx.arc(cx + 4, cy - 1, 9, Math.PI * 1.7, Math.PI * 0.4, true);
       ctx.closePath();
       ctx.stroke();
 
       ctx.fillRect(cx - 8, cy - 8, 1.5, 1.5);
       ctx.fillRect(cx - 10, cy + 5, 1.5, 1.5);
       break;
     }
 
     case 'rooftop': {
       ctx.beginPath();
       ctx.moveTo(cx - 14, cy + 3);
       ctx.lineTo(cx, cy - 8);
       ctx.lineTo(cx + 14, cy + 3);
       ctx.closePath();
       ctx.stroke();
 
       ctx.strokeRect(cx - 10, cy + 3, 20, 10);
 
       ctx.beginPath();
       ctx.moveTo(cx, cy - 8);
       ctx.lineTo(cx, cy - 14);
       ctx.lineTo(cx + 4, cy - 12);
       ctx.stroke();
       break;
     }
 
     default: {
       ctx.strokeRect(cx - 8, cy - 8, 16, 16);
       break;
     }
   }
 
   ctx.restore();
 }
