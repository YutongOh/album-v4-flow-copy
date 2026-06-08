
const D = {
  cameraSectionH: 88,
  effectsSectionH: 80,
  recentsH: 52,
  tabSectionH: 42,
  navTitleInsetH: 88,
  cameraHideMs: 200,
  cameraShowMs: 250,
  panelEnterMs: 300,
  easeInOut: 'cubic-bezier(0.25, 0, 0.25, 1)',
  easeOutStandard: 'cubic-bezier(0.33, 0.86, 0.2, 1)',
  navDraftsSlide: 32,
  navCameraSlide: 44,
};

const els = {
  album: document.getElementById('screen-album'),
  capture: document.getElementById('screen-capture'),
  albumScroll: document.getElementById('albumScroll'),
  cameraHeader: document.getElementById('cameraHeader'),
  cameraSlot: document.getElementById('cameraSlot'),
  cameraInner: document.getElementById('cameraInner'),
  navDrafts: document.getElementById('navDrafts'),
  navCamera: document.getElementById('navCamera'),
  navTitle: document.getElementById('navTitle'),
  tabsSection: document.getElementById('tabsSection'),
  tabPinnedOverlay: document.getElementById('tabPinnedOverlay'),
  effectsPresetsScroll: document.getElementById('effectsPresetsScroll'),
  capPanel: document.getElementById('capPanel'),
  capPreview: document.getElementById('capPreview'),
  capGrid: document.getElementById('capGrid'),
};

let navSwitched = false;
let navProgress = 0;
let tabPinned = false;
let selectedAlbumTab = 0;
let selectedCapTab = 0;
let selectedCapEffect = -1;
let flipped = false;
let navAnimating = false;
let scrollDebugEl = null;

function clamp(v, lo = 0, hi = 1) { return Math.min(hi, Math.max(lo, v)); }

function navFrame(t) {
  t = clamp(t);
  return {
    draftsAlpha: 1 - t,
    cameraAlpha: t,
    draftsSlide: -t * D.navDraftsSlide,
    cameraSlide: (1 - t) * D.navCameraSlide,
  };
}

function applyNavVisuals(t, animate) {
  const n = navFrame(t);
  const dur = navSwitched ? D.cameraHideMs : D.cameraShowMs;
  const trans = animate ? `${dur}ms ${D.easeInOut}` : 'none';

  els.navDrafts.style.transition = animate ? `transform ${trans}, opacity ${trans}` : 'none';
  els.navCamera.style.transition = animate ? `transform ${trans}, opacity ${trans}` : 'none';
  els.navDrafts.style.opacity = String(n.draftsAlpha);
  els.navDrafts.style.transform = `translateY(${n.draftsSlide}px)`;
  els.navCamera.style.opacity = String(n.cameraAlpha);
  els.navCamera.style.transform = `translateY(${n.cameraSlide}px)`;
  navProgress = t;
  updateNavCameraHitTarget();
}

function setNavSwitched(switched, animate = true) {
  if (navSwitched === switched) return;
  navSwitched = switched;
  applyNavVisuals(switched ? 1 : 0, animate);
  if (animate) {
    navAnimating = true;
    const ms = switched ? D.cameraHideMs : D.cameraShowMs;
    clearTimeout(setNavSwitched._timer);
    setNavSwitched._timer = setTimeout(() => {
      navAnimating = false;
      updateScrollDebug();
    }, ms + 20);
  }
  updateScrollDebug();
}

function isCameraEntryObscured() {
  return els.albumScroll.scrollTop >= D.cameraSectionH - 1;
}

function syncNavFromScroll() {
  setNavSwitched(isCameraEntryObscured(), true);
}

function isTabPinned() {
  if (!els.tabsSection || !els.albumScroll) return false;
  const scrollRect = els.albumScroll.getBoundingClientRect();
  const tabsRect = els.tabsSection.getBoundingClientRect();
  return tabsRect.top < scrollRect.top - 0.5;
}

function setTabPinned(pinned) {
  if (tabPinned === pinned) return;
  tabPinned = pinned;
  els.tabPinnedOverlay?.classList.toggle('visible', pinned);
  els.tabsSection?.classList.toggle('tabs-hidden', pinned);
  els.navTitle?.classList.toggle('visible', pinned);
  updateScrollDebug();
}

function syncTabPinFromScroll() {
  setTabPinned(isTabPinned());
}

function isListAtTop() {
  return els.albumScroll.scrollTop <= 1;
}

