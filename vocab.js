// ===== VOCABULARY STUDIO: Cards/Table, US/UK TTS, SRS, Flashcard, Quiz, Typing/Dictation, Match Game =====

(function () {
  const STORAGE_KEY = 'eg_vocab_progress_v1';
  const SETTINGS_KEY = 'eg_vocab_settings_v1';

  const SRS_PRESETS = {
    standard: {
      label: 'Chuẩn Ebbinghaus (Khuyến nghị)',
      againMins: 10,
      hardHours: 1,
      goodDays: 1,
      easyDays: 3,
      easeFactor: 1.8,
      maxIntervalDays: 21
    },
    intensive: {
      label: 'Ôn gấp trước thi (IELTS Sprint)',
      againMins: 5,
      hardHours: 0.5,
      goodDays: 0.5,
      easyDays: 2,
      easeFactor: 1.5,
      maxIntervalDays: 7
    },
    longterm: {
      label: 'Ghi nhớ dài hạn',
      againMins: 10,
      hardHours: 2,
      goodDays: 1,
      easyDays: 3,
      easeFactor: 2.0,
      maxIntervalDays: 30
    }
  };

  function defaultSettings() {
    return Object.assign({
      accent: 'en-US',
      speechRate: 0.96,
      autoSpeak: true,
      srsPreset: 'standard'
    }, SRS_PRESETS.standard);
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return Object.assign(defaultSettings(), saved);
    } catch { return defaultSettings(); }
  }

  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  }

  // State for current unit vocabulary session
  const state = {
    unitKey: '',
    title: '',
    intro: '',
    words: [],        // [{ idx, id, word, ipa, pos, cefr, meaning, example, examplePlain }]
    notesMd: '',
    mode: 'list',     // 'list' | 'flashcard' | 'quiz' | 'typing' | 'game'
    view: 'grid',     // 'grid' | 'table'
    settings: loadSettings(),
    settingsOpen: false,
    hideMode: 'none', // 'none' | 'meaning' | 'word'
    search: '',
    filterCefr: 'all',
    filterPos: 'all',
    filterStatus: 'all', // 'all' | 'due' | 'review' | 'unmastered' | 'mastered'
    // Sub-mode states
    fc: { deck: [], idx: 0, flipped: false, scope: 'all', done: 0 },
    quiz: { deck: [], idx: 0, dir: 'en-vi', options: [], answered: false, chosen: -1, score: 0, total: 0 },
    typing: { deck: [], idx: 0, submode: 'meaning', answered: false, correct: false, userInput: '', hintLevel: 0, score: 0, total: 0 },
    game: { round: 1, pairs: [], leftSel: null, rightSel: null, matched: new Set(), mistakes: 0, combo: 0, bestCombo: 0, startTime: 0, timerId: null, elapsed: 0, finished: false }
  };

  // ===== STORAGE & SCIENTIFIC SRS (Ebbinghaus Learning Steps + Bounded SM-2) =====
  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  }
  function saveStore(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }
  function getWordProgress(id) {
    const store = loadStore();
    const raw = store[id];
    const baseEase = state.settings.easeFactor || 1.8;
    if (!raw) {
      return { mastered: false, review: false, reps: 0, intervalMins: 0, ease: baseEase, dueAt: 0, lastAt: 0 };
    }
    // Migrate legacy day-based `interval` -> `intervalMins`
    const intervalMins = typeof raw.intervalMins === 'number'
      ? raw.intervalMins
      : Math.round((raw.interval || 0) * 1440);
    return Object.assign({ mastered: false, review: false, reps: 0, ease: baseEase, dueAt: 0, lastAt: 0 }, raw, { intervalMins });
  }
  function updateWordProgress(id, patch) {
    const store = loadStore();
    const cur = getWordProgress(id);
    store[id] = Object.assign({}, cur, patch);
    saveStore(store);
    return store[id];
  }
  function isDue(prog) {
    if (!prog) return true;
    if (prog.dueAt === 0) return !prog.mastered;
    return prog.dueAt <= Date.now();
  }

  function formatIntervalMins(mins) {
    const m = Math.max(1, Math.round(mins));
    if (m < 60) return `${m} phút`;
    if (m < 1440) {
      const h = Math.round((m / 60) * 10) / 10;
      return `${h} giờ`;
    }
    const d = Math.round((m / 1440) * 10) / 10;
    return `${d} ngày`;
  }

  // Scientific Ebbinghaus + Bounded SM-2 calculation (shared by preview & save)
  // quality: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  function computeNextSrs(p, quality) {
    const cfg = state.settings;
    const MIN_EASE = 1.3;
    const MAX_EASE = 2.5;
    const maxMins = Math.max(1, Number(cfg.maxIntervalDays) || 21) * 1440;
    const againMins = Math.max(1, Number(cfg.againMins) || 10);
    const hardMins = Math.max(15, Math.round((Number(cfg.hardHours) || 1) * 60));
    const goodFirstMins = Math.max(60, Math.round((Number(cfg.goodDays) || 1) * 1440));
    const easyFirstMins = Math.min(maxMins, Math.max(goodFirstMins, Math.round((Number(cfg.easyDays) || 3) * 1440)));
    const defaultEase = Math.min(MAX_EASE, Math.max(MIN_EASE, Number(cfg.easeFactor) || 1.8));

    let reps = p.reps || 0;
    let prevMins = p.intervalMins || 0;
    let ease = Math.min(MAX_EASE, Math.max(MIN_EASE, p.ease || defaultEase));
    let intervalMins = againMins;
    let mastered = p.mastered;
    let review = p.review;

    if (quality === 1) {
      // Again: short-term Ebbinghaus step (e.g. 10 mins)
      reps = 0;
      intervalMins = againMins;
      ease = Math.max(MIN_EASE, +(ease - 0.2).toFixed(2));
      mastered = false;
      review = true;
    } else if (quality === 2) {
      // Hard: review soon (1h on first exposure, or 1.15x previous capped at max)
      if (reps === 0 || prevMins < 720) {
        intervalMins = hardMins;
        reps = 1;
      } else {
        intervalMins = Math.min(maxMins, Math.max(720, Math.round(prevMins * 1.15)));
      }
      ease = Math.max(MIN_EASE, +(ease - 0.15).toFixed(2));
      mastered = false;
      review = true;
    } else if (quality === 3) {
      // Good: Ebbinghaus ladder (e.g. 1d -> 3d -> 5d -> 9d -> 16d -> max 21d)
      reps += 1;
      if (reps === 1) {
        intervalMins = goodFirstMins;
      } else if (reps === 2) {
        intervalMins = Math.min(maxMins, Math.max(goodFirstMins * 2, Math.round(goodFirstMins * 3)));
      } else {
        const base = Math.max(prevMins, goodFirstMins * 2);
        intervalMins = Math.min(maxMins, Math.round(base * ease));
      }
      // Mastered only after passing at least 2 successful recalls (>= 2 days interval)
      if (reps >= 2 && intervalMins >= 2880) {
        mastered = true;
        review = false;
      } else {
        review = false;
      }
    } else {
      // Easy: never jumps to 10d on first recall; uses configured easyDays (default 3d) then bounded ease
      reps += 1;
      if (reps === 1) {
        intervalMins = easyFirstMins;
      } else {
        const base = Math.max(prevMins, easyFirstMins);
        intervalMins = Math.min(maxMins, Math.round(base * Math.min(ease * 1.2, 2.2)));
      }
      ease = Math.min(MAX_EASE, +(ease + 0.1).toFixed(2));
      mastered = (reps >= 2 || intervalMins >= 4320);
      review = false;
    }

    return { reps, intervalMins, ease, mastered, review };
  }

  function applySrs(id, quality) {
    const p = getWordProgress(id);
    const now = Date.now();
    const next = computeNextSrs(p, quality);
    const dueAt = now + next.intervalMins * 60000;
    return updateWordProgress(id, {
      reps: next.reps,
      intervalMins: next.intervalMins,
      interval: +(next.intervalMins / 1440).toFixed(2),
      ease: next.ease,
      dueAt,
      lastAt: now,
      mastered: next.mastered,
      review: next.review
    });
  }

  function formatNextDue(prog) {
    if (!prog || !prog.dueAt) return 'Chưa học';
    const diffMins = Math.round((prog.dueAt - Date.now()) / 60000);
    if (diffMins <= 0) return 'Đến hạn ôn';
    return `Ôn sau ${formatIntervalMins(diffMins)}`;
  }

  // ===== SPEECH SYNTHESIS (US / UK) =====
  let cachedVoices = [];
  function refreshVoices() {
    if (typeof speechSynthesis !== 'undefined') {
      cachedVoices = speechSynthesis.getVoices() || [];
    }
  }
  if (typeof speechSynthesis !== 'undefined') {
    refreshVoices();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
      speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }

  function speakText(text, accentOverride, rateOverride) {
    if (!text || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const lang = accentOverride || state.settings.accent || 'en-US';
      const clean = text.replace(/[*_`~]/g, '').replace(/\s+/g, ' ').trim();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = lang;
      utter.rate = typeof rateOverride === 'number' ? rateOverride : (Number(state.settings.speechRate) || 0.96);

      refreshVoices();
      const voices = cachedVoices;
      const exact = voices.find(v => v.lang && v.lang.toLowerCase() === lang.toLowerCase() && /samantha|daniel|google|alex|karen|moira|serena|natural/i.test(v.name))
                 || voices.find(v => v.lang && v.lang.toLowerCase() === lang.toLowerCase())
                 || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
      if (exact) utter.voice = exact;

      speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }

  // ===== PARSE vocabulary.md =====
  function stripMd(s) {
    return s.replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .trim();
  }

  function parseVocabMd(md, unitKey) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    let title = '';
    const introLines = [];
    const words = [];
    let tableStarted = false;
    let tableEnded = false;
    const notesLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!title && /^#\s+/.test(line)) {
        title = line.replace(/^#\s+/, '').trim();
        continue;
      }
      if (!tableStarted && /^\|/.test(line)) {
        tableStarted = true;
        continue;
      }
      if (tableStarted && !tableEnded) {
        if (/^\|/.test(line)) {
          // Skip separator line
          if (/^\|[\s:\-|]+\|$/.test(line.trim())) continue;
          const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
          if (cells.length >= 6 && /^\d+$/.test(cells[0])) {
            const idx = parseInt(cells[0]);
            const word = stripMd(cells[1]);
            const ipa = cells[2] || '';
            const pos = stripMd(cells[3] || '');
            const cefr = stripMd(cells[4] || '').toUpperCase();
            const meaning = cells[5] || '';
            const example = cells[6] || '';
            const firstExample = stripMd(example.split(';')[0] || '');
            words.push({
              idx,
              id: `${unitKey}::${word.toLowerCase()}`,
              word,
              ipa,
              pos,
              cefr,
              meaning,
              meaningPlain: stripMd(meaning),
              example,
              examplePlain: firstExample
            });
          }
          continue;
        } else {
          tableEnded = true;
        }
      }
      if (!tableStarted) {
        if (line.trim()) introLines.push(line);
      } else if (tableEnded) {
        notesLines.push(line);
      }
    }

    return {
      title,
      intro: introLines.join('\n'),
      words,
      notesMd: notesLines.join('\n').trim()
    };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escJs(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }
  function posGroup(pos) {
    const p = pos.toLowerCase();
    if (/idiom|phr/.test(p)) return 'phr';
    if (/\badv\b/.test(p)) return 'adv';
    if (/\badj\b/.test(p)) return 'adj';
    if (/\bv\b/.test(p)) return 'v';
    if (/\bn\b/.test(p)) return 'n';
    return 'other';
  }
  function cefrClass(cefr) {
    if (cefr.includes('C1') || cefr.includes('C2')) return 'c1';
    if (cefr.includes('B2')) return 'b2';
    return 'b1';
  }

  function getFilteredWords() {
    const q = state.search.toLowerCase().trim();
    return state.words.filter(w => {
      const prog = getWordProgress(w.id);
      if (state.filterCefr !== 'all' && !w.cefr.includes(state.filterCefr)) return false;
      if (state.filterPos !== 'all' && posGroup(w.pos) !== state.filterPos) return false;
      if (state.filterStatus === 'mastered' && !prog.mastered) return false;
      if (state.filterStatus === 'unmastered' && prog.mastered) return false;
      if (state.filterStatus === 'review' && !prog.review) return false;
      if (state.filterStatus === 'due' && !isDue(prog)) return false;
      if (q) {
        const hay = `${w.word} ${w.meaningPlain} ${w.example} ${w.ipa} ${w.pos}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function getStats() {
    let mastered = 0, review = 0, due = 0;
    state.words.forEach(w => {
      const p = getWordProgress(w.id);
      if (p.mastered) mastered++;
      if (p.review) review++;
      if (isDue(p)) due++;
    });
    return { total: state.words.length, mastered, review, due };
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ===== MAIN RENDER =====
  function render() {
    const root = document.getElementById('vocab-studio-root');
    if (!root) return;
    stopGameTimer();

    const st = getStats();
    const pct = st.total ? Math.round((st.mastered / st.total) * 100) : 0;

    let bodyHtml = '';
    if (state.mode === 'list') bodyHtml = renderListView();
    else if (state.mode === 'flashcard') bodyHtml = renderFlashcardView();
    else if (state.mode === 'quiz') bodyHtml = renderQuizView();
    else if (state.mode === 'typing') bodyHtml = renderTypingView();
    else if (state.mode === 'game') bodyHtml = renderGameView();

    const notesHtml = (state.mode === 'list' && state.notesMd && typeof window.renderMarkdown === 'function')
      ? `<div class="vs-notes">${window.renderMarkdown(state.notesMd)}</div>`
      : '';

    const compactPractice = state.mode !== 'list';
    const curAccLabel = state.settings.accent === 'en-GB' ? '🇬🇧 UK' : '🇺🇸 US';
    const isList = state.mode === 'list';

    root.innerHTML = `
      <div class="vs-header ${compactPractice ? 'is-practice' : ''}">
        <div class="vs-title-row">
          <div class="vs-title-left">
            <h1 class="vs-h1">${esc(state.title || 'Từ vựng trọng tâm')}</h1>
            <div class="vs-stats-line">
              <button class="vs-stat-pill green ${isList && state.filterStatus === 'mastered' ? 'active' : ''}"
                      onclick="VocabStudio.quickFilterStatus('mastered')"
                      title="Bấm để xem danh sách từ đã thuộc">
                ✅ <span class="vs-stat-lbl">Đã thuộc: </span><strong>${st.mastered}/${st.total}</strong>
              </button>
              <button class="vs-stat-pill amber ${isList && state.filterStatus === 'review' ? 'active' : ''}"
                      onclick="VocabStudio.quickFilterStatus('review')"
                      title="Bấm để xem danh sách từ cần ôn">
                ⭐ <span class="vs-stat-lbl">Cần ôn: </span><strong>${st.review}</strong>
              </button>
              <button class="vs-stat-pill indigo ${isList && state.filterStatus === 'due' ? 'active' : ''}"
                      onclick="VocabStudio.quickFilterStatus('due')"
                      title="Bấm để xem danh sách từ đến hạn ôn SRS">
                ⏰ <span class="vs-stat-lbl">SRS: </span><strong>${st.due}</strong>
              </button>
            </div>
          </div>
          <div class="vs-speech-ctrl">
            <button class="vs-chip vs-settings-btn ${state.settingsOpen ? 'active' : ''}"
                    onclick="VocabStudio.toggleSettings()"
                    title="Cài đặt giọng đọc & thuật toán SRS">
              ⚙️ <span class="vs-set-lbl">Cài đặt</span> <span class="vs-set-meta">(${curAccLabel})</span>
            </button>
          </div>
        </div>
        <div class="vs-prog-bar"><div class="vs-prog-fill" style="width:${pct}%"></div></div>
      </div>

      ${state.settingsOpen ? renderSettingsModal() : ''}

      <div class="vs-mode-tabs">
        <button class="vs-mode-btn ${state.mode === 'list' ? 'active' : ''}" onclick="VocabStudio.setMode('list')">📋 Danh sách</button>
        <button class="vs-mode-btn ${state.mode === 'flashcard' ? 'active' : ''}" onclick="VocabStudio.setMode('flashcard')">🃏 Flashcard</button>
        <button class="vs-mode-btn ${state.mode === 'quiz' ? 'active' : ''}" onclick="VocabStudio.setMode('quiz')">❓ Trắc nghiệm</button>
        <button class="vs-mode-btn ${state.mode === 'typing' ? 'active' : ''}" onclick="VocabStudio.setMode('typing')">⌨️ Điền &amp; Nghe</button>
        <button class="vs-mode-btn ${state.mode === 'game' ? 'active' : ''}" onclick="VocabStudio.setMode('game')">🎮 Ghép cặp</button>
      </div>

      <div class="vs-stage">${bodyHtml}</div>
      ${notesHtml}
    `;

    if (state.mode === 'game' && !state.game.finished) {
      startGameTimer();
    }
    if (state.mode === 'typing' && !state.settingsOpen) {
      const inp = document.getElementById('vs-type-input');
      if (inp) setTimeout(() => inp.focus(), 40);
    }
  }

  function renderSettingsModal() {
    const s = state.settings;
    // Preview full Ebbinghaus ladder for Good
    const ladder = [];
    let sim = { reps: 0, intervalMins: 0, ease: s.easeFactor, mastered: false, review: false };
    for (let k = 0; k < 5; k++) {
      sim = computeNextSrs(sim, 3);
      ladder.push(formatIntervalMins(sim.intervalMins));
    }

    return `
      <div class="vs-modal-backdrop" onclick="if(event.target===this)VocabStudio.closeSettings()">
        <div class="vs-modal" role="dialog" aria-label="Cài đặt Từ vựng và SRS">
          <div class="vs-modal-head">
            <h3>⚙️ Cài đặt Học từ vựng &amp; SRS</h3>
            <button class="ex-nav-close" onclick="VocabStudio.closeSettings()" aria-label="Đóng">✕</button>
          </div>
          <div class="vs-modal-body">
            <div class="vs-set-sec">
              <div class="vs-set-title">🔊 Phát âm (Text-to-Speech)</div>
              <div class="vs-set-row">
                <span>Giọng đọc:</span>
                <div class="vs-seg-group">
                  <button class="vs-seg ${s.accent==='en-US'?'active':''}" onclick="VocabStudio.updateSetting('accent','en-US')">🇺🇸 Anh–Mỹ (US)</button>
                  <button class="vs-seg ${s.accent==='en-GB'?'active':''}" onclick="VocabStudio.updateSetting('accent','en-GB')">🇬🇧 Anh–Anh (UK)</button>
                </div>
              </div>
              <div class="vs-set-row">
                <span>Tốc độ đọc:</span>
                <div class="vs-seg-group">
                  <button class="vs-seg ${s.speechRate===0.72?'active':''}" onclick="VocabStudio.updateSetting('speechRate',0.72)">🐢 0.72x</button>
                  <button class="vs-seg ${s.speechRate===0.85?'active':''}" onclick="VocabStudio.updateSetting('speechRate',0.85)">0.85x</button>
                  <button class="vs-seg ${s.speechRate===0.96?'active':''}" onclick="VocabStudio.updateSetting('speechRate',0.96)">Chuẩn</button>
                  <button class="vs-seg ${s.speechRate===1.15?'active':''}" onclick="VocabStudio.updateSetting('speechRate',1.15)">1.15x</button>
                </div>
              </div>
              <div class="vs-set-row">
                <span>Tự động đọc khi lật thẻ / kiểm tra:</span>
                <label class="vs-switch">
                  <input type="checkbox" ${s.autoSpeak ? 'checked' : ''} onchange="VocabStudio.updateSetting('autoSpeak', this.checked)">
                  <span>${s.autoSpeak ? 'Đang bật' : 'Đang tắt'}</span>
                </label>
              </div>
            </div>

            <div class="vs-set-sec">
              <div class="vs-set-title">🧠 Lặp lại ngắt quãng SRS (Chuẩn Ebbinghaus)</div>
              <div class="vs-preset-row">
                ${Object.keys(SRS_PRESETS).map(key => `
                  <button class="vs-preset-btn ${s.srsPreset===key?'active':''}" onclick="VocabStudio.applySrsPreset('${key}')">
                    ${esc(SRS_PRESETS[key].label)}
                  </button>
                `).join('')}
              </div>
              <div class="vs-srs-grid">
                <label class="vs-field">
                  <span>1. Quên (phút)</span>
                  <input type="number" min="1" max="120" step="1" value="${s.againMins}" onchange="VocabStudio.updateSetting('againMins', +this.value, true)">
                </label>
                <label class="vs-field">
                  <span>2. Khó lần đầu (giờ)</span>
                  <input type="number" min="0.5" max="24" step="0.5" value="${s.hardHours}" onchange="VocabStudio.updateSetting('hardHours', +this.value, true)">
                </label>
                <label class="vs-field">
                  <span>3. Tốt lần đầu (ngày)</span>
                  <input type="number" min="0.5" max="5" step="0.5" value="${s.goodDays}" onchange="VocabStudio.updateSetting('goodDays', +this.value, true)">
                </label>
                <label class="vs-field">
                  <span>4. Dễ lần đầu (ngày)</span>
                  <input type="number" min="1" max="7" step="0.5" value="${s.easyDays}" onchange="VocabStudio.updateSetting('easyDays', +this.value, true)">
                </label>
                <label class="vs-field">
                  <span>Hệ số giãn (Ease)</span>
                  <input type="number" min="1.3" max="2.5" step="0.1" value="${s.easeFactor}" onchange="VocabStudio.updateSetting('easeFactor', +this.value, true)">
                </label>
                <label class="vs-field">
                  <span>Tối đa (ngày)</span>
                  <input type="number" min="3" max="60" step="1" value="${s.maxIntervalDays}" onchange="VocabStudio.updateSetting('maxIntervalDays', +this.value, true)">
                </label>
              </div>
              <div class="vs-srs-preview">
                📈 Chuỗi ôn khi chọn <strong>Tốt</strong> liên tiếp: <strong>${ladder.join(' → ')}</strong> (tối đa ${s.maxIntervalDays} ngày)
              </div>
            </div>
          </div>
          <div class="vs-modal-foot">
            <button class="ex-btn" onclick="VocabStudio.resetSettings()">🔄 Mặc định</button>
            <button class="ex-btn vs-danger-btn" onclick="VocabStudio.resetUnitProgress()">🗑 Xóa tiến độ Unit</button>
            <button class="ex-btn primary" style="margin-left:auto" onclick="VocabStudio.closeSettings()">✓ Xong</button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== 1. LIST VIEW (GRID & TABLE) =====
  function renderListView() {
    const words = getFilteredWords();
    const isMobile = window.innerWidth <= 680;
    const effectiveView = isMobile ? 'grid' : state.view;

    const toolbar = `
      <div class="vs-list-controls">
        <div class="vs-search-wrap">
          <span>🔍</span>
          <input type="search" id="vs-search-input" value="${esc(state.search)}"
                 placeholder="Tìm từ, nghĩa tiếng Việt, collocation..."
                 oninput="VocabStudio.setSearch(this.value)">
        </div>
        <div class="vs-filter-row">
          <select class="vs-select" onchange="VocabStudio.setFilter('filterCefr', this.value)" aria-label="Lọc trình độ">
            <option value="all" ${state.filterCefr==='all'?'selected':''}>Trình độ: Tất cả</option>
            <option value="B1" ${state.filterCefr==='B1'?'selected':''}>CEFR: B1</option>
            <option value="B2" ${state.filterCefr==='B2'?'selected':''}>CEFR: B2</option>
            <option value="C1" ${state.filterCefr==='C1'?'selected':''}>CEFR: C1</option>
          </select>
          <select class="vs-select" onchange="VocabStudio.setFilter('filterPos', this.value)" aria-label="Lọc từ loại">
            <option value="all" ${state.filterPos==='all'?'selected':''}>Từ loại: Tất cả</option>
            <option value="v" ${state.filterPos==='v'?'selected':''}>Động từ (v)</option>
            <option value="n" ${state.filterPos==='n'?'selected':''}>Danh từ (n)</option>
            <option value="adj" ${state.filterPos==='adj'?'selected':''}>Tính từ (adj)</option>
            <option value="adv" ${state.filterPos==='adv'?'selected':''}>Trạng từ (adv)</option>
            <option value="phr" ${state.filterPos==='phr'?'selected':''}>Cụm từ / Idiom</option>
          </select>
          <select class="vs-select" onchange="VocabStudio.setFilter('filterStatus', this.value)" aria-label="Lọc trạng thái">
            <option value="all" ${state.filterStatus==='all'?'selected':''}>Trạng thái: Tất cả</option>
            <option value="due" ${state.filterStatus==='due'?'selected':''}>⏰ Đến hạn ôn SRS</option>
            <option value="review" ${state.filterStatus==='review'?'selected':''}>⭐ Cần ôn</option>
            <option value="unmastered" ${state.filterStatus==='unmastered'?'selected':''}>○ Chưa thuộc</option>
            <option value="mastered" ${state.filterStatus==='mastered'?'selected':''}>✅ Đã thuộc</option>
          </select>
          <div class="vs-seg-group" title="Chế độ ẩn để tự nhẩm">
            <button class="vs-seg ${state.hideMode==='none'?'active':''}" onclick="VocabStudio.setHideMode('none')">Hiện hết</button>
            <button class="vs-seg ${state.hideMode==='meaning'?'active':''}" onclick="VocabStudio.setHideMode('meaning')">Ẩn nghĩa</button>
            <button class="vs-seg ${state.hideMode==='word'?'active':''}" onclick="VocabStudio.setHideMode('word')">Ẩn từ</button>
          </div>
          <div class="vs-seg-group vs-view-toggle">
            <button class="vs-seg ${state.view==='grid'?'active':''}" onclick="VocabStudio.setView('grid')" title="Dạng thẻ lưới">⊞ Thẻ</button>
            <button class="vs-seg ${state.view==='table'?'active':''}" onclick="VocabStudio.setView('table')" title="Dạng bảng gọn">☰ Bảng</button>
          </div>
        </div>
      </div>
    `;

    const statusBannerMap = {
      mastered: '✅ Đang xem danh sách: <strong>Đã thuộc</strong>',
      review: '⭐ Đang xem danh sách: <strong>Cần ôn</strong>',
      due: '⏰ Đang xem danh sách: <strong>Đến hạn ôn SRS</strong>',
      unmastered: '○ Đang xem danh sách: <strong>Chưa thuộc</strong>'
    };
    const activeBanner = state.filterStatus !== 'all'
      ? `<div class="vs-filter-banner">
          <span>${statusBannerMap[state.filterStatus]} (${words.length} từ)</span>
          <button class="vs-banner-clear" onclick="VocabStudio.setFilter('filterStatus','all')">✕ Xem tất cả (${state.words.length})</button>
        </div>`
      : '';

    if (words.length === 0) {
      return activeBanner + toolbar + `<div class="vs-empty">🔎 Không tìm thấy từ vựng nào trong mục này.</div>`;
    }

    if (effectiveView === 'table') {
      return activeBanner + toolbar + `
        <div class="vs-table-wrap">
          <table class="vs-table">
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Từ / Cụm từ</th>
                <th>IPA</th>
                <th>Loại</th>
                <th>CEFR</th>
                <th>Nghĩa tiếng Việt</th>
                <th>Ví dụ / Collocation</th>
                <th style="width:105px;text-align:center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              ${words.map(w => {
                const p = getWordProgress(w.id);
                const wordBlur = state.hideMode === 'word' ? 'vs-blur' : '';
                const meanBlur = state.hideMode === 'meaning' ? 'vs-blur' : '';
                return `<tr class="${p.mastered ? 'is-mastered' : ''} ${p.review ? 'is-review' : ''}">
                  <td style="color:var(--gray-500)">${w.idx}</td>
                  <td>
                    <span class="vs-word-txt ${wordBlur}" onclick="this.classList.toggle('revealed')">${esc(w.word)}</span>
                  </td>
                  <td><span class="vs-ipa">${esc(w.ipa)}</span></td>
                  <td><span class="vs-pos-badge">${esc(w.pos)}</span></td>
                  <td><span class="vs-cefr ${cefrClass(w.cefr)}">${esc(w.cefr)}</span></td>
                  <td>
                    <span class="vs-mean-txt ${meanBlur}" onclick="this.classList.toggle('revealed')">${typeof inline === 'function' ? inline(w.meaning) : esc(w.meaningPlain)}</span>
                  </td>
                  <td class="vs-ex-cell">
                    ${typeof inline === 'function' ? inline(w.example) : esc(w.example)}
                  </td>
                  <td>
                    <div class="vs-row-actions">
                      <button class="vs-icon-btn" onclick="VocabStudio.speak('${escJs(w.word)}')" title="Nghe phát âm">🔊</button>
                      <button class="vs-icon-btn ${p.review ? 'star-on' : ''}" onclick="VocabStudio.toggleFlag('${escJs(w.id)}','review')" title="Đánh dấu cần ôn">⭐</button>
                      <button class="vs-icon-btn ${p.mastered ? 'done-on' : ''}" onclick="VocabStudio.toggleFlag('${escJs(w.id)}','mastered')" title="Đánh dấu đã thuộc">✅</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Card Grid View
    return activeBanner + toolbar + `
      <div class="vs-grid">
        ${words.map(w => {
          const p = getWordProgress(w.id);
          const wordBlur = state.hideMode === 'word' ? 'vs-blur' : '';
          const meanBlur = state.hideMode === 'meaning' ? 'vs-blur' : '';
          const dueLabel = formatNextDue(p);
          return `<div class="vs-card ${p.mastered ? 'is-mastered' : ''} ${p.review ? 'is-review' : ''}">
            <div class="vs-card-top">
              <div class="vs-card-badges">
                <span class="vs-idx">#${w.idx}</span>
                <span class="vs-cefr ${cefrClass(w.cefr)}">${esc(w.cefr)}</span>
                <span class="vs-pos-badge">${esc(w.pos)}</span>
              </div>
              <div class="vs-card-actions">
                <button class="vs-icon-btn" onclick="VocabStudio.speak('${escJs(w.word)}')" title="Nghe phát âm">🔊</button>
                <button class="vs-icon-btn ${p.review ? 'star-on' : ''}" onclick="VocabStudio.toggleFlag('${escJs(w.id)}','review')" title="Cần ôn lại">⭐</button>
                <button class="vs-icon-btn ${p.mastered ? 'done-on' : ''}" onclick="VocabStudio.toggleFlag('${escJs(w.id)}','mastered')" title="Đã thuộc">✅</button>
              </div>
            </div>
            <div class="vs-card-word ${wordBlur}" onclick="this.classList.toggle('revealed')">${esc(w.word)}</div>
            <div class="vs-card-ipa">${esc(w.ipa)}</div>
            <div class="vs-card-meaning ${meanBlur}" onclick="this.classList.toggle('revealed')">
              ${typeof inline === 'function' ? inline(w.meaning) : esc(w.meaningPlain)}
            </div>
            <div class="vs-card-example">
              <div class="vs-card-ex-txt">${typeof inline === 'function' ? inline(w.example) : esc(w.example)}</div>
              ${w.examplePlain ? `<button class="vs-mini-speak" onclick="VocabStudio.speak('${escJs(w.examplePlain)}')" title="Nghe ví dụ">🔈 Nghe ví dụ</button>` : ''}
            </div>
            <div class="vs-card-foot">
              <span class="vs-srs-tag ${isDue(p) ? 'due' : ''}">⏰ ${dueLabel}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  // ===== 2. FLASHCARD + SRS =====
  function initFlashcards(scope) {
    state.fc.scope = scope || state.fc.scope || 'all';
    let pool = state.words.slice();
    if (state.fc.scope === 'due') pool = pool.filter(w => isDue(getWordProgress(w.id)));
    else if (state.fc.scope === 'review') pool = pool.filter(w => getWordProgress(w.id).review);
    else if (state.fc.scope === 'unmastered') pool = pool.filter(w => !getWordProgress(w.id).mastered);
    state.fc.deck = shuffle(pool);
    state.fc.idx = 0;
    state.fc.flipped = false;
    state.fc.done = 0;
  }

  function renderFlashcardView() {
    const fc = state.fc;
    const scopeBar = `
      <div class="vs-subbar vs-subbar-inline">
        <div class="vs-seg-group">
          <button class="vs-seg ${fc.scope==='all'?'active':''}" onclick="VocabStudio.fcScope('all')">Tất cả (${state.words.length})</button>
          <button class="vs-seg ${fc.scope==='due'?'active':''}" onclick="VocabStudio.fcScope('due')">⏰ SRS (${getStats().due})</button>
          <button class="vs-seg ${fc.scope==='review'?'active':''}" onclick="VocabStudio.fcScope('review')">⭐ Ôn (${getStats().review})</button>
          <button class="vs-seg ${fc.scope==='unmastered'?'active':''}" onclick="VocabStudio.fcScope('unmastered')">○ Mới</button>
        </div>
        <button class="ex-btn vs-compact-btn" onclick="VocabStudio.fcShuffle()" title="Xáo trộn lại">🔀 Xáo</button>
      </div>
    `;

    if (fc.deck.length === 0) {
      return scopeBar + `<div class="vs-empty">🎉 Tuyệt vời! Không còn từ nào cần ôn trong mục này. Hãy chọn <strong>Tất cả</strong> để ôn lại thêm!</div>`;
    }

    if (fc.idx >= fc.deck.length) {
      return scopeBar + `
        <div class="vs-done-box">
          <div style="font-size:3rem">🎉</div>
          <h3>Hoàn thành phiên Flashcard SRS!</h3>
          <p>Bạn đã ôn xong <strong>${fc.done}</strong> thẻ. Lịch lặp lại ngắt quãng đã được lưu tự động.</p>
          <button class="ex-btn primary" onclick="VocabStudio.fcShuffle()">🔄 Học lại vòng mới</button>
        </div>
      `;
    }

    const w = fc.deck[fc.idx];
    const p = getWordProgress(w.id);

    return scopeBar + `
      <div class="vs-fc-wrap">
        <div class="vs-fc-meta">
          <span>Thẻ <strong>${fc.idx + 1} / ${fc.deck.length}</strong></span>
          <span class="vs-kbd-hint">Phím tắt: <code>Space</code> lật · <code>1–4</code> SRS · <code>R</code> nghe</span>
        </div>
        <div class="vs-fc-scene" onclick="VocabStudio.fcFlip()">
          <div class="vs-fc-card ${fc.flipped ? 'flipped' : ''}">
            <div class="vs-fc-face vs-fc-front">
              <div class="vs-fc-badges">
                <span class="vs-cefr ${cefrClass(w.cefr)}">${esc(w.cefr)}</span>
                <span class="vs-pos-badge">${esc(w.pos)}</span>
                ${p.review ? '<span class="vs-stat-pill amber">⭐ Cần ôn</span>' : ''}
              </div>
              <div class="vs-fc-word">${esc(w.word)}</div>
              <div class="vs-fc-ipa">${esc(w.ipa)}</div>
              <div class="vs-fc-audio" onclick="event.stopPropagation()">
                <button class="vs-audio-btn" onclick="VocabStudio.speak('${escJs(w.word)}','en-US')">🔊 US</button>
                <button class="vs-audio-btn" onclick="VocabStudio.speak('${escJs(w.word)}','en-GB')">🔊 UK</button>
              </div>
              <div class="vs-fc-hint">👆 Chạm vào thẻ để lật xem nghĩa</div>
            </div>
            <div class="vs-fc-face vs-fc-back">
              <div class="vs-fc-back-word">${esc(w.word)} <span class="vs-ipa">${esc(w.ipa)}</span></div>
              <div class="vs-fc-meaning">${typeof inline === 'function' ? inline(w.meaning) : esc(w.meaningPlain)}</div>
              <div class="vs-fc-example">
                <div style="font-size:.78rem;font-weight:700;color:var(--gray-500);margin-bottom:4px">VÍ DỤ / COLLOCATION:</div>
                <div>${typeof inline === 'function' ? inline(w.example) : esc(w.example)}</div>
              </div>
              <div class="vs-fc-audio" onclick="event.stopPropagation()">
                ${w.examplePlain ? `<button class="vs-audio-btn" onclick="VocabStudio.speak('${escJs(w.examplePlain)}')">🔈 Nghe ví dụ</button>` : ''}
              </div>
            </div>
          </div>
        </div>

        ${fc.flipped ? `
          <div class="vs-srs-bar">
            <div class="vs-srs-prompt">Bạn nhớ từ này ở mức nào? (Chuẩn Ebbinghaus SRS)</div>
            <div class="vs-srs-btns">
              <button class="vs-srs-btn q1" onclick="VocabStudio.fcRate(1)"><strong>1. Quên</strong><span>${formatIntervalMins(computeNextSrs(p, 1).intervalMins)}</span></button>
              <button class="vs-srs-btn q2" onclick="VocabStudio.fcRate(2)"><strong>2. Khó</strong><span>${formatIntervalMins(computeNextSrs(p, 2).intervalMins)}</span></button>
              <button class="vs-srs-btn q3" onclick="VocabStudio.fcRate(3)"><strong>3. Tốt</strong><span>${formatIntervalMins(computeNextSrs(p, 3).intervalMins)}</span></button>
              <button class="vs-srs-btn q4" onclick="VocabStudio.fcRate(4)"><strong>4. Dễ</strong><span>${formatIntervalMins(computeNextSrs(p, 4).intervalMins)}</span></button>
            </div>
          </div>
        ` : `
          <div class="vs-fc-nav">
            <button class="ex-btn" onclick="VocabStudio.fcMove(-1)" ${fc.idx === 0 ? 'disabled' : ''}>← Trước</button>
            <button class="ex-btn primary" onclick="VocabStudio.fcFlip()">🔄 Lật thẻ xem đáp án</button>
            <button class="ex-btn" onclick="VocabStudio.fcMove(1)">Bỏ qua →</button>
          </div>
        `}
      </div>
    `;
  }

  // ===== 3. QUICK QUIZ =====
  function initQuiz(dir) {
    state.quiz.dir = dir || state.quiz.dir || 'en-vi';
    state.quiz.deck = shuffle(state.words);
    state.quiz.idx = 0;
    state.quiz.score = 0;
    state.quiz.total = state.quiz.deck.length;
    buildQuizOptions();
  }
  function buildQuizOptions() {
    const q = state.quiz;
    q.answered = false;
    q.chosen = -1;
    if (q.idx >= q.deck.length) return;
    const correctWord = q.deck[q.idx];
    const distractors = shuffle(state.words.filter(w => w.id !== correctWord.id)).slice(0, 3);
    q.options = shuffle([correctWord, ...distractors]);
  }

  function renderQuizView() {
    const q = state.quiz;
    const subbar = `
      <div class="vs-subbar">
        <div class="vs-seg-group">
          <button class="vs-seg ${q.dir==='en-vi'?'active':''}" onclick="VocabStudio.quizDir('en-vi')">🇬🇧 Anh → 🇻🇳 Việt</button>
          <button class="vs-seg ${q.dir==='vi-en'?'active':''}" onclick="VocabStudio.quizDir('vi-en')">🇻🇳 Việt → 🇬🇧 Anh</button>
        </div>
        <div class="vs-quiz-score">📊 Điểm: <strong>${q.score}/${q.idx + (q.answered ? 1 : 0)}</strong> · Câu ${Math.min(q.idx + 1, q.total)}/${q.total}</div>
        <button class="ex-btn" onclick="VocabStudio.quizRestart()">🔄 Làm lại</button>
      </div>
    `;

    if (q.total === 0) return subbar + `<div class="vs-empty">Không có từ vựng để kiểm tra.</div>`;
    if (q.idx >= q.total) {
      const pct = Math.round((q.score / q.total) * 100);
      return subbar + `
        <div class="vs-done-box">
          <div style="font-size:3rem">${pct >= 80 ? '🏆' : '👏'}</div>
          <h3>Hoàn thành bài Trắc nghiệm!</h3>
          <p>Bạn trả lời đúng <strong>${q.score} / ${q.total}</strong> câu (<strong>${pct}%</strong>).</p>
          <button class="ex-btn primary" onclick="VocabStudio.quizRestart()">🔄 Chơi lại</button>
        </div>
      `;
    }

    const cur = q.deck[q.idx];
    const isEnVi = q.dir === 'en-vi';

    return subbar + `
      <div class="vs-quiz-box">
        <div class="vs-quiz-prompt">
          <div class="vs-quiz-badges">
            <span class="vs-cefr ${cefrClass(cur.cefr)}">${esc(cur.cefr)}</span>
            <span class="vs-pos-badge">${esc(cur.pos)}</span>
          </div>
          ${isEnVi ? `
            <div class="vs-quiz-main">${esc(cur.word)}</div>
            <div class="vs-quiz-sub">${esc(cur.ipa)} <button class="vs-icon-btn" onclick="VocabStudio.speak('${escJs(cur.word)}')">🔊</button></div>
          ` : `
            <div class="vs-quiz-main vi">${esc(cur.meaningPlain)}</div>
            <div class="vs-quiz-sub">Chọn từ tiếng Anh đúng nghĩa trên:</div>
          `}
        </div>

        <div class="vs-quiz-opts">
          ${q.options.map((opt, idx) => {
            let cls = '';
            if (q.answered) {
              if (opt.id === cur.id) cls = 'correct';
              else if (idx === q.chosen) cls = 'wrong';
            }
            const label = isEnVi ? opt.meaningPlain : `${opt.word} ${opt.ipa ? `(${opt.ipa})` : ''}`;
            return `<button class="vs-quiz-opt ${cls}" onclick="VocabStudio.quizPick(${idx})" ${q.answered ? 'disabled' : ''}>
              <span class="vs-opt-key">${idx + 1}</span>
              <span class="vs-opt-txt">${esc(label)}</span>
            </button>`;
          }).join('')}
        </div>

        ${q.answered ? `
          <div class="vs-quiz-fb">
            <div><strong>Ví dụ:</strong> ${typeof inline === 'function' ? inline(cur.example) : esc(cur.example)}</div>
            <button class="ex-btn primary" onclick="VocabStudio.quizNext()">Câu tiếp theo →</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ===== 4. TYPING & DICTATION =====
  function initTyping(submode) {
    state.typing.submode = submode || state.typing.submode || 'meaning';
    state.typing.deck = shuffle(state.words);
    state.typing.idx = 0;
    state.typing.answered = false;
    state.typing.correct = false;
    state.typing.userInput = '';
    state.typing.hintLevel = 0;
    state.typing.score = 0;
    state.typing.total = state.typing.deck.length;
    if (state.typing.submode === 'dictation' && state.typing.deck[0]) {
      setTimeout(() => speakText(state.typing.deck[0].word), 180);
    }
  }

  // Character-level LCS diff so user immediately sees wrong / extra / missing letters
  function renderSpellingDiff(typedRaw, expectedRaw) {
    const a = typedRaw.trim();
    const b = expectedRaw.trim();
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i][j] = al[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    let userHtml = '', expHtml = '';
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (al[i] === bl[j]) {
        userHtml += `<span class="vs-ch-ok">${esc(a[i])}</span>`;
        expHtml += `<span class="vs-ch-ok">${esc(b[j])}</span>`;
        i++; j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        userHtml += `<span class="vs-ch-err">${esc(a[i])}</span>`;
        i++;
      } else {
        expHtml += `<span class="vs-ch-miss">${esc(b[j])}</span>`;
        j++;
      }
    }
    while (i < m) { userHtml += `<span class="vs-ch-err">${esc(a[i])}</span>`; i++; }
    while (j < n) { expHtml += `<span class="vs-ch-miss">${esc(b[j])}</span>`; j++; }

    return `<div class="vs-diff-box">
      <div class="vs-diff-row"><span class="vs-diff-lbl">Bạn nhập:</span><span class="vs-diff-word">${userHtml}</span></div>
      <div class="vs-diff-row"><span class="vs-diff-lbl">Đáp án:</span><span class="vs-diff-word">${expHtml}</span></div>
    </div>`;
  }

  function makeHint(word, level) {
    if (level <= 0) return '';
    return word.split(' ').map(part => {
      if (part.length <= 2) return part[0] + '_'.repeat(Math.max(0, part.length - 1));
      const show = Math.min(part.length - 1, level);
      return part.slice(0, show) + '_'.repeat(part.length - show);
    }).join('  ');
  }

  function renderTypingView() {
    const t = state.typing;
    const subbar = `
      <div class="vs-subbar">
        <div class="vs-seg-group">
          <button class="vs-seg ${t.submode==='meaning'?'active':''}" onclick="VocabStudio.typingMode('meaning')">⌨️ Điền từ (nhìn nghĩa)</button>
          <button class="vs-seg ${t.submode==='dictation'?'active':''}" onclick="VocabStudio.typingMode('dictation')">🎧 Nghe viết (Dictation)</button>
        </div>
        <div class="vs-quiz-score">📊 Đúng: <strong>${t.score}/${t.idx + (t.answered ? 1 : 0)}</strong> · Câu ${Math.min(t.idx + 1, t.total)}/${t.total}</div>
        <button class="ex-btn" onclick="VocabStudio.typingRestart()">🔄 Làm lại</button>
      </div>
    `;

    if (t.total === 0) return subbar + `<div class="vs-empty">Không có từ vựng để luyện tập.</div>`;
    if (t.idx >= t.total) {
      const pct = Math.round((t.score / t.total) * 100);
      return subbar + `
        <div class="vs-done-box">
          <div style="font-size:3rem">${pct >= 80 ? '🌟' : '💪'}</div>
          <h3>Hoàn thành luyện ${t.submode === 'dictation' ? 'Nghe viết' : 'Điền từ'}!</h3>
          <p>Bạn gõ chính xác <strong>${t.score} / ${t.total}</strong> từ (<strong>${pct}%</strong>).</p>
          <button class="ex-btn primary" onclick="VocabStudio.typingRestart()">🔄 Luyện lại</button>
        </div>
      `;
    }

    const cur = t.deck[t.idx];
    const hintStr = makeHint(cur.word, t.hintLevel);

    return subbar + `
      <div class="vs-quiz-box">
        <div class="vs-quiz-prompt">
          <div class="vs-quiz-badges">
            <span class="vs-cefr ${cefrClass(cur.cefr)}">${esc(cur.cefr)}</span>
            <span class="vs-pos-badge">${esc(cur.pos)}</span>
          </div>
          ${t.submode === 'dictation' ? `
            <div class="vs-dict-audio">
              <button class="vs-big-audio" onclick="VocabStudio.speak('${escJs(cur.word)}')">🔊 Nghe từ (${state.settings.accent === 'en-GB' ? 'UK' : 'US'})</button>
              <button class="ex-btn" onclick="VocabStudio.speakSlowOnce('${escJs(cur.word)}')">🐢 Nghe chậm</button>
            </div>
            <div class="vs-quiz-sub">Nghe phát âm và gõ lại đúng chính tả tiếng Anh (${cur.word.split(' ').length} từ)</div>
          ` : `
            <div class="vs-quiz-main vi">${esc(cur.meaningPlain)}</div>
            <div class="vs-quiz-sub">Gõ từ/cụm từ tiếng Anh tương ứng (${cur.word.split(' ').length} từ) · <button class="vs-link-btn" onclick="VocabStudio.speak('${escJs(cur.word)}')">🔊 Nghe gợi ý</button></div>
          `}
          ${hintStr ? `<div class="vs-hint-chip">💡 Gợi ý: <code>${esc(hintStr)}</code></div>` : ''}
        </div>

        <div class="vs-type-row">
          <input id="vs-type-input" type="text" class="ex-input ${t.answered ? (t.correct ? 'vs-inp-ok' : 'vs-inp-bad') : ''}" style="max-width:100%"
                 value="${esc(t.userInput || '')}"
                 placeholder="Gõ từ tiếng Anh..."
                 enterkeyhint="${t.answered ? 'next' : 'done'}"
                 autocomplete="off" spellcheck="false"
                 ${t.answered ? 'readonly' : ''}
                 oninput="VocabStudio.typingInput(this.value)">
          ${!t.answered ? `
            <button class="ex-btn" onclick="VocabStudio.typingHint()">💡 Gợi ý</button>
            <button class="ex-btn primary" onclick="VocabStudio.typingCheck()">Kiểm tra</button>
          ` : `
            <button class="ex-btn primary" onclick="VocabStudio.typingNext()">Từ tiếp theo →</button>
          `}
        </div>
        <div class="vs-kbd-hint" style="margin-top:8px;font-size:.78rem;color:var(--gray-500)">
          Phím tắt: <code>Enter</code> kiểm tra / từ tiếp theo · <code>Tab</code> nghe phát âm · <code>Shift+Tab</code> nghe chậm · <code>Alt+H</code> gợi ý
        </div>

        ${t.answered ? `
          <div class="vs-type-fb ${t.correct ? 'ok' : 'bad'}">
            <div style="font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>${t.correct ? '✅ Chính xác!' : '❌ Chưa chính xác.'}</span>
              <span>Đáp án: <strong>${esc(cur.word)}</strong> <span class="vs-ipa">${esc(cur.ipa)}</span></span>
              <button class="vs-icon-btn" onclick="VocabStudio.speak('${escJs(cur.word)}')">🔊</button>
            </div>
            ${!t.correct ? renderSpellingDiff(t.userInput || '', cur.word) : ''}
            <div><strong>Nghĩa:</strong> ${esc(cur.meaningPlain)}</div>
            <div style="margin-top:4px;font-size:.86rem;color:var(--gray-600)"><strong>Ví dụ:</strong> ${typeof inline === 'function' ? inline(cur.example) : esc(cur.example)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ===== 5. MATCH GAME =====
  function stopGameTimer() {
    if (state.game.timerId) {
      clearInterval(state.game.timerId);
      state.game.timerId = null;
    }
  }
  function startGameTimer() {
    stopGameTimer();
    state.game.timerId = setInterval(() => {
      state.game.elapsed = ((Date.now() - state.game.startTime) / 1000).toFixed(1);
      const el = document.getElementById('vs-game-timer');
      if (el) el.textContent = `${state.game.elapsed}s`;
    }, 100);
  }
  function initGame() {
    stopGameTimer();
    const chosen = shuffle(state.words).slice(0, Math.min(6, state.words.length));
    state.game = {
      round: (state.game.round || 0) + 1,
      left: shuffle(chosen.map(w => ({ id: w.id, text: w.word, sub: w.ipa }))),
      right: shuffle(chosen.map(w => ({ id: w.id, text: w.meaningPlain, sub: w.pos }))),
      leftSel: null,
      rightSel: null,
      matched: new Set(),
      wrongPair: null,
      mistakes: 0,
      combo: 0,
      bestCombo: 0,
      startTime: Date.now(),
      timerId: null,
      elapsed: '0.0',
      finished: false
    };
  }

  function renderGameView() {
    const g = state.game;
    const bestKey = `eg_match_best_${state.unitKey}`;
    const best = localStorage.getItem(bestKey);

    const subbar = `
      <div class="vs-subbar">
        <div class="vs-game-stats">
          <span>⏱ <strong id="vs-game-timer">${g.elapsed}s</strong></span>
          <span>🔥 Combo: <strong>${g.combo}</strong></span>
          <span>❌ Nhầm: <strong>${g.mistakes}</strong></span>
          ${best ? `<span>🏆 Kỷ lục: <strong>${best}s</strong></span>` : ''}
        </div>
        <button class="ex-btn primary" onclick="VocabStudio.gameNew()">🎲 Vòng mới (6 cặp)</button>
      </div>
    `;

    if (g.finished) {
      return subbar + `
        <div class="vs-done-box">
          <div style="font-size:3rem">🏆</div>
          <h3>Xuất sắc! Hoàn thành trong ${g.elapsed} giây!</h3>
          <p>Combo cao nhất: <strong>${g.bestCombo}</strong> · Số lần nhầm: <strong>${g.mistakes}</strong>${best ? ` · Kỷ lục unit: <strong>${best}s</strong>` : ''}</p>
          <button class="ex-btn primary" onclick="VocabStudio.gameNew()">🎮 Chơi vòng tiếp theo</button>
        </div>
      `;
    }

    return subbar + `
      <p style="font-size:.86rem;color:var(--gray-500);margin-bottom:12px">Chọn 1 từ tiếng Anh ở cột trái rồi ghép với nghĩa tiếng Việt tương ứng ở cột phải!</p>
      <div class="vs-match-board">
        <div class="vs-match-col">
          ${g.left.map(item => {
            const isMatched = g.matched.has(item.id);
            const isSel = g.leftSel === item.id;
            const isWrong = g.wrongPair && g.wrongPair.l === item.id;
            return `<button class="vs-match-card ${isMatched ? 'matched' : ''} ${isSel ? 'selected' : ''} ${isWrong ? 'wrong' : ''}"
                            onclick="VocabStudio.gamePick('left','${escJs(item.id)}')" ${isMatched ? 'disabled' : ''}>
              <span class="vs-mc-main">${esc(item.text)}</span>
              <span class="vs-mc-sub">${esc(item.sub)}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="vs-match-col">
          ${g.right.map(item => {
            const isMatched = g.matched.has(item.id);
            const isSel = g.rightSel === item.id;
            const isWrong = g.wrongPair && g.wrongPair.r === item.id;
            return `<button class="vs-match-card vi ${isMatched ? 'matched' : ''} ${isSel ? 'selected' : ''} ${isWrong ? 'wrong' : ''}"
                            onclick="VocabStudio.gamePick('right','${escJs(item.id)}')" ${isMatched ? 'disabled' : ''}>
              <span class="vs-mc-main">${esc(item.text)}</span>
              <span class="vs-mc-sub">${esc(item.sub)}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ===== KEYBOARD SHORTCUTS =====
  document.addEventListener('keydown', e => {
    const root = document.getElementById('vocab-studio-root');
    if (!root) return;
    if (state.settingsOpen) {
      if (e.key === 'Escape') { state.settingsOpen = false; render(); }
      return;
    }

    const isSearchInput = e.target && (e.target.id === 'search-input' || e.target.id === 'vs-search-input');
    if (isSearchInput) return;

    // Typing / Dictation shortcuts work seamlessly even while focused inside #vs-type-input
    if (state.mode === 'typing' && state.typing.idx < state.typing.total) {
      const cur = state.typing.deck[state.typing.idx];
      if (e.key === 'Enter') {
        e.preventDefault();
        if (state.typing.answered) window.VocabStudio.typingNext();
        else window.VocabStudio.typingCheck();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (cur) {
          if (e.shiftKey) window.VocabStudio.speakSlowOnce(cur.word);
          else speakText(cur.word);
        }
        return;
      }
      if (!state.typing.answered && e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        window.VocabStudio.typingHint();
        return;
      }
      if (state.typing.answered && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (cur) speakText(cur.word);
        return;
      }
    }

    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;

    if (state.mode === 'flashcard' && state.fc.idx < state.fc.deck.length) {
      const cur = state.fc.deck[state.fc.idx];
      if (e.code === 'Space') { e.preventDefault(); window.VocabStudio.fcFlip(); }
      else if (e.key === 'r' || e.key === 'R' || e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) window.VocabStudio.speakSlowOnce(cur.word);
        else speakText(cur.word);
      } else if (state.fc.flipped && ['1', '2', '3', '4'].includes(e.key)) {
        window.VocabStudio.fcRate(parseInt(e.key));
      }
    } else if (state.mode === 'quiz' && state.quiz.idx < state.quiz.total) {
      const cur = state.quiz.deck[state.quiz.idx];
      if (e.key === 'r' || e.key === 'R' || e.key === 'Tab') {
        e.preventDefault();
        if (cur) speakText(cur.word);
      } else if (!state.quiz.answered && ['1', '2', '3', '4'].includes(e.key)) {
        window.VocabStudio.quizPick(parseInt(e.key) - 1);
      } else if (state.quiz.answered && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        window.VocabStudio.quizNext();
      }
    }
  });

  // ===== PUBLIC API =====
  window.VocabStudio = {
    toggleSettings() { state.settingsOpen = !state.settingsOpen; render(); },
    closeSettings() { state.settingsOpen = false; render(); },
    updateSetting(key, val, markCustom) {
      if (typeof val === 'number' && (isNaN(val) || val <= 0)) return;
      state.settings[key] = val;
      if (markCustom) state.settings.srsPreset = 'custom';
      saveSettings(state.settings);
      render();
    },
    applySrsPreset(presetKey) {
      const preset = SRS_PRESETS[presetKey];
      if (!preset) return;
      state.settings = Object.assign({}, state.settings, preset, { srsPreset: presetKey });
      saveSettings(state.settings);
      render();
    },
    resetSettings() {
      state.settings = defaultSettings();
      saveSettings(state.settings);
      render();
    },
    resetUnitProgress() {
      if (typeof confirm === 'function' && !confirm('Xóa toàn bộ tiến độ từ vựng (Đã thuộc, Cần ôn, SRS) của unit này?')) return;
      const store = loadStore();
      state.words.forEach(w => { delete store[w.id]; });
      saveStore(store);
      state.settingsOpen = false;
      render();
    },
    quickFilterStatus(status) {
      if (state.mode === 'list' && state.filterStatus === status) {
        state.filterStatus = 'all';
      } else {
        state.mode = 'list';
        state.filterStatus = status;
      }
      render();
    },
    speak(text, accentOverride) { speakText(text, accentOverride); },
    speakSlowOnce(text) { speakText(text, null, 0.72); },
    setMode(m) {
      state.mode = m;
      if (m === 'flashcard') initFlashcards(state.fc.scope);
      else if (m === 'quiz') initQuiz(state.quiz.dir);
      else if (m === 'typing') initTyping(state.typing.submode);
      else if (m === 'game') initGame();
      render();
    },
    setView(v) { state.view = v; render(); },
    setHideMode(h) { state.hideMode = h; render(); },
    setSearch(val) {
      state.search = val;
      render();
      const inp = document.getElementById('vs-search-input');
      if (inp) { inp.focus(); inp.setSelectionRange(val.length, val.length); }
    },
    setFilter(key, val) { state[key] = val; render(); },
    toggleFlag(id, flag) {
      const p = getWordProgress(id);
      const maxDay = Math.min(state.settings.maxIntervalDays || 21, Math.max(3, state.settings.easyDays || 3));
      if (flag === 'mastered') {
        const next = !p.mastered;
        updateWordProgress(id, {
          mastered: next,
          review: next ? false : p.review,
          reps: next ? Math.max(2, p.reps) : 0,
          intervalMins: next ? maxDay * 1440 : 0,
          dueAt: next ? Date.now() + maxDay * 86400000 : Date.now()
        });
      } else if (flag === 'review') {
        const next = !p.review;
        updateWordProgress(id, {
          review: next,
          mastered: next ? false : p.mastered,
          dueAt: next ? Date.now() : p.dueAt
        });
      }
      render();
    },

    // Flashcard actions
    fcScope(scope) { initFlashcards(scope); render(); },
    fcShuffle() { initFlashcards(state.fc.scope); render(); },
    fcFlip() {
      state.fc.flipped = !state.fc.flipped;
      if (state.fc.flipped && state.settings.autoSpeak && state.fc.deck[state.fc.idx]) {
        speakText(state.fc.deck[state.fc.idx].word);
      }
      render();
    },
    fcMove(delta) {
      const next = state.fc.idx + delta;
      if (next >= 0 && next < state.fc.deck.length) {
        state.fc.idx = next;
        state.fc.flipped = false;
        render();
      }
    },
    fcRate(q) {
      const cur = state.fc.deck[state.fc.idx];
      if (!cur) return;
      applySrs(cur.id, q);
      state.fc.done++;
      if (q === 1) {
        // Re-queue forgotten card 2 steps later in same session
        const insertAt = Math.min(state.fc.deck.length, state.fc.idx + 3);
        state.fc.deck.splice(insertAt, 0, cur);
      }
      state.fc.idx++;
      state.fc.flipped = false;
      render();
    },

    // Quiz actions
    quizDir(d) { initQuiz(d); render(); },
    quizRestart() { initQuiz(state.quiz.dir); render(); },
    quizPick(optIdx) {
      const q = state.quiz;
      if (q.answered) return;
      const cur = q.deck[q.idx];
      const picked = q.options[optIdx];
      q.answered = true;
      q.chosen = optIdx;
      const isRight = picked && picked.id === cur.id;
      if (isRight) {
        q.score++;
        applySrs(cur.id, 3);
      } else {
        applySrs(cur.id, 1);
      }
      if (state.settings.autoSpeak) speakText(cur.word);
      render();
    },
    quizNext() {
      state.quiz.idx++;
      buildQuizOptions();
      render();
    },

    // Typing / Dictation actions
    typingMode(sm) { initTyping(sm); render(); },
    typingRestart() { initTyping(state.typing.submode); render(); },
    typingInput(val) { state.typing.userInput = val; },
    typingHint() {
      const inp = document.getElementById('vs-type-input');
      if (inp) state.typing.userInput = inp.value;
      state.typing.hintLevel++;
      render();
    },
    typingCheck() {
      const inp = document.getElementById('vs-type-input');
      if (!inp) return;
      const rawVal = inp.value;
      const val = rawVal.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!val) { inp.focus(); return; }
      state.typing.userInput = rawVal.trim();
      const cur = state.typing.deck[state.typing.idx];
      const expected = cur.word.trim().toLowerCase().replace(/\s+/g, ' ');
      // Accept with or without "something/sth" normalization
      const ok = val === expected || val.replace(/\bsth\b/g, 'something') === expected.replace(/\bsth\b/g, 'something');
      state.typing.answered = true;
      state.typing.correct = ok;
      if (ok) {
        state.typing.score++;
        applySrs(cur.id, state.typing.hintLevel === 0 ? 4 : 3);
      } else {
        applySrs(cur.id, 1);
      }
      if (state.settings.autoSpeak) speakText(cur.word);
      render();
    },
    typingNext() {
      state.typing.idx++;
      state.typing.answered = false;
      state.typing.correct = false;
      state.typing.userInput = '';
      state.typing.hintLevel = 0;
      render();
      if (state.typing.submode === 'dictation' && state.typing.deck[state.typing.idx]) {
        setTimeout(() => speakText(state.typing.deck[state.typing.idx].word), 180);
      }
    },

    // Match game actions
    gameNew() { initGame(); render(); },
    gamePick(side, id) {
      const g = state.game;
      if (g.matched.has(id) || g.finished) return;
      g.wrongPair = null;

      if (side === 'left') {
        g.leftSel = (g.leftSel === id) ? null : id;
        const w = state.words.find(x => x.id === id);
        if (g.leftSel && w) speakText(w.word);
      } else {
        g.rightSel = (g.rightSel === id) ? null : id;
      }

      if (g.leftSel && g.rightSel) {
        if (g.leftSel === g.rightSel) {
          g.matched.add(g.leftSel);
          g.combo++;
          g.bestCombo = Math.max(g.bestCombo, g.combo);
          applySrs(g.leftSel, 3);
          g.leftSel = null;
          g.rightSel = null;
          if (g.matched.size === g.left.length) {
            stopGameTimer();
            g.elapsed = ((Date.now() - g.startTime) / 1000).toFixed(1);
            g.finished = true;
            const bestKey = `eg_match_best_${state.unitKey}`;
            const prev = parseFloat(localStorage.getItem(bestKey) || '99999');
            if (parseFloat(g.elapsed) < prev) {
              localStorage.setItem(bestKey, g.elapsed);
            }
          }
        } else {
          g.mistakes++;
          g.combo = 0;
          g.wrongPair = { l: g.leftSel, r: g.rightSel };
          g.leftSel = null;
          g.rightSel = null;
          render();
          setTimeout(() => {
            if (state.game.wrongPair) {
              state.game.wrongPair = null;
              render();
            }
          }, 550);
          return;
        }
      }
      render();
    }
  };

  // Entry point called from index.html
  window.renderVocabStudio = function (md, unitKey, containerEl) {
    stopGameTimer();
    const parsed = parseVocabMd(md, unitKey);
    if (!parsed.words.length && typeof window.renderMarkdown === 'function') {
      containerEl.innerHTML = window.renderMarkdown(md);
      return;
    }
    state.unitKey = unitKey;
    state.title = parsed.title;
    state.intro = parsed.intro;
    state.words = parsed.words;
    state.notesMd = parsed.notesMd;
    state.mode = 'list';
    state.search = '';
    state.filterCefr = 'all';
    state.filterPos = 'all';
    state.filterStatus = 'all';
    state.hideMode = 'none';

    containerEl.innerHTML = `<div id="vocab-studio-root"></div>`;
    render();
  };
})();

