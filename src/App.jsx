import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';

const autoCorrelate = (buf, sampleRate) => {
  const size = buf.length;
  let rms = 0;

  for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = size - 1, thres = 0.2;

  for (let i = 0; i < size / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }

  for (let i = 1; i < size / 2; i++) {
    if (Math.abs(buf[size - i]) < thres) {
      r2 = size - i;
      break;
    }
  }

  buf = buf.slice(r1, r2);
  const trimmedSize = buf.length;
  const correlations = new Array(trimmedSize).fill(0);

  for (let i = 0; i < trimmedSize; i++) {
    for (let j = 0; j < trimmedSize - i; j++) {
      correlations[i] += buf[j] * buf[j + i];
    }
  }

  let d = 0;
  while (d + 1 < trimmedSize && correlations[d] > correlations[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;

  for (let i = d; i < trimmedSize; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxPos = i;
    }
  }

  if (maxPos <= 0 || maxPos >= trimmedSize - 1) return -1;

  let period = maxPos;
  const x1 = correlations[period - 1];
  const x2 = correlations[period];
  const x3 = correlations[period + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;

  if (a) period -= b / (2 * a);

  return period > 0 ? sampleRate / period : -1;
};

const westernNotes = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const rootFrequencies = {
  C: 261.63, 'C#': 277.18, D: 293.66, 'D#': 311.13,
  E: 329.63, F: 349.23, 'F#': 369.99, G: 392.00,
  'G#': 415.30, A: 440.00, 'A#': 466.16, B: 493.88
};

const swaraLabels = {
  0: { short: 'Sa', full: 'Shadja' },
  1: { short: 're', full: 'Komal Rishabh' },
  2: { short: 'Re', full: 'Shuddha Rishabh' },
  3: { short: 'ga', full: 'Komal Gandhar' },
  4: { short: 'Ga', full: 'Shuddha Gandhar' },
  5: { short: 'ma', full: 'Shuddha Madhyam' },
  6: { short: 'Ma', full: 'Teevra Madhyam' },
  7: { short: 'Pa', full: 'Pancham' },
  8: { short: 'dha', full: 'Komal Dhaivat' },
  9: { short: 'Dha', full: 'Shuddha Dhaivat' },
  10: { short: 'ni', full: 'Komal Nishad' },
  11: { short: 'Ni', full: 'Shuddha Nishad' }
};

const INITIAL_PITCH = {
  freq: null,
  western: '-',
  swaraShort: '-',
  swaraFull: '',
  cents: 0,
  string: '-'
};

const ViolinStudio = () => {
  const [micActive, setMicActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingsList, setRecordingsList] = useState([]);
  const [rootNote, setRootNote] = useState('D');
  const [tuningStyle, setTuningStyle] = useState('sapa');
  const [pitch, setPitch] = useState(INITIAL_PITCH);
  const [droneActive, setDroneActive] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [metroActive, setMetroActive] = useState(false);
  const [taalBeats, setTaalBeats] = useState(8);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [holdTime, setHoldTime] = useState(0.75);
  const [sequence, setSequence] = useState('Sa Re Ga Ma Pa Dha Ni Sa');
  const [activeNoteIndex] = useState(1);
  const [pitchHistory, setPitchHistory] = useState([]);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const reqIdRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const droneOscillators = useRef([]);
  const metroInterval = useRef(null);
  const waveformCanvasRef = useRef(null);
  const pitchCanvasRef = useRef(null);
  const pitchHistoryRef = useRef([]);
  const lastHistorySampleRef = useRef(0);
  const updatePitchRef = useRef(null);
  const mountedRef = useRef(true);

  const initAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const drawWaveform = useCallback((buffer) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;

    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.strokeStyle = 'rgba(245,184,75,0.2)';
    ctx.stroke();

    ctx.beginPath();

    for (let i = 0; i < buffer.length; i++) {
      const x = (i / (buffer.length - 1)) * w;
      const y = (0.5 - buffer[i] * 0.43) * h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#e8a93e');
    gradient.addColorStop(0.5, '#ffe0a0');
    gradient.addColorStop(1, '#5ee0ad');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.7;
    ctx.shadowColor = 'rgba(245,184,75,0.32)';
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (reqIdRef.current) {
      cancelAnimationFrame(reqIdRef.current);
      reqIdRef.current = null;
    }

    if (recording && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
    setMicActive(false);
    setPitch(INITIAL_PITCH);
    setPitchHistory([]);
    pitchHistoryRef.current = [];

    const canvas = waveformCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [recording]);

  const getIndianString = useCallback((freq, rootFreq) => {
    if (freq < rootFreq * 0.6) return '-';

    if (tuningStyle === 'sapa') {
      if (freq < rootFreq * 0.85) return 'P̣ (Mandra Pa)';
      if (freq < rootFreq * 1.25) return 'S (Madhya Sa)';
      if (freq < rootFreq * 1.75) return 'P (Madhya Pa)';
      return "S' (Taar Sa)";
    }

    if (freq < rootFreq * 0.85) return 'Ṣ (Mandra Sa)';
    if (freq < rootFreq * 1.25) return 'P (Mandra Pa)';
    if (freq < rootFreq * 1.75) return 'S (Madhya Sa)';
    return "P' (Madhya Pa)";
  }, [tuningStyle]);

  const updatePitch = useCallback(() => {
    if (!analyserRef.current || !audioCtxRef.current) return;

    const buffer = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buffer);
    drawWaveform(buffer);

    const acFreq = autoCorrelate(buffer, audioCtxRef.current.sampleRate);

    if (Number.isFinite(acFreq) && acFreq > 40 && acFreq < 2000) {
      const rootFreq = rootFrequencies[rootNote];
      const noteNumFrom440 = 12 * Math.log2(acFreq / 440);
      const roundedWestern = Math.round(noteNumFrom440) + 69;
      const noteNumFromRoot = 12 * Math.log2(acFreq / rootFreq);
      const nearestSemitone = Math.round(noteNumFromRoot);
      const swaraIndex = ((nearestSemitone % 12) + 12) % 12;
      const centsOff = Math.round((noteNumFromRoot - nearestSemitone) * 100);

      setPitch({
        freq: acFreq.toFixed(1),
        western: westernNotes[((roundedWestern % 12) + 12) % 12],
        swaraShort: swaraLabels[swaraIndex].short,
        swaraFull: swaraLabels[swaraIndex].full,
        cents: centsOff,
        string: getIndianString(acFreq, rootFreq)
      });

      const now = performance.now();

      if (now - lastHistorySampleRef.current > 90) {
        lastHistorySampleRef.current = now;

        const nextPoint = {
          cents: centsOff,
          swara: swaraLabels[swaraIndex].short,
          freq: acFreq
        };

        const nextHistory = [
          ...pitchHistoryRef.current.slice(-119),
          nextPoint
        ];

        pitchHistoryRef.current = nextHistory;
        setPitchHistory(nextHistory);
      }
    }

    reqIdRef.current = requestAnimationFrame(() => {
      if (updatePitchRef.current) updatePitchRef.current();
    });
  }, [rootNote, getIndianString, drawWaveform]);

  updatePitchRef.current = updatePitch;

  const startMic = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access requires HTTPS or localhost.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = stream;
      initAudioCtx();

      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.15;

      audioCtxRef.current
        .createMediaStreamSource(stream)
        .connect(analyserRef.current);

      pitchHistoryRef.current = [];
      setPitchHistory([]);
      lastHistorySampleRef.current = 0;
      setMicActive(true);

      requestAnimationFrame(() => {
        if (updatePitchRef.current) updatePitchRef.current();
      });
    } catch (err) {
      console.error('Microphone startup failed:', err);
      alert(
        'Could not start the microphone. Allow microphone access and run the app on localhost or HTTPS.'
      );
    }
  };

  useEffect(() => {
    const canvas = pitchCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const yFor = cents =>
      h / 2 - (Math.max(-50, Math.min(50, cents)) / 50) * (h * 0.42);

    [-50, -25, 0, 25, 50].forEach(cents => {
      const y = yFor(cents);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.strokeStyle =
        cents === 0
          ? 'rgba(94,224,173,0.42)'
          : 'rgba(255,255,255,0.075)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (pitchHistory.length < 2) return;

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#d9952f');
    gradient.addColorStop(0.55, '#ffd078');
    gradient.addColorStop(1, '#5ee0ad');

    ctx.beginPath();

    pitchHistory.forEach((point, i) => {
      const x = (i / Math.max(1, pitchHistory.length - 1)) * w;
      const y = yFor(point.cents);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(245,184,75,0.22)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [pitchHistory]);

  useEffect(() => {
    const handleResize = () => {
      if (analyserRef.current) {
        const buffer = new Float32Array(analyserRef.current.fftSize);
        analyserRef.current.getFloatTimeDomainData(buffer);
        drawWaveform(buffer);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  const toggleDrone = () => {
    if (droneActive) {
      droneOscillators.current.forEach(node => {
        try {
          node.osc.stop();
        } catch {}
        node.osc.disconnect();
      });

      droneOscillators.current = [];
      setDroneActive(false);
      return;
    }

    initAudioCtx();

    const baseFreq = rootFrequencies[rootNote];
    const masterGain = audioCtxRef.current.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioCtxRef.current.destination);

    const freqs = tuningStyle === 'sapa'
      ? [baseFreq / 2, baseFreq, baseFreq * 1.5, baseFreq * 2]
      : [baseFreq / 1.5, baseFreq / 2, baseFreq, baseFreq * 1.5];

    freqs.forEach((freq, i) => {
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;
      if (i === 1) osc.detune.value = 4;

      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();

      droneOscillators.current.push({ osc, gain });
    });

    setDroneActive(true);
  };

  useEffect(() => {
    if (!droneActive) return;

    droneOscillators.current.forEach(node => {
      try {
        node.osc.stop();
      } catch {}
      node.osc.disconnect();
    });

    droneOscillators.current = [];
    setDroneActive(false);

    // Restart the drone with the new root note/style.
    const timer = setTimeout(() => {
      initAudioCtx();

      const baseFreq = rootFrequencies[rootNote];
      const masterGain = audioCtxRef.current.createGain();
      masterGain.gain.value = 0.15;
      masterGain.connect(audioCtxRef.current.destination);

      const freqs = tuningStyle === 'sapa'
        ? [baseFreq / 2, baseFreq, baseFreq * 1.5, baseFreq * 2]
        : [baseFreq / 1.5, baseFreq / 2, baseFreq, baseFreq * 1.5];

      freqs.forEach((freq, i) => {
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;
        if (i === 1) osc.detune.value = 4;

        gain.gain.value = 0.06;
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();

        droneOscillators.current.push({ osc, gain });
      });

      setDroneActive(true);
    }, 50);

    return () => clearTimeout(timer);
  // This effect intentionally reacts to root/tuning changes while the drone is active.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNote, tuningStyle]);

  const toggleMetronome = () => {
    if (metroActive) {
      clearInterval(metroInterval.current);
      setMetroActive(false);
      setCurrentBeat(0);
    } else {
      setCurrentBeat(1);
      setMetroActive(true);
    }
  };

  useEffect(() => {
    clearInterval(metroInterval.current);

    if (metroActive) {
      metroInterval.current = setInterval(() => {
        setCurrentBeat(prev => (prev % taalBeats) + 1);
      }, (60 / Number(bpm)) * 1000);
    }

    return () => clearInterval(metroInterval.current);
  }, [bpm, metroActive, taalBeats]);

  const startRecordingObj = () => {
    if (!streamRef.current) return;

    audioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';

    mediaRecorderRef.current = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined
    );

    mediaRecorderRef.current.ondataavailable = e => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm'
      });

      const audioUrl = URL.createObjectURL(blob);
      setRecordingsList(prev => [
        ...prev,
        { url: audioUrl, date: new Date().toLocaleTimeString() }
      ]);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const toggleRecording = async () => {
    if (recording) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
      return;
    }

    if (!streamRef.current) {
      await startMic();
    }

    // Wait for microphone permission/startup before recording.
    if (streamRef.current) startRecordingObj();
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearInterval(metroInterval.current);

      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      droneOscillators.current.forEach(node => {
        try {
          node.osc.stop();
        } catch {}
      });

      recordingsList.forEach(rec => URL.revokeObjectURL(rec.url));

      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const seqArray = sequence.split(/\s+/).filter(Boolean);
  const prevNote = activeNoteIndex > 0
    ? seqArray[activeNoteIndex - 1]
    : '---';
  const targetNote = seqArray.length > 0 && activeNoteIndex < seqArray.length
    ? seqArray[activeNoteIndex]
    : '---';
  const nextNote = activeNoteIndex < seqArray.length - 1
    ? seqArray[activeNoteIndex + 1]
    : '---';

  const pitchFeedback = !micActive || !pitch.freq
    ? 'Ready'
    : pitch.swaraShort.toLowerCase() !== targetNote.toLowerCase()
      ? 'Different swara'
      : Math.abs(pitch.cents) <= 5
        ? 'In tune'
        : pitch.cents > 0
          ? 'Sharp'
          : 'Flat';

  return (
    <div className="app-viewport">
      <header className="top-bar">
        <div className="root-badge">
          <label>Shruti (Sa):</label>
          <select
            value={rootNote}
            onChange={e => setRootNote(e.target.value)}
          >
            {westernNotes.map(note => (
              <option key={note} value={note}>{note}</option>
            ))}
          </select>
        </div>

        <div className="header-controls">
          {!micActive ? (
            <button className="btn-primary" onClick={startMic}>
              ▶ Turn On Mic
            </button>
          ) : (
            <button className="btn-danger" onClick={stopMic}>
              ⏹ Turn Off Mic
            </button>
          )}

          <button
            className={`btn-record ${recording ? 'recording' : ''}`}
            onClick={toggleRecording}
          >
            {recording ? '⏹ Stop Rec' : '⏺ Record'}
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* PANEL 1: SWARA TUNER + LIVE VISUALIZATION */}
        <section className="dashboard-card tuner-panel">
          <div className="card-header">
            <h3>Swara Tuner</h3>
            <button
              className="tuning-toggle-btn"
              onClick={() =>
                setTuningStyle(prev => prev === 'sapa' ? 'pasa' : 'sapa')
              }
            >
              Style: {tuningStyle === 'sapa' ? 'Sa-Pa-Sa-Pa' : 'Pa-Sa-Pa-Sa'}
            </button>
          </div>

          <div className="tuner-display">
            <h1 className="main-note indian">{pitch.swaraShort}</h1>
            <p className="sub-note">{pitch.swaraFull || '---'}</p>
            <p className="frequency">
              {pitch.freq
                ? `${pitch.freq} Hz (Cents: ${pitch.cents > 0 ? '+' : ''}${pitch.cents})`
                : '--- Hz'}
            </p>
          </div>

          <div className="pitch-visualizer">
            <div className="visualizer-heading">
              <span className="visualizer-title">LIVE SIGNAL</span>
              <span className={`signal-status ${micActive ? 'is-live' : ''}`}>
                <i />
                {micActive ? 'Listening' : 'Mic off'}
              </span>
            </div>

            <canvas
              ref={waveformCanvasRef}
              className="waveform-canvas"
              aria-label="Live microphone waveform"
            />

            <div className="pitch-history-heading">
              <span className="visualizer-title">PITCH HISTORY</span>
              <span className="pitch-axis-labels">
                <span>+50¢</span><span>0¢</span><span>−50¢</span>
              </span>
            </div>

            <canvas
              ref={pitchCanvasRef}
              className="pitch-history-canvas"
              aria-label="Scrolling pitch deviation graph"
            />

            <div className="pitch-compare-row">
              <div className="pitch-compare-item">
                <span className="compare-label">TARGET SWARA</span>
                <strong>{targetNote}</strong>
              </div>

              <div className="compare-divider" />

              <div className="pitch-compare-item detected">
                <span className="compare-label">DETECTED</span>
                <strong>{pitch.freq ? pitch.swaraShort : '—'}</strong>
              </div>

              <div
                className={`pitch-match ${
                  pitchFeedback === 'In tune'
                    ? 'match-good'
                    : pitchFeedback === 'Ready'
                      ? ''
                      : 'match-wait'
                }`}
              >
                {pitchFeedback}
              </div>
            </div>
          </div>

          <div className="gauge-wrapper">
            <div className="gauge-labels">
              <span>♭ Flat</span><span>♯ Sharp</span>
            </div>
            <div className="gauge-track">
              <div className="gauge-center" />
              <div
                className="gauge-needle"
                style={{
                  transform: `translateX(-50%) rotate(${
                    Math.max(-50, Math.min(50, pitch.cents))
                  }deg)`
                }}
              />
            </div>
          </div>

          <div className="string-indicator">
            <h4>
              String / Drone Layout ({tuningStyle === 'sapa' ? 'Sa-Pa' : 'Pa-Sa'})
            </h4>

            <div className="string-badges">
              {(tuningStyle === 'sapa'
                ? ['P̣ (Mandra Pa)', 'S (Madhya Sa)', 'P (Madhya Pa)', "S' (Taar Sa)"]
                : ['Ṣ (Mandra Sa)', 'P (Mandra Pa)', 'S (Madhya Sa)', "P' (Madhya Pa)"]
              ).map(str => (
                <span
                  key={str}
                  className={`string-badge ${pitch.string === str ? 'active' : ''}`}
                >
                  {str.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* PANEL 2: ALANKAR PRACTICE */}
        <section className="dashboard-card practice-panel">
          <div className="card-header">
            <h3>Alankar Practice</h3>
            <span className="hold-display">
              Hold: <strong>{holdTime}s</strong>
            </span>
          </div>

          <div className="practice-inputs">
            <input
              type="text"
              value={sequence}
              onChange={e => setSequence(e.target.value)}
              placeholder="Type Swaras (e.g. Sa Re Ga)"
            />

            <input
              type="range"
              min="0.10"
              max="8.0"
              step="0.10"
              value={holdTime}
              onChange={e => setHoldTime(Number(e.target.value))}
            />
          </div>

          <div className="tracker-row">
            <div className="track-box secondary">
              <span className="track-label">Previous</span>
              <div className="track-note">{prevNote}</div>
            </div>

            <div className="track-box active-target">
              <span className="track-label">Target Swara</span>
              <div className="track-note">{targetNote}</div>
              <progress value={micActive ? '45' : '0'} max="100" />
            </div>

            <div className="track-box secondary">
              <span className="track-label">Next</span>
              <div className="track-note">{nextNote}</div>
            </div>
          </div>
        </section>

        {/* PANEL 3: TAAL METRONOME */}
        <section className="dashboard-card metronome-panel">
          <div className="card-header">
            <h3>Taal & Laya (Rhythm)</h3>
            <select
              className="taal-select"
              value={taalBeats}
              onChange={e => {
                setTaalBeats(Number(e.target.value));
                setCurrentBeat(0);
              }}
            >
              <option value={6}>Dadra (6 Beats)</option>
              <option value={8}>Keherwa (8 Beats)</option>
              <option value={16}>Teentaal (16 Beats)</option>
            </select>
          </div>

          <div className="taal-display">
            <div className="taal-grid">
              {Array.from({ length: taalBeats }).map((_, i) => (
                <div
                  key={i}
                  className={`beat-circle ${
                    currentBeat === i + 1 ? 'active' : ''
                  } ${i === 0 ? 'sam' : ''}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <p className="bow-label">
              {currentBeat === 1
                ? 'Sam (Beat 1)'
                : currentBeat > 0
                  ? `Matra ${currentBeat}`
                  : 'Ready'}
            </p>
          </div>

          <div className="slider-group">
            <label>{bpm} BPM (Tempo)</label>
            <input
              type="range"
              min="40"
              max="180"
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
            />
          </div>

          <button
            className={`btn-toggle ${metroActive ? 'active' : ''}`}
            onClick={toggleMetronome}
            style={{ width: '100%' }}
          >
            {metroActive ? 'Stop Taal' : 'Start Taal'}
          </button>
        </section>

        {/* PANEL 4: TANPURA + RECORDINGS */}
        <section className="dashboard-card session-panel">
          <div className="card-header">
            <h3>Tanpura & Session</h3>
          </div>

          <div className="drone-section">
            <p className="drone-desc">
              Digital Tanpura sounding {tuningStyle === 'sapa' ? 'Sa & Pa' : 'Pa & Sa'}
              {' '}relative to ({rootNote}).
            </p>

            <button
              className={`btn-toggle ${droneActive ? 'active' : ''}`}
              onClick={toggleDrone}
              style={{ width: '100%', margin: '0.75rem 0' }}
            >
              {droneActive ? 'Mute Tanpura' : 'Play Tanpura'}
            </button>
          </div>

          <h4 className="recordings-title">
            Takes ({recordingsList.length})
          </h4>

          <div className="recordings-list">
            {recordingsList.length === 0 && (
              <p className="empty-text">No takes yet.</p>
            )}

            {recordingsList.map((rec, i) => (
              <div key={i} className="record-item">
                <span>Take {i + 1} · {rec.date}</span>
                <audio src={rec.url} controls />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ViolinStudio;