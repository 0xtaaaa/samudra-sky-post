 // Samudra Sky Post — Hangar & Aircraft Fleet System
 // Defines three aircraft variants with unique aerodynamic traits, visual styling,
 // and physical tolerances: Nuri-7 (workhorse), Kecil-2 (light courier), and Badai-9 (storm ship).
 
 import * as THREE from 'three';
 import { buildPlaneMesh } from './plane.js';
 
 export const AIRCRAFT_VARIANTS = {
   'nuri-7': {
     id: 'nuri-7',
     name: 'Nuri-7',
     type: 'Twin-Prop Workhorse',
     blurb: 'Balanced island cargo plane. Forgiving lift, generous payload, and rock-steady stability in moderate gusts.',
     mass: 1.0,
     power: 1.0,
     maxSpeedKnots: 99,
     stallSpeedKnots: 28,
     stallSpeedMps: 24,
     flapStallSpeedMps: 20,
     fuelBurnRate: 1.0,
     fuelCapacitySeconds: 360,
     damageTolerance: 1.0,
     rollRate: 1.05,
     pitchRate: 0.42,
     climbRateMult: 1.0,
     colorPalette: {
       cream: 0xf2e8d5,
       red: 0xc0392b,
       dark: 0x2a2f36,
       glass: 0x9fd8ef,
     },
   },
   'kecil-2': {
     id: 'kecil-2',
     name: 'Kecil-2',
     type: 'Light Courier',
     blurb: 'Nimble single-seat courier. Extremely agile roll and high climb rate, but sensitive to gusts and fragile on landing.',
     mass: 0.72,
     power: 1.25,
     maxSpeedKnots: 118,
     stallSpeedKnots: 24,
     stallSpeedMps: 20,
     flapStallSpeedMps: 16,
     fuelBurnRate: 1.2,
     fuelCapacitySeconds: 280,
     damageTolerance: 0.75,
     rollRate: 1.45,
     pitchRate: 0.58,
     climbRateMult: 1.35,
     colorPalette: {
       cream: 0xffffff,
       red: 0x0099ff,
       dark: 0x1f2937,
       glass: 0x7fe7ff,
     },
   },
   'badai-9': {
     id: 'badai-9',
     name: 'Badai-9',
     type: 'Storm Ship',
     blurb: 'Heavy reinforced postal transport built for squalls and gale fronts. High stall speed, but cuts through severe turbulence untouched.',
     mass: 1.45,
     power: 1.38,
     maxSpeedKnots: 92,
     stallSpeedKnots: 34,
     stallSpeedMps: 30,
     flapStallSpeedMps: 26,
     fuelBurnRate: 0.85,
     fuelCapacitySeconds: 480,
     damageTolerance: 1.6,
     rollRate: 0.82,
     pitchRate: 0.35,
     climbRateMult: 0.88,
     colorPalette: {
       cream: 0xd4a373,
       red: 0x264653,
       dark: 0x111827,
       glass: 0x588157,
     },
   },
 };
 
 export class HangarSystem {
   constructor(storageKey = 'samudra-selected-aircraft') {
     this.storageKey = storageKey;
     this.variants = AIRCRAFT_VARIANTS;
     this.selectedPlaneId = this.loadSelected();
   }
 
   loadSelected() {
     try {
       const stored = window?.localStorage?.getItem(this.storageKey);
       if (stored && this.variants[stored]) {
         return stored;
       }
     } catch {
       // Storage unavailable
     }
     return 'nuri-7';
   }
 
   selectPlane(planeId) {
     if (!this.variants[planeId]) return false;
     this.selectedPlaneId = planeId;
     try {
       window?.localStorage?.setItem(this.storageKey, planeId);
     } catch {
       // Storage quota
     }
     return true;
   }
 
   getSelectedPlane() {
     return this.variants[this.selectedPlaneId] || this.variants['nuri-7'];
   }
 
   getAllPlanes() {
     return Object.values(this.variants);
   }
 
   applyPhysicsProfile(flightModel, planeConfig = null) {
     const plane = planeConfig || this.getSelectedPlane();
     if (!flightModel) return;
 
     // Feed characteristics into flight model instance
     flightModel.planeProfile = plane;
     flightModel.mass = plane.mass;
     flightModel.powerMult = plane.power;
     flightModel.rollRateMult = plane.rollRate;
     flightModel.pitchRateMult = plane.pitchRate;
     flightModel.climbMult = plane.climbRateMult;
     flightModel.stallSpeed = plane.stallSpeedMps;
     flightModel.flapStallSpeed = plane.flapStallSpeedMps;
     flightModel.maxSpeedCap = (plane.maxSpeedKnots / 1.94384);
   }
 
   applyDamageProfile(damageModel, planeConfig = null) {
     const plane = planeConfig || this.getSelectedPlane();
     if (!damageModel) return;
     damageModel.fuelBurnMultiplier = plane.fuelBurnRate;
     damageModel.toleranceMultiplier = plane.damageTolerance;
   }
 
   createPlaneVisuals(planeConfig = null) {
     const plane = planeConfig || this.getSelectedPlane();
     const meshData = buildPlaneMesh();
 
     // Colorize materials to match variant scheme
     if (plane.id === 'kecil-2') {
       meshData.group.scale.set(0.85, 0.85, 0.85);
       meshData.group.traverse((o) => {
         if (o.isMesh && o.material && o.material.color) {
           if (o.material.color.getHex() === 0xf2e8d5) {
             o.material.color.setHex(plane.colorPalette.cream);
           } else if (o.material.color.getHex() === 0xc0392b) {
             o.material.color.setHex(plane.colorPalette.red);
           }
         }
       });
     } else if (plane.id === 'badai-9') {
       meshData.group.scale.set(1.15, 1.15, 1.15);
       meshData.group.traverse((o) => {
         if (o.isMesh && o.material && o.material.color) {
           if (o.material.color.getHex() === 0xf2e8d5) {
             o.material.color.setHex(plane.colorPalette.cream);
           } else if (o.material.color.getHex() === 0xc0392b) {
             o.material.color.setHex(plane.colorPalette.red);
           }
         }
       });
     }
 
     return meshData;
   }
 
   renderHangarPickerHtml() {
     const planes = this.getAllPlanes();
     const cards = planes.map((p) => {
       const isSel = p.id === this.selectedPlaneId;
       const border = isSel ? '#ffb347' : 'rgba(127,231,255,0.35)';
       const glow = isSel ? 'box-shadow: 0 0 16px rgba(255,179,71,0.4);' : '';
       return `
         <div class="hangar-card panel" data-plane-id="${p.id}"
              style="flex: 1; min-width: 170px; padding: 12px; border: 1px solid ${border}; border-radius: 8px; cursor: pointer; text-align: left; ${glow}">
           <div style="display:flex; justify-content:space-between; align-items:center;">
             <span style="font-weight: bold; font-size: 16px; color: #ffd9a0;">${p.name}</span>
             <span class="mono" style="font-size: 11px; color: #7fe7ff;">${p.type}</span>
           </div>
           <p style="font-size: 12px; line-height: 1.4; color: #dff6ff; margin: 6px 0;">${p.blurb}</p>
           <div class="mono" style="font-size: 11px; color: #9fd8ef; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px;">
             <div>Speed: <b>${p.maxSpeedKnots} kt</b></div>
             <div>Stall: <b>${p.stallSpeedKnots} kt</b></div>
             <div>Mass: <b>${p.mass}x</b></div>
             <div>Hull: <b>${p.damageTolerance}x</b></div>
           </div>
         </div>
       `;
     }).join('');
 
     return `
       <div style="margin-top: 10px; margin-bottom: 6px;">
         <div class="label" style="margin-bottom: 6px; text-align: center;">Choose Mail Aircraft</div>
         <div class="hangar-row" style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
           ${cards}
         </div>
       </div>
     `;
   }
 }
