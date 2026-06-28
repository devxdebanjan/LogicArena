// Web Audio Synth Sounds for logicarena
export const playSynthSound = (type) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'correct') {
      const now = ctx.currentTime;
      const playTone = (freq, delay, vol, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };
      playTone(523.25, 0, 0.12, 0.35);      // C5
      playTone(659.25, 0.06, 0.12, 0.35);   // E5
      playTone(783.99, 0.12, 0.15, 0.45);   // G5
    } else if (type === 'wrong') {
      const now = ctx.currentTime;
      const playOsc = (freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.5, now + 0.3);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      };
      playOsc(130);
      playOsc(133);
    } else if (type === 'start') {
      const now = ctx.currentTime;
      const playTone = (freq, delay, vol, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };
      playTone(261.63, 0, 0.1, 0.2);       // C4
      playTone(329.63, 0.05, 0.1, 0.2);    // E4
      playTone(392.00, 0.1, 0.1, 0.2);     // G4
      playTone(523.25, 0.15, 0.15, 0.4);   // C5
    } else if (type === 'end') {
      const now = ctx.currentTime;
      const playTone = (freq, delay, vol, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };
      playTone(392.00, 0, 0.1, 0.25);      // G4
      playTone(329.63, 0.06, 0.1, 0.25);   // E4
      playTone(261.63, 0.12, 0.1, 0.25);   // C4
      playTone(196.00, 0.18, 0.12, 0.4);   // G3
    } else if (type === 'victory') {
      const now = ctx.currentTime;
      const playTone = (freq, delay, vol, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };
      playTone(523.25, 0, 0.1, 0.25);      // C5
      playTone(659.25, 0.06, 0.1, 0.25);   // E5
      playTone(783.99, 0.12, 0.1, 0.25);   // G5
      playTone(1046.50, 0.18, 0.12, 0.3);  // C6
      playTone(1318.51, 0.24, 0.12, 0.45); // E6
    }
  } catch (e) {
    console.error('AudioContext play error:', e);
  }
};
