import {
  Assignee,
  Brand,
  ContentPost,
  ContentType,
  KanbanColumn,
  KanbanStatus,
  Platform,
} from '../types/content';

export const BRANDS: Brand[] = [
  {
    id: 'exodo',
    name: 'Éxodo - Streetwear',
    badge: 'EX',
    accent: '#18181b',
    accentLight: '#f4f4f5',
    description: 'Drop urbano, DTF/Serigrafía & Lanzamientos',
    handle: 'exodostreetwear',
    category: 'Marca de ropa',
    website: 'exodostreetwear.com',
    igFollowers: '12.4K',
    igFollowing: '284',
    ttFollowing: '96',
    ttFollowers: '18.9K',
    ttLikes: '142.6K',
    highlights: [
      { id: 'h-1', label: 'Drop 04', tint: '#27272a' },
      { id: 'h-2', label: 'Taller', tint: '#3f3f46' },
      { id: 'h-3', label: 'Fits', tint: '#52525b' },
      { id: 'h-4', label: 'Envíos', tint: '#18181b' },
    ],
  },
  {
    id: 'agape',
    name: 'Ágape',
    badge: 'AG',
    accent: '#0d9488',
    accentLight: '#f0fdfa',
    description: 'Comunidad, Editorial & Campañas',
    handle: 'agape.editorial',
    category: 'Comunidad',
    website: 'agapecomunidad.org',
    igFollowers: '6.8K',
    igFollowing: '192',
    ttFollowing: '54',
    ttFollowers: '9.3K',
    ttLikes: '68.4K',
    highlights: [
      { id: 'h-5', label: 'Encuentros', tint: '#0f766e' },
      { id: 'h-6', label: 'Editorial', tint: '#115e59' },
      { id: 'h-7', label: 'Historias', tint: '#134e4a' },
    ],
  },
  {
    id: 'personal',
    name: 'Personal / Otros',
    badge: 'PO',
    accent: '#4f46e5',
    accentLight: '#eef2ff',
    description: 'Proyectos Audiovisuales, Battletai & Notas',
    handle: 'andres.studio',
    category: 'Creador digital',
    website: 'andresstudio.co',
    igFollowers: '3.2K',
    igFollowing: '410',
    ttFollowing: '128',
    ttFollowers: '11.5K',
    ttLikes: '94.2K',
    highlights: [
      { id: 'h-8', label: 'Montaje', tint: '#3730a3' },
      { id: 'h-9', label: 'IA & Cine', tint: '#4338ca' },
      { id: 'h-10', label: 'Battletai', tint: '#312e81' },
    ],
  },
];

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'estrategia',
    title: '1. Estrategia & Brief',
    shortTitle: 'Estrategia',
    owner: 'Estratega Manager',
    accentText: 'text-amber-700 dark:text-amber-300',
    accentBg: 'bg-amber-500/12',
    accentBorder: 'border-amber-500/30',
  },
  {
    id: 'produccion',
    title: '2. En Producción / Diseño',
    shortTitle: 'Producción',
    owner: 'Equipo de Producción / Gráfico',
    accentText: 'text-purple-700 dark:text-purple-300',
    accentBg: 'bg-purple-500/12',
    accentBorder: 'border-purple-500/30',
  },
  {
    id: 'copywriting',
    title: '3. Copywriting & Edición',
    shortTitle: 'Copywriting',
    owner: 'Content Manager',
    accentText: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-500/12',
    accentBorder: 'border-sky-500/30',
  },
  {
    id: 'programado',
    title: '4. Programado / Aprobado',
    shortTitle: 'Programado',
    owner: 'Social Media Manager',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    accentBg: 'bg-indigo-500/12',
    accentBorder: 'border-indigo-500/30',
  },
  {
    id: 'publicado',
    title: '5. Publicado',
    shortTitle: 'Publicado',
    owner: 'Archivado / Live',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-500/12',
    accentBorder: 'border-emerald-500/30',
  },
];

export const CONTENT_TYPES: ContentType[] = [
  'Reel',
  'Carrusel',
  'Historia',
  'Lanzamiento de Producto',
  'Tanda',
];

export const PLATFORMS: Platform[] = [
  'Instagram',
  'TikTok',
  'Web/Lanzamientos',
];

export const ASSIGNEES: Assignee[] = [
  'Andrés',
  'Valeria',
  'Isaac',
  'Diseño Éxodo',
];

