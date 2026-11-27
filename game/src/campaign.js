 // Samudra Sky Post — Island Mail Campaign
 // The five mail runs organized into a sequential chain with unlocks,
 // detailed briefings, tier milestones, postmaster ratings, and tour summary.
 
 import { MISSIONS, totalRings, maxScore } from './missions.js';
 
 export const POSTMASTER_RANKS = [
   { minScore: 0, title: 'Apprentice', description: 'Fresh cadet sorting pouch mail at Samudra Field.' },
   { minScore: 1800, title: 'Courier', description: 'Dependable route runner through the inter-island gusts.' },
   { minScore: 3600, title: 'Postmaster', description: 'Senior island airman entrusted with all weather charters.' },
   { minScore: 5200, title: 'Sky Post Legend', description: 'Revered ace who delivers through gale, sea spray, and dark.' },
 ];
 
 export const CAMPAIGN_BRIEFINGS = {
   'first-light': {
     code: 'LEG-01',
     route: 'Samudra Field -> Karang Reef Strip',
     officer: 'Postmaster R. Hidayat',
     dispatch: 'Dawn pouch manifest: telegraph drafts and maritime weather packets for Karang Outpost.',
     objectives: [
       'Depart Samudra Field Runway 09.',
       'Thread all 5 dawn guidance rings across the calm strait.',
       'Touch down safely at Karang Reef Strip (Runway 1).'
     ],
     hazards: 'Light ground mist and morning glare over the water.',
     unlockThreshold: 0
   },
   'crosswind-run': {
     code: 'LEG-02',
     route: 'Samudra Field Circuit via Palem Atoll',
     officer: 'Harbor Control Samudra',
     dispatch: 'Urgent customs manifest and payroll bags circling around Palem Atoll and back to home base.',
     objectives: [
       'Take off into the coastal breeze.',
       'Navigate 8 rings through the Palem corridor.',
       'Counter the 8 kt westerly crosswind on final approach to Runway 0.'
     ],
     hazards: 'Crosswind drift on final approach requiring crab correction.',
     unlockThreshold: 500
   },
   'twin-isles': {
     code: 'LEG-03',
     route: 'Samudra Field <-> Karang Reef Round Trip',
     officer: 'Station Chief Tariq',
     dispatch: 'Two-stage relay: morning mail drop at Karang, loading priority medical packages for the return leg.',
     objectives: [
       'Stage 1: Fly 3 rings and land at Karang Reef Strip.',
       'Transfer pouch and depart Karang.',
       'Stage 2: Fly 3 return rings and touch down at Samudra Field.'
     ],
     hazards: 'Intermediate field landing with short rollout.',
     unlockThreshold: 1400
   },
   'dusk-delivery': {
     code: 'LEG-04',
     route: 'Samudra Archipelago Outer Ring to Karang',
     officer: 'Lighthouse Watcher Maria',
     dispatch: 'Twilight parcel run: lighthouse lamp fuel permits and late mail along the archipelago rim.',
     objectives: [
       'Climb out into the fading dusk light.',
       'Clear 10 boundary rings hugging the outer island ridge.',
       'Locate Karang strip under runway flare lighting.'
     ],
     hazards: 'Diminishing horizon contrast and dusk shadow traps.',
     unlockThreshold: 2600
   },
   'storm-post': {
     code: 'LEG-05',
     route: 'Archipelago Storm Sweep to Samudra Field',
     officer: 'Governor General Mail Dispatch',
     dispatch: 'Gale-force emergency airmail: storm warnings and hospital vaccine parcels across active squall lines.',
     objectives: [
       'Lift off into 12 kt gale winds and driving rain.',
       'Thread 12 rings in extreme chop and downdrafts.',
       'Recover aircraft safely at Samudra Field through zero-visibility cloud base.'
     ],
     hazards: 'Severe turbulence, wind gusts, and high stall hazard.',
     unlockThreshold: 4000
   }
 };
 
 export class CampaignSystem {
   constructor(storageKey = 'samudra-campaign-save') {
     this.storageKey = storageKey;
     this.missions = MISSIONS;
     this.state = this.loadState();
   }
 
   loadState() {
     try {
       const raw = window?.localStorage?.getItem(this.storageKey);
       if (raw) {
         const parsed = JSON.parse(raw);
         if (parsed && Array.isArray(parsed.completedRuns)) {
           return {
             unlockedIndex: Math.max(0, Math.min(this.missions.length - 1, Number(parsed.unlockedIndex) || 0)),
             cumulativeScore: Math.max(0, Number(parsed.cumulativeScore) || 0),
             completedRuns: parsed.completedRuns || [],
             stageScores: parsed.stageScores || {},
             tourComplete: Boolean(parsed.tourComplete),
           };
         }
       }
     } catch {
       // LocalStorage unavailable or corrupt
     }
     return {
       unlockedIndex: 0,
       cumulativeScore: 0,
       completedRuns: [],
       stageScores: {},
       tourComplete: false,
     };
   }
 
   saveState() {
     try {
       window?.localStorage?.setItem(this.storageKey, JSON.stringify(this.state));
     } catch {
       // Storage quota or privacy mode
     }
   }
 
   resetProgress() {
     this.state = {
       unlockedIndex: 0,
       cumulativeScore: 0,
       completedRuns: [],
       stageScores: {},
       tourComplete: false,
     };
     this.saveState();
   }
 
   getMissionCount() {
     return this.missions.length;
   }
 
   getMission(index) {
     return this.missions[index] || null;
   }
 
   getBriefing(index) {
     const mission = this.getMission(index);
     if (!mission) return null;
     const extra = CAMPAIGN_BRIEFINGS[mission.id] || {
       code: `LEG-0${index + 1}`,
       route: mission.name,
       officer: 'HQ Dispatch',
       dispatch: mission.blurb,
       objectives: ['Complete all course rings.', 'Land safely at destination strip.'],
       hazards: 'Monitor wind and airspeed.',
       unlockThreshold: index * 600,
     };
     return {
       index,
       id: mission.id,
       name: mission.name,
       blurb: mission.blurb,
       timeOfDay: mission.timeOfDay,
       wind: mission.wind,
       turbulence: mission.turbulence,
       parSeconds: mission.parSeconds,
       totalRings: totalRings(mission),
       maxScore: maxScore(mission),
       ...extra,
       unlocked: this.isUnlocked(index),
       bestScore: this.getBestScore(mission.id),
     };
   }
 
   isUnlocked(index) {
     if (index === 0) return true;
     if (index <= this.state.unlockedIndex) return true;
     const mission = this.getMission(index);
     if (!mission) return false;
     const briefing = CAMPAIGN_BRIEFINGS[mission.id];
     if (briefing && this.state.cumulativeScore >= briefing.unlockThreshold) {
       return true;
     }
     return false;
   }
 
   getBestScore(missionId) {
     return Number(this.state.stageScores[missionId] || 0);
   }
 
   recordRunResult(missionIndex, score, crashed = false, stats = {}) {
     const mission = this.getMission(missionIndex);
     if (!mission) return { rank: this.getCurrentRank(), unlockedNext: false };
 
     const prevBest = this.getBestScore(mission.id);
     const newBest = Math.max(prevBest, score);
     this.state.stageScores[mission.id] = newBest;
 
     if (!crashed) {
       if (!this.state.completedRuns.includes(mission.id)) {
         this.state.completedRuns.push(mission.id);
       }
       if (missionIndex + 1 > this.state.unlockedIndex && missionIndex + 1 < this.missions.length) {
         this.state.unlockedIndex = missionIndex + 1;
       }
     }
 
     this.state.cumulativeScore = Object.values(this.state.stageScores).reduce((a, b) => a + Number(b), 0);
 
     const isLastMission = missionIndex === this.missions.length - 1;
     if (isLastMission && !crashed) {
       this.state.tourComplete = true;
     }
 
     this.saveState();
 
     return {
       missionIndex,
       score,
       prevBest,
       isNewRecord: score > prevBest,
       cumulativeScore: this.state.cumulativeScore,
       rank: this.getCurrentRank(),
       unlockedNext: this.isUnlocked(missionIndex + 1),
       tourComplete: this.state.tourComplete,
       stats,
     };
   }
 
   getCurrentRank() {
     return this.getRankForScore(this.state.cumulativeScore);
   }
 
   getRankForScore(score) {
     let current = POSTMASTER_RANKS[0];
     for (const rank of POSTMASTER_RANKS) {
       if (score >= rank.minScore) {
         current = rank;
       }
     }
     const currentIndex = POSTMASTER_RANKS.indexOf(current);
     const nextRank = POSTMASTER_RANKS[currentIndex + 1] || null;
     const scoreToNext = nextRank ? Math.max(0, nextRank.minScore - score) : 0;
     const progressToNext = nextRank
       ? (score - current.minScore) / (nextRank.minScore - current.minScore)
       : 1.0;
 
     return {
       title: current.title,
       description: current.description,
       minScore: current.minScore,
       scoreToNext,
       progressToNext: Math.min(1.0, Math.max(0.0, progressToNext)),
       nextRankTitle: nextRank ? nextRank.title : 'Maximum Rank',
     };
   }
 
   getChainProgress() {
     const total = this.missions.length;
     const cleared = this.state.completedRuns.length;
     const theoreticalMax = this.missions.reduce((sum, m) => sum + maxScore(m), 0);
     return {
       total,
       cleared,
       percent: Math.round((cleared / total) * 100),
       cumulativeScore: this.state.cumulativeScore,
       theoreticalMax,
       tourComplete: this.state.tourComplete,
       currentRank: this.getCurrentRank(),
     };
   }
 
   getTourSummary() {
     const progress = this.getChainProgress();
     const runs = this.missions.map((m, idx) => {
       const best = this.getBestScore(m.id);
       const possible = maxScore(m);
       const cleared = this.state.completedRuns.includes(m.id);
       return {
         index: idx,
         id: m.id,
         name: m.name,
         cleared,
         bestScore: best,
         maxScore: possible,
         pct: possible > 0 ? Math.round((best / possible) * 100) : 0,
       };
     });
 
     let overallRating = 'Apprentice Postie';
     if (progress.cumulativeScore >= 5200) overallRating = 'Sky Post Legend';
     else if (progress.cumulativeScore >= 3600) overallRating = 'Master Courier';
     else if (progress.cumulativeScore >= 1800) overallRating = 'Senior Island Pilot';
 
     return {
       tourComplete: this.state.tourComplete,
       overallRating,
       cumulativeScore: progress.cumulativeScore,
       theoreticalMax: progress.theoreticalMax,
       clearedCount: progress.cleared,
       totalCount: progress.total,
       runs,
     };
   }
 }