function updateScrollDebug() {
  if (!scrollDebugEl) return;
  scrollDebugEl.textContent = [
    `scrollTop: ${Math.round(els.albumScroll.scrollTop)}`,
    `cameraObscured: ${isCameraEntryObscured()}`,
    `navSwitched: ${navSwitched}`,
    `tabPinned: ${tabPinned}`,
    `navProgress: ${navProgress.toFixed(2)}`,
    `animating: ${navAnimating}`,
    `threshold: ${D.cameraSectionH}px`,
    `tabPin ~${D.cameraSectionH + D.effectsSectionH + D.recentsH}px`,
    `fold ${D.cameraHideMs}ms / unfold ${D.cameraShowMs}ms easeInOut`,
  ].join('\n');
}

function setupScrollDebug() {
  if (!/[?&]debug(=1)?(?:&|$)/.test(location.search)) return;
  scrollDebugEl = document.createElement('div');
  scrollDebugEl.id = 'scrollDebug';
  document.querySelector('.phone').appendChild(scrollDebugEl);
  updateScrollDebug();
}

function setupAlbumScroll() {
  els.albumScroll.addEventListener('scroll', () => {
    syncNavFromScroll();
    syncTabPinFromScroll();
    updateScrollDebug();
  }, { passive: true });
  syncTabPinFromScroll();
}

function setupEffectsPresetsScroll() {
  const el = els.effectsPresetsScroll;
  if (!el) return;
  const sync = () => {
    el.classList.toggle('is-scrolled', el.scrollLeft > 0.5);
  };
  el.addEventListener('scroll', sync, { passive: true });
  sync();
}

function setupAlbumTabs() {
  document.querySelectorAll('.tab-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedAlbumTab = Number(btn.dataset.tab);
      document.querySelectorAll('.tab-item').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.tab) === selectedAlbumTab);
      });
    });
  });
}

function updateNavCameraHitTarget() {
  const btn = document.getElementById('navCameraBtn');
  if (btn) btn.style.pointerEvents = navProgress >= 0.5 ? 'auto' : 'none';
}

const CAPTURE_TABS = ["Trending","New","Tool","Create","Hot","Hot","Hot","Hot","Hot","Hot","Hot"];

function layoutCapTabs() {
  const scroll = document.getElementById('capTabScroll');
  scroll.querySelectorAll('.cap-tab').forEach((btn) => {
    const i = Number(btn.dataset.tab);
    const active = i === selectedCapTab;
    btn.classList.toggle('active', active);
    if (active) {
      btn.innerHTML = `<span class="cap-tab-block"><span class="cap-tab-top"></span><span class="cap-tab-body"><span>${CAPTURE_TABS[i]}</span><span class="cap-tab-ind"></span></span></span>`;
    } else {
      btn.textContent = CAPTURE_TABS[i];
    }
    btn.onclick = () => { selectedCapTab = i; layoutCapTabs(); };
  });
}

function selectCapEffect(index) {
  selectedCapEffect = index;
  els.capGrid.querySelectorAll('.cap-effect').forEach((b) => {
    b.classList.toggle('selected', index >= 0 && Number(b.dataset.i) === index);
  });
}

function resetCaptureState() {
  selectedCapTab = 0;
  flipped = false;
  els.capPreview.classList.remove('flipped');
  document.getElementById('capMusic').classList.remove('hidden');
  selectCapEffect(-1);
  layoutCapTabs();
  els.capPanel.style.transition = 'none';
  els.capPanel.style.transform = 'translateY(346px)';
}

function playCapturePanelEnter() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    els.capPanel.style.transition = `transform ${D.panelEnterMs}ms ${D.easeOutStandard}`;
    els.capPanel.style.transform = 'translateY(0)';
  }));
}

function openCapture() {
  resetCaptureState();
  els.album.classList.remove('active');
  els.capture.classList.add('active');
  playCapturePanelEnter();
}

function closeCapture() {
  els.capture.classList.remove('active');
  els.album.classList.add('active');
}

function initCapture() {
  document.getElementById('capBack').addEventListener('click', closeCapture);
  document.getElementById('capFlip').addEventListener('click', () => {
    flipped = !flipped;
    els.capPreview.classList.toggle('flipped', flipped);
  });
  document.getElementById('capMusicClose').addEventListener('click', () => {
    document.getElementById('capMusic').classList.add('hidden');
  });
  els.capGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.cap-effect');
    if (!btn) return;
    selectCapEffect(Number(btn.dataset.i));
  });
  layoutCapTabs();
}

document.getElementById('navCameraBtn').addEventListener('click', () => {
  if (navProgress < 0.5) return;
  els.albumScroll.scrollTo({ top: 0, behavior: 'smooth' });
});

applyNavVisuals(0, false);
setupScrollDebug();
setupAlbumScroll();
setupEffectsPresetsScroll();
setupAlbumTabs();
initCapture();
