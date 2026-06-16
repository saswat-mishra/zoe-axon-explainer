/* ============================================================
   Zoé Axon — interactive explainer · app.js
   Nav, scroll reveal, counters, architecture, SOP view,
   modularity, outcomes chart, and the Playground engine.
   Everything is data-driven from window.ZOE (js/data.js).
   ============================================================ */
(function () {
  'use strict';

  const { PLANES, SERVICES, MODULARITY, SCENARIOS } = window.ZOE;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* step type → icon, dot colour, plain label */
  const TYPE_META = {
    tool_call:      { ico: '🔌', dot: '#1F5CEA', svc: '#1F5CEA' },
    llm_call:       { ico: '✨', dot: '#0EA5E9', svc: '#0EA5E9' },
    agent:          { ico: '🤖', dot: '#7C3AED', svc: '#7C3AED' },
    script:         { ico: '⚙️', dot: '#0D9488', svc: '#0D9488' },
    human_approval: { ico: '🙋', dot: '#D97706', svc: '#D97706' },
    choice:         { ico: '🔀', dot: '#94A3B8', svc: '#6B7890' },
    parallel:       { ico: '🧩', dot: '#7C3AED', svc: '#7C3AED' },
    terminal:       { ico: '🏁', dot: '#16A34A', svc: '#16A34A' },
  };
  const svcInfo = (key) => SERVICES[key] || { label: key || 'AI', color: '#1F5CEA', plane: 'brain' };

  /* ========================================================
     NAV
     ======================================================== */
  function initNav() {
    const nav = $('#nav');
    const burger = $('#navBurger');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    $$('.nav-links a, .nav-cta').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    }));

    /* active link on scroll */
    const links = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
    const secs = $$('main section[id]').filter(s => links.has(s.id));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          links.get(en.target.id)?.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => obs.observe(s));
  }

  /* ========================================================
     SCROLL REVEAL (staggered)
     ======================================================== */
  function initReveal() {
    const items = $$('.reveal');
    if (reduced()) { items.forEach(i => i.classList.add('in')); return; }
    items.forEach(el => {
      const sibs = Array.from(el.parentElement.children).filter(c => c.classList.contains('reveal'));
      const idx = sibs.indexOf(el);
      el.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms';
    });
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); o.unobserve(en.target); } });
    }, { threshold: 0.12 });
    items.forEach(i => obs.observe(i));
  }

  /* ========================================================
     COUNTERS
     ======================================================== */
  function initCounters() {
    const nums = $$('[data-count]');
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (reduced()) { el.textContent = target + suffix; return; }
      const dur = 1400; const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver((entries, o) => {
      entries.forEach(en => { if (en.isIntersecting) { run(en.target); o.unobserve(en.target); } });
    }, { threshold: 0.5 });
    nums.forEach(n => obs.observe(n));
  }

  /* ========================================================
     HERO MINI-PIPELINE
     ======================================================== */
  function initPipeline() {
    const chips = $$('#pipelineTrack .pl-chip');
    const dot = $('#plDot');
    if (!chips.length) return;
    if (reduced()) { chips.forEach(c => c.classList.add('lit')); if (dot) dot.style.display = 'none'; return; }
    let i = 0;
    const step = () => {
      chips.forEach(c => c.classList.remove('lit'));
      const c = chips[i];
      c.classList.add('lit');
      if (dot) {
        dot.style.cssText = `position:absolute;width:9px;height:9px;border-radius:50%;background:var(--cyan);box-shadow:0 0 12px var(--cyan);transition:left .5s ease, top .5s ease;top:${c.offsetTop + c.offsetHeight / 2 - 4}px;left:${c.offsetLeft + c.offsetWidth / 2 - 4}px;`;
      }
      i = (i + 1) % chips.length;
    };
    step();
    setInterval(step, 1100);
  }

  /* ========================================================
     ARCHITECTURE
     ======================================================== */
  let deployMode = 'hybrid';
  function hostBadge(hosting) {
    if (deployMode === 'cloud') {
      return hosting === 'either'
        ? { cls: 'badge-cloud', text: '☁️ Cloud' }
        : { cls: 'badge-cloud', text: '☁️ Cloud' };
    }
    if (hosting === 'on-prem') return { cls: 'badge-onprem', text: '🔒 On your servers' };
    if (hosting === 'cloud')   return { cls: 'badge-cloud',  text: '☁️ Cloud tool' };
    return { cls: 'badge-either', text: 'Either' };
  }
  function hostNote(hosting) {
    if (deployMode === 'cloud') return { cls: 'host-cloud', text: '☁️ Runs in the cloud (Full-cloud profile)' };
    if (hosting === 'on-prem') return { cls: 'host-onprem', text: '🔒 Hosted on your own servers — sensitive data stays in-house' };
    if (hosting === 'cloud')   return { cls: 'host-cloud',  text: '☁️ A cloud tool you already use — reached through an audited adapter' };
    return { cls: 'host-either', text: 'Can run on your servers or in the cloud' };
  }

  function buildArch() {
    const wrap = $('#archPlanes');
    wrap.innerHTML = PLANES.map(p => {
      const b = hostBadge(p.hosting);
      const items = p.items.map(it => {
        const heart = p.highlight && /SOP Engine/i.test(it);
        return `<span class="plane-pill${heart ? ' is-heart' : ''}">${esc(it)}${heart ? ' ★' : ''}</span>`;
      }).join('');
      return `<button class="plane${p.highlight ? ' highlight' : ''}" data-plane="${p.id}" aria-label="${esc(p.name)} — ${esc(p.plain)}">
        <div class="plane-top">
          <div>
            <div class="plane-name">${esc(p.name)}${p.highlight ? ' <span class="plane-star">★ the heart</span>' : ''}</div>
            <div class="plane-plain">${esc(p.plain)}</div>
          </div>
          <span class="plane-badge ${b.cls}" data-badge>${b.text}</span>
        </div>
        <div class="plane-items">${items}</div>
      </button>`;
    }).join('');

    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.plane');
      if (!btn) return;
      $$('.plane', wrap).forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      showArchPanel(btn.dataset.plane);
    });
  }

  let activePlaneId = null;
  function showArchPanel(id) {
    activePlaneId = id;
    const p = PLANES.find(x => x.id === id);
    if (!p) return;
    const note = hostNote(p.hosting);
    $('#archPanelEmpty').hidden = true;
    const body = $('#archPanelBody');
    body.hidden = false;
    body.innerHTML = `
      <h3>${esc(p.name)}</h3>
      <div class="app-plain">${esc(p.plain)}</div>
      <p class="app-detail">${esc(p.detail)}</p>
      <div class="app-sub">What lives here</div>
      <div class="app-items">${p.items.map(i => `<span class="app-item">${esc(i)}</span>`).join('')}</div>
      <div class="app-host ${note.cls}">${note.text}</div>`;
  }

  function refreshArchBadges() {
    PLANES.forEach(p => {
      const btn = $(`.plane[data-plane="${p.id}"]`);
      if (!btn) return;
      const b = hostBadge(p.hosting);
      const badge = $('[data-badge]', btn);
      badge.className = `plane-badge ${b.cls}`;
      badge.setAttribute('data-badge', '');
      badge.textContent = b.text;
    });
    if (activePlaneId) showArchPanel(activePlaneId);
  }

  function initDeployToggle() {
    const tog = $('#deployToggle');
    tog.addEventListener('click', (e) => {
      const btn = e.target.closest('.dt-btn');
      if (!btn) return;
      deployMode = btn.dataset.deploy;
      $$('.dt-btn', tog).forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      $('#archHint').innerHTML = deployMode === 'hybrid'
        ? '🔒 <strong>On your own servers</strong> &nbsp;·&nbsp; ☁️ <strong>Cloud tools you already use</strong>'
        : '☁️ <strong>Everything runs in the cloud</strong> — the simplest profile to roll out';
      refreshArchBadges();
    });
  }

  /* ========================================================
     JSON SYNTAX HIGHLIGHT (shared by SOP view + playground)
     ======================================================== */
  function hlLine(line) {
    const safe = esc(line);
    return safe.replace(/("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|([{}\[\],])/g,
      (m, str, colon, num, punc) => {
        if (str) return `<span class="${colon ? 'tk-key' : 'tk-str'}">${str}</span>${colon ? '<span class="tk-punc">' + colon + '</span>' : ''}`;
        if (num) return `<span class="tk-num">${num}</span>`;
        if (punc) return `<span class="tk-punc">${punc}</span>`;
        return m;
      });
  }
  const stepIdOf = (line) => { const m = line.match(/"id"\s*:\s*"([^"]+)"/); return m ? m[1] : null; };

  function renderJson(jsonStr, { withStepIds = false } = {}) {
    return jsonStr.split('\n').map(line => {
      const sid = withStepIds ? stepIdOf(line) : null;
      return `<span class="json-line"${sid ? ` data-stepid="${esc(sid)}"` : ''}>${hlLine(line)}</span>`;
    }).join('\n');
  }

  /* ========================================================
     "HOW SOPs WORK" — annotated SOP
     ======================================================== */
  function buildSop() {
    const sc = SCENARIOS.find(s => s.id === 'license_expired');
    if (!sc) return;
    const annoFor = (line) => {
      if (/"trigger"/.test(line)) return 1;
      if (/"variables"/.test(line)) return 2;
      if (/"autonomy"/.test(line)) return 3;
      if (/"type":"choice"/.test(line)) return 4;
      if (/"type":"human_approval"/.test(line)) return 5;
      if (/"compensation"/.test(line)) return 6;
      if (/"type":"terminal"/.test(line)) return 7;
      return null;
    };
    const html = sc.sopJson.split('\n').map(line => {
      const a = annoFor(line);
      const badge = a ? `<span class="sop-anno" aria-label="annotation ${a}">${a}</span>` : '';
      return `<span class="json-line">${badge}${hlLine(line)}</span>`;
    }).join('\n');
    $('#sopCode').innerHTML = html;
  }

  /* ========================================================
     MODULARITY
     ======================================================== */
  function buildModularity() {
    $('#modProfiles').innerHTML = MODULARITY.profiles.map(p => `<div class="mod-profile">${esc(p)}</div>`).join('');
    $('#modLine').textContent = MODULARITY.line;
    $('#modCore').addEventListener('click', () => setMod(null));
    $$('.mod-ring').forEach(btn => btn.addEventListener('click', () => {
      $$('.mod-ring').forEach(b => b.classList.toggle('is-active', b === btn));
      setMod(btn.dataset.ring);
    }));
    function setMod(ringId) {
      const title = $('#modDetailTitle'), note = $('#modDetailNote');
      if (!ringId) {
        $$('.mod-ring').forEach(b => b.classList.remove('is-active'));
        title.textContent = 'The unchanging core';
        note.textContent = MODULARITY.core + ' Tap a ring to see what plugs into it.';
        return;
      }
      const r = MODULARITY.rings.find(x => x.id === ringId);
      title.textContent = r.name;
      note.textContent = r.note;
    }
  }

  /* ========================================================
     OUTCOMES CHART (Chart.js, optional)
     ======================================================== */
  function buildChart() {
    const canvas = $('#outcomesChart');
    if (!canvas || typeof window.Chart === 'undefined') {
      if (canvas) canvas.closest('.chart-card').style.display = 'none';
      return;
    }
    const cats = {};
    SCENARIOS.forEach(s => {
      const c = s.category;
      cats[c] = cats[c] || { auto: 0, human: 0, n: 0 };
      cats[c].auto += s.outcome.automationPct;
      cats[c].human += (100 - s.outcome.automationPct);
      cats[c].n += 1;
    });
    const labels = Object.keys(cats);
    const auto = labels.map(l => Math.round(cats[l].auto / cats[l].n));
    const human = labels.map(l => Math.round(cats[l].human / cats[l].n));
    new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Automated', data: auto, backgroundColor: '#1F5CEA', borderRadius: 6, stack: 's' },
          { label: 'Human-handled', data: human, backgroundColor: '#D97706', borderRadius: 6, stack: 's' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { family: 'DM Sans' }, color: '#3A4860' } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6B7890', font: { family: 'DM Sans' } }, stacked: true },
          y: { max: 100, grid: { color: '#ECEFF5' }, ticks: { color: '#6B7890', callback: v => v + '%' }, stacked: true },
        },
      },
    });
  }

  /* ========================================================
     PLAYGROUND — mini-map
     ======================================================== */
  /* derive the connector nodes (and an auto two-row layout) from SERVICES so a new
     connector service appears on the map without touching this file */
  const CONNECTOR_NODES = Object.keys(SERVICES).filter(k => SERVICES[k].plane === 'connectors');
  const MAP_XS = [110, 320, 600, 810], MAP_YS = [52, 326], MAP_COLS = MAP_XS.length;
  const MAP_POS = Object.fromEntries(CONNECTOR_NODES.map((k, i) => [
    k, [MAP_XS[i % MAP_COLS], MAP_YS[Math.floor(i / MAP_COLS) % MAP_YS.length]]]));
  const BRAIN_C = [460, 189];
  let travelRAF = null;

  function buildMap() {
    const svg = $('#pgMap');
    const [bx, by] = BRAIN_C;
    let edges = '', nodes = '';
    CONNECTOR_NODES.forEach(key => {
      const [x, y] = MAP_POS[key];
      edges += `<line class="map-edge" id="edge-${key}" x1="${bx}" y1="${by}" x2="${x}" y2="${y}" />`;
    });
    // brain node
    nodes += nodeSVG('brain', bx, by, 'The Brain', 'orchestrator · SOP', 190, 88, 'brain');
    // connectors
    CONNECTOR_NODES.forEach(key => {
      const [x, y] = MAP_POS[key];
      nodes += nodeSVG(key, x, y, svcInfo(key).label, 'connector', 134, 46);
    });
    svg.innerHTML = `${edges}${nodes}<circle id="mapTravelDot" class="map-travel" r="5" cx="${bx}" cy="${by}" style="visibility:hidden" />`;

    function nodeSVG(id, cx, cy, label, sub, w, h, extra = '') {
      const x = cx - w / 2, y = cy - h / 2;
      return `<g class="map-node ${extra}" id="map-${id}">
        <rect class="map-node-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="11" />
        <text class="map-label" x="${cx}" y="${cy + (sub ? -2 : 4)}" text-anchor="middle">${esc(label)}</text>
        ${sub ? `<text class="map-sub" x="${cx}" y="${cy + 13}" text-anchor="middle">${esc(sub)}</text>` : ''}
      </g>`;
    }
  }

  function clearMap() {
    if (travelRAF) cancelAnimationFrame(travelRAF);
    $$('#pgMap .map-node').forEach(n => n.classList.remove('lit', 'lit-group'));
    $$('#pgMap .map-edge').forEach(n => n.classList.remove('lit'));
    const dot = $('#mapTravelDot'); if (dot) dot.style.visibility = 'hidden';
  }

  function lightMapForServices(services) {
    clearMap();
    $('#map-brain')?.classList.add('lit'); // brain is always involved
    const connectors = [];
    services.forEach(key => {
      const info = svcInfo(key);
      if (info.plane === 'brain') { $('#map-brain')?.classList.add('lit'); return; }
      const node = $(`#map-${key}`);
      if (node) { node.classList.add('lit'); $(`#edge-${key}`)?.classList.add('lit'); connectors.push(key); }
    });
    if (connectors.length && !reduced()) travelDot(connectors[0]);
  }

  function travelDot(key) {
    const dot = $('#mapTravelDot');
    const [tx, ty] = MAP_POS[key]; const [bx, by] = BRAIN_C;
    if (!dot) return;
    dot.style.visibility = 'visible';
    const dur = 600; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      dot.setAttribute('cx', bx + (tx - bx) * p);
      dot.setAttribute('cy', by + (ty - by) * p);
      if (p < 1) travelRAF = requestAnimationFrame(tick);
      else dot.style.visibility = 'hidden';
    };
    travelRAF = requestAnimationFrame(tick);
  }

  /* ========================================================
     PLAYGROUND — engine
     ======================================================== */
  const PG = {
    sc: null, path: [], idx: -1, playing: false, waiting: false,
    speed: 1, channel: 'chat', elapsed: 0, perStep: 0, ranCount: 0,
    autoTarget: 100, timer: null, jsonView: false, finished: false, filter: 'all',
    runId: 0,         // monotonic epoch — bumped on every reset to invalidate in-flight runs
    busy: false, busyRun: -1, // re-entrancy guard so concurrent advance() chains can't interleave
    resolveWait: null,        // lets a reset force-resolve a pending waitable()
  };

  function stepById(id) { return PG.sc.steps.find(s => s.id === id); }

  /* compute the happy-path order (approvals approved, choices take their authored next) */
  function computePath(sc) {
    const path = []; const seen = new Set();
    let cur = sc.steps[0];
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id); path.push(cur);
      if (cur.type === 'terminal') break;
      if (cur.status === 'fail') break; // fail ends the visible happy path
      if (cur.type === 'human_approval') { cur = stepById(cur.hitl.onApprove); continue; }
      const i = sc.steps.indexOf(cur);
      cur = sc.steps[i + 1];
    }
    return path;
  }

  function buildScenarioChips() {
    const wrap = $('#pgScenarios');
    wrap.innerHTML = SCENARIOS.map((s, i) => {
      const autoIco = (s.autonomy === 'auto') ? '🟢' : '🟠';
      const autoLbl = (s.autonomy === 'auto') ? 'fully automatic' : 'needs a human’s OK';
      return `<button class="scenario-chip" data-id="${s.id}" data-autonomy="${s.autonomy}"
        aria-pressed="false" tabindex="${i === 0 ? '0' : '-1'}" aria-label="${esc(s.title)} — tier ${s.tier}, ${autoLbl}">
        <span class="sc-icon" aria-hidden="true">${s.icon}</span>
        <span class="sc-body">
          <span class="sc-title">${esc(s.title)}</span>
          <span class="sc-badges"><span class="sc-tier">${esc(s.tier)}</span><span class="sc-auto" title="${autoLbl}">${autoIco}</span></span>
        </span>
      </button>`;
    }).join('');

    wrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.scenario-chip');
      if (chip) selectScenario(chip.dataset.id);
    });
    /* arrow-key navigation across chips */
    wrap.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      const chips = $$('.scenario-chip:not([hidden])', wrap);
      const cur = document.activeElement.closest('.scenario-chip');
      let i = chips.indexOf(cur); if (i < 0) i = 0;
      if (e.key === 'ArrowRight') i = (i + 1) % chips.length;
      else if (e.key === 'ArrowLeft') i = (i - 1 + chips.length) % chips.length;
      else if (e.key === 'Home') i = 0; else i = chips.length - 1;
      e.preventDefault(); chips[i].focus(); selectScenario(chips[i].dataset.id);
    });
  }

  function applyFilter(filter) {
    PG.filter = filter;
    $$('.filt-btn').forEach(b => {
      const on = b.dataset.filter === filter;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    let firstVisible = null;
    $$('.scenario-chip').forEach(chip => {
      const a = chip.dataset.autonomy;
      const show = filter === 'all'
        || (filter === 'auto' && a === 'auto')
        || (filter === 'hitl' && a !== 'auto');
      chip.hidden = !show;
      if (show && !firstVisible) firstVisible = chip;
    });
    if (PG.sc && $(`.scenario-chip[data-id="${PG.sc.id}"]`)?.hidden && firstVisible) {
      selectScenario(firstVisible.dataset.id);
    }
  }

  function selectScenario(id) {
    const sc = SCENARIOS.find(s => s.id === id);
    if (!sc) return;
    PG.sc = sc;
    $$('.scenario-chip').forEach(c => {
      const on = c.dataset.id === id;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
      c.tabIndex = on ? 0 : -1;
    });
    setChannel(sc.channel, true);
    resetRun();
  }

  function setChannel(ch, silent) {
    PG.channel = ch;
    $$('.ch-btn').forEach(b => {
      const on = b.dataset.channel === ch;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('#pgVoice').hidden = (ch !== 'voice');
    $('#pgConvCol')?.classList.toggle('voice-mode', ch === 'voice');
    $('.pg-conv-col')?.classList.toggle('voice-mode', ch === 'voice');
    if (!silent) resetRun();
  }

  /* ---- render understanding ---- */
  function renderUnderstanding(sc) {
    $('#pgIntent').textContent = sc.intent;
    $('#pgTier').textContent = sc.tier;
    $('#pgRecipe').textContent = `${sc.sopId} · v${sc.sopVersion}`;
    const pct = Math.round(sc.confidence * 100);
    $('#pgConfVal').textContent = pct + '%';
    // animate confidence bar after a tick
    const bar = $('#pgConfBar'); bar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = pct + '%'; }));
    $('#pgVars').innerHTML = sc.variables.map(v => `
      <div class="u-vars-row">
        <span class="u-vars-k">${esc(v.k)}</span>
        <span class="u-vars-rgt"><span class="u-vars-v">${esc(v.v)}</span><span class="u-vars-src">${esc(v.src)}</span></span>
      </div>`).join('');
  }

  /* toggle a row's detail panel and keep aria-expanded in sync */
  function openRow(row, open) {
    if (!row) return;
    row.classList.toggle('open', open);
    $('.step-main', row)?.setAttribute('aria-expanded', String(open));
  }
  function wireRow(row) {
    const main = $('.step-main', row);
    main.addEventListener('click', () => openRow(row, !row.classList.contains('open')));
  }

  /* ---- render step rows (pending) ---- */
  function renderSteps(path) {
    const wrap = $('#pgSteps');
    wrap.innerHTML = path.map((s, i) => stepRowHTML(s, i)).join('');
    $$('.step-row', wrap).forEach(wireRow);
  }

  function stepRowHTML(s, i) {
    const meta = TYPE_META[s.type] || TYPE_META.tool_call;
    const info = svcInfo(s.service);
    const svcLabel = s.type === 'human_approval' ? 'Human' : info.label;
    const svcColor = s.type === 'human_approval' ? '#D97706' : (info.color || meta.svc);
    return `<div class="step-row pending" data-stepid="${esc(s.id)}" data-idx="${i}">
      <button type="button" class="step-main" aria-expanded="false" aria-controls="detail-${esc(s.id)}">
        <span class="step-typedot" style="background:${meta.dot}"></span>
        <span class="step-ico" aria-hidden="true">${meta.ico}</span>
        <span class="step-title">${esc(s.title)}</span>
        <span class="step-svc" style="background:${svcColor}">${esc(svcLabel)}</span>
        <span class="step-status"><span class="step-state" role="status"></span><span class="step-dur"></span></span>
      </button>
      <div class="step-detail" id="detail-${esc(s.id)}"><div class="step-detail-inner">${stepDetailHTML(s)}</div></div>
    </div>`;
  }

  function stepDetailHTML(s) {
    let h = '';
    if (s.inputs && Object.keys(s.inputs).length) {
      h += `<div class="sd-block"><div class="sd-label">Inputs — variables passed in</div><div class="sd-inputs">${
        Object.entries(s.inputs).map(([k, v]) => `<span class="sd-chip">${esc(k)}=${esc(v)}</span>`).join('')}</div></div>`;
    }
    if (s.checked) h += `<div class="sd-block"><div class="sd-label">What it checked / found</div><div class="sd-found">${esc(s.checked)}</div></div>`;
    if (s.output && s.type !== 'parallel') h += `<div class="sd-block"><div class="sd-label">Result</div><div class="sd-found">${esc(s.output)}</div></div>`;
    if (s.guard) h += `<div class="sd-block"><div class="sd-guard">${esc(s.guard)}</div></div>`;
    if (s.type === 'parallel') h += `<div class="sd-block" data-agents></div>`;
    return h || `<div class="sd-block sd-found">Runs the “${esc(s.title)}” step.</div>`;
  }

  function rowEl(id) { return $(`#pgSteps .step-row[data-stepid="${CSS.escape(id)}"]`); }

  /* ---- conversation ---- */
  function clearConv() { $('#pgConversation').innerHTML = `<div class="pg-empty-conv">The conversation will appear here when you press Play.</div>`; }
  function pushMessage(from, text) {
    const conv = $('#pgConversation');
    if ($('.pg-empty-conv', conv)) conv.innerHTML = '';
    const who = from === 'user' ? PG.sc.user.name : 'Zoé';
    const el = document.createElement('div');
    el.className = 'msg ' + (from === 'user' ? 'msg-user' : 'msg-zoe');
    el.innerHTML = `<div class="msg-from">${esc(who)}</div><span class="msg-text"></span>`;
    conv.appendChild(el);
    conv.scrollTop = conv.scrollHeight;
    // announce the whole message once (the visual still types it out char by char)
    const ann = $('#pgAnnouncer'); if (ann) ann.textContent = `${who}: ${text}`;
    const target = $('.msg-text', el);
    return typeInto(target, text, conv);
  }
  function typeInto(target, text, conv) {
    return new Promise(resolve => {
      if (reduced()) { target.textContent = text; resolve(); return; }
      const my = PG.runId;
      target.innerHTML = '<span class="caret">&nbsp;</span>';
      let i = 0; const caret = $('.caret', target);
      const tick = () => {
        if (my !== PG.runId) { resolve(); return; } // reset happened — stop typing
        if (i <= text.length) {
          target.textContent = text.slice(0, i);
          if (i < text.length) { target.appendChild(caret); }
          conv.scrollTop = conv.scrollHeight;
          i++;
          setTimeout(tick, 18 / PG.speed);
        } else { resolve(); }
      };
      tick();
    });
  }

  /* ---- voice ---- */
  function setVoiceStatus(txt) { const v = $('#voiceStatus'); if (v) v.textContent = txt; }

  /* ---- activity log ---- */
  function logLine(text) {
    const ul = $('#pgLog');
    const empty = $('.pg-log-empty', ul); if (empty) empty.remove();
    const li = document.createElement('li');
    PG.elapsed = Math.min(PG.sc.outcome.elapsedSec, PG.elapsed);
    const t = formatClock(PG.elapsed);
    li.innerHTML = `<span class="lg-time">${t}</span><span class="lg-text">${esc(text)}</span>`;
    ul.appendChild(li);
    ul.scrollTop = ul.scrollHeight;
  }
  function formatClock(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`.slice(3);
  }

  /* ---- outcome card ---- */
  function setState(state, label) {
    const pill = $('#pgState');
    pill.dataset.state = state; pill.textContent = label;
  }
  function setRing(pct) {
    const C = 213.6;
    $('#pgRingFg').style.strokeDashoffset = C * (1 - pct / 100);
    $('#pgAutoPct').textContent = Math.round(pct) + '%';
  }
  function setSla(sec) { $('#pgSla').textContent = Math.round(sec) + 's'; }

  /* ---- progress readout ---- */
  function updateProgress() {
    const total = PG.path.length;
    const cur = Math.max(0, PG.ranCount);
    const autoPct = PG.curAuto || 0;
    $('#pgProgress').textContent = `Step ${Math.min(cur, total)} / ${total} · ⏱ ${Math.round(PG.elapsed)}s · 🤖 ${Math.round(autoPct)}% automated`;
  }

  /* ---- JSON view sync ---- */
  function renderJsonView() {
    const pre = $('#pgJson');
    pre.innerHTML = renderJson(PG.sc.sopJson, { withStepIds: true });
  }
  function syncJson(stepId) {
    if (!PG.jsonView) return;
    const pre = $('#pgJson');
    $$('.json-line', pre).forEach(l => l.classList.remove('jl-active'));
    const line = $(`.json-line[data-stepid="${CSS.escape(stepId)}"]`, pre);
    if (line) { line.classList.add('jl-active'); line.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); }
  }
  function toggleJson(on) {
    PG.jsonView = on;
    $('#pgJsonToggle').classList.toggle('is-active', on);
    $('#pgJsonToggle').setAttribute('aria-pressed', String(on));
    $('#pgJsonToggle').textContent = on ? 'View steps' : 'View JSON';
    $('#pgSteps').hidden = on;
    $('#pgJson').hidden = !on;
    if (on) { renderJsonView(); if (PG.curStepId) syncJson(PG.curStepId); }
  }

  /* ---- RESET ---- */
  function resetRun() {
    PG.runId++;            // invalidate any in-flight run (stale continuations bail after their await)
    clearTimer(); settleWait();
    PG.playing = false; PG.waiting = false; PG.finished = false; PG.busy = false; PG.busyRun = -1;
    PG.idx = -1; PG.ranCount = 0; PG.elapsed = 0; PG.curAuto = 0; PG.curStepId = null;
    PG.rejectId = null; PG.failed = false; PG.jumpTo = null;
    const sc = PG.sc;
    PG.path = computePath(sc);
    PG.autoTarget = sc.outcome.automationPct;
    PG.perStep = sc.outcome.elapsedSec / Math.max(1, PG.path.length);

    renderUnderstanding(sc);
    renderSteps(PG.path);
    clearConv();
    queueFirstMessage();
    $('#pgLog').innerHTML = `<li class="pg-log-empty">No actions yet — press Play.</li>`;
    setState('none', '—');
    $('#pgTicket').textContent = '—';
    setRing(0); setSla(0);
    $('#pgStamp').hidden = true; $('#pgStamp').className = 'ticket-stamp';
    $('#pgProactive').hidden = true;
    clearMap();
    if (PG.jsonView) { renderJsonView(); }
    setPlayLabel('▶ Play');
    $('#pgPlay').disabled = false; $('#pgStep').disabled = false;
    setVoiceStatus('🎙 ready');
    updateProgress();
  }

  function queueFirstMessage() {
    // show the user's first message as a faded preview cue (not yet "sent")
    const first = PG.sc.steps.find(s => s.chat && s.chat.from === 'user');
    const conv = $('#pgConversation');
    if (first) {
      conv.innerHTML = `<div class="pg-empty-conv">“${esc(first.chat.text)}” — press <strong>▶ Play</strong> to begin.</div>`;
    }
  }

  function clearTimer() { if (PG.timer) { clearTimeout(PG.timer); PG.timer = null; } }
  /* force-resolve a pending waitable() so a reset never leaves an await hanging */
  function settleWait() { if (PG.resolveWait) { const r = PG.resolveWait; PG.resolveWait = null; r(); } }
  function setPlayLabel(t) { $('#pgPlay').textContent = t; }

  const stepInFlight = () => PG.busy && PG.busyRun === PG.runId;

  /* ---- PLAY / PAUSE ---- */
  function play() {
    if (PG.finished) { resetRun(); }
    if (PG.waiting) return;
    if (PG.playing) { // pause (current step finishes, no further auto-advance)
      PG.playing = false; clearTimer(); setPlayLabel('▶ Play'); return;
    }
    PG.playing = true; setPlayLabel('⏸ Pause');
    advance();
  }

  /* ---- STEP (one step, no auto-timer) ---- */
  function doStep() {
    if (PG.finished || PG.waiting || stepInFlight()) return;
    PG.playing = false; setPlayLabel('▶ Play');
    advance(true);
  }

  /* advance: run the next step in the path (serialized — one chain at a time per run) */
  async function advance(single = false) {
    if (PG.waiting || PG.finished || stepInFlight()) return;
    const my = PG.runId;
    PG.busy = true; PG.busyRun = my;
    try {
      const next = nextStep();
      if (!next) return;
      PG.curStepId = next.id;
      await runStep(next);
    } finally {
      if (PG.busyRun === my) PG.busy = false;
    }
    if (my !== PG.runId || PG.waiting || PG.finished) return; // reset/HITL/finish during the step
    if (PG.playing && !single) {
      PG.timer = setTimeout(() => advance(), 120 / PG.speed);
    }
  }

  /* figure out the next step object to run, based on pointer + branch state */
  function nextStep() {
    const sc = PG.sc;
    if (PG.idx < 0) { PG.idx = 0; return PG.path[0]; }
    const cur = PG.path[PG.idx];
    if (!cur) return null;
    if (cur.type === 'terminal') { PG.finished = true; return null; }
    // jump targets (set by HITL reject) override the linear path
    if (PG.jumpTo) {
      const t = stepById(PG.jumpTo); PG.jumpTo = null;
      // rebuild remaining path from the jump target, and re-pace against the new length
      PG.path = PG.path.slice(0, PG.idx + 1).concat(pathFrom(t));
      PG.perStep = PG.sc.outcome.elapsedSec / Math.max(1, PG.path.length);
      renderAppendRow(t, PG.idx + 1);
      PG.idx += 1; return PG.path[PG.idx];
    }
    PG.idx += 1;
    return PG.path[PG.idx] || null;
  }

  function pathFrom(start) {
    const out = []; const seen = new Set(PG.path.slice(0, PG.idx + 1).map(s => s.id));
    let cur = start;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id); out.push(cur);
      if (cur.type === 'terminal') break;
      if (cur.status === 'fail') break;
      if (cur.type === 'human_approval') { cur = stepById(cur.hitl.onApprove); continue; }
      const i = PG.sc.steps.indexOf(cur); cur = PG.sc.steps[i + 1];
    }
    return out;
  }

  function renderAppendRow(step, idx) {
    if (rowEl(step.id)) return;
    const wrap = $('#pgSteps');
    const div = document.createElement('div');
    div.innerHTML = stepRowHTML(step, idx);
    const row = div.firstElementChild;
    wrap.appendChild(row);
    wireRow(row);
  }

  /* ---- run one step (the core animation) ---- */
  async function runStep(step) {
    const my = PG.runId;
    const stale = () => my !== PG.runId;
    const row = rowEl(step.id);
    PG.ranCount += 1;

    // outcome state transitions
    if (PG.ranCount === 1) { setState('new', 'New'); $('#pgTicket').textContent = PG.sc.outcome.ticket; }
    else if (step.type !== 'terminal') setState('progress', 'In Progress');

    // light the map
    const services = step.type === 'parallel' && step.agents
      ? step.agents.map(a => a.service)
      : [step.service];
    lightMapForServices(services);

    // JSON sync
    syncJson(step.id);

    // mark active + open detail (collapse the others)
    if (row) {
      row.classList.remove('pending'); row.classList.add('active');
      openRow(row, true);
      $$('.step-row').forEach(r => { if (r !== row) openRow(r, false); });
      const stateEl = $('.step-state', row);
      stateEl.innerHTML = step.type === 'human_approval' ? ''
        : '<span class="spinner" aria-hidden="true"></span><span class="sr-only">running</span>';
      row.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    }

    // stream chat
    if (step.chat) {
      if (PG.channel === 'voice') setVoiceStatus(step.chat.from === 'user' ? '🎙 listening…' : '🔊 speaking…');
      await pushMessage(step.chat.from, step.chat.text);
      if (stale()) return;
      if (PG.channel === 'voice') setVoiceStatus('🎙 …');
    }

    // ===== HUMAN APPROVAL — pause =====
    if (step.type === 'human_approval') {
      return enterHitl(step, row);
    }

    // ===== PARALLEL — run agents simultaneously =====
    if (step.type === 'parallel' && step.agents) {
      await runParallel(step, row);
      if (stale()) return;
    }

    // log + counters as it works
    bumpCounters();
    if (step.output) logLine(`${step.type === 'choice' ? '🔀 ' : ''}${step.output}`);
    if (step.branch) {
      const note = document.createElement('div');
      note.className = 'sd-block'; note.innerHTML = `<div class="sd-label">Decision taken</div><div class="sd-found">${esc(step.branch)}</div>`;
      $('.step-detail-inner', row)?.appendChild(note);
    }

    // wait the step duration (scaled)
    const dur = Math.max(300, (step.durationMs || 800)) / PG.speed;
    await waitable(dur);
    if (PG.finished || stale()) return; // reset / finish happened mid-wait

    // ===== FORCED FAILURE → compensation + escalate =====
    if (step.status === 'fail') {
      if (row) {
        row.classList.remove('active'); row.classList.add('failed');
        $('.step-state', row).innerHTML = '<span class="step-x" aria-hidden="true">✗</span><span class="sr-only">failed</span>';
        $('.step-dur', row).textContent = (step.durationMs / 1000).toFixed(1) + 's';
      }
      logLine('✗ ' + (step.output || 'Step failed'));
      await waitable(500 / PG.speed);
      if (stale()) return;
      logLine('↩ Compensating — safely undoing the previous action');
      await pushMessage('zoe', "I couldn't safely fix this remotely, so I've undone my changes and handed it to a human engineer — with everything I found attached.");
      if (stale()) return;
      finalize('handoff');
      return;
    }

    // mark done
    if (row) {
      row.classList.remove('active'); row.classList.add('done');
      $('.step-state', row).innerHTML = '<span class="step-check" aria-hidden="true">✓</span><span class="sr-only">succeeded</span>';
      $('.step-dur', row).textContent = ((step.durationMs || 800) / 1000).toFixed(1) + 's';
    }

    if (step.type === 'terminal') { finalizeTerminal(step); return; }
    updateProgress();
  }

  /* a wait that can be force-resolved by reset via settleWait() */
  function waitable(ms) {
    return new Promise(resolve => {
      if (reduced()) ms = Math.min(ms, 80);
      PG.resolveWait = resolve;
      PG.timer = setTimeout(() => { PG.resolveWait = null; PG.timer = null; resolve(); }, ms);
    });
  }

  function bumpCounters() {
    const total = PG.path.length;
    PG.elapsed = Math.min(PG.sc.outcome.elapsedSec, PG.perStep * PG.ranCount);
    // monotonic, non-overshooting so the ring never lurches on a branch divergence
    PG.curAuto = Math.min(PG.autoTarget, Math.max(PG.curAuto || 0, Math.round(PG.autoTarget * (PG.ranCount / total))));
    setRing(PG.curAuto); setSla(PG.elapsed);
    updateProgress();
  }

  /* ---- parallel ---- */
  async function runParallel(step, row) {
    const host = $('[data-agents]', row);
    if (!host) return;
    const my = PG.runId;
    const n = step.agents.length;
    host.innerHTML = `<div class="sd-label">${n} AI worker${n === 1 ? '' : 's'}, at the same time</div>` +
      step.agents.map((a, i) => {
        const info = svcInfo(a.service);
        return `<div class="agent-mini" data-ai="${i}">
          <span class="step-typedot" style="background:#7C3AED"></span>
          <span class="agent-title">${esc(a.title)}</span>
          <span class="step-svc" style="background:${info.color}">${esc(info.label)}</span>
          <span class="agent-out"><span class="spinner" aria-hidden="true"></span></span>
        </div>`;
      }).join('');
    // finish each independently
    await Promise.all(step.agents.map((a, i) => (async () => {
      const t = (700 + i * 350 + (i % 2) * 200) / PG.speed;
      await sleep(reduced() ? 40 : t);
      if (my !== PG.runId) return; // stale run
      const mini = $(`.agent-mini[data-ai="${i}"]`, host);
      if (mini) { mini.classList.add('done'); $('.agent-out', mini).innerHTML = `✓ ${esc(a.output)}`; }
      logLine(`↳ ${a.title}: ${a.output}`);
    })()));
    if (my !== PG.runId) return;
    // merge line
    const merge = document.createElement('div');
    merge.className = 'merge-line'; merge.textContent = step.output;
    host.appendChild(merge);
  }

  /* ---- HITL ---- */
  function enterHitl(step, row) {
    PG.waiting = true; PG.playing = false;
    setPlayLabel('▶ Play'); $('#pgPlay').disabled = true; $('#pgStep').disabled = true;
    setState('progress', 'Waiting on approval');
    logLine('⏸ Waiting for a human’s approval');
    setVoiceStatus('⏸ waiting for approval');

    if (row) {
      row.classList.remove('active'); row.classList.add('waiting');
      openRow(row, true);
      $('.step-state', row).innerHTML = '<span class="step-wait"><span aria-hidden="true">⏸</span> waiting for your OK</span>';
      const inner = $('.step-detail-inner', row);
      const box = document.createElement('div');
      box.className = 'step-hitl';
      box.innerHTML = `<div class="step-hitl-q">🙋 ${esc(step.hitl.prompt)}</div>
        <div class="step-hitl-actions">
          <button class="hitl-mini approve">✓ Approve</button>
          <button class="hitl-mini reject">✗ Reject</button>
        </div>`;
      inner.appendChild(box);
      $('.approve', box).addEventListener('click', () => resolveHitl(step, true));
      $('.reject', box).addEventListener('click', () => resolveHitl(step, false));
      $('.approve', box).focus();
    }
    // mirror prompt in conversation
    mirrorHitlInConversation(step);
  }

  function mirrorHitlInConversation(step) {
    const conv = $('#pgConversation');
    if ($('.pg-empty-conv', conv)) conv.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'msg msg-hitl';
    // the actionable Approve/Reject pair lives in the step row (which holds focus);
    // this conversation copy is a visual mirror, hidden from AT/keyboard to avoid duplicate controls
    el.innerHTML = `<div class="msg-from">Approval needed</div>
      <div class="hitl-q">🙋 ${esc(step.hitl.prompt)}</div>
      <div class="msg-hitl-actions" aria-hidden="true">
        <button class="hitl-mini approve" tabindex="-1">✓ Approve</button>
        <button class="hitl-mini reject" tabindex="-1">✗ Reject</button>
      </div>`;
    conv.appendChild(el); conv.scrollTop = conv.scrollHeight;
    $('.approve', el).addEventListener('click', () => resolveHitl(step, true));
    $('.reject', el).addEventListener('click', () => resolveHitl(step, false));
  }

  function resolveHitl(step, approved) {
    if (!PG.waiting) return;
    PG.waiting = false;
    $('#pgPlay').disabled = false; $('#pgStep').disabled = false;
    // lock the buttons (both in row + conversation)
    $$('.step-hitl-actions, .msg-hitl-actions').forEach(a => {
      a.querySelectorAll('button').forEach(b => { b.disabled = true; });
      a.classList.add('resolved');
    });
    const row = rowEl(step.id);
    if (row) {
      row.classList.remove('waiting'); row.classList.add('done');
      $('.step-state', row).innerHTML = `<span class="step-check" aria-hidden="true" style="color:${approved ? 'var(--auto)' : 'var(--fail)'}">${approved ? '✓' : '✗'}</span><span class="sr-only">${approved ? 'approved' : 'rejected'}</span>`;
      $('.step-dur', row).textContent = 'approval';
    }
    // focus would otherwise drop to <body> when the focused Approve button is disabled
    $('#pgPlay').focus();
    logLine(approved ? '✓ Approved by a human' : '✗ Rejected by a human');
    bumpCounters();

    const targetId = approved ? step.hitl.onApprove : step.hitl.onReject;
    PG.jumpTo = targetId;
    // resume
    PG.playing = true; setPlayLabel('⏸ Pause');
    advance();
  }

  /* ---- finalize ---- */
  function finalizeTerminal(step) {
    const isReject = /reject/i.test(step.id);
    if (isReject) { finalize('closed'); }
    else { finalize(PG.sc.outcome.trueResolution === false ? 'handoff' : 'resolved'); }
  }

  function finalize(kind) {
    PG.finished = true; PG.playing = false; PG.waiting = false; clearTimer();
    setPlayLabel('↺ Replay'); $('#pgPlay').disabled = false; $('#pgStep').disabled = true;
    setVoiceStatus('🎙 done');
    const o = PG.sc.outcome;
    // snap counters
    PG.elapsed = o.elapsedSec; setSla(o.elapsedSec);
    const stamp = $('#pgStamp'); stamp.hidden = false;

    if (kind === 'resolved') {
      setState('resolved', 'Resolved');
      PG.curAuto = o.automationPct; setRing(o.automationPct);
      stamp.className = 'ticket-stamp ok';
      stamp.innerHTML = `<span class="stamp-big">✅ Resolved</span>
        <span class="stamp-sub">${esc(o.resolution)} · ${o.elapsedSec}s · ${o.automationPct}% automated</span>`;
      if (o.proactiveNote) { const pn = $('#pgProactive'); pn.hidden = false; pn.textContent = o.proactiveNote; }
      confetti();
    } else if (kind === 'handoff') {
      setState('handoff', 'Handed to a human');
      PG.curAuto = o.automationPct; setRing(o.automationPct);
      stamp.className = 'ticket-stamp handoff';
      stamp.innerHTML = `<span class="stamp-big">🙋 Handed to a human</span>
        <span class="stamp-sub">${esc(o.resolution)} · full trail attached</span>`;
    } else { // closed (rejected)
      setState('handoff', 'Closed — not approved');
      PG.curAuto = o.automationPct; setRing(o.automationPct);
      stamp.className = 'ticket-stamp handoff';
      stamp.innerHTML = `<span class="stamp-big">🚫 Closed — not approved</span>
        <span class="stamp-sub">Logged with the reason · no changes made</span>`;
    }
    clearMap();
    updateProgress();
  }

  /* ---- tiny confetti (canvas-free, DOM dots) ---- */
  function confetti() {
    if (reduced()) return;
    const colors = ['#1F5CEA', '#22D3EE', '#16A34A', '#7C3AED', '#3B82F6'];
    const card = $('.ticket-card'); if (!card) return;
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5;';
    card.appendChild(host);
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('span');
      const c = colors[i % colors.length];
      const left = Math.round(15 + (i * 37) % 70);
      d.style.cssText = `position:absolute;top:30%;left:${left}%;width:7px;height:7px;background:${c};border-radius:2px;opacity:1;`;
      host.appendChild(d);
      const dx = (((i * 53) % 100) - 50);
      const dy = 120 + (i % 5) * 30;
      const rot = ((i * 71) % 360);
      d.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 900 + (i % 6) * 120, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    }
    setTimeout(() => host.remove(), 1400);
  }

  /* ========================================================
     PLAYGROUND wiring
     ======================================================== */
  function initPlayground() {
    buildScenarioChips();
    buildMap();
    $('#pgPlay').addEventListener('click', play);
    $('#pgStep').addEventListener('click', doStep);
    $('#pgReset').addEventListener('click', resetRun);
    $('#pgSpeed').addEventListener('change', (e) => { PG.speed = parseFloat(e.target.value); });
    $('#pgJsonToggle').addEventListener('click', () => toggleJson(!PG.jsonView));
    $$('.ch-btn').forEach(b => b.addEventListener('click', () => setChannel(b.dataset.channel)));
    $$('.filt-btn').forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter)));

    // deep-link: #play=<id>
    let initial = SCENARIOS[0].id;
    const m = location.hash.match(/play=([\w-]+)/);
    if (m && SCENARIOS.some(s => s.id === m[1])) initial = m[1];
    selectScenario(initial);
  }

  /* tooltips: allow Escape to dismiss while the trigger keeps focus (WCAG 1.4.13) */
  function initTooltips() {
    $$('.tooltip').forEach(t => t.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') t.blur();
    }));
  }

  /* ========================================================
     BOOT
     ======================================================== */
  function boot() {
    initNav();
    initReveal();
    initCounters();
    initPipeline();
    initTooltips();
    buildArch();
    initDeployToggle();
    buildSop();
    buildModularity();
    initPlayground();
    buildChart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
