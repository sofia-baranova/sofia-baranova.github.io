/* Гифка-пасхалка рядом с «давайте пообщаемся» и «спасибо, что дочитали»: при каждом заходе на страницу — следующая
   из перемешанной «колоды», без повторов, пока не покажутся все. Файлы — анимированный WebP с прозрачным фоном, высота 80 px (оригиналы гифок в _originals/stickers).
   Новая гифка: положить в images/, обработать так же и дописать путь в список ниже */
(function () {
  var STICKERS = [
    'images/sticker-sticker.webp',
    'images/sticker-alien.webp',
    'images/sticker-penguin.webp',
    'images/sticker-rat.webp',
    'images/sticker-roblox.webp',
    'images/sticker-smiley.webp',
    'images/sticker-sonic.webp',
    'images/sticker-spiderman.webp',
    'images/sticker-spongebob.webp',
    'images/sticker-squidward.webp'
  ];
  // персонажи, которые занимают малую часть кадра (бегают по нему или тонкие), — крупнее, чтобы на глаз были одного размера с остальными
  var SCALE = {
    'images/sticker-sonic.webp': 1.3,
    'images/sticker-spiderman.webp': 1.3,
    'images/sticker-sticker.webp': 1.25
  };
  // вертикальные гифки (выше, чем шире) — в баннере чуть выше остальных
  var TALL = ['images/sticker-alien.webp', 'images/sticker-rat.webp', 'images/sticker-sticker.webp',
              'images/sticker-roblox.webp', 'images/sticker-spiderman.webp', 'images/sticker-squidward.webp'];
  var imgs = document.querySelectorAll('img[data-sticker]');
  if (!imgs.length) return;

  // «колода»: пока не показаны все гифки по разу, повторов нет; потом колода тасуется заново.
  // Очередь запоминается в браузере посетителя. Если основное хранилище недоступно (приватный режим и т.п.),
  // берём запасное: хранилище вкладки, а если и его нет — имя окна (оно переживает перезагрузку вкладки)
  var store = (function () {
    var KEY = 'sticker-state';
    function tryStorage(name) { // при заблокированных cookies ошибку даёт уже само обращение к хранилищу — поэтому всё внутри try
      try { var st = window[name], t = '__t'; st.setItem(t, t); st.removeItem(t); return st; } catch (e) { return null; }
    }
    var st = tryStorage('localStorage') || tryStorage('sessionStorage');
    return {
      get: function () {
        try {
          if (st) return JSON.parse(st.getItem(KEY));
          var m = /(?:^|;)sticker=([^;]*)/.exec(window.name || '');
          return m ? JSON.parse(decodeURIComponent(m[1])) : null;
        } catch (e) { return null; }
      },
      set: function (v) {
        try {
          if (st) { st.setItem(KEY, JSON.stringify(v)); return; }
          var rest = (window.name || '').replace(/(?:^|;)sticker=[^;]*/, '');
          window.name = rest + ';sticker=' + encodeURIComponent(JSON.stringify(v));
        } catch (e) {}
      }
    };
  })();

  var state = store.get() || {};
  var deck = state.deck, last = state.last;
  var recent = Array.isArray(state.recent) ? state.recent : (last ? [last] : []);
  var valid = Array.isArray(deck) && deck.length && deck.every(function (src) { return STICKERS.indexOf(src) !== -1; });
  if (!valid) {
    deck = STICKERS.slice();
    for (var i = deck.length - 1; i > 0; i--) { // перемешивание Фишера — Йетса
      var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    // на стыке колод недавно показанные уходят в конец новой: между двумя показами одной гифки всегда не меньше 5 других
    deck = deck.filter(function (src) { return recent.indexOf(src) === -1; })
               .concat(deck.filter(function (src) { return recent.indexOf(src) !== -1; }));
  }
  // страховка: та же гифка, что в прошлый раз, никогда не идёт подряд — её карта уходит в конец колоды
  if (deck.length > 1 && deck[0] === last) { deck.push(deck.shift()); }
  var pick = deck.shift();
  imgs.forEach(function (img) { img.src = pick; if (SCALE[pick]) { img.style.setProperty('--sticker-k', SCALE[pick]); img.classList.add('is-scaled'); } if (TALL.indexOf(pick) !== -1) img.classList.add('is-tall'); });
  recent = [pick].concat(recent.filter(function (src) { return src !== pick; })).slice(0, 5); // помним последние 5
  store.set({ deck: deck, last: pick, recent: recent });
})();

/* Гамбургер-меню в шапке: открыть/закрыть по кнопке, закрыть по клику на ссылку, клику мимо или Esc */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav-mobile');
  if (!toggle || !nav) return;

  var setOpen = function (open) {
    // высота пунктов меню — до неё вытягивается стекло шапки (см. .header::before в styles.css)
    if (open) document.documentElement.style.setProperty('--menu-h', nav.offsetHeight + 'px');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('is-open'));
  });

  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (nav.contains(e.target) || toggle.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 600) setOpen(false);
  });
})();