export const PLATFORM_STYLES: Record<
  Platform,
  {
    text: string;
    cal: string;
    swatch: string;
    short: string;
  }
> = {
  Instagram: {
    text: 'text-pink-600 dark:text-pink-400',
    cal: 'bg-pink-500/10 text-pink-800 dark:text-pink-200 border border-pink-500/25',
    swatch: 'bg-pink-500',
    short: 'IG',
  },
  TikTok: {
    text: 'text-cyan-700 dark:text-cyan-400',
    cal: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/25',
    swatch: 'bg-cyan-500',
    short: 'TT',
  },
  'Web/Lanzamientos': {
    text: 'text-violet-700 dark:text-violet-400',
    cal: 'bg-violet-500/10 text-violet-800 dark:text-violet-200 border border-violet-500/25',
    swatch: 'bg-violet-500',
    short: 'WEB',
  },
};

export const STATUS_CAL_STYLES: Record<KanbanStatus, string> = {
  estrategia: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/25',
  produccion: 'bg-purple-500/10 text-purple-800 dark:text-purple-200 border border-purple-500/25',
  copywriting: 'bg-sky-500/10 text-sky-800 dark:text-sky-200 border border-sky-500/25',
  programado: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border border-indigo-500/25',
  publicado: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/25',
};

export const formatDateKey = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const todayObj = new Date();
export const CURRENT_YEAR = todayObj.getFullYear();
export const CURRENT_MONTH = todayObj.getMonth();
export const TODAY_KEY = formatDateKey(
  todayObj.getFullYear(),
  todayObj.getMonth(),
  todayObj.getDate()
);

const makeDate = (dayOffset: number, hour = '18:00') => {
  const targetDay = Math.min(28, Math.max(1, todayObj.getDate() + dayOffset));
  const d = new Date(CURRENT_YEAR, CURRENT_MONTH, targetDay);
  return {
    date: formatDateKey(d.getFullYear(), d.getMonth(), d.getDate()),
    time: hour,
  };
};

