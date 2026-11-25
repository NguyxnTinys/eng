// ===== VISUAL SVG / INTERACTIVE DIAGRAMS FOR THEORY =====
// Replaces ASCII art code blocks in theory.md with clear, Grammar-in-Use style graphics.

(function () {
  // Shared SVG arrow markers
  function svgDefs(idPrefix) {
    return `<defs>
      <marker id="${idPrefix}-arr-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8"/>
      </marker>
      <marker id="${idPrefix}-arr-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#4f46e5"/>
      </marker>
      <marker id="${idPrefix}-arr-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669"/>
      </marker>
      <marker id="${idPrefix}-arr-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706"/>
      </marker>
      <marker id="${idPrefix}-arr-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#e11d48"/>
      </marker>
    </defs>`;
  }

  // Helper: standard timeline base (Past | NOW | Future)
  function timelineBase(id, nowX, yAxis) {
    return `
      <!-- Background zones -->
      <rect x="20" y="34" width="${nowX - 20}" height="${yAxis - 10}" rx="8" fill="#f8fafc"/>
      <rect x="${nowX}" y="34" width="${740 - nowX}" height="${yAxis - 10}" rx="8" fill="#faf5ff" opacity=".6"/>
      <!-- Zone labels -->
      <text x="${20 + (nowX - 20) / 2}" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="#64748b">QUÁ KHỨ (PAST)</text>
      <text x="${nowX + (740 - nowX) / 2}" y="22" text-anchor="middle" font-size="12" font-weight="700" fill="#7c3aed">TƯƠNG LAI (FUTURE)</text>
      <!-- Main horizontal axis -->
      <line x1="28" y1="${yAxis}" x2="730" y2="${yAxis}" stroke="#94a3b8" stroke-width="2.5" marker-end="url(#${id}-arr-gray)"/>
      <!-- NOW vertical dashed line & badge -->
      <line x1="${nowX}" y1="36" x2="${nowX}" y2="${yAxis + 32}" stroke="#4f46e5" stroke-width="2" stroke-dasharray="5,4"/>
      <rect x="${nowX - 44}" y="8" width="88" height="22" rx="11" fill="#4f46e5"/>
      <text x="${nowX}" y="23" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">HIỆN TẠI (NOW)</text>
    `;
  }

  const DIAGRAMS = {
    // 1. Present Simple
    '01_Tenses/01_Present_Simple:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 210" class="vd-svg" role="img" aria-label="Biểu đồ thì Hiện tại đơn">
          ${svgDefs('ps')}
          ${timelineBase('ps', 380, 118)}
          <!-- Continuous band for facts/general truths -->
          <rect x="52" y="103" width="656" height="30" rx="15" fill="#e0e7ff" stroke="#818cf8" stroke-width="1.5"/>
          <line x1="72" y1="118" x2="688" y2="118" stroke="#4f46e5" stroke-width="2.5" marker-start="url(#ps-arr-indigo)" marker-end="url(#ps-arr-indigo)"/>
          <!-- Repeated habit dots across Past -> Now -> Future -->
          ${[125, 220, 315, 380, 465, 560, 645].map((x, idx) => `
            <circle cx="${x}" cy="118" r="${idx === 3 ? 9 : 7}" fill="${idx === 3 ? '#4f46e5' : '#e11d48'}" stroke="#ffffff" stroke-width="2.5"/>
            <text x="${x}" y="152" text-anchor="middle" font-size="11" font-weight="600" fill="${idx === 3 ? '#4f46e5' : '#be123c'}">${['T2','T3','T4','Hôm nay','T6','T7','CN'][idx]}</text>
          `).join('')}
          <!-- Callout above -->
          <rect x="170" y="50" width="420" height="32" rx="8" fill="#ffffff" stroke="#c7d2fe" stroke-width="1.5"/>
          <text x="380" y="70" text-anchor="middle" font-size="12.5" font-weight="700" fill="#3730a3">🔁 Lặp lại đều đặn (Thói quen) &amp; Luôn luôn đúng (Chân lý)</text>
          <!-- Bottom summary -->
          <text x="380" y="186" text-anchor="middle" font-size="12" fill="#475569">Không chỉ đúng ở 1 khoảnh khắc — mà đúng xuyên suốt <tspan font-weight="700" fill="#1e293b">Quá khứ → Hiện tại → Tương lai</tspan></text>
        </svg>
        <div class="vd-examples">
          <div class="vd-ex"><span class="vd-pill rose">🔁 Thói quen</span> <span>She <strong>drinks</strong> coffee every morning. <em>(Ngày nào cô ấy cũng uống)</em></span></div>
          <div class="vd-ex"><span class="vd-pill indigo">🌍 Chân lý</span> <span>The Earth <strong>orbits</strong> the Sun. <em>(Luôn đúng mọi thời điểm)</em></span></div>
        </div>
      </div>`,

    // 2. Present Perfect
    '01_Tenses/03_Present_Perfect:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 250" class="vd-svg" role="img" aria-label="Biểu đồ thì Hiện tại hoàn thành">
          ${svgDefs('pp')}
          <!-- Zones -->
          <rect x="20" y="36" width="520" height="196" rx="8" fill="#f8fafc"/>
          <rect x="540" y="36" width="200" height="196" rx="8" fill="#faf5ff" opacity=".6"/>
          <text x="270" y="24" text-anchor="middle" font-size="12" font-weight="700" fill="#64748b">QUÁ KHỨ (PAST)</text>
          <text x="645" y="24" text-anchor="middle" font-size="12" font-weight="700" fill="#7c3aed">TƯƠNG LAI</text>
          <!-- NOW line -->
          <line x1="540" y1="36" x2="540" y2="232" stroke="#4f46e5" stroke-width="2.5" stroke-dasharray="5,4"/>
          <rect x="492" y="8" width="96" height="22" rx="11" fill="#4f46e5"/>
          <text x="540" y="23" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">HIỆN TẠI (NOW)</text>

          <!-- Case 1 -->
          <circle cx="150" cy="78" r="8" fill="#e11d48"/>
          <path d="M 162 78 L 526 78" stroke="#e11d48" stroke-width="3" stroke-dasharray="6,4" marker-end="url(#pp-arr-rose)"/>
          <circle cx="540" cy="78" r="8" fill="#4f46e5" stroke="#fff" stroke-width="2"/>
          <rect x="44" y="52" width="220" height="20" rx="5" fill="#ffe4e6"/>
          <text x="154" y="66" text-anchor="middle" font-size="11" font-weight="700" fill="#be123c">① Xảy ra trước (không rõ lúc nào)</text>
          <rect x="556" y="64" width="174" height="28" rx="6" fill="#eef2ff" stroke="#c7d2fe"/>
          <text x="643" y="82" text-anchor="middle" font-size="11.5" font-weight="700" fill="#3730a3">→ Còn kết quả ở hiện tại</text>

          <!-- Case 2 -->
          <circle cx="110" cy="142" r="8" fill="#059669"/>
          <line x1="118" y1="142" x2="526" y2="142" stroke="#059669" stroke-width="5" marker-end="url(#pp-arr-green)"/>
          <circle cx="540" cy="142" r="8" fill="#4f46e5" stroke="#fff" stroke-width="2"/>
          <rect x="44" y="116" width="220" height="20" rx="5" fill="#d1fae5"/>
          <text x="154" y="130" text-anchor="middle" font-size="11" font-weight="700" fill="#047857">② Bắt đầu từ quá khứ (for / since)</text>
          <rect x="556" y="128" width="174" height="28" rx="6" fill="#d1fae5" stroke="#6ee7b7"/>
          <text x="643" y="146" text-anchor="middle" font-size="11.5" font-weight="700" fill="#065f46">→ Vẫn tiếp tục đến NOW</text>

          <!-- Case 3 -->
          <rect x="70" y="196" width="470" height="16" rx="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
          <circle cx="170" cy="204" r="5" fill="#d97706"/>
          <circle cx="310" cy="204" r="5" fill="#d97706"/>
          <circle cx="430" cy="204" r="5" fill="#d97706"/>
          <circle cx="540" cy="204" r="8" fill="#4f46e5" stroke="#fff" stroke-width="2"/>
          <text x="305" y="189" text-anchor="middle" font-size="11.5" font-weight="700" fill="#b45309">③ Trải nghiệm từ bé đến giờ (ever / never / 3 times)</text>
          <rect x="556" y="190" width="174" height="28" rx="6" fill="#fef3c7" stroke="#fcd34d"/>
          <text x="643" y="208" text-anchor="middle" font-size="11.5" font-weight="700" fill="#92400e">→ Chưa khép lại đến NOW</text>
        </svg>
      </div>`,

    // 3. Present Perfect Continuous (Block 1: Timeline)
    '01_Tenses/04_Present_Perfect_Continuous:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 215" class="vd-svg" role="img" aria-label="Biểu đồ thì Hiện tại hoàn thành tiếp diễn">
          ${svgDefs('ppc')}
          ${timelineBase('ppc', 520, 108)}
          <!-- Duration bar -->
          <rect x="130" y="96" width="390" height="24" rx="12" fill="#d1fae5" stroke="#059669" stroke-width="2.5"/>
          <!-- Wavy / continuous stripes inside -->
          <line x1="145" y1="108" x2="505" y2="108" stroke="#059669" stroke-width="3" stroke-dasharray="10,6"/>
          <circle cx="130" cy="108" r="9" fill="#059669" stroke="#fff" stroke-width="2.5"/>
          <circle cx="520" cy="108" r="9" fill="#4f46e5" stroke="#fff" stroke-width="2.5"/>
          <!-- Continuation dashed arrow into future -->
          <line x1="532" y1="108" x2="615" y2="108" stroke="#059669" stroke-width="2.5" stroke-dasharray="4,4" marker-end="url(#ppc-arr-green)"/>
          <!-- Labels -->
          <text x="130" y="140" text-anchor="middle" font-size="11.5" font-weight="700" fill="#047857">Bắt đầu (started)</text>
          <text x="520" y="140" text-anchor="middle" font-size="11.5" font-weight="700" fill="#3730a3">Vẫn đang tiếp diễn</text>
          <text x="520" y="156" text-anchor="middle" font-size="10.5" fill="#64748b">hoặc vừa dừng &amp; còn dấu hiệu rõ</text>
          <!-- Bracket for duration -->
          <path d="M 130 166 L 130 176 L 520 176 L 520 166" fill="none" stroke="#059669" stroke-width="2"/>
          <rect x="195" y="164" width="260" height="24" rx="12" fill="#059669"/>
          <text x="325" y="180" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff">⏱ Nhấn mạnh QUÁ TRÌNH / ĐỘ DÀI (How long?)</text>
          <!-- Top caption -->
          <text x="325" y="78" text-anchor="middle" font-size="12.5" font-weight="700" fill="#065f46">have / has + been + V-ing</text>
        </svg>
      </div>`,

    // 4. Present Perfect Continuous (Block 2: Quick Summary Card)
    '01_Tenses/04_Present_Perfect_Continuous:1': () => `
      <div class="vd-summary-card">
        <div class="vd-summary-head">⚡ Tóm tắt nhanh: Present Perfect Continuous</div>
        <div class="vd-summary-formula">S + have / has + been + V-ing</div>
        <div class="vd-summary-grid">
          <div><strong>Trục thời gian:</strong> Quá khứ ═══▶ Hiện tại</div>
          <div><strong>Trọng tâm:</strong> Tính liên tục, thời lượng (duration), quá trình</div>
          <div><strong>Câu hỏi điển hình:</strong> <code>How long have/has + S + been + V-ing?</code></div>
          <div class="vd-warn-txt"><strong>Tuyệt đối tránh:</strong> KHÔNG dùng với Stative Verbs (<code>know, own, believe...</code>)</div>
        </div>
      </div>`,

    // 5. Past Simple (Block 1: Timeline)
    '01_Tenses/05_Past_Simple:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 200" class="vd-svg" role="img" aria-label="Biểu đồ thì Quá khứ đơn">
          ${svgDefs('past')}
          ${timelineBase('past', 460, 104)}
          <!-- Event dot completely in the past -->
          <circle cx="220" cy="104" r="12" fill="#e11d48" stroke="#ffffff" stroke-width="3"/>
          <!-- Separation barrier before NOW -->
          <line x1="355" y1="68" x2="355" y2="140" stroke="#e11d48" stroke-width="2" stroke-dasharray="3,3" opacity=".5"/>
          <rect x="315" y="48" width="80" height="20" rx="10" fill="#fee2e2"/>
          <text x="355" y="62" text-anchor="middle" font-size="10.5" font-weight="700" fill="#b91c1c">Đã kết thúc</text>
          <!-- Callout for event -->
          <rect x="85" y="130" width="270" height="50" rx="8" fill="#fff1f2" stroke="#fda4af" stroke-width="1.5"/>
          <text x="220" y="150" text-anchor="middle" font-size="12" font-weight="700" fill="#be123c">Hành động xảy ra &amp; chấm dứt hẳn</text>
          <text x="220" y="168" text-anchor="middle" font-size="11" fill="#64748b">yesterday · last week · in 2020 · 2 days ago</text>
        </svg>
        <div class="vd-examples">
          <div class="vd-ex"><span class="vd-pill rose">✓ Hoàn tất ở quá khứ</span> <span>I <strong>visited</strong> Hanoi in 2020. <em>(Xảy ra năm 2020 và đã xong hẳn, không nối về hiện tại)</em></span></div>
        </div>
      </div>`,

    // 6. Past Simple (Block 2: Quick Summary Table Card)
    '01_Tenses/05_Past_Simple:1': () => `
      <div class="vd-summary-card">
        <div class="vd-summary-head">⚡ Tóm tắt nhanh: Thì Quá khứ đơn (Past Simple)</div>
        <table class="vd-mini-table">
          <thead><tr><th>Thể</th><th>Động từ TO BE</th><th>Động từ THƯỜNG</th></tr></thead>
          <tbody>
            <tr><td><strong>Khẳng định (+)</strong></td><td><code>S + was / were + ...</code></td><td><code>S + V2 / V-ed</code></td></tr>
            <tr><td><strong>Phủ định (–)</strong></td><td><code>S + wasn't / weren't</code></td><td><code>S + didn't + V-inf</code></td></tr>
            <tr><td><strong>Nghi vấn (?)</strong></td><td><code>Was / Were + S + ...?</code></td><td><code>Did + S + V-inf?</code></td></tr>
          </tbody>
        </table>
      </div>`,

    // 7. Past Perfect
    '01_Tenses/07_Past_Perfect:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 215" class="vd-svg" role="img" aria-label="Biểu đồ thì Quá khứ hoàn thành">
          ${svgDefs('ppast')}
          ${timelineBase('ppast', 610, 108)}
          <!-- Event 1: Past Perfect -->
          <circle cx="170" cy="108" r="13" fill="#4f46e5" stroke="#fff" stroke-width="3"/>
          <text x="170" y="113" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">1</text>
          <!-- Arrow from Event 1 to Event 2 -->
          <line x1="186" y1="108" x2="394" y2="108" stroke="#4f46e5" stroke-width="3" marker-end="url(#ppast-arr-indigo)"/>
          <text x="290" y="96" text-anchor="middle" font-size="11" font-weight="700" fill="#4f46e5">xảy ra TRƯỚC</text>
          <!-- Event 2: Past Simple -->
          <circle cx="414" cy="108" r="13" fill="#d97706" stroke="#fff" stroke-width="3"/>
          <text x="414" y="113" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">2</text>
          <!-- Cards below -->
          <rect x="45" y="132" width="250" height="62" rx="8" fill="#eef2ff" stroke="#818cf8" stroke-width="1.5"/>
          <text x="170" y="152" text-anchor="middle" font-size="12" font-weight="700" fill="#3730a3">① Quá khứ hoàn thành (had + V3)</text>
          <text x="170" y="170" text-anchor="middle" font-size="11" fill="#475569">Hành động 1: Xong trước</text>
          <text x="170" y="186" text-anchor="middle" font-size="11" font-style="italic" fill="#4f46e5">The train had departed</text>

          <rect x="310" y="132" width="230" height="62" rx="8" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.5"/>
          <text x="425" y="152" text-anchor="middle" font-size="12" font-weight="700" fill="#b45309">② Quá khứ đơn (V2/ed)</text>
          <text x="425" y="170" text-anchor="middle" font-size="11" fill="#475569">Hành động 2 / Mốc quá khứ</text>
          <text x="425" y="186" text-anchor="middle" font-size="11" font-style="italic" fill="#b45309">when I arrived at the station.</text>
        </svg>
      </div>`,

    // 8. Past Perfect Continuous
    '01_Tenses/08_Past_Perfect_Continuous:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 215" class="vd-svg" role="img" aria-label="Biểu đồ thì Quá khứ hoàn thành tiếp diễn">
          ${svgDefs('ppastc')}
          ${timelineBase('ppastc', 610, 105)}
          <!-- Continuous process bar between past1 and past2 -->
          <rect x="110" y="93" width="320" height="24" rx="12" fill="#e0e7ff" stroke="#4f46e5" stroke-width="2.5"/>
          <line x1="125" y1="105" x2="415" y2="105" stroke="#4f46e5" stroke-width="3" stroke-dasharray="10,6"/>
          <circle cx="110" cy="105" r="9" fill="#4f46e5" stroke="#fff" stroke-width="2.5"/>
          <circle cx="430" cy="105" r="10" fill="#d97706" stroke="#fff" stroke-width="2.5"/>
          <!-- Labels -->
          <text x="110" y="138" text-anchor="middle" font-size="11.5" font-weight="700" fill="#3730a3">Quá khứ xa hơn</text>
          <text x="110" y="153" text-anchor="middle" font-size="10.5" fill="#64748b">Bắt đầu hành động</text>
          <text x="430" y="138" text-anchor="middle" font-size="11.5" font-weight="700" fill="#b45309">Mốc quá khứ (Past Simple)</text>
          <text x="430" y="153" text-anchor="middle" font-size="10.5" fill="#64748b">Hành động xen vào / Kết quả lúc đó</text>
          <text x="270" y="76" text-anchor="middle" font-size="12.5" font-weight="700" fill="#3730a3">had been + V-ing</text>
          <!-- Bracket -->
          <path d="M 110 166 L 110 176 L 430 176 L 430 166" fill="none" stroke="#4f46e5" stroke-width="2"/>
          <rect x="145" y="164" width="250" height="24" rx="12" fill="#4f46e5"/>
          <text x="270" y="180" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">⏱ Quá trình &amp; Thời lượng (for / since / all day)</text>
        </svg>
      </div>`,

    // 9. Future Perfect
    '01_Tenses/11_Future_Perfect:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 215" class="vd-svg" role="img" aria-label="Biểu đồ thì Tương lai hoàn thành">
          ${svgDefs('fp')}
          ${timelineBase('fp', 210, 108)}
          <!-- Action finishes before future point -->
          <rect x="290" y="88" width="160" height="40" rx="10" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
          <text x="370" y="106" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">✓ Hành động X xong</text>
          <text x="370" y="121" text-anchor="middle" font-size="10.5" fill="#047857">will have + V3/ed</text>
          <!-- Future milestone -->
          <circle cx="585" cy="108" r="11" fill="#7c3aed" stroke="#fff" stroke-width="3"/>
          <!-- Curved look-back arrow -->
          <path d="M 580 92 Q 495 45 410 82" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-dasharray="5,3" marker-end="url(#fp-arr-indigo)"/>
          <rect x="405" y="42" width="235" height="22" rx="11" fill="#ede9fe"/>
          <text x="522" y="57" text-anchor="middle" font-size="11" font-weight="700" fill="#5b21b6">👀 Nhìn ngược từ mốc tương lai</text>
          <!-- Milestone label -->
          <rect x="465" y="134" width="240" height="46" rx="8" fill="#f5f3ff" stroke="#c4b5fd" stroke-width="1.5"/>
          <text x="585" y="153" text-anchor="middle" font-size="12" font-weight="700" fill="#5b21b6">Mốc tương lai (Deadline)</text>
          <text x="585" y="170" text-anchor="middle" font-size="11" fill="#64748b">By 5 p.m. · By the time you arrive</text>
        </svg>
      </div>`,

    // 10. Future Perfect Continuous
    '01_Tenses/12_Future_Perfect_Continuous:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 215" class="vd-svg" role="img" aria-label="Biểu đồ thì Tương lai hoàn thành tiếp diễn">
          ${svgDefs('fpc')}
          ${timelineBase('fpc', 290, 105)}
          <!-- Long continuous bar from Past through NOW up to Future milestone -->
          <rect x="105" y="93" width="465" height="24" rx="12" fill="#ede9fe" stroke="#7c3aed" stroke-width="2.5"/>
          <line x1="120" y1="105" x2="555" y2="105" stroke="#7c3aed" stroke-width="3" stroke-dasharray="10,6"/>
          <circle cx="105" cy="105" r="8" fill="#64748b" stroke="#fff" stroke-width="2"/>
          <circle cx="290" cy="105" r="8" fill="#4f46e5" stroke="#fff" stroke-width="2"/>
          <polygon points="570,93 582,105 570,117 558,105" fill="#7c3aed" stroke="#fff" stroke-width="2"/>
          <text x="340" y="76" text-anchor="middle" font-size="12.5" font-weight="700" fill="#5b21b6">will have been + V-ing</text>
          <!-- Labels -->
          <text x="105" y="136" text-anchor="middle" font-size="11" font-weight="600" fill="#475569">Bắt đầu</text>
          <text x="570" y="136" text-anchor="middle" font-size="11.5" font-weight="700" fill="#5b21b6">Mốc tương lai</text>
          <text x="570" y="151" text-anchor="middle" font-size="10.5" fill="#64748b">by next June / by 5 p.m.</text>
          <!-- Bracket -->
          <path d="M 105 164 L 105 174 L 570 174 L 570 164" fill="none" stroke="#7c3aed" stroke-width="2"/>
          <rect x="175" y="162" width="325" height="24" rx="12" fill="#7c3aed"/>
          <text x="337" y="178" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">⏱ Kéo dài liên tục đến mốc tương lai (for 5 years)</text>
        </svg>
      </div>`,

    // 11. Countable vs Uncountable Nouns (Tree)
    '02_Nouns_Articles_Determiners/01_Countable_Uncountable_Plural_Nouns:0': () => `
      <div class="vd-tree">
        <div class="vd-tree-root">DANH TỪ (NOUNS)</div>
        <div class="vd-tree-branches">
          <div class="vd-branch blue">
            <div class="vd-branch-title">🔢 ĐẾM ĐƯỢC (Countable)</div>
            <ul>
              <li>Có hình thái <strong>Số ít &amp; Số nhiều</strong> (<code>book → books</code>)</li>
              <li>Đếm được bằng số: <code>1, 2, 3...</code></li>
              <li>Đi với: <code>a/an, many, few, a few</code></li>
            </ul>
          </div>
          <div class="vd-branch amber">
            <div class="vd-branch-title">💧 KHÔNG ĐẾM ĐƯỢC (Uncountable)</div>
            <ul>
              <li><strong>Không</strong> có số nhiều (không thêm <code>-s/-es</code>)</li>
              <li><strong>Không</strong> dùng trực tiếp với <code>a/an</code> hay số đếm</li>
              <li>Đi với: <code>much, little, a piece of...</code></li>
            </ul>
          </div>
        </div>
      </div>`,

    // 12. Modal Verbs Deduction Scale
    '04_Modal_Verbs/03_Deduction_Possibility_Present_Future:0': () => `
      <div class="vd-card" style="padding:16px 18px">
        <div class="vd-scale-title">🎯 Thang mức độ chắc chắn khi suy đoán</div>
        <div class="vd-scale">
          ${[
            { pct: '100%', w: 100, col: '#0f766e', mod: 'Hiện tại đơn', desc: 'Sự thật hiển nhiên (KHÔNG cần modal)' },
            { pct: '95%+', w: 95, col: '#059669', mod: 'must', desc: 'Chắc chắn là đúng (có bằng chứng rõ ràng)' },
            { pct: '75–85%', w: 80, col: '#2563eb', mod: 'should / ought to', desc: 'Theo lẽ thường / dự kiến sẽ đúng' },
            { pct: '50–70%', w: 62, col: '#4f46e5', mod: 'may / might well', desc: 'Rất có thể (mạnh hơn may/might thường)' },
            { pct: '30–50%', w: 42, col: '#d97706', mod: 'may / might / could', desc: 'Có thể (50/50 hoặc thấp hơn, chưa chắc)' },
            { pct: '<15%', w: 18, col: '#64748b', mod: 'may not / might not', desc: 'Có thể không phải' },
            { pct: '95%+ (–)', w: 95, col: '#dc2626', mod: "can't / couldn't", desc: 'Chắc chắn KHÔNG PHẢI (phi lý)' }
          ].map(r => `
            <div class="vd-scale-row">
              <div class="vd-scale-pct" style="color:${r.col}">${r.pct}</div>
              <div class="vd-scale-bar-wrap">
                <div class="vd-scale-bar" style="width:${r.w}%;background:${r.col}"></div>
              </div>
              <div class="vd-scale-info">
                <code style="color:${r.col};font-weight:700">${r.mod}</code>
                <span>${r.desc}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`,

    // 13. Verbs with Both V-ing & to-V (Tree)
    '05_Verb_Patterns_Gerunds_Infinitives/03_Verbs_With_Both_Meaning_Change:0': () => `
      <div class="vd-tree">
        <div class="vd-tree-root">ĐỘNG TỪ + [ V-ing / to-V ]</div>
        <div class="vd-tree-branches">
          <div class="vd-branch rose">
            <div class="vd-branch-title">⚠️ ĐỔI NGHĨA HOÀN TOÀN</div>
            <ul>
              <li><code>remember / forget / regret</code></li>
              <li><code>stop / try / mean / go on</code></li>
              <li><code>need / want / require</code> <em>(+ V-ing mang nghĩa bị động)</em></li>
            </ul>
          </div>
          <div class="vd-branch blue">
            <div class="vd-branch-title">🔄 ÍT ĐỔI NGHĨA / THEO TÂN NGỮ</div>
            <ul>
              <li><code>begin / start / continue</code></li>
              <li><code>like / love / hate</code> <em>(sắc thái nhẹ)</em></li>
              <li><code>allow / advise / recommend</code><br><em>(không O → V-ing; có O → O + to-V)</em></li>
            </ul>
          </div>
        </div>
      </div>`,

    // 14. Reported Questions Transform
    '08_Reported_Speech/02_Reported_Questions:0': () => `
      <div class="vd-card" style="padding:16px 18px">
        <div class="vd-transform">
          <div class="vd-tr-row">
            <span class="vd-tr-label">Câu trực tiếp:</span>
            <div class="vd-tokens">
              <span class="vd-tok purple"><em>Wh-</em>Where</span>
              <span class="vd-tok rose strike"><em>Trợ ĐT (bỏ)</em>do</span>
              <span class="vd-tok blue"><em>S</em>you</span>
              <span class="vd-tok green"><em>V</em>live?</span>
            </div>
          </div>
          <div class="vd-tr-arrow">↓ Bỏ trợ động từ <code>do</code> · Đổi đại từ · Lùi thì · Đưa về trật tự câu kể (S + V)</div>
          <div class="vd-tr-row">
            <span class="vd-tr-label">Câu tường thuật:</span>
            <div class="vd-tokens">
              <span class="vd-tok gray"><em>Mệnh đề dẫn</em>He asked me</span>
              <span class="vd-tok purple"><em>Wh-</em>where</span>
              <span class="vd-tok blue"><em>S</em>I</span>
              <span class="vd-tok green"><em>V (lùi thì)</em>lived.</span>
            </div>
          </div>
        </div>
      </div>`,

    // 15. Prepositions of Time Pyramid (AT / ON / IN)
    '10_Prepositions_and_Phrasal_Verbs/01_Prepositions_of_Time:0': () => `
      <div class="vd-card">
        <svg viewBox="0 0 760 270" class="vd-svg" role="img" aria-label="Kim tự tháp giới từ thời gian AT ON IN">
          <!-- Pyramid layers -->
          <!-- Top: AT -->
          <polygon points="155,20 100,98 210,98" fill="#ef4444" stroke="#ffffff" stroke-width="3"/>
          <text x="155" y="78" text-anchor="middle" font-size="18" font-weight="800" fill="#ffffff">AT</text>
          <!-- Middle: ON -->
          <polygon points="100,98 210,98 258,174 52,174" fill="#3b82f6" stroke="#ffffff" stroke-width="3"/>
          <text x="155" y="144" text-anchor="middle" font-size="20" font-weight="800" fill="#ffffff">ON</text>
          <!-- Bottom: IN -->
          <polygon points="52,174 258,174 302,250 8,250" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
          <text x="155" y="220" text-anchor="middle" font-size="22" font-weight="800" fill="#ffffff">IN</text>

          <!-- Connectors & Explanations -->
          <!-- AT -->
          <line x1="196" y1="62" x2="320" y2="62" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,3"/>
          <rect x="320" y="22" width="424" height="72" rx="10" fill="#fef2f2" stroke="#fecaca" stroke-width="1.5"/>
          <text x="336" y="44" font-size="13" font-weight="800" fill="#b91c1c">AT — Đỉnh nhọn = Điểm thời gian chính xác</text>
          <text x="336" y="64" font-size="11.5" fill="#475569">• Giờ giấc: <tspan font-weight="700" fill="#1e293b">at 8:30 a.m., at midnight, at noon</tspan></text>
          <text x="336" y="82" font-size="11.5" fill="#475569">• Khoảnh khắc / dịp lễ: <tspan font-weight="700" fill="#1e293b">at night, at Christmas, at present</tspan></text>

          <!-- ON -->
          <line x1="238" y1="136" x2="320" y2="136" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,3"/>
          <rect x="320" y="102" width="424" height="72" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
          <text x="336" y="124" font-size="13" font-weight="800" fill="#1d4ed8">ON — Thân giữa = 1 Ngày cụ thể</text>
          <text x="336" y="144" font-size="11.5" fill="#475569">• Thứ, ngày tháng: <tspan font-weight="700" fill="#1e293b">on Tuesday, on 20th November</tspan></text>
          <text x="336" y="162" font-size="11.5" fill="#475569">• Buổi + thứ/ngày: <tspan font-weight="700" fill="#1e293b">on Friday night, on Christmas Day</tspan></text>

          <!-- IN -->
          <line x1="284" y1="214" x2="320" y2="214" stroke="#10b981" stroke-width="2" stroke-dasharray="4,3"/>
          <rect x="320" y="182" width="424" height="72" rx="10" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5"/>
          <text x="336" y="204" font-size="13" font-weight="800" fill="#047857">IN — Đáy rộng = Khoảng thời gian dài &amp; bao chứa</text>
          <text x="336" y="224" font-size="11.5" fill="#475569">• Buổi chung: <tspan font-weight="700" fill="#1e293b">in the morning, in the afternoon</tspan></text>
          <text x="336" y="242" font-size="11.5" fill="#475569">• Tháng, mùa, năm, thế kỷ: <tspan font-weight="700" fill="#1e293b">in July, in 2026, in the 1990s</tspan></text>
        </svg>
      </div>`,

    // 16. Prepositions of Place & Movement
    '10_Prepositions_and_Phrasal_Verbs/02_Prepositions_of_Place_Movement:0': () => `
      <div class="vd-tree">
        <div class="vd-tree-branches">
          <div class="vd-branch blue">
            <div class="vd-branch-title">📍 VỊ TRÍ TĨNH (Place)</div>
            <div class="vd-prep-list">
              <div><span class="vd-prep-ico">●</span><code>at</code> — tại 1 điểm cụ thể</div>
              <div><span class="vd-prep-ico">▬</span><code>on</code> — trên bề mặt / con đường</div>
              <div><span class="vd-prep-ico">▣</span><code>in</code> — bên trong không gian 3D</div>
              <div><span class="vd-prep-ico">▲</span><code>above / over</code> — cao hơn / trùm lên</div>
              <div><span class="vd-prep-ico">▼</span><code>below / under</code> — thấp hơn / bên dưới</div>
              <div><span class="vd-prep-ico">A●B</span><code>between</code> — ở giữa 2 đối tượng</div>
              <div><span class="vd-prep-ico">••●••</span><code>among</code> — giữa một đám đông</div>
              <div><span class="vd-prep-ico">◄─►</span><code>opposite</code> — đối diện (mặt đối mặt)</div>
              <div><span class="vd-prep-ico">► ►</span><code>in front of</code> — ở phía trước</div>
            </div>
          </div>
          <div class="vd-branch green">
            <div class="vd-branch-title">🏃 CHUYỂN ĐỘNG (Movement)</div>
            <div class="vd-prep-list">
              <div><span class="vd-prep-ico">──▶●</span><code>to</code> — đi tới tận đích</div>
              <div><span class="vd-prep-ico">──▶</span><code>toward(s)</code> — về phía (chưa chắc tới)</div>
              <div><span class="vd-prep-ico">─▶▣</span><code>into</code> — từ ngoài đi vào trong</div>
              <div><span class="vd-prep-ico">─▶▬</span><code>onto</code> — từ dưới bước lên bề mặt</div>
              <div><span class="vd-prep-ico">═▶═</span><code>across</code> — băng ngang bề mặt</div>
              <div><span class="vd-prep-ico">▶▣▶</span><code>through</code> — đi xuyên qua khối 3D</div>
              <div><span class="vd-prep-ico">══▶</span><code>along</code> — đi dọc theo tuyến đường</div>
            </div>
          </div>
        </div>
      </div>`,

    // 17. Clauses of Reason, Result & Purpose
    '11_Conjunctions_and_Clauses/02_Clauses_of_Reason_Result_Purpose:0': () => `
      <div class="vd-card" style="padding:16px 18px">
        <div class="vd-flow-list">
          <div class="vd-flow-row">
            <span class="vd-flow-box blue">NGUYÊN NHÂN</span>
            <span class="vd-flow-conn">── <code>so / therefore / consequently / as a result</code> ──▶</span>
            <span class="vd-flow-box green">KẾT QUẢ</span>
          </div>
          <div class="vd-flow-row">
            <span class="vd-flow-box green">KẾT QUẢ</span>
            <span class="vd-flow-conn">◀── <code>because / since / as / because of / due to</code> ──</span>
            <span class="vd-flow-box blue">NGUYÊN NHÂN</span>
          </div>
          <div class="vd-flow-row">
            <span class="vd-flow-box amber">HÀNH ĐỘNG</span>
            <span class="vd-flow-conn">── <code>to / in order to / so that + modal</code> ──▶</span>
            <span class="vd-flow-box purple">MỤC ĐÍCH</span>
          </div>
        </div>
      </div>`,

    // 18. Inversion (Partial & Full)
    '13_Advanced_Structures/01_Inversion:0': () => `
      <div class="vd-card" style="padding:16px 18px">
        <div class="vd-transform">
          <div class="vd-inv-title">1. Đảo ngữ bán phần (Đưa trạng từ phủ định lên đầu → kéo Trợ ĐT lên trước Chủ ngữ)</div>
          <div class="vd-tr-row">
            <span class="vd-tr-label">Câu thường:</span>
            <div class="vd-tokens">
              <span class="vd-tok blue"><em>S</em>They</span>
              <span class="vd-tok amber"><em>Aux</em>have</span>
              <span class="vd-tok rose"><em>Adv</em>never</span>
              <span class="vd-tok green"><em>V</em>witnessed</span>
              <span class="vd-tok gray">such a storm.</span>
            </div>
          </div>
          <div class="vd-tr-row">
            <span class="vd-tr-label">Đảo ngữ:</span>
            <div class="vd-tokens">
              <span class="vd-tok rose"><em>Adv ⬆</em>Never</span>
              <span class="vd-tok amber"><em>Aux ⬅</em>have</span>
              <span class="vd-tok blue"><em>S</em>they</span>
              <span class="vd-tok green"><em>V</em>witnessed</span>
              <span class="vd-tok gray">such a storm.</span>
            </div>
          </div>

          <hr style="margin:12px 0;border-top:1px dashed #cbd5e1">

          <div class="vd-inv-title">2. Đảo ngữ hoàn toàn (Đưa cụm Nơi chốn lên đầu → đảo nguyên Động từ lên trước Chủ ngữ)</div>
          <div class="vd-tr-row">
            <span class="vd-tr-label">Câu thường:</span>
            <div class="vd-tokens">
              <span class="vd-tok blue"><em>S</em>An old temple</span>
              <span class="vd-tok green"><em>V</em>stood</span>
              <span class="vd-tok purple"><em>Place</em>on the hill.</span>
            </div>
          </div>
          <div class="vd-tr-row">
            <span class="vd-tr-label">Đảo ngữ:</span>
            <div class="vd-tokens">
              <span class="vd-tok purple"><em>Place ⬆</em>On the hill</span>
              <span class="vd-tok green"><em>V ⬅</em>stood</span>
              <span class="vd-tok blue"><em>S</em>an old temple.</span>
            </div>
          </div>
        </div>
      </div>`
  };

  window.getVisualDiagram = function (unitKey, index) {
    const fn = DIAGRAMS[`${unitKey}:${index}`];
    return fn ? fn() : null;
  };
})();