/* Клик по «e-mail» копирует адрес в буфер обмена и показывает подтверждение. */
document.querySelectorAll('.js-copy-email').forEach(function (el) {
  var original = el.textContent;
  el.addEventListener('click', function (e) {
    e.preventDefault();
    var email = el.getAttribute('data-email');
    if (!email) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () {
        el.textContent = 'скопировано';
        setTimeout(function () { el.textContent = original; }, 1200);
      });
    } else {
      window.location.href = 'mailto:' + email; // запасной вариант
    }
  });
});

/* Drag-to-scroll: тянешь мышью влево-вправо, работает и на .wide-scroll__track, и на .lightbox__scroll */
function enableDragScroll(el) {
  if (!el) return;
  var isDown = false, startX = 0, startScroll = 0, moved = false;

  // нативный drag картинки перехватывает мышь и рвёт скролл — отключаем его насовсем
  el.querySelectorAll('img').forEach(function (img) {
    img.draggable = false;
    img.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });

  el.addEventListener('mousedown', function (e) {
    isDown = true; moved = false;
    startX = e.pageX;
    startScroll = el.scrollLeft;
    el.classList.add('is-dragging');
    e.preventDefault(); // тоже часть защиты от нативного drag/выделения текста
  });
  window.addEventListener('mouseup', function () {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('is-dragging');
  });
  window.addEventListener('mousemove', function (e) {
    if (!isDown) return;
    e.preventDefault();
    var dx = e.pageX - startX;
    if (Math.abs(dx) > 3) moved = true;
    el.scrollLeft = startScroll - dx;
  });
  // клик по картинке после драга не должен ничего триггерить (на будущее, если добавим ссылки внутри)
  el.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

document.querySelectorAll('.wide-scroll__track, .lightbox__scroll').forEach(enableDragScroll);

/* Лайтбокс: открыть по кнопке-«лупе», закрыть по крестику, клику по фону или Esc */
document.querySelectorAll('[data-lightbox-open]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var lightbox = document.getElementById(btn.getAttribute('data-lightbox-open'));
    if (!lightbox) return;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
});

document.querySelectorAll('.lightbox').forEach(function (lightbox) {
  var close = function () {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  var closeBtn = lightbox.querySelector('.lightbox__close');
  if (closeBtn) closeBtn.addEventListener('click', close);
  // закрытие по клику на фон убрали: при драге картинки курсор часто
  // отпускается за её пределами и лайтбокс закрывался случайно
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) close();
  });
});

/* Стопка фото мастерской: листаем стрелками, всегда виден один активный кадр */
(function () {
  var stack = document.getElementById('workshop-stack');
  if (!stack) return;
  var frames = Array.prototype.slice.call(stack.querySelectorAll('.photo-stack__frame'));
  var arrows = stack.querySelectorAll('.photo-stack__arrow');
  if (!frames.length) return;
  var current = frames.findIndex(function (f) { return f.classList.contains('is-active'); });
  if (current < 0) current = 0;

  var show = function (i) {
    frames.forEach(function (f, idx) { f.classList.toggle('is-active', idx === i); });
  };

  arrows.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dir = parseInt(btn.getAttribute('data-dir'), 10);
      current = (current + dir + frames.length) % frames.length;
      show(current);
    });
  });

  /* Увеличение по ховеру отключается у самых краёв кадра — не даём зуму держаться до упора */
  var framesBox = stack.querySelector('.photo-stack__frames');
  if (framesBox) {
    var EDGE_PAD = 18; // px отступа от края, где зум выключается
    var setZoom = function (on) {
      var active = framesBox.querySelector('.photo-stack__frame.is-active');
      if (active) active.classList.toggle('is-hover-zoom', on);
    };
    framesBox.addEventListener('mousemove', function (e) {
      var rect = framesBox.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var inside = x > EDGE_PAD && x < rect.width - EDGE_PAD && y > EDGE_PAD && y < rect.height - EDGE_PAD;
      setZoom(inside);
    });
    framesBox.addEventListener('mouseleave', function () { setZoom(false); });
  }
})();

