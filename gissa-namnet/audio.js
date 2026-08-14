// Ljud för Gissa Namnet
// All musik och alla effekter genereras i webbläsaren med Web Audio API.
// Inga ljudfiler laddas ner - originalmelodier i chiptune-stil, ett tema per
// kategori. (Seriernas riktiga musik är upphovsrättsskyddad och kan inte
// läggas ut på en publik sida.)

const Sound = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let enabled = true;

    // Notnamn -> frekvens
    const NOTE_BASE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

    function freq(note) {
        if (!note) return 0;
        const match = /^([A-G]#?)(\d)$/.exec(note);
        if (!match) return 0;
        const semitone = NOTE_BASE[match[1]] + (parseInt(match[2], 10) + 1) * 12;
        return 440 * Math.pow(2, (semitone - 69) / 12);
    }

    // === Teman ===
    // Pokémon: pigg dur, snabb puls. Naruto: japansk pentatonisk skala,
    // lugnare puls och taiko-aktig trumma.
    const THEMES = {
        pokemon: {
            tempo: 132,
            lead: ['C5', null, 'E5', 'G5', 'E5', null, 'D5', null,
                   'F5', null, 'A5', 'G5', 'E5', null, 'C5', null,
                   'D5', null, 'F5', 'A5', 'G5', null, 'E5', null,
                   'C5', 'D5', 'E5', 'G5', 'C6', null, 'G5', null],
            bass: ['C3', null, 'C3', null, 'G2', null, 'G2', null,
                   'F2', null, 'F2', null, 'C3', null, 'C3', null,
                   'D3', null, 'D3', null, 'G2', null, 'G2', null,
                   'C3', null, 'G2', null, 'C3', null, 'C3', null],
            drums: ['kick', null, 'hat', null, 'snare', null, 'hat', null,
                    'kick', null, 'hat', null, 'snare', null, 'hat', 'hat',
                    'kick', null, 'hat', null, 'snare', null, 'hat', null,
                    'kick', null, 'hat', null, 'snare', null, 'hat', 'hat'],
            wave: 'square'
        },
        naruto: {
            tempo: 100,
            // A-moll pentatonisk med japansk klang
            lead: ['A4', null, 'C5', null, 'D5', null, 'E5', null,
                   'G5', null, 'E5', null, 'D5', null, 'C5', null,
                   'A4', null, 'C5', 'D5', 'E5', null, 'D5', null,
                   'C5', null, 'A4', null, 'G4', null, 'A4', null],
            bass: ['A2', null, null, null, 'E2', null, null, null,
                   'F2', null, null, null, 'G2', null, null, null,
                   'A2', null, null, null, 'E2', null, null, null,
                   'F2', null, 'G2', null, 'A2', null, null, null],
            drums: ['kick', null, null, 'hat', 'kick', null, 'snare', null,
                    'kick', null, null, 'hat', 'snare', null, 'hat', null,
                    'kick', null, null, 'hat', 'kick', null, 'snare', null,
                    'kick', 'kick', null, 'hat', 'snare', null, 'hat', null],
            wave: 'triangle'
        }
    };

    let currentTheme = null;
    let schedulerId = null;
    let nextStepTime = 0;
    let step = 0;

    function ensureContext() {
        if (ctx) return true;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;

        ctx = new Ctx();
        masterGain = ctx.createGain();
        masterGain.gain.value = enabled ? 1 : 0;
        masterGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.16;
        musicGain.connect(masterGain);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.5;
        sfxGain.connect(masterGain);
        return true;
    }

    // En ton med mjuk in- och uttoning
    function tone(when, frequency, duration, wave, gain, destination) {
        if (!frequency) return;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(frequency, when);

        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(gain, when + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0008, when + duration);

        osc.connect(env);
        env.connect(destination || sfxGain);
        osc.start(when);
        osc.stop(when + duration + 0.02);
    }

    // Brusbaserad trumma
    function drum(when, type) {
        const length = type === 'kick' ? 0.16 : type === 'snare' ? 0.13 : 0.045;
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            const fade = 1 - i / data.length;
            data[i] = (Math.random() * 2 - 1) * fade * fade;
        }

        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        if (type === 'kick') {
            filter.type = 'lowpass';
            filter.frequency.value = 160;
        } else if (type === 'snare') {
            filter.type = 'bandpass';
            filter.frequency.value = 1800;
        } else {
            filter.type = 'highpass';
            filter.frequency.value = 7000;
        }

        const env = ctx.createGain();
        env.gain.value = type === 'hat' ? 0.25 : 0.6;

        src.connect(filter);
        filter.connect(env);
        env.connect(musicGain);
        src.start(when);

        // Kicken får en tonhöjdssvep för att låta som en riktig bastrumma
        if (type === 'kick') {
            const osc = ctx.createOscillator();
            const oscEnv = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, when);
            osc.frequency.exponentialRampToValueAtTime(45, when + 0.13);
            oscEnv.gain.setValueAtTime(0.7, when);
            oscEnv.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
            osc.connect(oscEnv);
            oscEnv.connect(musicGain);
            osc.start(when);
            osc.stop(when + 0.18);
        }
    }

    function scheduleStep(index, when) {
        const theme = THEMES[currentTheme];
        if (!theme) return;
        const stepTime = 30 / theme.tempo; // sextondelar

        const lead = theme.lead[index % theme.lead.length];
        if (lead) tone(when, freq(lead), stepTime * 1.6, theme.wave, 0.18, musicGain);

        const bass = theme.bass[index % theme.bass.length];
        if (bass) tone(when, freq(bass), stepTime * 2.2, 'triangle', 0.3, musicGain);

        const hit = theme.drums[index % theme.drums.length];
        if (hit) drum(when, hit);
    }

    function scheduler() {
        const theme = THEMES[currentTheme];
        if (!theme) return;
        const stepTime = 30 / theme.tempo;

        while (nextStepTime < ctx.currentTime + 0.2) {
            scheduleStep(step, nextStepTime);
            nextStepTime += stepTime;
            step = (step + 1) % theme.lead.length;
        }
    }

    function playTheme(name) {
        if (!ensureContext()) return;
        if (ctx.state === 'suspended') ctx.resume();
        if (currentTheme === name && schedulerId) return;

        stopMusic();
        currentTheme = name;
        step = 0;
        nextStepTime = ctx.currentTime + 0.06;
        schedulerId = setInterval(scheduler, 25);
    }

    function stopMusic() {
        if (schedulerId) {
            clearInterval(schedulerId);
            schedulerId = null;
        }
        currentTheme = null;
    }

    // === Effekter ===
    function arpeggio(notes, spacing, duration, wave, gain) {
        if (!ensureContext()) return;
        if (ctx.state === 'suspended') ctx.resume();
        const start = ctx.currentTime;
        notes.forEach((note, i) => tone(start + i * spacing, freq(note), duration, wave, gain));
    }

    function sweep(from, to, duration, wave, gain) {
        if (!ensureContext()) return;
        if (ctx.state === 'suspended') ctx.resume();
        const when = ctx.currentTime;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(from, when);
        osc.frequency.exponentialRampToValueAtTime(to, when + duration);
        env.gain.setValueAtTime(0, when);
        env.gain.linearRampToValueAtTime(gain, when + 0.015);
        env.gain.exponentialRampToValueAtTime(0.0008, when + duration);
        osc.connect(env);
        env.connect(sfxGain);
        osc.start(when);
        osc.stop(when + duration + 0.02);
    }

    return {
        init() { ensureContext(); },

        isEnabled() { return enabled; },

        setEnabled(value) {
            enabled = value;
            if (masterGain) {
                masterGain.gain.setTargetAtTime(enabled ? 1 : 0, ctx.currentTime, 0.02);
            }
            try { localStorage.setItem('soundGissa', enabled ? 'on' : 'off'); } catch { /* strunt i det */ }
        },

        loadPreference() {
            try { enabled = localStorage.getItem('soundGissa') !== 'off'; } catch { enabled = true; }
            return enabled;
        },

        playTheme,
        stopMusic,

        click() { arpeggio(['E5'], 0, 0.06, 'square', 0.16); },
        start() { arpeggio(['C5', 'E5', 'G5', 'C6'], 0.07, 0.16, 'square', 0.2); },
        correct() { arpeggio(['E5', 'G5', 'C6'], 0.065, 0.2, 'square', 0.22); },
        wrong() { sweep(320, 90, 0.42, 'sawtooth', 0.2); },
        timeout() { sweep(220, 70, 0.6, 'square', 0.2); },
        tick() { arpeggio(['A5'], 0, 0.045, 'square', 0.13); },
        win() { arpeggio(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], 0.09, 0.3, 'square', 0.22); },
        gameOver() { arpeggio(['G4', 'E4', 'C4'], 0.14, 0.35, 'triangle', 0.2); }
    };
})();