// Generates self-contained editorial artboard covers as SVG data URLs (zero broken external links)
function buildArtboardCover(opts: {
  bg1: string;
  bg2: string;
  accent: string;
  ink: string;
  kicker: string;
  headline: string;
  subline: string;
  motif: 'tee' | 'plotter' | 'grid' | 'sticker' | 'lookbook' | 'editorial' | 'reel' | 'timeline' | 'campaign';
}): string {
  const { bg1, bg2, accent, ink, kicker, headline, subline, motif } = opts;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let graphic = '';
  if (motif === 'tee') {
    graphic = `
      <g opacity="0.92" transform="translate(220, 125)">
        <path d="M55 20 L110 0 L155 25 L200 0 L255 20 L300 85 L258 118 L235 90 L235 280 L75 280 L75 90 L52 118 L10 85 Z" fill="${ink}" fill-opacity="0.1" stroke="${ink}" stroke-opacity="0.45" stroke-width="2.5"/>
        <path d="M115 12 Q155 48 195 12" fill="none" stroke="${ink}" stroke-opacity="0.45" stroke-width="2.5"/>
        <rect x="115" y="95" width="80" height="80" fill="none" stroke="${accent}" stroke-width="2"/>
        <circle cx="155" cy="135" r="24" fill="${accent}" fill-opacity="0.28"/>
        <text x="155" y="140" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="3">RAÍZ</text>
      </g>`;
  } else if (motif === 'plotter') {
    graphic = `
      <g transform="translate(80, 135)">
        <rect x="0" y="65" width="440" height="110" rx="14" fill="${ink}" fill-opacity="0.08" stroke="${ink}" stroke-opacity="0.35" stroke-width="2"/>
        <line x1="28" y1="100" x2="412" y2="100" stroke="${accent}" stroke-width="2.5" stroke-dasharray="10 6"/>
        <rect x="150" y="78" width="44" height="44" rx="8" fill="${accent}" fill-opacity="0.85"/>
        <path d="M90 175 L350 175 L380 265 L60 265 Z" fill="${ink}" fill-opacity="0.12" stroke="${ink}" stroke-opacity="0.3" stroke-width="1.5"/>
        <circle cx="145" cy="220" r="18" fill="none" stroke="${accent}" stroke-width="2"/>
        <rect x="200" y="202" width="44" height="36" rx="4" fill="none" stroke="${ink}" stroke-opacity="0.5" stroke-width="2"/>
        <polygon points="295,202 320,238 270,238" fill="none" stroke="${accent}" stroke-width="2"/>
      </g>`;
  } else if (motif === 'grid') {
    graphic = `
      <g transform="translate(115, 130)">
        <rect x="0" y="0" width="170" height="225" rx="8" fill="${ink}" fill-opacity="0.08" stroke="${ink}" stroke-opacity="0.32" stroke-width="2"/>
        <rect x="200" y="0" width="170" height="225" rx="8" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-width="2"/>
        <line x1="35" y1="55" x2="135" y2="55" stroke="${ink}" stroke-opacity="0.5" stroke-width="2"/>
        <line x1="85" y1="55" x2="85" y2="180" stroke="${ink}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="5 5"/>
        <line x1="228" y1="55" x2="342" y2="55" stroke="${accent}" stroke-width="2.5"/>
        <line x1="285" y1="55" x2="285" y2="160" stroke="${accent}" stroke-width="2.5" stroke-dasharray="5 5"/>
        <text x="85" y="205" text-anchor="middle" fill="${ink}" fill-opacity="0.7" font-family="sans-serif" font-size="12" font-weight="600">CLÁSICO</text>
        <text x="285" y="205" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="12" font-weight="700">BOXY FIT</text>
      </g>`;
  } else if (motif === 'sticker') {
    graphic = `
      <g transform="translate(110, 135)">
        <rect x="20" y="25" width="145" height="90" rx="45" transform="rotate(-8 92 70)" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2.5"/>
        <text x="92" y="76" text-anchor="middle" transform="rotate(-8 92 70)" fill="${ink}" font-family="sans-serif" font-size="16" font-weight="700">UV DTF</text>
        <circle cx="285" cy="85" r="56" fill="${ink}" fill-opacity="0.1" stroke="${ink}" stroke-opacity="0.4" stroke-width="2"/>
        <text x="285" y="90" text-anchor="middle" fill="${ink}" font-family="sans-serif" font-size="14" font-weight="700">EX—04</text>
        <rect x="125" y="145" width="215" height="72" rx="14" transform="rotate(4 232 180)" fill="${ink}" fill-opacity="0.12" stroke="${accent}" stroke-width="2"/>
        <text x="232" y="187" text-anchor="middle" transform="rotate(4 232 180)" fill="${ink}" font-family="sans-serif" font-size="14" font-weight="600" letter-spacing="2">EDICIÓN LIMITADA</text>
      </g>`;
  } else if (motif === 'lookbook') {
    graphic = `
      <g transform="translate(120, 120)">
        <rect x="0" y="0" width="360" height="240" rx="10" fill="none" stroke="${ink}" stroke-opacity="0.25" stroke-width="1.5"/>
        <line x1="120" y1="0" x2="120" y2="240" stroke="${ink}" stroke-opacity="0.14" stroke-width="1"/>
        <line x1="240" y1="0" x2="240" y2="240" stroke="${ink}" stroke-opacity="0.14" stroke-width="1"/>
        <line x1="0" y1="120" x2="360" y2="120" stroke="${ink}" stroke-opacity="0.14" stroke-width="1"/>
        <circle cx="180" cy="120" r="64" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="2"/>
        <circle cx="180" cy="120" r="22" fill="none" stroke="${ink}" stroke-opacity="0.6" stroke-width="1.5"/>
      </g>`;
  } else if (motif === 'editorial') {
    graphic = `
      <g transform="translate(95, 130)">
        <circle cx="205" cy="115" r="95" fill="${accent}" fill-opacity="0.18"/>
        <circle cx="205" cy="115" r="62" fill="none" stroke="${accent}" stroke-width="1.8"/>
        <line x1="60" y1="115" x2="350" y2="115" stroke="${ink}" stroke-opacity="0.28" stroke-width="1.5"/>
        <line x1="205" y1="20" x2="205" y2="210" stroke="${ink}" stroke-opacity="0.28" stroke-width="1.5"/>
      </g>`;
  } else if (motif === 'reel') {
    graphic = `
      <g transform="translate(195, 115)">
        <rect x="0" y="0" width="210" height="255" rx="22" fill="${ink}" fill-opacity="0.08" stroke="${ink}" stroke-opacity="0.35" stroke-width="2"/>
        <circle cx="105" cy="126" r="38" fill="${accent}" fill-opacity="0.25" stroke="${accent}" stroke-width="2.5"/>
        <polygon points="95,110 126,126 95,142" fill="${ink}"/>
        <line x1="28" y1="218" x2="182" y2="218" stroke="${ink}" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round"/>
        <line x1="28" y1="218" x2="112" y2="218" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
      </g>`;
  } else if (motif === 'timeline') {
    graphic = `
      <g transform="translate(65, 145)">
        <rect x="0" y="18" width="160" height="34" rx="6" fill="${accent}" fill-opacity="0.35" stroke="${accent}" stroke-width="1.5"/>
        <rect x="172" y="18" width="210" height="34" rx="6" fill="${ink}" fill-opacity="0.12" stroke="${ink}" stroke-opacity="0.35" stroke-width="1.5"/>
        <rect x="394" y="18" width="76" height="34" rx="6" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="1.5"/>
        <rect x="45" y="68" width="265" height="30" rx="6" fill="${ink}" fill-opacity="0.1" stroke="${ink}" stroke-opacity="0.3" stroke-width="1.5"/>
        <rect x="322" y="68" width="148" height="30" rx="6" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="1.5"/>
        <rect x="0" y="114" width="470" height="26" rx="6" fill="${ink}" fill-opacity="0.07" stroke="${ink}" stroke-opacity="0.2" stroke-width="1.5"/>
        <line x1="225" y1="0" x2="225" y2="175" stroke="${accent}" stroke-width="2.5"/>
        <polygon points="217,0 233,0 225,12" fill="${accent}"/>
      </g>`;
  } else {
    graphic = `
      <g transform="translate(110, 140)">
        <rect x="0" y="0" width="380" height="190" rx="16" fill="${ink}" fill-opacity="0.08" stroke="${ink}" stroke-opacity="0.28" stroke-width="2"/>
        <rect x="28" y="34" width="140" height="16" rx="4" fill="${accent}" fill-opacity="0.65"/>
        <rect x="28" y="68" width="320" height="10" rx="4" fill="${ink}" fill-opacity="0.25"/>
        <rect x="28" y="92" width="240" height="10" rx="4" fill="${ink}" fill-opacity="0.18"/>
        <rect x="28" y="132" width="108" height="28" rx="8" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="1.5"/>
      </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720" width="600" height="720">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="720" fill="url(#g)"/>
    <g opacity="0.08" stroke="${ink}" stroke-width="1">
      <line x1="0" y1="120" x2="600" y2="120"/>
      <line x1="0" y1="600" x2="600" y2="600"/>
      <line x1="60" y1="0" x2="60" y2="720"/>
      <line x1="540" y1="0" x2="540" y2="720"/>
    </g>
    ${graphic}
    <text x="60" y="84" fill="${accent}" font-family="system-ui, sans-serif" font-size="16" font-weight="700" letter-spacing="2.5">${esc(kicker)}</text>
    <text x="60" y="558" fill="${ink}" font-family="system-ui, sans-serif" font-size="34" font-weight="700">${esc(headline)}</text>
    <text x="60" y="646" fill="${ink}" fill-opacity="0.65" font-family="system-ui, sans-serif" font-size="18" font-weight="500">${esc(subline)}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const COVER_EXODO_RAIZ = buildArtboardCover({
  bg1: '#18181b',
  bg2: '#27272a',
  accent: '#a1a1aa',
  ink: '#fafafa',
  kicker: 'ÉXODO — DROP 04',
  headline: 'Boxy Tee "Raíz"',
  subline: '280 GSM · Serigrafía Alto Relieve',
  motif: 'tee',
});

const COVER_EXODO_TALLER = buildArtboardCover({
  bg1: '#111827',
  bg2: '#1f2937',
  accent: '#22d3ee',
  ink: '#f8fafc',
  kicker: 'DETRÁS DE CÁMARAS',
  headline: 'Taller & Cameo',
  subline: 'Proceso Print & Cut · 9:16',
  motif: 'plotter',
});

const COVER_EXODO_FIT = buildArtboardCover({
  bg1: '#1c1917',
  bg2: '#292524',
  accent: '#f59e0b',
  ink: '#fafaf9',
  kicker: 'CARRUSEL EDITORIAL',
  headline: 'Boxy vs Clásico',
  subline: 'Guía técnica de caídas y tallas',
  motif: 'grid',
});

const COVER_EXODO_STICKERS = buildArtboardCover({
  bg1: '#1e1b4b',
  bg2: '#312e81',
  accent: '#a78bfa',
  ink: '#f5f3ff',
  kicker: 'TANDA LIMITADA',
  headline: 'Stickers UV DTF',
  subline: '8 ilustraciones vectoriales',
  motif: 'sticker',
});

const COVER_EXODO_LOOKBOOK = buildArtboardCover({
  bg1: '#0f172a',
  bg2: '#1e293b',
  accent: '#f472b6',
  ink: '#f8fafc',
  kicker: 'LOOKBOOK URBANO',
  headline: 'Sesión Tarde',
  subline: 'Secuencia interactiva · Historias',
  motif: 'lookbook',
});

const COVER_AGAPE_ENCUENTRO = buildArtboardCover({
  bg1: '#042f2e',
  bg2: '#115e59',
  accent: '#5eead4',
  ink: '#f0fdfa',
  kicker: 'ÁGAPE EDITORIAL',
  headline: 'Reflexión & Comunidad',
  subline: '5 ideas para cultivar escucha',
  motif: 'editorial',
});

const COVER_AGAPE_RELATO = buildArtboardCover({
  bg1: '#0f292e',
  bg2: '#164e63',
  accent: '#67e8f9',
  ink: '#ecfeff',
  kicker: 'MICRO-RELATO VISUAL',
  headline: 'Desde lo simple',
  subline: 'Pieza audiovisual · Voz & Ambiente',
  motif: 'reel',
});

const COVER_PERSONAL_MONTAJE = buildArtboardCover({
  bg1: '#17153b',
  bg2: '#2e236c',
  accent: '#818cf8',
  ink: '#eef2ff',
  kicker: 'NOTAS METODOLÓGICAS',
  headline: 'IA en Montaje',
  subline: 'Preproducción y criterio narrativo',
  motif: 'timeline',
});

const COVER_PERSONAL_CAMPANA = buildArtboardCover({
  bg1: '#18181b',
  bg2: '#312e81',
  accent: '#38bdf8',
  ink: '#f8fafc',
  kicker: 'COMUNIDAD & BATTLETAI',
  headline: 'Campañas Activas',
  subline: 'Resumen de recompensas vigentes',
  motif: 'campaign',
});

export const INITIAL_POSTS: ContentPost[] = [
  {
    id: 'post-1',
    brandId: 'exodo',
    title: 'Drop 04: Heavyweight Boxy Tee — "Raíz"',
    status: 'programado',
    platform: 'Instagram',
    contentType: 'Lanzamiento de Producto',
    ...makeDate(1, '19:30'),
    assignee: 'Andrés',
    coverUrl: COVER_EXODO_RAIZ,
    mediaType: 'image',
    mediaItems: [
      {
        id: 'm-1',
        name: 'exodo_raiz_front_4k.svg',
        type: 'image',
        url: COVER_EXODO_RAIZ,
      },
    ],
    caption:
      'Algodón peinado 280 GSM, corte boxy estructurado y estampa en serigrafía de alto relieve. Disponible este viernes en tienda.',
    hashtags:
      '#ExodoStreetwear #StreetwearCaracas #Drop04 #HeavyweightTee #ModaUrbana',
    cta: 'Activa el recordatorio y entra al enlace del perfil para apartar tu talla.',
    internalNotes:
      'Verificar stock de tallas XL en adelante y confirmar artes finales para DTF/serigrafía.',
    checklist: [
      { id: 'c-1', text: 'Aprobar arte final y separación de color', done: true },
      { id: 'c-2', text: 'Grabar clip de detalle de costura y etiqueta', done: true },
      { id: 'c-3', text: 'Programar en Meta Business Suite', done: false },
    ],
    comments: [
      {
        id: 'cm-1',
        author: 'Valeria',
        text: 'El encuadre de la primera foto quedó súper limpio para el feed.',
        time: 'Hace 2h',
      },
      {
        id: 'cm-2',
        author: 'Andrés',
        text: 'Listo, mañana ajustamos el horario del lanzamiento web.',
        time: 'Hace 45m',
      },
    ],
    feedOrder: 0,
  },
  {
    id: 'post-2',
    brandId: 'exodo',
    title: 'Detrás de cámaras: Taller & Plotter Cameo',
    status: 'produccion',
    platform: 'TikTok',
    contentType: 'Reel',
    ...makeDate(2, '16:00'),
    assignee: 'Diseño Éxodo',
    coverUrl: COVER_EXODO_TALLER,
    mediaType: 'image',
    mediaItems: [
      {
        id: 'm-2',
        name: 'taller_proceso_reel.svg',
        type: 'image',
        url: COVER_EXODO_TALLER,
      },
    ],
    caption:
      'Así preparamos los stickers troquelados y pruebas de color antes de sacar una tanda completa.',
    hashtags: '#BehindTheScenes #PrintAndCut #Exodo #ProcesoCreativo',
    cta: 'Comenta qué diseño te gustaría ver en la próxima tanda.',
    internalNotes: 'Mantener ritmo rápido de cortes en los primeros 3 segundos.',
    checklist: [
      { id: 'c-4', text: 'Grabar video vertical 9:16 en mesa de trabajo', done: true },
      { id: 'c-5', text: 'Exportar versión limpia sin marcas de agua', done: false },
    ],
    comments: [
      {
        id: 'cm-3',
        author: 'Andrés',
        text: 'Agreguemos un plano cerrado del corte de vinil.',
        time: 'Hace 3h',
      },
    ],
    feedOrder: 1,
  },
  {
    id: 'post-3',
    brandId: 'exodo',
    title: 'Guía de fits: Boxy vs Clásico',
    status: 'copywriting',
    platform: 'Instagram',
    contentType: 'Carrusel',
    ...makeDate(4, '18:00'),
    assignee: 'Valeria',
    coverUrl: COVER_EXODO_FIT,
    mediaType: 'image',
    mediaItems: [
      {
        id: 'm-3',
        name: 'carrusel_fit_guide.svg',
        type: 'image',
        url: COVER_EXODO_FIT,
      },
    ],
    caption:
      '¿No sabes qué talla elegir? Desglosamos caídas, largos y proporciones para que aciertes a la primera.',
    hashtags: '#GuiaDeTallas #Streetwear #Exodo #EstiloUrbano',
    cta: 'Guarda este carrusel antes de hacer tu pedido.',
    internalNotes: 'Revisar coherencia con tabla de medidas actualizada.',
    checklist: [
      { id: 'c-6', text: 'Redactar titulares de las 6 diapositivas', done: true },
      { id: 'c-7', text: 'Revisar ortografía y CTA final', done: false },
    ],
    comments: [],
    feedOrder: 2,
  },
  {
    id: 'post-4',
    brandId: 'exodo',
    title: 'Tanda de Stickers UV DTF — Edición Limitada',
    status: 'estrategia',
    platform: 'Web/Lanzamientos',
    contentType: 'Tanda',
    ...makeDate(6, '12:00'),
    assignee: 'Andrés',
    coverUrl: COVER_EXODO_STICKERS,
    mediaType: 'image',
    mediaItems: [],
    caption: 'Pack de stickers resistentes a agua y sol con acabado gráfico nítido.',
    hashtags: '#Stickers #UVDTF #ExodoMerch',
    cta: 'Pide tu pack directo en la web.',
    internalNotes: 'Definir precio por tanda y margen de producción.',
    checklist: [
      { id: 'c-8', text: 'Definir selección de 8 ilustraciones vectoriales', done: false },
      { id: 'c-9', text: 'Calcular costos por plancha', done: false },
    ],
    comments: [],
    feedOrder: 3,
  },
  {
    id: 'post-5',
    brandId: 'exodo',
    title: 'Lookbook Urbano — Sesión Tarde',
    status: 'publicado',
    platform: 'Instagram',
    contentType: 'Historia',
    ...makeDate(-2, '17:15'),
    assignee: 'Valeria',
    coverUrl: COVER_EXODO_LOOKBOOK,
    mediaType: 'image',
    mediaItems: [],
    caption: 'Encuestas en historias para elegir la próxima combinación de colores.',
    hashtags: '#ExodoLookbook #Encuesta',
    cta: 'Vota en la encuesta y cuéntanos tu favorita.',
    internalNotes: 'Buena tasa de respuesta en el sticker de encuesta.',
    checklist: [
      {
        id: 'c-10',
        text: 'Subir secuencia de 4 historias con sticker interactivo',
        done: true,
      },
    ],
    comments: [
      {
        id: 'cm-4',
        author: 'Valeria',
        text: '74% votó por el tono carbón.',
        time: 'Ayer',
      },
    ],
    feedOrder: 4,
  },
  {
    id: 'post-6',
    brandId: 'agape',
    title: 'Encuentro de Cierre — Reflexión & Comunidad',
    status: 'programado',
    platform: 'Instagram',
    contentType: 'Carrusel',
    ...makeDate(3, '10:30'),
    assignee: 'Valeria',
    coverUrl: COVER_AGAPE_ENCUENTRO,
    mediaType: 'image',
    mediaItems: [],
    caption:
      'Cinco ideas clave para cultivar espacios de escucha, servicio y cercanía esta semana.',
    hashtags: '#Agape #Comunidad #Proposito #Editorial',
    cta: 'Comparte esta publicación con alguien que necesite leerla hoy.',
    internalNotes: 'Mantener paleta serena y tipografía editorial.',
    checklist: [
      { id: 'c-11', text: 'Aprobar diseño tipográfico', done: true },
      { id: 'c-12', text: 'Programar publicación matutina', done: true },
    ],
    comments: [],
    feedOrder: 0,
  },
  {
    id: 'post-7',
    brandId: 'agape',
    title: 'Micro-relato Visual: Construir desde lo simple',
    status: 'copywriting',
    platform: 'TikTok',
    contentType: 'Reel',
    ...makeDate(5, '15:00'),
    assignee: 'Isaac',
    coverUrl: COVER_AGAPE_RELATO,
    mediaType: 'image',
    mediaItems: [],
    caption:
      'A veces el mayor impacto nace de constancia silenciosa y detalles bien cuidados.',
    hashtags: '#Agape #Reflexion #Audiovisual',
    cta: 'Déjanos una palabra en los comentarios.',
    internalNotes: 'Ajustar mezcla de voz y música ambiental.',
    checklist: [
      { id: 'c-13', text: 'Grabar locución', done: true },
      { id: 'c-14', text: 'Subtitular y exportar', done: false },
    ],
    comments: [],
    feedOrder: 1,
  },
  {
    id: 'post-8',
    brandId: 'personal',
    title: 'Flujo IA en Montaje Audiovisual — Avance',
    status: 'produccion',
    platform: 'Web/Lanzamientos',
    contentType: 'Carrusel',
    ...makeDate(2, '14:00'),
    assignee: 'Andrés',
    coverUrl: COVER_PERSONAL_MONTAJE,
    mediaType: 'image',
    mediaItems: [],
    caption:
      'Notas metodológicas sobre cómo integrar herramientas de IA en la preproducción y corte sin perder criterio narrativo.',
    hashtags: '#Cine #EdicionDeVideo #IA #Audiovisual',
    cta: 'Guarda el hilo visual para tu próximo montaje.',
    internalNotes: 'Incluir ejemplos comparativos de tiempos de edición.',
    checklist: [
      { id: 'c-15', text: 'Sintetizar estructura metodológica', done: true },
      { id: 'c-16', text: 'Diseñar láminas limpias', done: false },
    ],
    comments: [
      {
        id: 'cm-5',
        author: 'Isaac',
        text: 'Muy claro el enfoque en criterio del montador.',
        time: 'Hace 1d',
      },
    ],
    feedOrder: 0,
  },
  {
    id: 'post-9',
    brandId: 'personal',
    title: 'Actualización de Campañas & Recompensas',
    status: 'estrategia',
    platform: 'TikTok',
    contentType: 'Historia',
    ...makeDate(7, '18:30'),
    assignee: 'Andrés',
    coverUrl: COVER_PERSONAL_CAMPANA,
    mediaType: 'image',
    mediaItems: [],
    caption:
      'Resumen rápido de novedades de la comunidad y cómo funcionan los beneficios activos.',
    hashtags: '#Comunidad #Actualizacion #Gaming',
    cta: 'Revisa los detalles fijados en el perfil.',
    internalNotes: 'Asegurar que el mensaje sea 100% preciso.',
    checklist: [{ id: 'c-17', text: 'Validar puntos clave del anuncio', done: false }],
    comments: [],
    feedOrder: 1,
  },
];
