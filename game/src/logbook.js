 // Samudra Sky Post — Pilot's Flight Logbook
 // Sortie records tracking mission, ring counts, landing grades, fuel remaining,
 // airframe damage, time, scores, and aggregate island statistics.
 
 export class LogbookSystem {
   constructor(storageKey = 'samudra-pilot-logbook') {
     this.storageKey = storageKey;
     this.maxEntries = 50;
     this.data = this.load();
   }
 
   load() {
     try {
       const raw = window?.localStorage?.getItem(this.storageKey);
       if (raw) {
         const parsed = JSON.parse(raw);
         if (parsed && Array.isArray(parsed.entries)) {
           return {
             entries: parsed.entries,
             totals: parsed.totals || this.initTotals(),
             bestPerRun: parsed.bestPerRun || {},
           };
         }
       }
     } catch {
       // Storage unavailable
     }
     return {
       entries: [],
       totals: this.initTotals(),
       bestPerRun: {},
     };
   }
 
   save() {
     try {
       window?.localStorage?.setItem(this.storageKey, JSON.stringify(this.data));
     } catch {
       // Storage quota
     }
   }
 
   initTotals() {
     return {
       sorties: 0,
       completed: 0,
       crashes: 0,
       totalRings: 0,
       totalFlightTimeSec: 0,
       butterLandings: 0,
       firmLandings: 0,
       bouncedLandings: 0,
       totalScore: 0,
     };
   }
 
   recordSortie(sortie) {
     const entry = {
       id: 'SRT-' + Date.now().toString(36).toUpperCase(),
       timestamp: Date.now(),
       dateString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
       runId: sortie.runId || 'run-unknown',
       runName: sortie.runName || 'Unknown Run',
       planeId: sortie.planeId || 'nuri-7',
       planeName: sortie.planeName || 'Nuri-7',
       ringsHit: Number(sortie.ringsHit) || 0,
       ringsTotal: Number(sortie.ringsTotal) || 0,
       landingGrade: sortie.landingGrade || (sortie.crashed ? 'CRASH' : 'FIRM'),
       fuelLeft: Math.round(Math.max(0, Math.min(100, (sortie.fuelLeft ?? 1) * 100))),
       damage: Math.round(Math.max(0, Math.min(100, (sortie.damage ?? 0) * 100))),
       flightTimeSec: Math.round(sortie.flightTimeSec || 0),
       score: Math.round(sortie.score || 0),
       crashed: Boolean(sortie.crashed),
     };
 
     // Update best per run
     const currentBest = this.data.bestPerRun[entry.runId] || { score: 0, grade: '-', date: '' };
     if (entry.score > currentBest.score) {
       this.data.bestPerRun[entry.runId] = {
         score: entry.score,
         grade: entry.landingGrade,
         planeId: entry.planeId,
         date: entry.dateString,
       };
     }
 
     // Update running totals
     const t = this.data.totals;
     t.sorties += 1;
     if (entry.crashed) {
       t.crashes += 1;
     } else {
       t.completed += 1;
     }
     t.totalRings += entry.ringsHit;
     t.totalFlightTimeSec += entry.flightTimeSec;
     t.totalScore += entry.score;
 
     if (entry.landingGrade === 'BUTTER') t.butterLandings += 1;
     else if (entry.landingGrade === 'FIRM') t.firmLandings += 1;
     else if (entry.landingGrade === 'BOUNCED') t.bouncedLandings += 1;
 
     // Add entry and trim
     this.data.entries.unshift(entry);
     if (this.data.entries.length > this.maxEntries) {
       this.data.entries.length = this.maxEntries;
     }
 
     this.save();
     return entry;
   }
 
   getBestForRun(runId) {
     return this.data.bestPerRun[runId] || null;
   }
 
   getRecentEntries(limit = 10) {
     return this.data.entries.slice(0, limit);
   }
 
   getTotals() {
     return { ...this.data.totals };
   }
 
   clearLogbook() {
     this.data = {
       entries: [],
       totals: this.initTotals(),
       bestPerRun: {},
     };
     this.save();
   }
 
   renderLogbookHtml() {
     const t = this.data.totals;
     const hours = Math.floor(t.totalFlightTimeSec / 3600);
     const minutes = Math.floor((t.totalFlightTimeSec % 3600) / 60);
     const timeFmt = `${hours}h ${minutes}m`;
 
     const rows = this.data.entries.map((e) => {
       const gradeColor = e.landingGrade === 'BUTTER'
         ? '#7fe7ff'
         : e.landingGrade === 'FIRM'
         ? '#ffd9a0'
         : e.landingGrade === 'BOUNCED'
         ? '#ffaa55'
         : '#ff5555';
       const mm = String(Math.floor(e.flightTimeSec / 60)).padStart(2, '0');
       const ss = String(Math.floor(e.flightTimeSec % 60)).padStart(2, '0');
 
       return `
         <tr style="border-bottom: 1px solid rgba(127,231,255,0.15); font-size: 13px;">
           <td style="padding: 6px 4px; text-align: left;">${e.runName}</td>
           <td style="padding: 6px 4px;">${e.planeName}</td>
           <td style="padding: 6px 4px;">${e.ringsHit}/${e.ringsTotal}</td>
           <td style="padding: 6px 4px; color: ${gradeColor}; font-weight: bold;">${e.landingGrade}</td>
           <td style="padding: 6px 4px;">${e.fuelLeft}%</td>
           <td style="padding: 6px 4px;">${e.damage}%</td>
           <td style="padding: 6px 4px;">${mm}:${ss}</td>
           <td style="padding: 6px 4px; color: #ffd9a0; font-weight: bold;">${e.score}</td>
         </tr>
       `;
     }).join('');
 
     return `
       <div class="logbook-summary" style="display: flex; justify-content: space-around; margin-bottom: 14px; font-size: 14px;">
         <div><span class="label">Sorties</span><div class="value mono" style="font-size:20px;">${t.sorties}</div></div>
         <div><span class="label">Clear/Crash</span><div class="value mono" style="font-size:20px;">${t.completed}/${t.crashes}</div></div>
         <div><span class="label">Rings Hit</span><div class="value mono" style="font-size:20px;">${t.totalRings}</div></div>
         <div><span class="label">Butter/Firm</span><div class="value mono" style="font-size:20px;">${t.butterLandings}/${t.firmLandings}</div></div>
         <div><span class="label">Flight Time</span><div class="value mono" style="font-size:20px;">${timeFmt}</div></div>
       </div>
       <div style="max-height: 240px; overflow-y: auto; border: 1px solid rgba(127,231,255,0.25); border-radius: 6px;">
         <table style="width: 100%; border-collapse: collapse; text-align: center;" class="mono">
           <thead>
             <tr style="background: rgba(127,231,255,0.1); font-size: 11px; color: #8fd8ef; text-transform: uppercase;">
               <th style="padding: 6px 4px; text-align: left;">Run</th>
               <th style="padding: 6px 4px;">Craft</th>
               <th style="padding: 6px 4px;">Rings</th>
               <th style="padding: 6px 4px;">Touch</th>
               <th style="padding: 6px 4px;">Fuel</th>
               <th style="padding: 6px 4px;">Dmg</th>
               <th style="padding: 6px 4px;">Time</th>
               <th style="padding: 6px 4px;">Score</th>
             </tr>
           </thead>
           <tbody>
             ${rows || '<tr><td colspan="8" style="padding: 18px; color: #8fd8ef;">No sortie logs recorded yet.</td></tr>'}
           </tbody>
         </table>
       </div>
     `;
   }
 }
