/* ============================================================
   OKC Command Center — Kiosk Add-on Module
   Handles:
     1. Keep Samsung Tizen 2014 TV awake (silent video + wake lock)
     2. Second-shift break overlays (6:45p 15m, 9:00p 30m, 12:15a 15m)
     3. Rotating photo backgrounds during breaks (Lorem Picsum)
     4. 2:15am farewell screen w/ inspirational + drive-safe message
   All times are local clock (TV should be set to Central).
   Second shift window: 4:15 PM through 2:30 AM next day.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. KEEP-AWAKE (Samsung Tizen 2014 friendly) ---------- */
  function installKeepAwake() {
    var v = document.createElement('video');
    v.id = 'okc-wake-video';
    v.loop = true; v.muted = true; v.autoplay = true;
    v.setAttribute('playsinline', '');
    v.style.cssText =
      'position:fixed;top:0;left:0;width:2px;height:2px;' +
      'opacity:0.01;pointer-events:none;z-index:2147483647;';
    v.src = 'data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUK' +
            'HgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb' +
            '21lFlSua7+uvdeBAXPFh/OeWeOeWeOeWedJqWY2OgIA9jV7VQBAHFO7a1OsggE' +
            'vTbuMU6+zAEO7j7OBALeK94EB8YIVgBcDaWGPiJxAAA==';
    document.body.appendChild(v);

    function kick() {
      try {
        if (v.paused || v.ended) { v.currentTime = 0; }
        var p = v.play();
        if (p && p.catch) p.catch(function(){});
      } catch (e) {}
    }
    kick();
    setInterval(kick, 15000);
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('focus', kick);
    window.addEventListener('pageshow', kick);

    // Fake activity every 30s
    setInterval(function () {
      try {
        window.scrollBy(0, 1); window.scrollBy(0, -1);
        var evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('mousemove', true, false, window,
          0, 1, 1, 1, 1, false, false, false, false, 0, null);
        document.dispatchEvent(evt);
      } catch (e) {}
    }, 30000);

    // Modern Wake Lock API (no-op on old Tizen, active on newer)
    if ('wakeLock' in navigator) {
      var lock = null;
      function getLock() {
        try {
          navigator.wakeLock.request('screen').then(function (l) {
            lock = l;
            l.addEventListener('release', function () { lock = null; });
          }).catch(function(){});
        } catch (e) {}
      }
      getLock();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && !lock) getLock();
      });
    }

    // Safety soft reload every 4 hours
    setTimeout(function(){ try{ location.reload(); }catch(e){} },
               4 * 60 * 60 * 1000);
  }

  /* ---------- 2. OVERLAY DOM + STYLES ---------- */
  function installOverlay() {
    var style = document.createElement('style');
    style.textContent =
      '#okc-overlay{position:fixed;inset:0;z-index:2147483000;' +
        'display:none;align-items:center;justify-content:center;' +
        'background:#000;color:#fff;font-family:"Barlow Condensed","Oswald",' +
        'Impact,sans-serif;overflow:hidden;}' +
      '#okc-overlay.active{display:flex;}' +
      '#okc-bg{position:absolute;inset:0;background-size:cover;' +
        'background-position:center;transition:opacity 1.2s ease;' +
        'opacity:1;filter:brightness(0.55) saturate(1.1);}' +
      '#okc-bg.fade{opacity:0;}' +
      '#okc-overlay .okc-scrim{position:absolute;inset:0;' +
        'background:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,' +
        'rgba(0,0,0,0.75) 100%);}' +
      '#okc-overlay .okc-content{position:relative;text-align:center;' +
        'max-width:90vw;padding:4vh 6vw;}' +
      '#okc-overlay .okc-label{font-size:2.2vw;letter-spacing:0.25em;' +
        'color:#EF6100;font-weight:700;text-transform:uppercase;}' +
      '#okc-overlay .okc-title{font-size:9vw;font-weight:800;line-height:1.0;' +
        'margin:1vh 0 2vh;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,0.7);}' +
      '#okc-overlay .okc-clock{font-family:"Oswald",sans-serif;' +
        'font-size:16vw;font-weight:700;color:#007AC1;line-height:1;' +
        'text-shadow:0 6px 30px rgba(0,122,193,0.5);}' +
      '#okc-overlay .okc-sub{font-size:3vw;margin-top:3vh;color:#fff;' +
        'font-weight:600;letter-spacing:0.08em;}' +
      '#okc-overlay.farewell .okc-title{font-size:7vw;}' +
      '#okc-overlay.farewell .okc-msg{font-size:3.2vw;line-height:1.35;' +
        'color:#fff;margin:3vh auto;max-width:75vw;font-weight:500;' +
        'font-style:italic;}' +
      '#okc-overlay.farewell .okc-drive{font-size:4vw;margin-top:4vh;' +
        'color:#FFC72C;font-weight:800;letter-spacing:0.12em;}' +
      '#okc-overlay .okc-brand{position:absolute;bottom:3vh;right:4vw;' +
        'font-size:1.3vw;color:#fff;opacity:0.7;letter-spacing:0.2em;' +
        'text-transform:uppercase;}';
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'okc-overlay';
    overlay.innerHTML =
      '<div id="okc-bg"></div>' +
      '<div class="okc-scrim"></div>' +
      '<div class="okc-content">' +
        '<div class="okc-label" id="okc-label">Break Time</div>' +
        '<div class="okc-title" id="okc-title">Enjoy Your Break</div>' +
        '<div class="okc-clock" id="okc-clock">00:00</div>' +
        '<div class="okc-sub" id="okc-sub">remaining</div>' +
        '<div class="okc-msg" id="okc-msg" style="display:none"></div>' +
        '<div class="okc-drive" id="okc-drive" style="display:none"></div>' +
      '</div>' +
      '<div class="okc-brand">SupplyOne OKC — Southwest Region</div>';
    document.body.appendChild(overlay);
  }

  /* ---------- 3. PHOTO ROTATION ---------- */
  // Uses Lorem Picsum (no API key). Seed changes = new image guaranteed.
  // Each break gets a distinct seed-set so successive breaks don't repeat.
  function photoUrl(seed) {
    return 'https://picsum.photos/seed/okc' + seed + '/1920/1080';
  }
  var photoTimer = null;
  var photoSeedCursor = Math.floor(Date.now() / 1000); // unique per session
  function startPhotoRotation() {
    stopPhotoRotation();
    var bg = document.getElementById('okc-bg');
    function swap() {
      photoSeedCursor++;
      var next = photoUrl(photoSeedCursor);
      var img = new Image();
      img.onload = function () {
        bg.classList.add('fade');
        setTimeout(function () {
          bg.style.backgroundImage = 'url("' + next + '")';
          bg.classList.remove('fade');
        }, 1200);
      };
      img.onerror = function(){}; // silent
      img.src = next;
    }
    swap();                        // initial
    photoTimer = setInterval(swap, 10000); // rotate every 10s during break
  }
  function stopPhotoRotation() {
    if (photoTimer) { clearInterval(photoTimer); photoTimer = null; }
  }

  /* ---------- 4. SCHEDULE ENGINE ---------- */
  // All times LOCAL (TV configured to Central).
  // Break entries: startHour, startMin, durationMin, label, title
  var BREAKS_2ND = [
    { h: 18, m: 45, dur: 15, label: 'Second Shift Break',  title: 'Take 15 — You Earned It' },
    { h: 21, m:  0, dur: 30, label: 'Second Shift Lunch',  title: 'Lunch Break — 30 Minutes' },
    { h:  0, m: 15, dur: 15, label: 'Second Shift Break',  title: 'Final 15 — Finish Strong' }
  ];
  var FAREWELL = { h: 2, m: 15, dur: 15 };

  function nowLocal() {
    var d = new Date();
    return { d: d, mins: d.getHours() * 60 + d.getMinutes(), sec: d.getSeconds() };
  }

  function activeBreak() {
    var n = nowLocal();
    for (var i = 0; i < BREAKS_2ND.length; i++) {
      var b = BREAKS_2ND[i];
      var start = b.h * 60 + b.m;
      var end = start + b.dur;
      if (n.mins >= start && n.mins < end) {
        var endTotal = end;
        var remainingMin = endTotal - n.mins - 1;
        var remainingSec = 60 - n.sec;
        if (remainingSec === 60) { remainingSec = 0; remainingMin += 1; }
        return { brk: b, remMin: remainingMin, remSec: remainingSec };
      }
    }
    return null;
  }

  function activeFarewell() {
    var n = nowLocal();
    var start = FAREWELL.h * 60 + FAREWELL.m;
    var end = start + FAREWELL.dur;
    return (n.mins >= start && n.mins < end);
  }

  /* ---------- 5. RENDER LOOP ---------- */
  var currentMode = null; // 'break' | 'farewell' | null
  var currentBreakKey = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  var FAREWELL_MESSAGES = [
    'Another shift in the books — thank you for showing up, pushing hard, and taking care of each other. The work you did tonight keeps this plant running and our customers served. We see it and we appreciate it.',
    'Every box, every pallet, every safe move you made tonight mattered. Thank you for the effort and the attitude — that is what makes SupplyOne OKC different.',
    'Thank you for a strong shift. You gave us your time, your energy, and your skill — and it shows. Rest up tonight; you earned every minute of it.'
  ];
  function pickFarewell() {
    var idx = Math.floor(Math.random() * FAREWELL_MESSAGES.length);
    return FAREWELL_MESSAGES[idx];
  }

  function showBreak(info) {
    var ov = document.getElementById('okc-overlay');
    ov.classList.remove('farewell');
    ov.classList.add('active');
    document.getElementById('okc-label').textContent = info.brk.label;
    document.getElementById('okc-title').textContent = info.brk.title;
    document.getElementById('okc-clock').style.display = '';
    document.getElementById('okc-sub').style.display = '';
    document.getElementById('okc-msg').style.display = 'none';
    document.getElementById('okc-drive').style.display = 'none';
    document.getElementById('okc-clock').textContent =
      pad(info.remMin) + ':' + pad(info.remSec);
  }

  function showFarewell() {
    var ov = document.getElementById('okc-overlay');
    ov.classList.add('active');
    ov.classList.add('farewell');
    document.getElementById('okc-label').textContent = 'End of Shift';
    document.getElementById('okc-title').textContent = 'Thank You, Team';
    document.getElementById('okc-clock').style.display = 'none';
    document.getElementById('okc-sub').style.display = 'none';
    var msg = document.getElementById('okc-msg');
    msg.style.display = '';
    if (!msg.dataset.set) {
      msg.textContent = pickFarewell();
      msg.dataset.set = '1';
    }
    var drive = document.getElementById('okc-drive');
    drive.style.display = '';
    drive.textContent = 'Drive safely — get home safe. See you tomorrow.';
  }

  function hideOverlay() {
    var ov = document.getElementById('okc-overlay');
    ov.classList.remove('active');
    ov.classList.remove('farewell');
    var msg = document.getElementById('okc-msg');
    if (msg) msg.dataset.set = '';
  }

  function tick() {
    var brkInfo = activeBreak();
    var fare = activeFarewell();

    if (brkInfo) {
      var key = brkInfo.brk.h + ':' + brkInfo.brk.m;
      if (currentMode !== 'break' || currentBreakKey !== key) {
        currentMode = 'break';
        currentBreakKey = key;
        showBreak(brkInfo);
        startPhotoRotation();
      } else {
        // Update countdown only
        document.getElementById('okc-clock').textContent =
          pad(brkInfo.remMin) + ':' + pad(brkInfo.remSec);
      }
    } else if (fare) {
      if (currentMode !== 'farewell') {
        currentMode = 'farewell';
        currentBreakKey = null;
        showFarewell();
        startPhotoRotation();
      }
    } else {
      if (currentMode !== null) {
        currentMode = null;
        currentBreakKey = null;
        stopPhotoRotation();
        hideOverlay();
      }
    }
  }

  /* ---------- 6. BOOT ---------- */
  function boot() {
    installKeepAwake();
    installOverlay();
    tick();
    setInterval(tick, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