/* Табы «Карта / Список» в ленте раскадровки: переключают видимую ленту, и кнопка-лупа открывает в лайтбоксе ту, что сейчас на экране */
document.querySelectorAll('.scenario-tabs').forEach(function (tabs) {
  var box = tabs.closest('.wide-scroll');
  if (!box) return;
  var expand = box.querySelector('.wide-scroll__expand');
  var tabButtons = tabs.querySelectorAll('[data-tab]');

  tabButtons.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var id = tab.getAttribute('data-tab');
      tabButtons.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      box.querySelectorAll('[data-tab-panel]').forEach(function (panel) {
        panel.classList.toggle('is-active', panel.getAttribute('data-tab-panel') === id);
      });
      if (expand) expand.setAttribute('data-lightbox-open', 'lightbox-' + id);
    });
  });
});

/* Карусель картинок в рамке: стрелки листают по кругу, подпись под рамкой меняется вместе с картинкой */
document.querySelectorAll('.figure-carousel').forEach(function (box) {
  var slides = Array.prototype.slice.call(box.querySelectorAll('.figure-carousel__slide'));
  var caption = box.querySelector('.figure-carousel__caption');
  var current = 0;
  box.querySelectorAll('.photo-stack__arrow').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dir = parseInt(btn.getAttribute('data-dir'), 10);
      current = (current + dir + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
      if (caption) caption.textContent = slides[current].getAttribute('data-caption') || '';
    });
  });

  /* те же стрелки в лайтбоксе: листают картинки карусели, не закрывая его; клавиши ← → тоже работают */
  var ARROW = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m8.5 12.8 5.7 5.6c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-4.9-5 4.9-5c.4-.4.4-1 0-1.4-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3l-5.7 5.6c-.4.5-.4 1.1 0 1.6 0-.1 0-.1 0 0z"></path></svg>';
  var boxes = slides.map(function (s) { return document.getElementById(s.getAttribute('data-lightbox-open')); });
  var go = function (from, dir) {
    var to = (from + dir + slides.length) % slides.length;
    if (boxes[from]) boxes[from].classList.remove('is-open');
    if (boxes[to]) boxes[to].classList.add('is-open');
    current = to;
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === current); });
    if (caption) caption.textContent = slides[current].getAttribute('data-caption') || '';
  };
  boxes.forEach(function (lb, i) {
    if (!lb) return;
    [['prev', -1, 'Предыдущая картинка'], ['next', 1, 'Следующая картинка']].forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'lightbox__nav lightbox__nav--' + d[0];
      b.setAttribute('aria-label', d[2]);
      b.innerHTML = ARROW;
      b.addEventListener('click', function () { go(i, d[1]); });
      lb.appendChild(b);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var i = boxes.findIndex(function (lb) { return lb && lb.classList.contains('is-open'); });
    if (i < 0) return;
    go(i, e.key === 'ArrowLeft' ? -1 : 1);
  });
});

/* доска набросков: клик увеличивает в 2 раза в точке клика, повторный клик возвращает; при увеличении доску можно тянуть в любую сторону */
(function () {
  var lb = document.getElementById('lightbox-lofi');
  if (!lb) return;
  var sc = lb.querySelector('.lightbox__scroll');
  var img = sc.querySelector('img');
  img.addEventListener('click', function (e) {
    var r = img.getBoundingClientRect();
    var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    var on = !lb.classList.contains('is-zoomed');
    lb.classList.toggle('is-zoomed', on);
    if (on) requestAnimationFrame(function () {
      sc.scrollLeft = fx * img.offsetWidth - sc.clientWidth / 2;
      sc.scrollTop = fy * img.offsetHeight - sc.clientHeight / 2;
    });
  });
  var down = false, y0 = 0, top0 = 0;
  sc.addEventListener('mousedown', function (e) { down = true; y0 = e.pageY; top0 = sc.scrollTop; });
  window.addEventListener('mouseup', function () { down = false; });
  window.addEventListener('mousemove', function (e) { if (down && lb.classList.contains('is-zoomed')) sc.scrollTop = top0 - (e.pageY - y0); });
  document.querySelectorAll('.sketch-crop').forEach(function (c) { c.addEventListener('click', function () { lb.classList.remove('is-zoomed'); }); });
})();

