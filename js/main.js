/* ============================================================
   DetailRing — interactions & animations
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp  = (a, b, n) => a + (b - a) * n;

  /* ---------- PRELOADER ---------- */
  window.addEventListener('load', () => {
    const pre = $('#preloader');
    if (!pre) return;
    setTimeout(() => {
      pre.classList.add('is-done');
      // headlight ignition: flicker the lit layer on once, then hand back to scroll
      const lit = $('#heroImg');
      if (lit && !reduceMotion) {
        lit.classList.add('igniting');
        lit.addEventListener('animationend', () => lit.classList.remove('igniting'), { once: true });
      }
    }, reduceMotion ? 0 : 1150);
  });
  // safety: never let preloader trap the page
  setTimeout(() => { const p = $('#preloader'); if (p) p.classList.add('is-done'); }, 4000);

  /* ============================================================
     CUSTOM CURSOR + MAGNETIC
     ============================================================ */
  if (!isTouch && !reduceMotion) {
    document.documentElement.classList.add('has-cursor');
    const cursor = $('#cursor');
    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    const label = $('#cursorLabel');

    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    });

    (function raf() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(raf);
    })();

    const interactive = 'a,button,input,select,textarea,.magnetic,[data-cursor],.sw,.chip,.seg__btn,.works__tab,.acc__q,.ba__view';
    $$(interactive).forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-hover');
        const lbl = el.getAttribute('data-cursor') || (el.closest('[data-cursor]') && el.closest('[data-cursor]').getAttribute('data-cursor'));
        label.textContent = lbl || '';
        cursor.classList.toggle('is-labeled', !!lbl);
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hover', 'is-labeled');
        label.textContent = '';
      });
    });

    window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    window.addEventListener('mouseup',   () => cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('is-hidden'));

    // magnetic
    $$('.magnetic').forEach((el) => {
      const strength = 0.35;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ============================================================
     NAV: sticky + scroll progress
     ============================================================ */
  const nav = $('#nav');
  const scrollBar = $('#scrollBar');
  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (scrollBar) {
      const h = document.documentElement.scrollHeight - innerHeight;
      scrollBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ============================================================
     MOBILE MENU
     ============================================================ */
  const burger = $('#burger');
  const menu = $('#mobileMenu');
  const menuLinks = $$('.mobile-menu__link');
  menuLinks.forEach((l, i) => { l.style.transitionDelay = (0.18 + i * 0.05) + 's'; });
  function toggleMenu(open) {
    const willOpen = open !== undefined ? open : !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', willOpen);
    burger.classList.toggle('is-open', willOpen);
    burger.setAttribute('aria-expanded', willOpen);
    document.body.classList.toggle('lock', willOpen);
  }
  if (burger) burger.addEventListener('click', () => toggleMenu());
  menuLinks.forEach((l) => l.addEventListener('click', () => toggleMenu(false)));

  /* ============================================================
     REVEAL ON SCROLL
     ============================================================ */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* ============================================================
     LAZY BACKGROUND IMAGES
     Offscreen cards/gallery tiles carry their photo in data-bg and only
     fetch it just before they scroll into view — keeps first load light
     without changing a single pixel or animation.
     ============================================================ */
  const lazyBgEls = $$('[data-bg], [data-secbg], [data-imggroup]');
  if (lazyBgEls.length) {
    const setBg = (el) => {
      if (el.dataset.bgDone) return;
      el.dataset.bgDone = '1';
      if (el.dataset.bg)    el.style.setProperty('--img', "url('" + el.dataset.bg + "')");
      if (el.dataset.secbg) el.style.setProperty('--bg',  "url('" + el.dataset.secbg + "')");
      // a group wrapper: swap data-src -> src for every deferred <img> inside at once
      if (el.hasAttribute('data-imggroup')) {
        $$('img[data-src]', el).forEach((img) => { img.src = img.dataset.src; img.removeAttribute('data-src'); });
      }
    };
    if ('IntersectionObserver' in window) {
      const bgio = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { setBg(e.target); bgio.unobserve(e.target); } });
      }, { rootMargin: '600px 0px' });
      lazyBgEls.forEach((el) => bgio.observe(el));
    } else {
      lazyBgEls.forEach(setBg);
    }
  }

  /* ============================================================
     COUNTERS + RATING STARS
     ============================================================ */
  function animateCount(el, target, dec, plus) {
    const dur = 1600, start = performance.now();
    function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = (dec ? val.toFixed(dec) : Math.round(val).toLocaleString('ru-RU')) + (plus && p === 1 ? plus : '');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = (dec ? target.toFixed(dec) : Math.round(target).toLocaleString('ru-RU')) + (plus || '');
    }
    requestAnimationFrame(tick);
  }

  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target);
    const dec = el.dataset.dec ? parseInt(el.dataset.dec, 10) : (String(el.dataset.target).indexOf('.') > -1 ? 1 : 0);
    animateCount(el, target, el.dataset.dec || String(el.dataset.target).indexOf('.') > -1 ? dec : 0, el.dataset.plus || '');
  }

  const counters = $$('#ratingNum, #ratingCount, .stat__n');
  const stars = $$('#ratingStars .star');

  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target === $('#ratingBadge')) {
          stars.forEach((s, i) => setTimeout(() => s.classList.add('on'), reduceMotion ? 0 : 160 * i));
        } else {
          runCounter(e.target);
        }
        cio.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
    const badge = $('#ratingBadge');
    if (badge) cio.observe(badge);
  } else {
    counters.forEach(runCounter);
    stars.forEach((s) => s.classList.add('on'));
  }

  /* ============================================================
     BEFORE / AFTER SLIDERS + TABS
     ============================================================ */
  function setupBA(view) {
    const beforeBox = $('.ba__before', view);
    const beforeImg = $('.ba__img--before', view);
    const handle = $('.ba__handle', view);
    let pct = 50;

    function sizeImg() { if (beforeImg) beforeImg.style.width = view.clientWidth + 'px'; }
    function apply() {
      beforeBox.style.width = pct + '%';
      handle.style.left = pct + '%';
    }
    function setFromX(clientX) {
      const r = view.getBoundingClientRect();
      pct = clamp(((clientX - r.left) / r.width) * 100, 0, 100);
      apply();
    }

    let dragging = false;
    view.addEventListener('pointerdown', (e) => { dragging = true; view.setPointerCapture(e.pointerId); setFromX(e.clientX); });
    view.addEventListener('pointermove', (e) => { if (dragging) setFromX(e.clientX); });
    view.addEventListener('pointerup',   () => { dragging = false; });
    view.addEventListener('pointercancel', () => { dragging = false; });

    window.addEventListener('resize', () => { sizeImg(); });
    sizeImg(); apply();
    // re-size when its panel becomes visible
    return sizeImg;
  }

  const baSizers = $$('[data-ba]').map(setupBA);

  const tabs = $$('.works__tab');
  const panels = $$('.ba');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const key = tab.dataset.tab;
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === key));
      baSizers.forEach((fn) => fn());
    });
  });

  /* ============================================================
     FILM COLOR CONFIGURATOR
     ============================================================ */
  const swatches = $$('#swatches .sw');
  const colorName = $('#colorName');
  const colorFinish = $('#colorFinish');
  const carGlow = $('#carGlow');
  const finishBadge = $('#carFinishBadge');
  let imgFront = $('#carImgA');
  let imgBack = $('#carImgB');

  // preload wrap images for instant crossfade — but only once the
  // configurator is near the viewport, so they don't weigh down first load
  const preloadSwatches = () => swatches.forEach((sw) => { const i = new Image(); i.src = sw.dataset.img; });
  const swatchWrap = $('#swatches');
  if (swatchWrap && 'IntersectionObserver' in window) {
    const swio = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { preloadSwatches(); obs.disconnect(); }
    }, { rootMargin: '600px 0px' });
    swio.observe(swatchWrap);
  } else {
    preloadSwatches();
  }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  swatches.forEach((sw) => {
    sw.addEventListener('click', () => {
      if (sw.classList.contains('is-active')) return;
      swatches.forEach((s) => s.classList.remove('is-active'));
      sw.classList.add('is-active');

      // crossfade to the new photo
      imgBack.onload = () => {
        imgBack.classList.add('is-on');
        imgFront.classList.remove('is-on');
        const tmp = imgFront; imgFront = imgBack; imgBack = tmp;
      };
      imgBack.src = sw.dataset.img;

      if (carGlow) carGlow.style.setProperty('--glow', hexToRgba(sw.dataset.glow, 0.5));
      colorName.textContent = sw.dataset.name;
      colorFinish.textContent = sw.dataset.finish;
      if (finishBadge) finishBadge.textContent = sw.dataset.finish;
    });
  });
  // initial glow
  if (carGlow) carGlow.style.setProperty('--glow', hexToRgba('#c9ccc6', 0.4));

  /* ============================================================
     PRICE CALCULATOR
     ============================================================ */
  const classBtns = $$('#calcClass .seg__btn');
  const serviceChips = $$('#calcServices .chip');
  const totalEl = $('#calcTotal');
  const listEl = $('#calcList');
  let mult = 1;

  function fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  function updateChipPrices() {
    serviceChips.forEach((c) => {
      const i = $('i', c);
      if (i) i.textContent = fmt(parseFloat(c.dataset.price) * mult) + ' ₽';
    });
  }
  function animTotal(to) {
    const from = parseFloat((totalEl.textContent || '0').replace(/\s/g, '')) || 0;
    const dur = 500, start = performance.now();
    function tick(now) {
      const p = clamp((now - start) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      totalEl.textContent = fmt(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function recalc() {
    let total = 0;
    const items = [];
    serviceChips.forEach((c) => {
      if (c.classList.contains('is-on')) {
        const base = parseFloat(c.dataset.price) * mult;
        total += base;
        items.push({ name: $('span', c).textContent, price: base });
      }
    });
    if (items.length === 0) {
      listEl.innerHTML = '<li class="calc__empty">Отметьте нужные услуги</li>';
    } else {
      listEl.innerHTML = items.map((i) => `<li><span>${i.name}</span><b>${fmt(i.price)} ₽</b></li>`).join('');
    }
    animTotal(total);
  }

  classBtns.forEach((b) => b.addEventListener('click', () => {
    classBtns.forEach((x) => x.classList.remove('is-active'));
    b.classList.add('is-active');
    mult = parseFloat(b.dataset.mult);
    updateChipPrices();
    recalc();
  }));
  serviceChips.forEach((c) => c.addEventListener('click', () => { c.classList.toggle('is-on'); recalc(); }));
  updateChipPrices();

  /* ============================================================
     FAQ ACCORDION
     ============================================================ */
  const accItems = $$('#acc .acc__item');
  accItems.forEach((item) => {
    const q = $('.acc__q', item);
    const a = $('.acc__a', item);
    q.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      accItems.forEach((it) => { it.classList.remove('is-open'); $('.acc__a', it).style.maxHeight = null; });
      if (!open) { item.classList.add('is-open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ============================================================
     CONTACT FORM (demo)
     ============================================================ */
  const form = $('#bookForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = $('#formSuccess');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (ok) ok.hidden = false;
      form.querySelectorAll('input').forEach((i) => (i.value = ''));
    });
  }

  /* ============================================================
     SERVICE MODAL
     ============================================================ */
  const SERVICES = {
    polish: {
      tag: 'Полировка кузова', price: 'от 18 900 ₽', img: 'assets/img/car-gloss.jpg', title: 'Полировка кузова',
      lead: 'Многоступенчатая полировка лакокрасочного покрытия, которая убирает мелкие царапины, риски, голограммы и затёртости и возвращает кузову глубину цвета и зеркальный блеск.',
      list: [
        '<b>Что это:</b> снятие тончайшего слоя лака абразивными пастами разной зернистости с финишной располировкой.',
        '<b>Зачем нужна:</b> убирает «паутинку», разводы после моек и потускнение, цвет становится насыщенным.',
        '<b>Результат:</b> ровное зеркальное покрытие без вихревых рисков — авто выглядит заметно дороже.',
        '<b>Совет:</b> идеально сочетать с керамикой — полировка готовит поверхность, керамика её защищает.'
      ]
    },
    ceramic: {
      tag: 'Керамическое покрытие', price: 'от 32 000 ₽', img: 'assets/img/detail3.jpg', title: 'Керамическое покрытие',
      lead: 'Защитный нанокерамический слой с эффектом «жидкого стекла». Создаёт прочную плёнку, которая отталкивает воду и грязь и надолго сохраняет блеск.',
      list: [
        '<b>Что это:</b> состав на основе диоксида кремния (SiO₂), который полимеризуется прямо на лаке.',
        '<b>Зачем нужно:</b> защищает от выгорания, реагентов, химии и лёгких царапин, упрощает мойку.',
        '<b>Эффект:</b> выраженная гидрофобность — вода скатывается каплями, грязь не въедается.',
        '<b>Срок службы:</b> до 5 лет в зависимости от состава и количества слоёв.'
      ]
    },
    wrap: {
      tag: 'Оклейка плёнкой', price: 'от 64 000 ₽', img: 'assets/img/detail4.jpg', title: 'Оклейка плёнкой',
      lead: 'Оклейка кузова защитной или цветной плёнкой премиум-брендов. Меняет цвет и фактуру (глянец, мат, сатин, хамелеон) и защищает краску от сколов и царапин.',
      list: [
        '<b>Что это:</b> виниловая (цветная) или полиуретановая (антигравийная) плёнка поверх заводского ЛКП.',
        '<b>Зачем нужна:</b> защищает родную краску от камней и царапин, сохраняет стоимость авто.',
        '<b>Возможности:</b> смена цвета без перекраски, оклейка зон риска — капот, бампер, пороги, фары.',
        '<b>Гарантия:</b> до 7 лет на плёнку, снимается без вреда для заводского покрытия.'
      ]
    },
    cleaning: {
      tag: 'Химчистка салона', price: 'от 9 500 ₽', img: 'assets/img/interior2.jpg', title: 'Химчистка салона',
      lead: 'Глубокая чистка всех поверхностей салона — кожи, алькантары, текстиля, пластика и потолка — с устранением запахов озонированием.',
      list: [
        '<b>Что это:</b> влажная и сухая чистка профессиональной химией с экстракцией загрязнений.',
        '<b>Зачем нужна:</b> удаляет пятна, пыль, аллергены и неприятные запахи, освежает салон.',
        '<b>Уход за кожей:</b> бережная чистка и кондиционирование, защита от пересыхания и трещин.',
        '<b>Результат:</b> салон выглядит и пахнет как новый — безопасно для всех материалов.'
      ]
    },
    headlight: {
      tag: 'Полировка фар', price: 'от 3 400 ₽', img: 'assets/img/headlight2.jpg', title: 'Полировка фар',
      lead: 'Восстановление прозрачности оптики: снимаем помутнение, желтизну и микроцарапины, возвращаем яркость света и опрятный вид фарам.',
      list: [
        '<b>Что это:</b> поэтапная шлифовка и полировка поликарбоната с защитным финишным покрытием.',
        '<b>Зачем нужна:</b> мутные фары хуже светят и портят вид авто — это ещё и вопрос безопасности.',
        '<b>Эффект:</b> прозрачные фары и более яркий, направленный свет ночью.',
        '<b>Защита:</b> финишный лак замедляет повторное помутнение оптики.'
      ]
    },
    prep: {
      tag: 'Предпродажная подготовка', price: 'от 14 000 ₽', img: 'assets/img/detail5.jpg', title: 'Предпродажная подготовка',
      lead: 'Комплекс «под ключ» перед продажей: бесконтактная мойка, химчистка, полировка и защита. Автомобиль выглядит дороже и продаётся быстрее.',
      list: [
        '<b>Что входит:</b> мойка, чистка салона, полировка кузова, обработка пластика и шин.',
        '<b>Зачем нужна:</b> ухоженный автомобиль производит впечатление и поднимает цену.',
        '<b>Результат:</b> свежий вид, приятный запах и блеск — покупатель готов платить больше.',
        '<b>Срок:</b> обычно 1 день в зависимости от состояния авто.'
      ]
    }
  };

  const modal = $('#serviceModal');
  if (modal) {
    const mImg = $('#modalImg'), mTag = $('#modalTag'), mTitle = $('#modalTitle'),
          mLead = $('#modalLead'), mList = $('#modalList'), mPrice = $('#modalPrice');
    function openModal(key) {
      const d = SERVICES[key]; if (!d) return;
      mImg.src = d.img; mImg.alt = d.title; mTag.textContent = d.tag;
      mTitle.textContent = d.title; mLead.textContent = d.lead; mPrice.textContent = d.price;
      mList.innerHTML = d.list.map((li) => `<li>${li}</li>`).join('');
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lock');
    }
    function closeModal() {
      modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lock');
    }
    $$('.scard[data-service]').forEach((c) => c.addEventListener('click', () => openModal(c.dataset.service)));
    modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
  }

  /* ============================================================
     HERO ROTATING PHRASE
     ============================================================ */
  const rotator = $('#rotator');
  if (rotator && !reduceMotion) {
    const words = $$('.rotator__w', rotator);
    let ri = 0;
    setInterval(() => {
      words[ri].classList.remove('is-on');
      ri = (ri + 1) % words.length;
      words[ri].classList.add('is-on');
    }, 1700);
  }

  /* ============================================================
     SCROLL PARALLAX (orbs + hero)
     ============================================================ */
  const heroMedia = $('.hero__media');
  const heroLit = $('#heroImg'); // lit-headlights layer; fades out on scroll down
  const parallaxEls = $$('[data-speed]');
  let ticking = false;
  function applyParallax() {
    const y = window.scrollY;
    // headlights fade off as you scroll — cheap, keep on ALL devices (incl. mobile)
    if (heroLit) heroLit.style.opacity = String(clamp(1 - y / (innerHeight * 0.5), 0, 1));
    // heavier parallax (hero shift + blurred orbs) only on non-touch, to keep mobile scroll smooth
    if (!isTouch) {
      if (heroMedia && y < innerHeight) heroMedia.style.transform = `translateY(${y * 0.16}px)`;
      const vh = innerHeight;
      parallaxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const center = r.top + r.height / 2;
        const off = center - vh / 2;
        el.style.transform = `translate3d(0, ${(-off * parseFloat(el.dataset.speed)).toFixed(1)}px, 0)`;
      });
    }
    ticking = false;
  }
  if (!reduceMotion) {
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(applyParallax); ticking = true; }
    }, { passive: true });
    applyParallax();
  }

})();
