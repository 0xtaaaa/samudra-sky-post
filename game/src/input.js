// Keyboard and mouse: the stick, the throttle and the look-around. Keys
// are read as a held set so the flight model can ask, every tick, what the
// pilot is doing right now.

/** Key names we care about, as KeyboardEvent.code values. */
const STICK = {
  pitchUp: ['ArrowUp', 'KeyI'],
  pitchDown: ['ArrowDown', 'KeyK'],
  bankLeft: ['ArrowLeft', 'KeyJ'],
  bankRight: ['ArrowRight', 'KeyL'],
  throttleUp: ['KeyW'],
  throttleDown: ['KeyS'],
};

/** Create the input state, bound to the window. */
export function createInput() {
  const held = new Set();
  const pressed = new Set(); // keys pressed since the last poll, for toggles
  let lookDX = 0;
  let lookDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  const canvas = document.getElementById('game');
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    lookDX += e.clientX - lastX;
    lookDY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const endDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const has = (codes) => codes.some((c) => held.has(c));

  return {
    /** The stick right now: pitch/bank -1..1, throttleUp/Down booleans. */
    stick() {
      return {
        pitch: (has(STICK.pitchUp) ? 1 : 0) - (has(STICK.pitchDown) ? 1 : 0),
        bank: (has(STICK.bankRight) ? 1 : 0) - (has(STICK.bankLeft) ? 1 : 0),
        throttleUp: has(STICK.throttleUp),
        throttleDown: has(STICK.throttleDown),
      };
    },
    /** True once for a key pressed since the last call to `poll()`. */
    poll() {
      const out = new Set(pressed);
      pressed.clear();
      return out;
    },
    /** Mouse-look deltas since the last call, in pixels. */
    look() {
      const d = { dx: lookDX, dy: lookDY };
      lookDX = 0;
      lookDY = 0;
      return d;
    },
    isDown(code) {
      return held.has(code);
    },
  };
}