/* кроп набросков: в лайтбоксе подсвечивается своя метка, доска прокручивается к ней */
document.querySelectorAll('.sketch-crop').forEach(function (crop) {
  crop.addEventListener('click', function () {
    var lb = document.getElementById('lightbox-lofi');
    var n = crop.getAttribute('data-mark');
    var sc = lb.querySelector('.lightbox__scroll');
    var target = lb.querySelector('.sketch-mark[data-mark="' + n + '"]');
    lb.querySelectorAll('.sketch-mark').forEach(function (m) { m.classList.toggle('is-target', m === target); });
    requestAnimationFrame(function () { sc.scrollLeft = target.offsetLeft - sc.clientWidth / 2; });
  });
});

/* стрелки по бокам и клавиши ← → в лайтбоксе стопки фото.
   Листают и саму стопку, поэтому после закрытия она показывает то же фото */
(function () {
  var stack = document.getElementById('workshop-stack');
  if (!stack) return;
  var frames = Array.prototype.slice.call(stack.querySelectorAll('.photo-stack__frame'));
  var boxes = frames.map(function (f) { return document.getElementById(f.getAttribute('data-lightbox-open')); });
  var arrows = { '-1': stack.querySelector('.photo-stack__arrow[data-dir="-1"]'), '1': stack.querySelector('.photo-stack__arrow[data-dir="1"]') };
  var ARROW = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m8.5 12.8 5.7 5.6c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-4.9-5 4.9-5c.4-.4.4-1 0-1.4-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3l-5.7 5.6c-.4.5-.4 1.1 0 1.6 0-.1 0-.1 0 0z"></path></svg>';
  var go = function (dir) {
    var from = boxes.findIndex(function (b) { return b && b.classList.contains('is-open'); });
    if (from < 0) return;
    arrows[String(dir)].click();
    var to = frames.findIndex(function (f) { return f.classList.contains('is-active'); });
    boxes[from].classList.remove('is-open');
    boxes[to].classList.add('is-open');
  };
  boxes.forEach(function (lb) {
    if (!lb) return;
    [['prev', -1, 'Предыдущее фото'], ['next', 1, 'Следующее фото']].forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'lightbox__nav lightbox__nav--' + d[0];
      b.setAttribute('aria-label', d[2]);
      b.innerHTML = ARROW;
      b.addEventListener('click', function () { go(d[1]); });
      lb.appendChild(b);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });
})();

