/**
 * js/sound-engine.js
 * ระบบเสียงเอฟเฟกต์สังเคราะห์ด้วย Web Audio API
 * ทำงานได้ทันทีแบบ Zero-Latency ไม่ต้องโหลดไฟล์ MP3 ภายนอก
 */

const SoundEngine = (function() {
  const STORAGE_KEY_ENABLED = 'tax_portal_sound_enabled';
  const STORAGE_KEY_VOLUME = 'tax_portal_sound_volume';
  const STORAGE_KEY_PACK = 'tax_portal_sound_pack';

  let audioCtx = null;
  let isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false'; // default true
  let volume = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME) || '0.35'); // default 35%
  let soundPack = localStorage.getItem(STORAGE_KEY_PACK) || 'modern'; // modern, chime, coin

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, delay = 0, gainMultiplier = 1) {
    if (!isEnabled || volume <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    const actualVol = Math.max(0.01, volume * gainMultiplier);
    gainNode.gain.setValueAtTime(actualVol, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  const sounds = {
    // เสียงคลิกปุ่มทั่วไป
    click: () => {
      playTone(950, 'sine', 0.04, 0, 0.4);
    },

    // เสียงเปลี่ยนแท็บ / สลับโหมด
    switch: () => {
      playTone(520, 'sine', 0.05, 0, 0.5);
      playTone(780, 'triangle', 0.06, 0.04, 0.4);
    },

    // เสียงเมื่อกดคำนวณภาษี (Melodic Chime)
    calc: () => {
      if (soundPack === 'coin') {
        sounds.coin();
        return;
      }
      playTone(587.33, 'sine', 0.12, 0, 0.6);      // D5
      playTone(739.99, 'sine', 0.14, 0.08, 0.6);   // F#5
      playTone(880.00, 'triangle', 0.22, 0.16, 0.7);// A5
    },

    // เสียงเหรียญทอง / ประหยัดภาษี (Crisp Metallic Coin Chime)
    coin: () => {
      playTone(987.77, 'sine', 0.15, 0, 0.7);      // B5
      playTone(1318.51, 'sine', 0.35, 0.08, 0.85); // E6
    },

    // เสียงบันทึกข้อมูลสำเร็จ (Success Major Chord)
    success: () => {
      playTone(523.25, 'sine', 0.18, 0, 0.6);      // C5
      playTone(659.25, 'sine', 0.20, 0.07, 0.65);  // E5
      playTone(783.99, 'sine', 0.22, 0.14, 0.7);   // G5
      playTone(1046.50, 'triangle', 0.38, 0.21, 0.8); // C6
    },

    // เสียงเตือน / กรอกข้อมูลไม่ครบ (Warning/Alert)
    alert: () => {
      playTone(320, 'sawtooth', 0.12, 0, 0.4);
      playTone(270, 'sawtooth', 0.16, 0.1, 0.45);
    },

    // เสียงเปิด/ปิดหน้าต่าง Modal
    modal: () => {
      playTone(440, 'sine', 0.08, 0, 0.4);
      playTone(660, 'sine', 0.1, 0.05, 0.45);
    }
  };

  function play(name) {
    try {
      if (sounds[name]) {
        sounds[name]();
      }
    } catch (e) {
      // Audio might be blocked by browser policy before first interaction
    }
  }

  function setEnabled(enabled) {
    isEnabled = Boolean(enabled);
    localStorage.setItem(STORAGE_KEY_ENABLED, isEnabled ? 'true' : 'false');
    if (isEnabled) {
      play('click');
    }
  }

  function setVolume(vol) {
    volume = Math.max(0, Math.min(1, parseFloat(vol)));
    localStorage.setItem(STORAGE_KEY_VOLUME, volume.toString());
  }

  function setSoundPack(pack) {
    soundPack = pack;
    localStorage.setItem(STORAGE_KEY_PACK, pack);
    play('switch');
  }

  function getSettings() {
    return {
      enabled: isEnabled,
      volume: volume,
      pack: soundPack
    };
  }

  // Initialize listener on user first interaction to unlock AudioContext
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  return {
    play,
    setEnabled,
    setVolume,
    setSoundPack,
    getSettings
  };
})();

window.SoundEngine = SoundEngine;
