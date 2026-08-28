/* ═══════════════════════════════════════════════════════════
   BONKERS EDITION – main.js
   Eine zentrale rAF-Loop, alles Weitere sind Module:
   i18n · Kinetik-Typo · Canvas · Parallax ·
   Pin-Scroll · Tilt · Magnetics · Eggs.
   Reduced Motion legt alle Bewegung still.
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var docEl = document.documentElement;
  docEl.classList.remove('no-js');
  docEl.classList.add('js');

  /* ── Utils ── */
  function $(s, c){ return (c || document).querySelector(s); }
  function $$(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t){ return a + (b - a) * t; }
  var reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var finePtr = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* Test-/Review-Parameter: ?anim=0 schaltet Transitions/Animationen ab. */
  var qs = null;
  try{ qs = new URLSearchParams(location.search); }catch(e){}
  var noAnim = !!(qs && qs.get('anim') === '0');
  if(noAnim) docEl.classList.add('noanim');
  var qsTheme = (qs && (qs.get('theme') === 'light' || qs.get('theme') === 'dark')) ? qs.get('theme') : null;
  /* ?egg=1: Terminal-Modus direkt ansehen (Debug/Vorschau, ohne Konami) */
  if(qs && qs.get('egg') === '1') docEl.setAttribute('data-egg', 'terminal');

  /* Module können auf Theme-Wechsel reagieren (z. B. Canvas-Farben) */
  var themeHooks = [];

  /* ?goto=<id>: direkt dorthin springen (Headless-Screenshots).
     Sofort + nochmal bei load, falls sich das Layout noch setzt. */
  function gotoTarget(){
    if(!(qs && qs.get('goto'))) return;
    var t = document.getElementById(qs.get('goto'));
    if(t) t.scrollIntoView({block:'start', behavior:'auto'});
  }

  /* ?strip=a,b,c: Feature-Bisektion fürs Headless-Debugging */
  if(qs && qs.get('strip')){
    var strip = qs.get('strip').split(',');
    var css = '';
    if(strip.indexOf('grain') >= 0)  css += '.grain{display:none!important}';
    if(strip.indexOf('ghost') >= 0)  css += '.ghost{display:none!important}';
    if(strip.indexOf('canvas') >= 0) css += '.hero-canvas{display:none!important}';
    if(strip.indexOf('filter') >= 0) css += '.hero-canvas{filter:none!important}';
    if(strip.indexOf('blend') >= 0)  css += '*{mix-blend-mode:normal!important}';
    if(strip.indexOf('stroke') >= 0) css += '*{-webkit-text-stroke:0!important; color:inherit}';
    if(strip.indexOf('mq') >= 0)     css += '.mq,.foot-mq{display:none!important}';
    if(strip.indexOf('mqrot') >= 0)  css += '.mq{rotate:none!important; scale:none!important}';
    if(strip.indexOf('mqwc') >= 0)   css += '.mq-track,.foot-mq-track{will-change:auto!important}';
    if(strip.indexOf('wc') >= 0)     css += '*{will-change:auto!important}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ?probe=1: Layout-Maße in den <title> schreiben (nur fürs Headless-Debugging) */
  if(qs && qs.get('probe') === '1'){
    setTimeout(function(){
      try{
        var out = ['y=' + Math.round(window.scrollY), 'vh=' + innerHeight, 'docH=' + Math.round(document.documentElement.scrollHeight)];
        var hin = $('.hero-inner'), hft = $('.hero-foot'), hmg = $('#heroMega');
        if(hin) out.push('innerBtm=' + Math.round(hin.getBoundingClientRect().bottom));
        if(hft) out.push('footH=' + hft.offsetHeight);
        if(hmg) out.push('megaH=' + Math.round(hmg.getBoundingClientRect().height) + ' fs=' + ($('.h-line', hmg) ? $('.h-line', hmg).style.fontSize : '?'));
        ['about', 'career', 'work', 'contact'].forEach(function(id){
          var el = document.getElementById(id);
          if(el) out.push(id + '@' + Math.round(el.getBoundingClientRect().top + window.scrollY));
        });
        var t = $('#about .sec-title');
        if(t){
          var r = t.getBoundingClientRect(), cs = getComputedStyle(t);
          out.push('title:' + Math.round(r.top + window.scrollY) + '/' + Math.round(r.width) + 'x' + Math.round(r.height) + ' op=' + cs.opacity + ' col=' + cs.color + ' fs=' + cs.fontSize + ' txt=' + (t.textContent || '').slice(0, 18));
          var inner = $('.line-inner', t);
          if(inner){ var ics = getComputedStyle(inner); out.push('inner: op=' + ics.opacity + ' tf=' + ics.transform + ' col=' + ics.color); }
        }
        var card = $('.tcard');
        if(card){ var cr = card.getBoundingClientRect(); out.push('card:' + Math.round(cr.top + window.scrollY) + ' op=' + getComputedStyle(card).opacity); }
        var ct = document.getElementById('contact');
        if(ct) out.push('contactBg=' + getComputedStyle(ct).backgroundColor);
        var mm = $('.mail-mega');
        if(mm) out.push('mailCol=' + getComputedStyle(mm).color);
        var mqEl = $('.mq');
        if(mqEl) out.push('mqBg=' + getComputedStyle(mqEl).backgroundColor);
        var tc2 = $$('.tcard')[1];
        if(tc2) out.push('card2Bg=' + getComputedStyle(tc2).backgroundImage.slice(0, 40));
        document.title = 'PROBE ' + out.join(' | ');
      }catch(e){ document.title = 'PROBE ERR ' + e.message; }
    }, 2500);
  }

  /* ── Eine rAF-Loop für alles ── */
  var frameFns = [];
  function onFrame(fn){ frameFns.push(fn); }
  var masterFrame = 0;
  function master(t){
    masterFrame = 0;
    for(var i = 0; i < frameFns.length; i++) frameFns[i](t || 0);
    if(!document.hidden) masterFrame = requestAnimationFrame(master);
  }
  function startMaster(){
    if(!document.hidden && !masterFrame) masterFrame = requestAnimationFrame(master);
  }
  function syncMaster(){
    if(document.hidden && masterFrame){
      cancelAnimationFrame(masterFrame);
      masterFrame = 0;
    } else {
      startMaster();
    }
  }
  document.addEventListener('visibilitychange', syncMaster);
  startMaster();

  /* ═══════════════ i18n ═══════════════
     Texte 1:1 von danielmartin.fyi übernommen.
     Werte dürfen HTML enthalten (innerHTML). Impressum bleibt rechtlich auf Deutsch. */
  var I18N = {
    de:{
      "meta.title":"Daniel Martin – Content und AI Strategist",
      "meta.desc":"Daniel Martin, Content und AI Strategist aus Köln. Ich mache komplexe Themen verständlich und wirksam: Content-Strategie für komplexe Themen, KI und Change.",
      "nav.about":"Über mich", "nav.career":"Werdegang", "nav.work":"Projekte", "nav.contact":"Kontakt", "nav.cta":"Kontakt",
      "skip.link":"Zum Inhalt springen",
      "menu.label":"Menü", "menu.close":"Schließen",
      "career.srhint":"Berufliche Stationen in chronologischer Reihenfolge, die aktuellste zuerst.",
      "hero.eyebrow":"Content Strategy, Copy &amp; AI · Köln",
      "hero.l1":"Klartexten.", "hero.l2":"Vordenken.",
      "hero.lead":"Hi! Ich bin Daniel, Content und AI Strategist mit tiefen Wurzeln in der B2B-Kommunikation. Damit bereite ich komplexe Themen so auf, dass die richtige Zielgruppe sie versteht und nutzen kann: Deine!",
      "hero.cta1":"So arbeite ich", "hero.cta2":"Kontakt",
      "hero.scroll":"Scroll",
      "about.num":"01 / Über mich", "about.title":"Verständlichkeit ist kein Zufall.",
      "about.lead":"Neugier treibt mich an. Ich übersetze einfach gerne: aus Komplexität wird Klarheit. Dieses Urteilsvermögen ist auch <i>die</i> Kernkompetenz im KI-Zeitalter.",
      "about.b1t":"Texte mit Tiefe",
      "about.b1d":"Ich schreibe nicht für dich, sondern für dein Publikum: durchdringen, abwägen, auf den Punkt bringen. Tiefe &gt; Buzzwords, immer.",
      "about.b2t":"Sichtbar für Mensch und Maschine",
      "about.b2d":"Inhalte, die ankommen: bei deiner Zielgruppe genauso wie bei den KI-Systemen, die sie finden und zitieren sollen. SEO, GEO? Kenn ich, kann ich.",
      "about.b3t":"Und wenn ich afk bin?",
      "about.b3d":"Dann findest du mich auf dem Badminton-Court, im Kino oder in der nächsten Multiplayer-Lobby. Bekennender <span class='geek'>Geek</span>, lange vor ChatGPT.",
      "career.num":"02 / Werdegang", "career.title":"Wo ich herkomme.",
      "career.lead":"Vier Stationen, ein roter Faden: komplexe Themen verständlich machen.",
      "cv1.year":"seit 2026", "cv1.org":"Convidera, Köln", "cv1.role":"AI Content Marketing Lead",
      "cv2.year":"2025–26", "cv2.org":"Comma Soft, Bonn", "cv2.role":"Senior Redakteur, Content &amp; Kampagnen",
      "cv3.year":"2019–25", "cv3.org":"palmerhargreaves, Köln", "cv3.role":"Editor → Senior Editor · B2B-Agentur",
      "cv4.year":"2015–19", "cv4.org":"next level, Köln", "cv4.role":"Online-Redaktion &amp; Marketing",
      "cv5.year":"2011–18", "cv5.org":"Uni Köln &amp; Bonn", "cv5.role":"B.A. Medienkulturwissenschaft, M.A. Medienwissenschaft",
      "work.num":"03 / Projekte", "work.title":"Ausgewählte Projekte.",
      "work.intro":"Fünf Beispiele, wie Content, KI und Change in der Praxis zusammenspielen.",
      "work.more":"Weitere Projekte anzeigen", "work.less":"Weniger anzeigen",
      "case1.title":"Relaunch alan.de", "case1.meta":"GenAI-Plattform · SEA · Leadstrecken · PR",
      "case1.desc":"Alan ist die souveräne, in Deutschland gehostete KI-Plattform für Unternehmen und KRITIS. Für den Relaunch habe ich alle Inhalte verantwortet: von SEA-Copy und Leadstrecken bis zu Blog, Social und PR.",
      "case2.title":"Corporate-Magazin „Reisebericht“", "case2.meta":"Comma Soft · Redaktionsleitung · KI-Workflow",
      "case2.desc":"Der „Reisebericht“ von Comma Soft bringt Entscheider:innen Themen wie KI-Agenten und digitale Souveränität näher. Ich habe die Redaktion geleitet und einen KI-Workflow aufgesetzt: mehr Tempo, gleiche redaktionelle Tiefe.",
      "case3.title":"Agiler Change bei palmerhargreaves", "case3.meta":"B2B-Agentur · Change · Agilisierung · KI",
      "case3.desc":"palmerhargreaves ist eine B2B-Agentur mit Kunden aus Telko, Big Four, Automotive und Life Science. Ich habe den Wandel begleitet und kommuniziert: agilere Zusammenarbeit und KI-Enablement, im eigenen Team wie für Kunden.",
      "case4.title":"C-Level-Positionierung", "case4.meta":"Ghostwriting · Social &amp; PR · anonym",
      "case4.desc":"Für Führungskräfte vom CISO bis zum CEO entwickle ich Positionierung und Stimme: auf LinkedIn und in der Presse. Zu den Kunden zählten unter anderem eine Fluglinie, eine Big-Four-Beratung und ein großer Telko-Konzern.",
      "case5.title":"Messe-Narrativ für einen Telko-Konzern", "case5.meta":"Telko-Konzern · Narrativ · Bühnenprogramm",
      "case5.desc":"Für den internationalen Messeauftritt eines großen Telko-Konzerns habe ich das übergreifende Narrativ entwickelt, dazu Briefings für die Moderation und die thematische Koordination der Speaker-Slots.",
      "case.view":"Projekt ansehen ↗", "case.talk":"Mehr im Gespräch →",
      "contact.num":"04 / Kontakt", "contact.title":"Lass uns reden.",
      "contact.lead":"Content-Strategie, KI im Arbeitsalltag oder eine Transformation, die begleitet werden will: Bei dir steht etwas davon an? Dann freue ich mich über deine Nachricht.",
      "contact.mailto":"mailto:hallo@danielmartin.fyi?subject=Anfrage%20%C3%BCber%20danielmartin.fyi&body=Hallo%20Daniel%2C%0D%0A%0D%0A%0D%0AViele%20Gr%C3%BC%C3%9Fe",
      "contact.copy":"E-Mail kopieren", "contact.copied":"E-Mail-Adresse kopiert.", "contact.copyfail":"Kopieren nicht möglich – bitte Adresse markieren.",
      "contact.time":"Ortszeit Köln",
      "foot.rights":"© 2026 Daniel Martin",
      "foot.built":"Gebaut mit HTML, CSS &amp; etwas KI. Kein Tracking, keine Cookies.",
      "foot.top":"Nach oben",
      "img.portrait":"Daniel Martin, Content und AI Strategist, Portrait",
      "img.case1":"alan.de, Kommunikation für eine sichere KI-Plattform",
      "img.case2":"Reisebericht, das Corporate-Magazin für Vorreiter, Comma Soft",
      "img.case3":"palmerhargreaves, B2B-Agentur in Köln",
      "img.case4":"C-Level-Positionierung und Thought Leadership",
      "img.case5":"Messeauftritt eines Telko-Konzerns",
      "impressum.summary":"Impressum &amp; Datenschutz",
      "aria.home":"Daniel Martin – Startseite", "aria.menu":"Menü", "aria.theme.light":"Zum hellen Modus wechseln", "aria.theme.dark":"Zum dunklen Modus wechseln"
    },
    en:{
      "meta.title":"Daniel Martin – Content and AI Strategist",
      "meta.desc":"Daniel Martin, content and AI strategist based in Cologne. I make complex topics clear and effective: content strategy, AI and change.",
      "nav.about":"About", "nav.career":"Career", "nav.work":"Work", "nav.contact":"Contact", "nav.cta":"Contact",
      "skip.link":"Skip to content",
      "menu.label":"Menu", "menu.close":"Close",
      "career.srhint":"Career stations in chronological order, most recent first.",
      "hero.eyebrow":"Content Strategy, Copy &amp; AI · Cologne",
      "hero.l1":"Make it clear.", "hero.l2":"Make it count.",
      "hero.lead":"Hi! I'm Daniel, a content and AI strategist with deep roots in B2B communications. That's how I shape complex topics so the right audience understands and can use them: yours.",
      "hero.cta1":"How I work", "hero.cta2":"Get in touch",
      "hero.scroll":"Scroll",
      "about.num":"01 / About", "about.title":"Clarity is no accident.",
      "about.lead":"Curiosity drives me. I simply enjoy translating: complexity becomes clarity. That judgment is also <i>the</i> core skill of the AI age.",
      "about.b1t":"Editor at the core",
      "about.b1d":"I think from the reader's side: get to the heart of it, weigh the angles, make the point. Depth beats buzzword, every time.",
      "about.b2t":"Found by people and machines",
      "about.b2d":"Content that lands: with your audience and with the AI systems meant to find and cite it. SEO, GEO? Been there, done that.",
      "about.b3t":"And when I'm afk?",
      "about.b3d":"You'll find me on the badminton court, at the cinema, or in the next multiplayer lobby. I was a <span class='geek'>geek</span> long before ChatGPT.",
      "career.num":"02 / Career", "career.title":"Where I'm coming from.",
      "career.lead":"Four stops, one thread: making complex topics clear.",
      "cv1.year":"since 2026", "cv1.org":"Convidera, Cologne", "cv1.role":"AI Content Marketing Lead",
      "cv2.year":"2025–26", "cv2.org":"Comma Soft, Bonn", "cv2.role":"Senior Editor, Content &amp; Campaigns",
      "cv3.year":"2019–25", "cv3.org":"palmerhargreaves, Cologne", "cv3.role":"Editor → Senior Editor · B2B agency",
      "cv4.year":"2015–19", "cv4.org":"next level, Cologne", "cv4.role":"Online editorial &amp; marketing",
      "cv5.year":"2011–18", "cv5.org":"Cologne &amp; Bonn University", "cv5.role":"B.A. Media &amp; Culture Studies, M.A. Media Studies",
      "work.num":"03 / Work", "work.title":"Selected work.",
      "work.intro":"Five examples of how content, AI and change come together in practice.",
      "work.more":"Show more projects", "work.less":"Show fewer",
      "case1.title":"alan.de relaunch", "case1.meta":"GenAI platform · SEA · lead funnels · PR",
      "case1.desc":"Alan is the sovereign, German-hosted AI platform for enterprises and critical-infrastructure (KRITIS) operators. For the relaunch I owned all content: from SEA copy and lead funnels to blog, social and PR.",
      "case2.title":"'Reisebericht' corporate magazine", "case2.meta":"Comma Soft · editorial lead · AI workflow",
      "case2.desc":"Comma Soft's 'Reisebericht' brings topics like AI agents and digital sovereignty to decision-makers. I led the editorial side and set up an AI workflow: more speed, the same editorial depth.",
      "case3.title":"Agile change at palmerhargreaves", "case3.meta":"B2B agency · change · agile · AI",
      "case3.desc":"palmerhargreaves is a B2B agency serving telco, Big Four, automotive and life science clients. I guided and communicated the change: more agile collaboration and AI enablement, within the team and for clients.",
      "case4.title":"C-level positioning", "case4.meta":"Ghostwriting · social &amp; PR · anonymous",
      "case4.desc":"For leaders from CISO to CEO, I develop positioning and voice: on LinkedIn and in the press. Clients have included an airline, a Big Four consultancy and a major telco group.",
      "case5.title":"Trade-fair narrative for a telco group", "case5.meta":"Telco group · narrative · stage programme",
      "case5.desc":"For the international trade-fair presence of a major telco group, I developed the overarching narrative, plus hosting briefs and the thematic coordination of the speaker slots.",
      "case.view":"View project ↗", "case.talk":"Let's talk →",
      "contact.num":"04 / Contact", "contact.title":"Let's talk.",
      "contact.lead":"Content strategy, AI in day-to-day work, or support with change: is one of those on your agenda right now? Then I'd be glad to hear from you.",
      "contact.mailto":"mailto:hallo@danielmartin.fyi?subject=Inquiry%20via%20danielmartin.fyi&body=Hi%20Daniel%2C%0D%0A%0D%0A%0D%0ABest%20regards",
      "contact.copy":"Copy email", "contact.copied":"Email address copied.", "contact.copyfail":"Could not copy – please select the address.",
      "contact.time":"Cologne local time",
      "foot.rights":"© 2026 Daniel Martin",
      "foot.built":"Built with HTML, CSS &amp; a little AI. No tracking, no cookies.",
      "foot.top":"Back to top",
      "img.portrait":"Daniel Martin, content and AI strategist, portrait",
      "img.case1":"alan.de, communications for a secure AI platform",
      "img.case2":"Reisebericht, the corporate magazine for frontrunners, Comma Soft",
      "img.case3":"palmerhargreaves, B2B agency in Cologne",
      "img.case4":"C-level positioning and thought leadership",
      "img.case5":"Trade-fair presence of a telco group",
      "impressum.summary":"Imprint &amp; Privacy",
      "aria.home":"Daniel Martin – home", "aria.menu":"Menu", "aria.theme.light":"Switch to light mode", "aria.theme.dark":"Switch to dark mode"
    }
  };

  var curLang = 'de';

  function applyLang(lang){
    var dict = I18N[lang] || I18N.de;
    curLang = (I18N[lang] ? lang : 'de');
    docEl.lang = curLang;
    $$('[data-i18n]').forEach(function(el){
      var v = dict[el.getAttribute('data-i18n')];
      if(v != null) el.innerHTML = v;
    });
    /* Frisch gesetzte Titel als Split-Quelle sichern */
    splitEls.forEach(function(el){ el.dataset.orig = el.textContent.replace(/\s+/g, ' ').trim(); });
    $$('[data-i18n-line]').forEach(function(el){
      var v = dict[el.getAttribute('data-i18n-line')];
      if(v != null) el.textContent = v;
    });
    $$('[data-i18n-meta]').forEach(function(el){
      var v = dict[el.getAttribute('data-i18n-meta')];
      if(v != null) el.innerHTML = v.split(' · ').map(function(t){ return '<i>' + t + '</i>'; }).join('');
    });
    $$('[data-i18n-alt]').forEach(function(el){
      var v = dict[el.getAttribute('data-i18n-alt')];
      if(v != null) el.setAttribute('alt', v);
    });
    $$('[data-i18n-href]').forEach(function(el){
      var v = dict[el.getAttribute('data-i18n-href')];
      if(v != null) el.setAttribute('href', v);
    });
    $$('[data-i18n-aria]').forEach(function(el){
      var v = dict[el.getAttribute('data-i18n-aria')];
      if(v != null) el.setAttribute('aria-label', v);
    });
    if(dict['meta.title']) document.title = dict['meta.title'];
    var md = $('meta[name="description"]');
    if(md && dict['meta.desc']) md.setAttribute('content', dict['meta.desc']);
    $$('.lang button').forEach(function(b){
      var active = b.getAttribute('data-lang') === curLang;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    renderThemeButtons();
    try{ localStorage.setItem('dm-lang', curLang); }catch(e){}
    refresh();
  }

  /* ═══════════════ Kinetik-Typo (Hero + Kontakt) ═══════════════ */
  var kinEls = $$('.kin');
  var introPlayed = false;

  function kinBuild(el){
    var text = el.textContent;
    el.textContent = '';
    el._chs = [];
    var frag = document.createDocumentFragment();
    for(var i = 0; i < text.length; i++){
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = text[i] === ' ' ? ' ' : text[i];
      s.style.setProperty('--i', i);
      if(introPlayed) s.style.transform = 'none';
      frag.appendChild(s);
      el._chs.push(s);
    }
    el.appendChild(frag);
    if(introPlayed) el.classList.add('in', 'live');
  }
  function kinRebuild(){
    kinEls.forEach(function(el){
      el.classList.remove('in', 'live');
      kinBuild(el);
    });
  }
  function kinIntro(){
    introPlayed = true;
    kinEls.forEach(function(el, idx){
      setTimeout(function(){
        el.classList.add('in');
        setTimeout(function(){ el.classList.add('live'); }, 1700);
      }, idx * 140);
    });
  }

  /* Gewicht der Buchstaben folgt dem Cursor (nur feiner Zeiger, keine Reduced Motion) */
  var mx = -1e4, my = -1e4;
  document.addEventListener('mousemove', function(e){ mx = e.clientX; my = e.clientY; }, {passive:true});
  if(finePtr && !reduced){
    onFrame(function(){
      if(mx < -9000) return;
      for(var k = 0; k < kinEls.length; k++){
        var el = kinEls[k];
        if(!el.classList.contains('live') || !el._chs) continue;
        var r = el.getBoundingClientRect();
        if(r.bottom < -100 || r.top > innerHeight + 100) continue;
        var near = mx > r.left - 220 && mx < r.right + 220 && my > r.top - 220 && my < r.bottom + 220;
        for(var i = 0; i < el._chs.length; i++){
          var s = el._chs[i];
          if(!near){
            if(s._w && s._w !== 700){ s._w = 700; s.style.fontVariationSettings = "'wght' 700"; s.style.transform = 'none'; }
            continue;
          }
          var cr = s.getBoundingClientRect();
          var d = Math.hypot(mx - (cr.left + cr.width / 2), my - (cr.top + cr.height / 2));
          var t = clamp(1 - d / 220, 0, 1);
          var w = Math.round(700 - t * 340);
          if(Math.abs(w - (s._w || 700)) > 3){ s._w = w; s.style.fontVariationSettings = "'wght' " + w; }
          s.style.transform = t > 0.01 ? 'translateY(' + (-7 * t).toFixed(1) + 'px)' : 'none';
        }
      }
    });
  }

  /* ═══════════════ Fit-to-Width (Mega-Zeilen) ═══════════════ */
  var fitEls = $$('[data-fit]');
  function fitAll(){
    fitEls.forEach(function(el){
      var row = el.parentElement;
      if(!row) return;
      var cw = row.clientWidth;
      if(!cw) return;
      el.style.fontSize = '100px';
      var w = el.scrollWidth;
      if(!w) return;
      /* 1 % Sicherheitsabstand gegen Rundungs-Clipping am Zeilenende */
      var fs = clamp(100 * cw / w, 30, 480) * .99;
      el.style.fontSize = fs.toFixed(2) + 'px';
    });
    /* Höhen-Pass für den Hero: Eyebrow, Megazeilen, Intro und CTAs
       müssen zusammen in den ersten Viewport passen (z. B. Full HD).
       Wenn nicht, skalieren beide Zeilen proportional runter. */
    var hero = $('.hero'), inner = $('.hero-inner'), mega = $('#heroMega'), foot = $('.hero-foot');
    if(!hero || !inner || !mega) return;
    var lines = $$('.h-line', mega);
    if(!lines.length) return;
    var heroTop = hero.getBoundingClientRect().top;
    var innerBottom = inner.getBoundingClientRect().bottom - heroTop;
    var allowed = innerHeight - (foot ? foot.offsetHeight : 60) - 10;
    var over = innerBottom - allowed;
    if(over > 4){
      var mh = mega.getBoundingClientRect().height;
      if(mh > 0){
        var ratio = Math.max(.55, (mh - over) / mh);
        lines.forEach(function(l){
          var cur = parseFloat(l.style.fontSize) || 100;
          l.style.fontSize = (cur * ratio).toFixed(2) + 'px';
        });
      }
    }
  }

  /* ═══════════════ Zeilen-Splits für große Titel ═══════════════ */
  var splitEls = $$('[data-split]');
  function splitBuild(el){
    /* Original-Text merken: textContent nach einem Split verliert die Spaces
       an Zeilengrenzen („istkein") – darum immer aus dataset.orig neu bauen. */
    var text = el.dataset.orig;
    if(!text){
      text = el.textContent.replace(/\s+/g, ' ').trim();
      el.dataset.orig = text;
    }
    el.textContent = '';
    var words = text.split(' ');
    var frag = document.createDocumentFragment();
    var spans = words.map(function(wd){
      var s = document.createElement('span');
      s.textContent = wd;
      s.style.display = 'inline-block';
      frag.appendChild(s);
      frag.appendChild(document.createTextNode(' '));
      return s;
    });
    el.appendChild(frag);
    var lines = [], top = null;
    spans.forEach(function(s){
      if(s.offsetTop !== top){ lines.push([]); top = s.offsetTop; }
      lines[lines.length - 1].push(s.textContent);
    });
    el.textContent = '';
    lines.forEach(function(ws, i){
      var line = document.createElement('span'); line.className = 'line';
      var inner = document.createElement('span'); inner.className = 'line-inner';
      inner.textContent = ws.join(' ');
      inner.style.setProperty('--i', i);
      line.appendChild(inner);
      el.appendChild(line);
    });
  }
  function splitsRebuild(){ splitEls.forEach(splitBuild); }

  /* ═══════════════ Scroll-Reveals (starten nach dem Preloader) ═══════════════ */
  var revealsInited = false;
  function initReveals(){
    if(revealsInited) return;
    revealsInited = true;
    /* Geschwister leicht staffeln */
    ['.cards3', '.cvlist', '.contact-meta'].forEach(function(sel){
      $$(sel).forEach(function(parent){
        $$('[data-reveal]', parent).forEach(function(el, i){
          el.style.setProperty('--d', (i * 90) + 'ms');
        });
      });
    });
    if(!('IntersectionObserver' in window)){
      $$('[data-reveal], [data-split]').forEach(function(el){ el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    $$('[data-reveal]').forEach(function(el){ io.observe(el); });
    splitEls.forEach(function(el){ io.observe(el); });
  }

  /* ═══════════════ Seiteneinstieg ═══════════════ */
  function startPage(){
    kinIntro();
    initReveals();
  }
  startPage();

  /* ═══════════════ Topbar: Scroll-Status + Hide-on-Scroll ═══════════════ */
  var topbar = $('#topbar');
  var menuOpen = false;
  (function(){
    var py = window.scrollY;
    onFrame(function(){
      var y = window.scrollY;
      topbar.classList.toggle('scrolled', y > 40);
      if(!menuOpen && y > 260 && y - py > 6) topbar.classList.add('hidden');
      else if(py - y > 4 || y < 260 || menuOpen) topbar.classList.remove('hidden');
      py = y;
    });
  })();

  /* Aktive Section im Topbar-Status */
  var topStatus = $('#topStatus');
  var curSec = null;
  function statusRender(){
    if(!topStatus) return;
    if(!curSec){ topStatus.textContent = ''; return; }
    var d = I18N[curLang];
    topStatus.textContent = curSec.getAttribute('data-idx') + ' · ' + (d[curSec.getAttribute('data-navkey')] || '');
  }
  if('IntersectionObserver' in window){
    var ioSec = new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(en.isIntersecting){ curSec = en.target; statusRender(); }
      });
    }, {rootMargin:'-38% 0px -55% 0px'});
    $$('main section[data-idx]').forEach(function(s){ ioSec.observe(s); });
  }

  /* ═══════════════ Fullscreen-Menü ═══════════════ */
  var menuBtn = $('#menuBtn'), ov = $('#ovmenu');
  var menuBackground = [$('#main'), $('.footer'), $('.skip-link'), $('.brand'), $('.top-status')]
    .concat($$('.top-right > :not(.menu-btn)')).filter(Boolean);
  function menuLabelRender(){
    var lab = $('.menu-btn-label');
    var txt = I18N[curLang][menuOpen ? 'menu.close' : 'menu.label'];
    if(lab) lab.textContent = txt;
    /* Auf Mobile ist das Wort-Label ausgeblendet → Zustand hörbar machen */
    if(menuBtn) menuBtn.setAttribute('aria-label', txt);
  }
  function setMenu(open, restoreFocus){
    menuOpen = open;
    ov.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    ov.setAttribute('aria-hidden', String(!open));
    menuBackground.forEach(function(el){ el.inert = open; });
    menuLabelRender();
    if(open){
      setTimeout(function(){ var f = $('.ov-link'); if(f) f.focus(); }, 450);
    } else if(restoreFocus !== false) {
      menuBtn.focus();
    }
  }
  menuBtn.addEventListener('click', function(){ setMenu(!menuOpen); });
  $$('.ov-link, .ov-meta a', ov).forEach(function(a){
    a.addEventListener('click', function(){ setMenu(false, false); });
  });
  document.addEventListener('keydown', function(e){
    if(!menuOpen) return;
    if(e.key === 'Escape'){
      setMenu(false);
      return;
    }
    if(e.key === 'Tab'){
      var focusable = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', ov)
        .filter(function(el){ return el.offsetParent !== null; });
      if(!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  /* Impressum-Anker: das <details> im Footer vorm Anspringen öffnen,
     sonst landet der Sprung auf zugeklapptem Inhalt */
  var legal = $('#legal');
  if(legal){
    $$('a[href="#legal"]').forEach(function(a){
      a.addEventListener('click', function(){ legal.open = true; });
    });
    if(location.hash === '#legal') legal.open = true;
  }

  /* ═══════════════ Theme: Dark ist Standard (Design-Statement),
     Light nur über den Toggle – die Wahl wird gespeichert. ═══════════════ */
  function effectiveTheme(){
    return docEl.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
  function updateThemeMeta(){
    var m = $('meta[name="theme-color"]');
    if(m) m.setAttribute('content', effectiveTheme() === 'dark' ? '#0A0A0D' : '#FBFAF7');
  }
  function renderThemeButtons(){
    var target = effectiveTheme() === 'dark' ? 'light' : 'dark';
    var dict = I18N[curLang] || I18N.de;
    var label = dict['aria.theme.' + target];
    $$('[data-theme-toggle]').forEach(function(btn){
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', String(effectiveTheme() === 'light'));
    });
  }
  function applyTheme(theme){
    if(theme === 'dark' || theme === 'light') docEl.setAttribute('data-theme', theme);
    else docEl.removeAttribute('data-theme');
    updateThemeMeta();
    renderThemeButtons();
    themeHooks.forEach(function(fn){ fn(); });
  }
  (function initTheme(){
    if(qsTheme){ applyTheme(qsTheme); return; }  /* ?theme= (Debug/Review) */
    var saved = null;
    try{ saved = localStorage.getItem('dm-theme'); }catch(e){}
    applyTheme(saved === 'dark' || saved === 'light' ? saved : null);
  })();
  $$('[data-theme-toggle]').forEach(function(themeBtn){
    themeBtn.addEventListener('click', function(){
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try{ localStorage.setItem('dm-theme', next); }catch(e){}
    });
  });

  /* ═══════════════ Hero-Canvas: driftende Farbfelder ═══════════════ */
  var heroVis = true;
  (function initCanvas(){
    var cv = $('#heroCanvas');
    if(!cv) return;
    var hero = $('.hero');
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(e){ heroVis = e[0].isIntersecting; }).observe(hero);
    }
    var ctx = cv.getContext('2d');
    if(!ctx) return;
    var w = 2, h = 2;
    function rgba(hex, a){
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    /* Geometrie fix, Farben je Theme */
    var blobs = [
      {r:.46, sx:.9,  sy:.7,  px:0.0, py:1.5},
      {r:.32, sx:.62, sy:.95, px:2.1, py:4.0},
      {r:.55, sx:.5,  sy:.42, px:4.2, py:2.2},
      {r:.15, sx:1.15,sy:.8,  px:1.2, py:5.1}
    ];
    function palette(){
      if(docEl.getAttribute('data-egg') === 'terminal'){
        return {
          comp:'lighter', bg:'#050807',
          cols:[['#0E7A66',.8], ['#45F0CE',.38], ['#0B2B24',.9], ['#8CF7DF',.2]]
        };
      }
      return effectiveTheme() === 'dark' ? {
        comp:'lighter', bg:'#0A0A0D',
        cols:[['#0C6B74',.85], ['#34B7C4',.6], ['#123B49',.9], ['#A9DBDF',.28]]
      } : {
        comp:'multiply', bg:'#FBFAF7',
        cols:[['#A6DCE2',.95], ['#5FBAC5',.8], ['#D2ECEF',.95], ['#0C6B74',.22]]
      };
    }
    var pal = palette();
    function size(){
      var r = cv.getBoundingClientRect();
      w = cv.width  = Math.max(2, Math.round(r.width  * .55));
      h = cv.height = Math.max(2, Math.round(r.height * .55));
    }
    size();
    cv._size = size;
    function draw(t){
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = pal.comp;
      var T = t * .00012;
      for(var i = 0; i < blobs.length; i++){
        var b = blobs[i];
        var x = w * (.5  + .4  * Math.sin(T * b.sx * 2.1 + b.px));
        var y = h * (.42 + .36 * Math.cos(T * b.sy * 1.7 + b.py));
        var rad = Math.min(w, h) * b.r * (1 + .14 * Math.sin(T * 1.3 + b.px));
        var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(pal.cols[i][0], pal.cols[i][1]));
        g.addColorStop(1, rgba(pal.cols[i][0], 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    }
    themeHooks.push(function(){
      pal = palette();
      if(reduced) draw(40000);
    });
    if(reduced){ draw(40000); return; }
    onFrame(function(t){
      if(!heroVis || document.hidden) return;
      draw(t);
    });
  })();

  /* ═══════════════ Parallax ([data-prlx]) + Maus-Offset fürs Portrait ═══════════════ */
  var prlxItems = $$('[data-prlx]').map(function(el){
    return {el:el, f:parseFloat(el.getAttribute('data-prlx')) || 0, sec:el.closest('section') || el.parentElement};
  });
  var portrait = $('#heroPortrait');
  var pmx = 0, pmy = 0;
  if(!reduced){
    onFrame(function(){
      var tx = mx < -9000 ? 0 : (mx / innerWidth  - .5) * 26;
      var ty = my < -9000 ? 0 : (my / innerHeight - .5) * 18;
      pmx = lerp(pmx, tx, .06);
      pmy = lerp(pmy, ty, .06);
      for(var i = 0; i < prlxItems.length; i++){
        var o = prlxItems[i];
        var r = o.sec.getBoundingClientRect();
        if(r.bottom < -80 || r.top > innerHeight + 80) continue;
        var y = r.top * o.f;
        if(o.el === portrait){
          o.el.style.transform = 'translate3d(' + (-pmx).toFixed(1) + 'px,' + (y - pmy).toFixed(1) + 'px,0)';
        } else {
          o.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
        }
      }
    });
  }

  /* ═══════════════ Velocity-Skew (dezent) ═══════════════ */
  if(!reduced){
    (function(){
      var skewEls = $$('.sec-title, .cvlist, .cards3');
      var lastY = window.scrollY, skew = 0, resting = true;
      onFrame(function(){
        var y = window.scrollY;
        var v = y - lastY; lastY = y;
        var target = clamp(v * .045, -1.2, 1.2);
        skew = lerp(skew, target, .12);
        if(Math.abs(skew) < .02){
          if(!resting){
            resting = true;
            for(var i = 0; i < skewEls.length; i++) skewEls[i].style.transform = '';
          }
          return;
        }
        resting = false;
        for(var j = 0; j < skewEls.length; j++) skewEls[j].style.transform = 'skewY(' + skew.toFixed(3) + 'deg)';
      });
    })();
  }

  /* ═══════════════ Projekte: horizontales Pinning ═══════════════ */
  var pinSec = $('#pinSec');
  var pinTrack = $('#workTrack');
  var pinMetricsFn = function(){};
  if(pinSec && pinTrack){
    (function(){
      var bar = $('#pinBar'), cnt = $('#pinCount'), nextEl = $('#pinNext');
      var cases = $$('article.pcard', pinTrack);
      var medias = $$('.pc-media', pinTrack).map(function(m){ return {m:m, img:$('img, .pc-art', m)}; });
      var mq = matchMedia('(max-width:900px)');
      var dist = 0, on = false, curX = 0;
      var moreBtn = $('#caseMore');

      function syncMoreBtn(){
        if(!moreBtn) return;
        var expanded = !pinTrack.classList.contains('collapsed');
        moreBtn.setAttribute('aria-expanded', String(expanded));
        var key = expanded ? 'work.less' : 'work.more';
        moreBtn.setAttribute('data-i18n', key);
        moreBtn.textContent = I18N[curLang][key];
      }

      function metrics(){
        var off = mq.matches || reduced;
        pinSec.classList.toggle('no-pin', off);
        if(off){
          pinSec.style.height = '';
          pinTrack.style.transform = '';
          on = false;
          /* Gestapelte Liste: erst zwei Karten, Rest hinter dem Button */
          if(moreBtn && moreBtn.hidden){
            moreBtn.hidden = false;
            pinTrack.classList.add('collapsed');
            syncMoreBtn();
          }
          return;
        }
        if(moreBtn && !moreBtn.hidden) moreBtn.hidden = true;
        pinTrack.classList.remove('collapsed');
        pinTrack.style.transform = 'translate3d(0,0,0)';
        dist = Math.max(0, pinTrack.scrollWidth - innerWidth);
        pinSec.style.height = (innerHeight + dist) + 'px';
        on = dist > 0;
      }
      pinMetricsFn = metrics;
      metrics();
      if(mq.addEventListener) mq.addEventListener('change', metrics);
      if(moreBtn){
        moreBtn.addEventListener('click', function(){
          pinTrack.classList.toggle('collapsed');
          syncMoreBtn();
        });
      }

      onFrame(function(){
        if(!on) return;
        var r = pinSec.getBoundingClientRect();
        if(r.bottom < -60 || r.top > innerHeight + 60) return;
        var p = clamp(-r.top / dist, 0, 1);
        var targX = -p * dist;
        curX = lerp(curX, targX, .18);
        if(Math.abs(curX - targX) < .1) curX = targX;
        pinTrack.style.transform = 'translate3d(' + curX.toFixed(2) + 'px,0,0)';
        if(bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        if(cnt) cnt.textContent = '0' + (Math.min(cases.length - 1, Math.floor(p * cases.length)) + 1) + ' / 0' + cases.length;
        if(nextEl) nextEl.classList.toggle('show', p > .94);
        /* Innen-Parallax der Bilder */
        for(var i = 0; i < medias.length; i++){
          var mr = medias[i].m.getBoundingClientRect();
          if(mr.right < 0 || mr.left > innerWidth) continue;
          var off = (mr.left + mr.width / 2 - innerWidth / 2) / innerWidth;
          if(medias[i].img) medias[i].img.style.transform = 'translateX(' + (off * -40).toFixed(1) + 'px)';
        }
      });

      /* Tastatur-Fokus: gepinnte Karte in Sicht scrollen */
      pinTrack.addEventListener('focusin', function(e){
        if(!on) return;
        var card = e.target.closest('.pcard');
        if(!card) return;
        var x = clamp(card.offsetLeft - (innerWidth - card.offsetWidth) / 2, 0, dist);
        var secTop = pinSec.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({top: secTop + x, behavior:'instant' in window ? 'instant' : 'auto'});
      });

    })();
  }

  /* ═══════════════ Tilt-Karten (About) ═══════════════ */
  if(finePtr && !reduced){
    $$('[data-tilt]').forEach(function(card){
      card.addEventListener('pointerenter', function(){
        card.style.transition = 'transform .12s ease-out';
      });
      card.addEventListener('pointermove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        card.style.transform = 'rotateX(' + ((py - .5) * -6.5).toFixed(2) + 'deg) rotateY(' + ((px - .5) * 6.5).toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function(){
        card.style.transition = 'transform .6s cubic-bezier(.19,1,.22,1)';
        card.style.transform = '';
        setTimeout(function(){ card.style.transition = ''; }, 620);
      });
    });
  }

  /* ═══════════════ Magnetische Buttons ═══════════════ */
  if(finePtr && !reduced){
    $$('[data-magnetic]').forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * .22).toFixed(1) + 'px,' + (dy * .3).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });
  }

  /* ═══════════════ Scramble-Hover (Menü-Links) ═══════════════ */
  (function(){
    var CHARS = 'ABCDEFGHIKLMNOPRSTUVWX#*/<>+';
    $$('[data-scramble]').forEach(function(a){
      var w = $('.ov-word', a) || a;
      a.addEventListener('mouseenter', function(){
        if(reduced) return;
        var orig = w.textContent;
        if(a._scr) clearInterval(a._scr);
        var t0 = performance.now(), DUR = 460;
        a._scr = setInterval(function(){
          var p = clamp((performance.now() - t0) / DUR, 0, 1);
          var keep = Math.floor(p * orig.length);
          var out = '';
          for(var i = 0; i < orig.length; i++){
            out += (i < keep || orig[i] === ' ') ? orig[i] : CHARS[(Math.random() * CHARS.length) | 0];
          }
          w.textContent = out;
          if(p >= 1){ clearInterval(a._scr); a._scr = null; w.textContent = orig; }
        }, 34);
      });
    });
  })();

  /* ═══════════════ Uhr (Ortszeit Köln) ═══════════════ */
  (function(){
    var els = [$('#clock'), $('#ovClock')].filter(Boolean);
    if(!els.length) return;
    var fmt;
    try{
      fmt = new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false});
    }catch(e){ return; }
    function tick(){
      var s = fmt.format(new Date());
      els.forEach(function(el){ el.textContent = s; });
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ═══════════════ E-Mail-Adresse kopieren ═══════════════ */
  (function(){
    var btn = $('#copyMail'), status = $('#copyStatus');
    if(!btn) return;
    var address = 'hallo@danielmartin.fyi';
    function legacyCopy(){
      var field = document.createElement('textarea');
      field.value = address;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try{ ok = document.execCommand('copy'); }catch(e){}
      field.remove();
      return ok;
    }
    function feedback(ok){
      var dict = I18N[curLang] || I18N.de;
      var message = dict[ok ? 'contact.copied' : 'contact.copyfail'];
      btn.textContent = message;
      if(status) status.textContent = message;
      setTimeout(function(){ btn.textContent = (I18N[curLang] || I18N.de)['contact.copy']; }, 1800);
    }
    btn.addEventListener('click', function(){
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(address).then(function(){ feedback(true); }, function(){ feedback(legacyCopy()); });
      } else {
        feedback(legacyCopy());
      }
    });
  })();

  /* ═══════════════ Nach oben ═══════════════ */
  var toTop = $('#toTop');
  if(toTop){
    toTop.addEventListener('click', function(){
      window.scrollTo({top:0, behavior: reduced ? 'auto' : 'smooth'});
    });
  }

  /* ═══════════════ Refresh-Pipeline (Lang-Wechsel, Resize, Font-Load) ═══════════════ */
  function refresh(){
    kinRebuild();
    fitAll();
    splitsRebuild();
    pinMetricsFn();
    statusRender();
    menuLabelRender();
    /* Mega-Zeilen sind in Buchstaben-Spans zerlegt → als Ganzes vorlesen lassen */
    var d = I18N[curLang];
    var hm = $('#heroMega');
    if(hm) hm.setAttribute('aria-label', d['hero.l1'] + ' ' + d['hero.l2']);
    var cm = $('.contact-mega');
    if(cm) cm.setAttribute('aria-label', d['contact.title']);
  }
  var rsTimer = null;
  window.addEventListener('resize', function(){
    clearTimeout(rsTimer);
    rsTimer = setTimeout(function(){
      refresh();
      var cv = $('#heroCanvas');
      if(cv && cv._size) cv._size();
    }, 180);
  });
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ refresh(); });
  }

  /* ── Sprache initialisieren (ruft refresh() auf) ── */
  (function initLang(){
    var saved = null;
    try{ saved = localStorage.getItem('dm-lang'); }catch(e){}
    var nav = (navigator.language || 'de').slice(0, 2).toLowerCase();
    applyLang(saved || (nav === 'en' ? 'en' : 'de'));
  })();
  gotoTarget();
  window.addEventListener('load', gotoTarget);
  $$('.lang button').forEach(function(b){
    b.addEventListener('click', function(){ applyLang(b.getAttribute('data-lang')); });
  });

  /* ═══════════════ Easteregg: Konsolen-Gruß ═══════════════ */
  console.log(
    '%cMoin. Du liest den Quelltext?%c\nDann verstehen wir uns vermutlich gut.  →  hallo@danielmartin.fyi',
    'color:#34B7C4;font:700 15px/1.6 system-ui,sans-serif',
    'color:#888;font:400 13px/1.6 system-ui,sans-serif'
  );

  /* ═══════════════ Easteregg: Konami-Code → „Vordenken-Modus" ═══════════════ */
  (function(){
    var seq = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
    var i = 0, active = false;
    document.addEventListener('keydown', function(e){
      var k = (e.key || '').toLowerCase();
      if(k === seq[i]){ if(++i === seq.length){ i = 0; celebrate(); } }
      else { i = (k === seq[0]) ? 1 : 0; }
    });
    function celebrate(){
      if(active) return; active = true;
      /* Terminal-Modus an/aus: die Scramble-Welle läuft an und mittendrin
         flippt der Skin – die Texte „dekodieren" sich in den neuen Modus */
      var on = docEl.getAttribute('data-egg') === 'terminal';
      if(!reduced) scrambleWave();
      setTimeout(function(){
        if(on){
          docEl.removeAttribute('data-egg');
          try{ sessionStorage.removeItem('dm-egg'); }catch(e){}
        } else {
          docEl.setAttribute('data-egg', 'terminal');
          try{ sessionStorage.setItem('dm-egg', '1'); }catch(e){}
        }
        refresh();                                   /* Mono-Metriken: Fit + Splits neu */
        themeHooks.forEach(function(fn){ fn(); });   /* Canvas auf Phosphor umfärben */
      }, reduced ? 0 : 280);
      if(!on) toast('Gut, wir können uns gerne auch erstmal über 🎮 und 📽️ unterhalten… ;-)');
      setTimeout(function(){ active = false; }, 1500);
    }
    /* Scramble-Welle: alle sichtbaren Headlines dekodieren sich einmal durch –
       kinetische Typo statt Partikel, gibt den Inhalt sofort zurück. */
    var EGG_CHARS = 'ABCDEFGHIKLMNOPRSTUVWX#*/<>+';
    function scrambleWave(){
      var targets = [];
      $$('.line-inner, .cv-org, .pc-title').forEach(function(el){
        var r = el.getBoundingClientRect();
        if(r.bottom > 0 && r.top < innerHeight && (el.textContent || '').trim()) targets.push(el);
      });
      kinEls.forEach(function(el){
        var r = el.getBoundingClientRect();
        if(r.bottom > 0 && r.top < innerHeight && el._chs && el._chs.length) targets.push(el);
      });
      targets.forEach(function(el, idx){
        setTimeout(function(){ scrambleEl(el, 640); }, idx * 80);
      });
    }
    function scrambleEl(el, dur){
      var t0 = performance.now();
      if(el._chs){ /* Hero-/Kontakt-Zeilen: pro Buchstaben-Span */
        var orig = el._chs.map(function(s){ return s.textContent; });
        (function step(){
          var p = clamp((performance.now() - t0) / dur, 0, 1);
          var keep = Math.floor(p * orig.length);
          el._chs.forEach(function(s, i){
            s.textContent = (i < keep || orig[i] === ' ') ? orig[i] : EGG_CHARS[(Math.random() * EGG_CHARS.length) | 0];
          });
          if(p < 1) requestAnimationFrame(step);
          else el._chs.forEach(function(s, i){ s.textContent = orig[i]; });
        })();
        return;
      }
      var orig = el.textContent;
      (function step(){
        var p = clamp((performance.now() - t0) / dur, 0, 1);
        var keep = Math.floor(p * orig.length);
        var out = '';
        for(var i = 0; i < orig.length; i++){
          out += (i < keep || orig[i] === ' ') ? orig[i] : EGG_CHARS[(Math.random() * EGG_CHARS.length) | 0];
        }
        el.textContent = out;
        if(p < 1) requestAnimationFrame(step);
        else el.textContent = orig;
      })();
    }
    function toast(msg){
      var t = document.createElement('div');
      t.className = 'egg-toast'; t.setAttribute('role', 'status');
      var code = document.createElement('span');
      code.className = 'egg-code';
      code.textContent = '↑ ↑ ↓ ↓ ← → ← → B A';
      t.appendChild(code);
      t.appendChild(document.createTextNode(msg));
      document.body.appendChild(t);
      requestAnimationFrame(function(){ t.classList.add('in'); });
      setTimeout(function(){ t.classList.remove('in'); setTimeout(function(){ t.remove(); }, 450); }, 3600);
    }
  })();

})();