/* те же стрелки и клавиши ← → в лайтбоксах доски артефактов, по кругу 01 → 06 */
(function () {
  var ids = ['01', '02', '03', '04', '05', '06'].map(function (n) { return 'lightbox-artifact-' + n; });
  var boxes = ids.map(function (id) { return document.getElementById(id); });
  if (boxes.some(function (b) { return !b; })) return;
  var ARROW = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m8.5 12.8 5.7 5.6c.4.4 1 .4 1.4 0 .4-.4.4-1 0-1.4l-4.9-5 4.9-5c.4-.4.4-1 0-1.4-.2-.2-.4-.3-.7-.3-.3 0-.5.1-.7.3l-5.7 5.6c-.4.5-.4 1.1 0 1.6 0-.1 0-.1 0 0z"></path></svg>';
  var go = function (dir) {
    var from = boxes.findIndex(function (b) { return b.classList.contains('is-open'); });
    if (from < 0) return;
    var to = (from + dir + boxes.length) % boxes.length;
    boxes[from].classList.remove('is-open');
    boxes[to].classList.add('is-open');
  };
  boxes.forEach(function (lb) {
    [['prev', -1, 'Предыдущий артефакт'], ['next', 1, 'Следующий артефакт']].forEach(function (d) {
      var b = document.createElement('button');
      b.className = 'lightbox__nav lightbox__nav--' + d[0];
      b.setAttribute('aria-label', d[2]);
      b.innerHTML = ARROW;
      b.addEventListener('click', function () { go(d[1]); });
      lb.appendChild(b);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  });
})();

// Картинка за курсором у слов «аватарки» и «Рикки».
// Мышью — карточка едет за курсором; если картинок несколько, они «пролистываются» движением вдоль слова:
// слово делится на равные отрезки по числу картинок, у каждого отрезка своя картинка.
// На телефоне — по тапу под словом, следующий тап листает картинки (или закрывает, если картинка одна).
(function () {
  var words = document.querySelectorAll('[data-pop]');
  if (!words.length) return;
  var pop = document.createElement('div');
  pop.className = 'cursor-pop'; pop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(pop);
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAP = 16, PAD = 16; // отступ карточки от курсора и от края экрана
  var active = null, idx = 0, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

  // заранее подгружаем картинки, чтобы при наведении не было пустой карточки
  words.forEach(function (w) { w.dataset.pop.split('|').forEach(function (src) { if (src.indexOf('ph:') !== 0) { var i = new Image(); i.src = src.split('@')[0]; } }); });

  function build(word) {
    pop.style.setProperty('--pop-w', (word.dataset.popW || 240) + 'px');
    pop.innerHTML = '';
    word.dataset.pop.split('|').forEach(function (src, i) {
      var el;
      if (src.indexOf('ph:') === 0) { el = document.createElement('div'); el.className = 'ph'; el.textContent = src.slice(3); }
      else {
        var parts = src.split('@'); // «картинка@120» — свой размер для отдельной картинки (наклейки меньше карточек)
        el = document.createElement('img'); el.src = parts[0]; el.alt = '';
        if (parts[1]) el.style.setProperty('--item-w', parts[1] + 'px');
      }
      el.hidden = i !== 0;
      pop.appendChild(el);
    });
    idx = 0;
  }
  function show(i) {
    var kids = pop.children;
    if (i === idx || !kids[i]) return;
    kids[idx].hidden = true; idx = i; kids[idx].hidden = false;
  }
  function next() {
    var kids = pop.children;
    if (kids.length < 2) return false;
    show((idx + 1) % kids.length);
    return true;
  }
  function pickByX(word, x) { // какая картинка соответствует положению курсора вдоль слова
    var r = word.getBoundingClientRect(), n = pop.children.length;
    var t = Math.min(Math.max((x - r.left) / r.width, 0), 0.999);
    show(Math.floor(t * n));
  }
  function render() { pop.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; }
  function tick() { // карточка мягко догоняет курсор
    cx += (tx - cx) * 0.3; cy += (ty - cy) * 0.3; render();
    raf = (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(tick) : 0;
  }
  function placeAtCursor(x, y, jump) { // справа снизу от курсора; у края экрана перескакивает на другую сторону
    var w = pop.offsetWidth, h = pop.offsetHeight;
    tx = x + GAP; ty = y + GAP;
    if (tx + w > innerWidth - PAD) tx = x - GAP - w;
    if (ty + h > innerHeight - PAD) ty = y - GAP - h;
    tx = Math.max(PAD, tx); ty = Math.max(PAD, ty);
    if (jump || reduce) { cancelAnimationFrame(raf); raf = 0; cx = tx; cy = ty; render(); }
    else if (!raf) raf = requestAnimationFrame(tick);
  }
  function placeUnder(word) { // по центру под словом; если снизу не влезает — над ним
    var r = word.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    cx = Math.min(Math.max(PAD, r.left + r.width / 2 - w / 2), innerWidth - PAD - w);
    cy = r.bottom + 8;
    if (cy + h > innerHeight - PAD) cy = r.top - 8 - h;
    tx = cx; ty = cy; render();
  }
  function open(word) { active = word; build(word); pop.classList.add('is-visible'); }
  function close() { active = null; pop.classList.remove('is-visible'); }

  words.forEach(function (word) {
    if (canHover) {
      word.addEventListener('mouseenter', function (e) { open(word); pickByX(word, e.clientX); placeAtCursor(e.clientX, e.clientY, true); });
      word.addEventListener('mousemove', function (e) { pickByX(word, e.clientX); placeAtCursor(e.clientX, e.clientY); });
      word.addEventListener('mouseleave', close);
    } else {
      word.addEventListener('click', function (e) {
        e.stopPropagation();
        if (active === word) { if (!next()) close(); return; }
        open(word); placeUnder(word);
      });
    }
    // с клавиатуры: Tab на слово — карточка под ним
    word.addEventListener('focus', function () { if (word.matches(':focus-visible')) { open(word); placeUnder(word); } });
    word.addEventListener('blur', function () { if (active === word) close(); });
  });
  document.addEventListener('click', function () { if (active && !canHover) close(); });
  window.addEventListener('scroll', function () { if (active && !canHover) close(); }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && active) close(); });
})();
