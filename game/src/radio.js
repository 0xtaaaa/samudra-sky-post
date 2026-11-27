 // Samudra Sky Post — Island Radio Chatter System
 // Timed and contextual radio messages from Samudra Tower, the Lighthouse Keeper,
 // and the Mail Office with priority queueing, expiration, audio clicks, and mute support.
 
 export const CALLSIGNS = {
   TOWER: { name: 'Samudra Tower', short: 'TWR', color: '#7fe7ff' },
   LIGHTHOUSE: { name: 'Karang Light', short: 'LIGHT', color: '#ffd9a0' },
   MAIL_OFFICE: { name: 'Mail Dispatch', short: 'POST', color: '#8fd8ef' },
   PALEM: { name: 'Palem Radio', short: 'PALEM', color: '#b9f2a1' },
 };
 
 export const RADIO_SCRIPTS = {
   takeoff: [
     { callsign: 'TOWER', text: 'Nuri-7, Samudra Tower. Wind is set. You are clear for departure, Runway 09.', priority: 2 },
     { callsign: 'MAIL_OFFICE', text: 'All bags secured in the forward locker. Fly steady and keep dry.', priority: 1 },
     { callsign: 'TOWER', text: 'Airborne confirmed, climb on heading and report clear of the lagoon.', priority: 2 },
   ],
   ring: [
     { callsign: 'MAIL_OFFICE', text: 'Pouch drop waypoint confirmed. Good line, pilot.', priority: 1 },
     { callsign: 'LIGHTHOUSE', text: 'Karang watcher has you in sight through the glass. Keep that trim.', priority: 1 },
     { callsign: 'TOWER', text: 'Radar contact tracking steady over the strait. Ring cleared.', priority: 1 },
     { callsign: 'PALEM', text: 'Palem listening post copies clear waypoint pass. Nice flying.', priority: 1 },
   ],
   approach: [
     { callsign: 'TOWER', text: 'Approach control: pattern is open. Check gear down and locked.', priority: 3 },
     { callsign: 'LIGHTHOUSE', text: 'Strip flares are lit at Karang. Watch the reef surf along the threshold.', priority: 3 },
     { callsign: 'MAIL_OFFICE', text: 'Sorting shed is waiting on the tarmac. Bring her down soft.', priority: 2 },
   ],
   touchdown: [
     { callsign: 'TOWER', text: 'Touchdown logged. Rollout is clean. Welcome back to the strip.', priority: 3 },
     { callsign: 'LIGHTHOUSE', text: 'Solid landing on Karang. Marshaller waving you to the tie-downs.', priority: 3 },
     { callsign: 'MAIL_OFFICE', text: 'Mail received undamaged. Outstanding run, captain.', priority: 2 },
   ],
   goAround: [
     { callsign: 'TOWER', text: 'Unstable approach! Go around, full power, climb straight ahead!', priority: 4 },
     { callsign: 'LIGHTHOUSE', text: 'Wave off wave off! You came in too hot over the seawall!', priority: 4 },
   ],
   crosswindWarning: [
     { callsign: 'TOWER', text: 'Gust front rolling across the channel. Keep the wings level and crab into it.', priority: 2 },
   ],
   lowFuel: [
     { callsign: 'TOWER', text: 'Warning: telemetry indicates low fuel state. Divert straight to the nearest strip.', priority: 4 },
   ],
   stallWarning: [
     { callsign: 'TOWER', text: 'Check your airspeed! Pitch down before the wing unports!', priority: 4 },
   ]
 };
 
 export class RadioSystem {
   constructor(options = {}) {
     this.queue = [];
     this.maxQueueSize = options.maxQueueSize || 4;
     this.currentTransmission = null;
     this.displayDuration = options.displayDuration || 4.2;
     this.muted = Boolean(options.muted);
     this.lineHistory = [];
     this.scriptIndex = {
       takeoff: 0,
       ring: 0,
       approach: 0,
       touchdown: 0,
       goAround: 0,
     };
     this.ringCounter = 0;
     this.lastTransmissionTime = -999;
     this.onMessageCallback = options.onMessage || null;
   }
 
   setMuted(muted) {
     this.muted = Boolean(muted);
     if (this.muted && this.currentTransmission) {
       this.currentTransmission = null;
     }
   }
 
   isMuted() {
     return this.muted;
   }
 
   toggleMute() {
     this.setMuted(!this.muted);
     return this.muted;
   }
 
   clear() {
     this.queue = [];
     this.currentTransmission = null;
   }
 
   broadcast(callsignKey, text, priority = 1, duration = 4.2) {
     if (this.muted) return null;
     const callsign = CALLSIGNS[callsignKey] || { name: callsignKey, short: callsignKey, color: '#eaf6ff' };
     const transmission = {
       id: Math.random().toString(36).substring(2, 9),
       callsignKey,
       callsignName: callsign.name,
       callsignShort: callsign.short,
       callsignColor: callsign.color,
       text,
       priority,
       duration,
       remaining: duration,
       timestamp: Date.now(),
     };
 
     // High priority transmissions override or prepend
     if (this.currentTransmission && priority > this.currentTransmission.priority + 1) {
       this.queue.unshift(this.currentTransmission);
       this.currentTransmission = transmission;
       if (this.onMessageCallback) this.onMessageCallback(transmission);
       return transmission;
     }
 
     if (!this.currentTransmission) {
       this.currentTransmission = transmission;
       if (this.onMessageCallback) this.onMessageCallback(transmission);
       return transmission;
     }
 
     // Insert into queue sorted by priority descending
     this.queue.push(transmission);
     this.queue.sort((a, b) => b.priority - a.priority);
 
     // Drop lowest priority old items if queue overflows
     if (this.queue.length > this.maxQueueSize) {
       this.queue.pop();
     }
     return transmission;
   }
 
   triggerEvent(eventType, extraText = null) {
     if (this.muted) return null;
     const script = RADIO_SCRIPTS[eventType];
     if (!script || script.length === 0) return null;
 
     const idx = (this.scriptIndex[eventType] || 0) % script.length;
     this.scriptIndex[eventType] = idx + 1;
 
     const entry = script[idx];
     const text = extraText ? `${entry.text} ${extraText}` : entry.text;
     return this.broadcast(entry.callsign, text, entry.priority);
   }
 
   onTakeoff(runwayName = 'Samudra Field') {
     return this.broadcast('TOWER', `Nuri-7 is airborne from ${runwayName}. Contact island advisory on frequency.`, 2);
   }
 
   onRingPassed(ringIndex, totalRings) {
     this.ringCounter += 1;
     const callsign = ringIndex % 2 === 0 ? 'LIGHTHOUSE' : 'MAIL_OFFICE';
     const messages = [
       `Wayring ${ringIndex}/${totalRings} logged on course. Horizon looks clean.`,
       `Through ring ${ringIndex} over the blue water. Pouch is steady in the hold.`,
       `Good altitude on gate ${ringIndex}. Watch the offshore thermal lift.`,
       `Ring ${ringIndex} confirmed clear. Turn to heading for the next marker.`,
     ];
     const msg = messages[(ringIndex - 1) % messages.length];
     return this.broadcast(callsign, msg, 1, 3.8);
   }
 
   onApproach(runwayName = 'destination strip') {
     return this.broadcast('TOWER', `Inbound traffic Nuri-7, lined up for ${runwayName}. Wind checked, runway clear.`, 3, 5.0);
   }
 
   onTouchdown(grade = 'FIRM', stripName = 'Runway') {
     const callsign = grade === 'BUTTER' ? 'TOWER' : 'MAIL_OFFICE';
     const comment = grade === 'BUTTER'
       ? `Greased it on ${stripName}! Zero bounce, textbook touchdown.`
       : grade === 'FIRM'
       ? `Firm contact on ${stripName}. Brakes holding, mail intake is standing by.`
       : `Hard set-down on ${stripName}! Inspect the struts at the hanger.`;
     return this.broadcast(callsign, comment, 3, 4.8);
   }
 
   onGoAround() {
     return this.broadcast('TOWER', 'Go around! Climb straight out, re-enter left traffic for runway.', 4, 4.0);
   }
 
   onLowFuel() {
     return this.broadcast('MAIL_OFFICE', 'Fuel reserve caution! Cut unnecessary revs and make direct for the field.', 4, 4.5);
   }
 
   onStallAlert() {
     return this.broadcast('TOWER', 'Stall horn active! Drop the nose, check airspeed!', 4, 3.5);
   }
 
   update(dt) {
     if (this.muted) {
       this.currentTransmission = null;
       return null;
     }
 
     if (this.currentTransmission) {
       this.currentTransmission.remaining -= dt;
       if (this.currentTransmission.remaining <= 0) {
         this.lineHistory.push({
           callsign: this.currentTransmission.callsignName,
           text: this.currentTransmission.text,
           timestamp: this.currentTransmission.timestamp,
         });
         if (this.lineHistory.length > 20) this.lineHistory.shift();
         this.currentTransmission = null;
       }
     }
 
     if (!this.currentTransmission && this.queue.length > 0) {
       this.currentTransmission = this.queue.shift();
       if (this.onMessageCallback) {
         this.onMessageCallback(this.currentTransmission);
       }
     }
 
     return this.currentTransmission;
   }
 
   getActiveLine() {
     return this.currentTransmission;
   }
 }
