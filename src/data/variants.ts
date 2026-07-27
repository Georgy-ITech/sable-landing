export type CapStyle = {
  topR: number;
  botR: number;
  h: number;
  color: string;
  metalness: number;
  roughness: number;
  segments: number;
};

export type LabelStyle = {
  /** цвет бумаги */
  paper: string;
  /** цвет печати */
  ink: string;
  /** акцент печати (линейка/орнамент) */
  accent: string;
  /** радиус полосы (≈ радиус корпуса + чуть наружу стекла) */
  r: number;
  /** центр полосы по высоте */
  y: number;
  /** высота полосы */
  h: number;
};

export type Variant = {
  id: string;
  name: string;
  subtitle: string;
  /** цвет жидкости во флаконе */
  liquid: string;
  /** цвет rim-света и свечения сцены */
  glow: string;
  /** акцент интерфейса, проверенный на контраст в каждой теме */
  accentDark: string;
  accentLight: string;
  accentRgbDark: string;
  accentRgbLight: string;
  /** силуэт флакона: точки LatheGeometry [радиус, высота] снизу вверх */
  profile: [number, number][];
  /** число сегментов вращения (меньше → гранёное стекло) */
  segments: number;
  /** верхняя точка горлышка (для посадки воротника и крышки) */
  neckTop: number;
  /** уровень налива жидкости (maxY профиля) */
  fill: number;
  /** видимый масштаб — нормализует разную высоту флаконов в кадре */
  viewScale: number;
  cap: CapStyle;
  label: LabelStyle;
  /** лёгкий оттенок стекла */
  glassTint: string;
  /** градиент-атмосфера сцены за флаконом */
  bgFrom: string;
  bgTo: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  description: string;
};

export const variants: Variant[] = [
  {
    id: 'nuit',
    name: 'Nuit',
    subtitle: 'Ночь',
    liquid: '#3a3aa0',
    glow: '#6366f1',
    accentDark: '#8f92f6',
    accentLight: '#4b49d6',
    accentRgbDark: '143, 146, 246',
    accentRgbLight: '75, 73, 214',
    // высокий стройный флакон
    profile: [
      [0.0, -1.0],
      [0.36, -1.0],
      [0.4, -0.9],
      [0.4, 0.75],
      [0.33, 0.96],
      [0.16, 1.12],
      [0.15, 1.28],
    ],
    segments: 48,
    neckTop: 1.28,
    fill: -0.05,
    viewScale: 0.62,
    cap: { topR: 0.18, botR: 0.16, h: 0.34, color: '#4a4c68', metalness: 0.95, roughness: 0.16, segments: 12 },
    label: { paper: '#ded9cc', ink: '#2a2b55', accent: '#6366f1', r: 0.41, y: -0.12, h: 0.62 },
    glassTint: '#eef0ff',
    bgFrom: '#2a2b74',
    bgTo: '#05050c',
    notes: {
      top: ['Бергамот', 'Чёрный перец'],
      heart: ['Ирис', 'Фиалка'],
      base: ['Уд', 'Амбра', 'Мускус'],
    },
    description:
      'Тёмная, дымчатая композиция для позднего вечера. Ирис и уд раскрываются медленно, оставляя тёплый бархатный шлейф.',
  },
  {
    id: 'ambre',
    name: 'Ambre',
    subtitle: 'Амбра',
    liquid: '#a9702f',
    glow: '#e8a95a',
    accentDark: '#e0a75f',
    accentLight: '#8f6316',
    accentRgbDark: '224, 167, 95',
    accentRgbLight: '143, 99, 22',
    // приземистый округлый аптекарский
    profile: [
      [0.0, -1.0],
      [0.56, -1.0],
      [0.62, -0.84],
      [0.62, 0.06],
      [0.5, 0.4],
      [0.25, 0.58],
      [0.23, 0.72],
    ],
    segments: 48,
    neckTop: 0.72,
    fill: -0.2,
    viewScale: 0.78,
    cap: { topR: 0.3, botR: 0.27, h: 0.24, color: '#c9a24a', metalness: 1.0, roughness: 0.28, segments: 24 },
    label: { paper: '#e3d5ba', ink: '#5a3d16', accent: '#b07d2e', r: 0.63, y: -0.34, h: 0.5 },
    glassTint: '#fff4e6',
    bgFrom: '#6b3f16',
    bgTo: '#0a0705',
    notes: {
      top: ['Мандарин', 'Кардамон'],
      heart: ['Роза', 'Шафран'],
      base: ['Ваниль', 'Бензоин', 'Кедр'],
    },
    description:
      'Тёплая янтарная смола с пряным сердцем. Ваниль и бензоин обволакивают, шафран добавляет благородной горечи.',
  },
  {
    id: 'brume',
    name: 'Brume',
    subtitle: 'Дымка',
    liquid: '#4e968c',
    glow: '#7fc9c0',
    accentDark: '#79cabf',
    accentLight: '#237f72',
    accentRgbDark: '121, 202, 191',
    accentRgbLight: '35, 127, 114',
    // гранёный угловатый
    profile: [
      [0.0, -1.0],
      [0.44, -1.0],
      [0.47, -0.88],
      [0.47, 0.52],
      [0.42, 0.66],
      [0.2, 0.84],
      [0.19, 1.0],
    ],
    segments: 6,
    neckTop: 1.0,
    fill: -0.02,
    viewScale: 0.72,
    cap: { topR: 0.24, botR: 0.22, h: 0.3, color: '#9aa0a6', metalness: 0.9, roughness: 0.42, segments: 6 },
    label: { paper: '#dae5e1', ink: '#1f5d54', accent: '#3f9b8e', r: 0.48, y: -0.18, h: 0.56 },
    glassTint: '#eafcfa',
    bgFrom: '#12594f',
    bgTo: '#04090a',
    notes: {
      top: ['Морская соль', 'Лайм'],
      heart: ['Шалфей', 'Герань'],
      base: ['Ветивер', 'Белый мускус', 'Кашемировое дерево'],
    },
    description:
      'Прохладная, минеральная свежесть утреннего тумана. Ветивер и морская соль создают ощущение чистого воздуха.',
  },
];

export const formats = [
  { size: '30 мл', price: '4 900 ₽', note: 'Дорожный формат' },
  { size: '50 мл', price: '6 900 ₽', note: 'Основной объём', popular: true },
  { size: '100 мл', price: '9 900 ₽', note: 'Для дома' },
];
