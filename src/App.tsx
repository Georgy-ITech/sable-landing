import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { variants, formats } from './data/variants';

// three/drei/postprocessing — тяжёлый чанк, грузим отдельно после первого экрана
const Scene = lazy(() => import('./components/three/Scene'));
import { useTheme } from './hooks/useTheme';
import { usePrefersReducedMotion, useIsMobile, useWebGLAvailable } from './hooks/useEnv';

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, reduced }: { children: ReactNode; delay?: number; reduced: boolean }) {
  if (reduced) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function MoonSun() {
  return (
    <>
      <svg className="i-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <svg className="i-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19 5l-1.8 1.8M6.8 17.2 5 19M19 19l-1.8-1.8M6.8 6.8 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const webgl = useWebGLAvailable();

  const [vi, setVi] = useState(0);
  const [fmt, setFmt] = useState(1);
  const [scrolled, setScrolled] = useState(false);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');

  const progress = useRef(0);
  const userRotate = useRef(0);
  const sceneLayer = useRef<HTMLDivElement>(null);
  const variant = variants[vi];

  // скролл-прогресс (0..1 за первые ~2 экрана) + фон шапки + затухание сцены
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      setScrolled(y > 12);
      progress.current = Math.min(Math.max(y / (vh * 2), 0), 1);

      // флакон — герой hero/нот/конфигуратора; на контентных секциях уводим его
      if (sceneLayer.current) {
        const craft = document.getElementById('craft');
        if (craft) {
          const t = (y + vh - craft.offsetTop) / vh; // 0 — craft у нижней кромки, 1 — вошёл
          const o = 1 - Math.min(Math.max(t, 0), 1) * 0.9;
          sceneLayer.current.style.opacity = String(o);
        }
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // акцент меняется под аромат. Контент — AA под текущую тему; зона над тёмной
  // студией (hero/ноты/конфигуратор/шапка) всегда использует «тёмный» акцент.
  useEffect(() => {
    const r = document.documentElement;
    const acc = theme === 'dark' ? variant.accentDark : variant.accentLight;
    const rgb = theme === 'dark' ? variant.accentRgbDark : variant.accentRgbLight;
    r.style.setProperty('--accent', acc);
    r.style.setProperty('--accent-2', variant.glow);
    r.style.setProperty('--accent-rgb', rgb);
    r.style.setProperty('--accent-stage', variant.accentDark);
    r.style.setProperty('--accent-stage-rgb', variant.accentRgbDark);
    r.style.setProperty('--variant', variant.glow);
    r.style.setProperty('--variant-rgb', rgb);
  }, [variant, theme]);

  // прячем лоадер, когда сцена готова (или сразу, если WebGL недоступен)
  useEffect(() => {
    if (!webgl) return setReady(true);
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, [webgl]);

  // автоскрытие тоста
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // drag-вращение флакона (только когда анимации разрешены)
  const dragging = useRef(false);
  const lastX = useRef(0);
  const onDragStart = (e: React.PointerEvent) => {
    if (reduced) return;
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    userRotate.current += (e.clientX - lastX.current) * 0.01;
    lastX.current = e.clientX;
  };
  const onDragEnd = () => {
    dragging.current = false;
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('email') as HTMLInputElement;
    const err = e.currentTarget.querySelector('.form__error') as HTMLElement;
    const val = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
      input.classList.add('is-error');
      input.setAttribute('aria-invalid', 'true');
      err.textContent = 'Введите корректный адрес — например, you@example.com';
      input.focus();
      return;
    }
    input.classList.remove('is-error');
    input.removeAttribute('aria-invalid');
    err.textContent = '';
    e.currentTarget.reset();
    setToast(`Спасибо! Сообщим о старте — ${variant.name}, ${formats[fmt].size}`);
  };

  return (
    <>
      <a className="skip-link" href="#main">К основному содержимому</a>

      {/* лоадер сцены */}
      <div className={`scene-loader ${ready ? 'is-hidden' : ''}`} aria-hidden="true">
        <div className="scene-loader__mark" />
      </div>

      {/* фоновый 3D-слой или премиум-фолбэк */}
      {webgl ? (
        <div className="scene-layer" ref={sceneLayer} aria-hidden="true">
          <Suspense fallback={null}>
            <Scene
              variant={variant}
              progress={progress}
              userRotate={userRotate}
              reducedMotion={reduced}
              isMobile={isMobile}
            />
          </Suspense>
        </div>
      ) : (
        <div className="scene-fallback" aria-hidden="true" />
      )}

      <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container header__inner">
          <a className="brand" href="#top" aria-label="Sable — на главную">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__word">Sable</span>
          </a>
          <nav className="nav" aria-label="Разделы">
            <a href="#notes">Композиция</a>
            <a href="#configurator">Ароматы</a>
            <a href="#formats">Форматы</a>
          </nav>
          <div className="header__actions">
            <button
              className={`tswitch ${theme === 'light' ? 'is-light' : ''}`}
              type="button"
              onClick={toggle}
              role="switch"
              aria-checked={theme === 'light'}
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            >
              <MoonSun />
              <span className="tswitch__knob" aria-hidden="true" />
            </button>
            <a className="buy" href="#formats">Купить</a>
          </div>
        </div>
      </header>

      <main id="main" className="page">
        {/* HERO */}
        <section className="hero" id="top">
          <div className="hero__top">
            <p className="eyebrow hero__eyebrow">Нишевый парфюм · ручная сборка</p>
            <h1 className="hero__title">Sable</h1>
          </div>
          <div className="hero__bottom">
            <p className="hero__tagline">
              Три композиции в гранёном флаконе. Соберите свой аромат — и рассмотрите его со всех сторон.
            </p>
            <div className="hero__actions">
              <a className="btn btn--primary" href="#configurator">Собрать аромат</a>
              <a className="btn btn--ghost" href="#notes">Композиция</a>
            </div>
          </div>
          <div className={`scroll-cue ${scrolled ? 'is-hidden' : ''}`} aria-hidden="true">
            <span>Листайте</span>
            <span />
          </div>
        </section>

        {/* NOTES */}
        <section className="section" id="notes">
          <div className="container">
            <div className="section__head">
              <Reveal reduced={reduced}>
                <p className="eyebrow">Композиция</p>
              </Reveal>
              <Reveal reduced={reduced} delay={0.05}>
                <h2 className="section__title">Пирамида аромата</h2>
              </Reveal>
              <Reveal reduced={reduced} delay={0.1}>
                <p className="section__lead">
                  Аромат раскрывается слоями: верхние ноты встречают первыми, сердце держит образ,
                  база остаётся с вами до вечера. Значения обновляются под выбранный аромат «{variant.name}».
                </p>
              </Reveal>
            </div>
            <div className="notes">
              {(['top', 'heart', 'base'] as const).map((k, i) => (
                <Reveal reduced={reduced} delay={i * 0.08} key={k}>
                  <div className="note-row">
                    <span className="note-row__label">
                      {k === 'top' ? 'Верхние' : k === 'heart' ? 'Сердце' : 'База'}
                    </span>
                    <span className="note-row__val">{variant.notes[k].join(' · ')}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CONFIGURATOR */}
        <section className="config" id="configurator" aria-label="Конфигуратор аромата">
          {!reduced && (
            <div
              className="config__drag"
              aria-hidden="true"
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            />
          )}
          {!reduced && <p className="config__hint">Потяните, чтобы повернуть флакон</p>}
          <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            <div className="config__panel">
              <p className="config__sub">Аромат {vi + 1} / {variants.length}</p>
              <h2 className="config__name">{variant.name}</h2>
              <p className="config__desc">{variant.description}</p>

              <div className="swatches" role="group" aria-label="Выбор аромата">
                {variants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`swatch ${i === vi ? 'is-active' : ''}`}
                    onClick={() => setVi(i)}
                    aria-pressed={i === vi}
                    aria-label={`Аромат ${v.name} — ${v.subtitle}`}
                  >
                    <span className="swatch__dot" style={{ background: v.liquid, color: v.glow }} />
                    <span className="swatch__name">{v.name}</span>
                  </button>
                ))}
              </div>

              <ul className="config__notes" aria-label="Ноты аромата">
                {[...variant.notes.top, ...variant.notes.heart, ...variant.notes.base].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CRAFT */}
        <section className="section" id="craft">
          <div className="container">
            <div className="section__head">
              <Reveal reduced={reduced}><p className="eyebrow">Крафт</p></Reveal>
              <Reveal reduced={reduced} delay={0.05}><h2 className="section__title">Сделано вручную</h2></Reveal>
            </div>
            <div className="craft-grid">
              {[
                {
                  icon: (
                    <path d="M9 3h6M10 3v3.2a6 6 0 0 1-.9 3.1L6.5 14a4 4 0 0 0 3.4 6h4.2a4 4 0 0 0 3.4-6l-2.6-4.7a6 6 0 0 1-.9-3.1V3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  ),
                  t: 'Гранёное стекло',
                  d: 'Тяжёлый флакон с гранями преломляет свет и лежит в руке как драгоценность.',
                },
                {
                  icon: (
                    <>
                      <path d="M12 3 21 8l-9 5-9-5 9-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                      <path d="M3 12l9 5 9-5M3 16l9 5 9-5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </>
                  ),
                  t: 'Малые партии',
                  d: 'Каждая композиция вызревает неделями и разливается партиями по несколько сотен флаконов.',
                },
                {
                  icon: (
                    <path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                  ),
                  t: 'Честный состав',
                  d: 'Высокая концентрация масел, без отдушек-заменителей. Стойкость — весь день.',
                },
              ].map((c, i) => (
                <Reveal reduced={reduced} delay={i * 0.08} key={c.t}>
                  <article className="craft-card">
                    <span className="craft-card__icon" aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">{c.icon}</svg>
                    </span>
                    <h3 className="craft-card__title">{c.t}</h3>
                    <p className="craft-card__text">{c.d}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FORMATS */}
        <section className="section" id="formats">
          <div className="container">
            <div className="section__head">
              <Reveal reduced={reduced}><p className="eyebrow">Форматы</p></Reveal>
              <Reveal reduced={reduced} delay={0.05}><h2 className="section__title">Выберите объём</h2></Reveal>
            </div>
            <div className="plans" role="group" aria-label="Выбор объёма">
              {formats.map((f, i) => (
                <Reveal reduced={reduced} delay={i * 0.08} key={f.size}>
                  <button
                    type="button"
                    className={`plan ${i === fmt ? 'is-selected' : ''}`}
                    onClick={() => setFmt(i)}
                    aria-pressed={i === fmt}
                  >
                    {f.popular && <span className="plan__badge">Популярный</span>}
                    <span className="plan__size">{f.size}</span>
                    <span className="plan__price">{f.price}</span>
                    <span className="plan__note">{f.note}</span>
                    <span className="plan__check" aria-hidden="true" />
                  </button>
                </Reveal>
              ))}
            </div>
            <p className="plans__summary">
              Выбрано: <b>{formats[fmt].size}</b> — {formats[fmt].price}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="section" id="cta">
          <div className="container">
            <Reveal reduced={reduced}>
              <div className="cta__inner">
                <p className="eyebrow">Скоро в продаже</p>
                <h2 className="section__title" style={{ marginTop: 'var(--s2)' }}>Узнать о старте первым</h2>
                <p className="section__lead" style={{ margin: 'var(--s2) auto 0' }}>
                  Ваш выбор: <b>{variant.name}</b>, {formats[fmt].size}. Оставьте почту — пришлём приглашение
                  и подарок к первому заказу.
                </p>
                <form className="form" onSubmit={submit} noValidate>
                  <div className="form__row">
                    <label className="sr-only" htmlFor="email">Электронная почта</label>
                    <input
                      className="form__input"
                      type="email"
                      id="email"
                      name="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      aria-describedby="email-error"
                    />
                    <button className="btn btn--primary" type="submit">Оставить почту</button>
                  </div>
                  <p className="form__error" id="email-error" role="alert" />
                  <p className="form__note">Без спама. Отписка в один клик.</p>
                </form>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer__brand">Sable</div>
          <p className="footer__text">
            Демонстрационный проект для портфолио. Бренд вымышлен, продукт не продаётся, форма работает в демо-режиме.
          </p>
        </div>
      </footer>

      <div className={`toast ${toast ? 'is-shown' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
