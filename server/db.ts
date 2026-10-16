import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'restaurant.sqlite');
export const db = new DatabaseSync(DB_PATH);

// Configure SQLite for high performance and integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    desc_ar TEXT NOT NULL,
    desc_fr TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests INTEGER NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    client_ip TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(name, phone, date, time)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT
  );

  CREATE TABLE IF NOT EXISTS chat_cache (
    query_hash TEXT PRIMARY KEY,
    normalized_query TEXT NOT NULL,
    reply TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'faq',
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT PRIMARY KEY,
    fail_count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    last_attempt INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
  CREATE INDEX IF NOT EXISTS idx_dishes_available ON dishes(available);
  CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
  CREATE INDEX IF NOT EXISTS idx_chat_cache_norm ON chat_cache(normalized_query);
`);

// Purge expired sessions on startup
const nowIso = new Date().toISOString();
db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso);

// Default settings
const DEFAULT_SETTINGS: Record<string, string> = {
  restaurant_name_fr: 'Coeur de Bouskoura',
  restaurant_name_ar: 'قلب بوسكورة',
  phone: '+212522123456',
  whatsapp: '212661234567', // Mobile 212XXXXXXXXX
  tagline_fr: 'Haute Gastronomie Marocaine au Cœur de Bouskoura',
  tagline_ar: 'أصالة الطبخ المغربي الرفيع في قلب بوسكورة',
  hours_fr: 'Tous les jours : 12h00 - 23h30',
  hours_ar: 'يومياً: من 12:00 إلى 23:30',
  opening_time: '12:00',
  closing_time: '23:30',
  timezone: 'Africa/Casablanca',
  address_fr: 'Route de Bouskoura, Casablanca, Maroc',
  address_ar: 'طريق بوسكورة، الدار البيضاء، المغرب',
  hero_subtitle_fr: 'Une expérience culinaire marocaine d’exception mêlant authenticité, saveurs du terroir et convivialité raffinée.',
  hero_subtitle_ar: 'تجربة ضيافة مغربية راقية تجمع بين عبق التقاليد ونكهات الأطلس والشاوية في جو ساحر.',
  theme_accent: '#D97706',
  announcement_fr: 'Bienvenue chez Coeur de Bouskoura ! Réservation recommandée le week-end.',
  announcement_ar: 'مرحباً بكم في قلب بوسكورة! يُستحسن الحجز المسبق خلال عطلة نهاية الأسبوع.',
  admin_password_hash: '',
  admin_salt: '',
};

const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
  const existing = getSettingStmt.get(k);
  if (!existing) {
    setSettingStmt.run(k, v);
  }
}

export function getSetting(key: string): string {
  const row = getSettingStmt.get(key) as { value: string } | undefined;
  return row ? row.value : (DEFAULT_SETTINGS[key] || '');
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) {
    // Hide admin password hash and salt from public client
    if (r.key === 'admin_password_hash' || r.key === 'admin_salt') continue;
    map[r.key] = r.value;
  }
  return map;
}

export function setSetting(key: string, value: string): void {
  setSettingStmt.run(key, value);
}

// 25 Authentic proofread Moroccan dishes
export const INITIAL_DISHES = [
  // 1. STARTERS (المقبلات)
  {
    id: 'harira',
    name_ar: 'حريرة مغربية أصيلة',
    name_fr: 'Harira Traditionnelle',
    desc_ar: 'شوربة مغربية عريقة بالطماطم الطازجة، الحمص، العدس، الكرفس واللحم البقري المنسم بالزعفران والتوابل',
    desc_fr: 'Soupe marocaine emblématique aux tomates fraîches, pois chiches, lentilles, céleri et viande parfumée au safran',
    price: 35,
    category: 'starters',
    available: 1,
    featured: 1,
    sort_order: 1,
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'briouates-viande',
    name_ar: 'بريوات باللحم المفروم',
    name_fr: 'Briouates au Boeuf Épicé',
    desc_ar: 'مثلثات الورقة المقرمشة محشوة باللحم المفروم المتبل بالقرفة، الكمون والبقدونس الطازج',
    desc_fr: 'Triangles feuilletés croustillants garnis de bœuf haché subtilement épicé à la cannelle et herbes fraîches',
    price: 55,
    category: 'starters',
    available: 1,
    featured: 1,
    sort_order: 2,
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'briouates-fromage',
    name_ar: 'بريوات بالجبن والزعتر',
    name_fr: 'Briouates au Fromage Frais et Zaatar',
    desc_ar: 'لفائف مقرمشة محشوة بمزيج الأجبان البلدية والزعتر البري المغربي وزيت الزيتون',
    desc_fr: 'Roulés croustillants au fromage frais fermier et origan sauvage de l’Atlas à l’huile d’olive',
    price: 45,
    category: 'starters',
    available: 1,
    featured: 0,
    sort_order: 3,
    image: '',
  },
  {
    id: 'zaalouk',
    name_ar: 'زعلوك الباذنجان المشوي',
    name_fr: "Zaalouk d'Aubergines Grillées",
    desc_ar: 'مقبل دافئ من الباذنجان المشوي المهروس مع الطماطم، الثوم، الكمون وزيت الزيتون البكر',
    desc_fr: "Caviar d'aubergines fumées et compotées à la tomate fraîche, ail, cumin doux et huile d'olive vierge",
    price: 40,
    category: 'starters',
    available: 1,
    featured: 0,
    sort_order: 4,
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'taktouka',
    name_ar: 'تكتوكة بالفلفل الحلو',
    name_fr: 'Taktouka aux Poivrons Grillés',
    desc_ar: 'سلطة مغربية دافئة من الفلفل الحلو المشوي المطهو على نار هادئة مع الطماطم وزيت الزيتون والكزبرة',
    desc_fr: 'Salade cuite de poivrons rouges et verts grillés, compotés aux tomates, ail et coriandre fraîche',
    price: 40,
    category: 'starters',
    available: 1,
    featured: 0,
    sort_order: 5,
    image: '',
  },

  // 2. MAINS & TAJINES (الأطباق الرئيسية والطواجن)
  {
    id: 'tajine-agneau-pruneaux',
    name_ar: 'طاجين لحم الغنم بالبرقوق واللوز',
    name_fr: "Tajine d'Agneau aux Pruneaux et Amandes",
    desc_ar: 'طاجين مغربي فاخر من لحم الغنم الطري المتبل بالزعفران الحر، مزين بالبرقوق المعسل واللوز المحمر والسمسم',
    desc_fr: 'Agneau fondant mijoté au safran pur de Taliouine, pruneaux caramélisés, amandes dorées croquantes et sésame',
    price: 135,
    category: 'mains',
    available: 1,
    featured: 1,
    sort_order: 6,
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'tajine-poulet-citron',
    name_ar: 'طاجين الدجاج البلدي بالحامض والزيتون',
    name_fr: 'Tajine de Poulet Beldi au Citron Confit et Olives',
    desc_ar: 'دجاج بلدي محمر بمرق خاثر مع الحامض المصير المخلل والزيتون الأحمر المسلالة والزعفران',
    desc_fr: 'Poulet fermier mijoté dans une sauce onctueuse au citron confit traditionnel et olives rouges meslalla',
    price: 110,
    category: 'mains',
    available: 1,
    featured: 1,
    sort_order: 7,
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'couscous-sept-legumes',
    name_ar: 'كسكس ملكي بالسبع خضار',
    name_fr: 'Couscous Royal aux Sept Légumes',
    desc_ar: 'سميد رقيق مبخر ثلاث مرات، يقدم مع تشكيلة خضار طازجة ولحم الغنم المطهو بمرق غني بالنكهات واللفت المحفور',
    desc_fr: 'Semoule fine cuite à la vapeur, servie avec sept légumes frais du terroir et agneau mijoté aux épices',
    price: 125,
    category: 'mains',
    available: 1,
    featured: 1,
    sort_order: 8,
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'couscous-tfaya',
    name_ar: 'كسكس بالتفاية ولحم الغنم',
    name_fr: "Couscous Tfaya à l'Agneau",
    desc_ar: 'كسكس تقليدي متبل بمرق الزعفران ومغطى بالبصل المعسل بالزبيب والقرفة والحمص المقرمش',
    desc_fr: "Couscous raffiné à l'agneau sublimé d'une compotée d'oignons caramélisés aux raisins secs et cannelle",
    price: 130,
    category: 'mains',
    available: 1,
    featured: 0,
    sort_order: 9,
    image: '',
  },
  {
    id: 'tanjia-marrakchia',
    name_ar: 'طنجية مراكشية أصيلة',
    name_fr: 'Tanjia Marrakchia Cuite à l’Étouffée',
    desc_ar: 'قطع لحم البقر الطرية المطهوة بطريقة تقليدية مع السمن الحار، الكمون الصوفي والزعفران الحر والثوم البلدي',
    desc_fr: 'Jarret de bœuf mijoté longuement à l’étouffée dans sa jarre en terre cuite, smen affiné, cumin et safran',
    price: 140,
    category: 'mains',
    available: 1,
    featured: 1,
    sort_order: 10,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pastilla-poulet',
    name_ar: 'بسطيلة الدجاج الفاسية باللوز',
    name_fr: 'Pastilla Fassi au Poulet et Amandes',
    desc_ar: 'تحفة الطبخ الفاسي، رقائق ورقة مقرمشة تجمع بين الدجاج المتبل، البيض المعقد وطبقة اللوز المكرمل بالقرفة وماء الزهر',
    desc_fr: "Feuilletage croustillant renfermant une effilochée de poulet épicé, amandes concassées parfumées à l'eau de fleur d'oranger et sucre glace",
    price: 120,
    category: 'mains',
    available: 1,
    featured: 1,
    sort_order: 11,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pastilla-fruits-mer',
    name_ar: 'بسطيلة فواكه البحر الحارة',
    name_fr: 'Pastilla aux Fruits de Mer',
    desc_ar: 'بسطيلة بحرية غنية بالقمرون، الكلمار، وفيليه السمك والشعرية الصينية مع صلصة الشرمولة والهريسة الحارة والليمون',
    desc_fr: 'Feuilleté généreux garni de crevettes royales, calamars, poisson blanc et vermicelle marinés à la chermoula relevée',
    price: 145,
    category: 'mains',
    available: 1,
    featured: 1,
    sort_order: 12,
    image: '',
  },
  {
    id: 'seffa-medfouna',
    name_ar: 'سفة مدفونة بالدجاج واللوز',
    name_fr: 'Seffa Medfouna au Poulet et Amandes',
    desc_ar: 'شعرية رقيقة مبخرة بالسمن والزبدة البلدية، تخفي تحتها قطعا من الدجاج المحمر المتبل بالزعفران واللوز المقلي والسكر الصقيل',
    desc_fr: "Cheveux d'ange vapeur au beurre doux et fleur d'oranger, cachant un poulet mijoté parfumé, cannelle et amandes concassées",
    price: 105,
    category: 'mains',
    available: 1,
    featured: 0,
    sort_order: 13,
    image: '',
  },

  // 3. GRILLS (المشويات على الفحم)
  {
    id: 'brochettes-kefta',
    name_ar: 'قطبان كفتة مشوية على الفحم',
    name_fr: 'Brochettes de Kefta Façon Maison',
    desc_ar: 'لحم بقري مفروم طازج متبل بالبصل، الشحم البلدي، الكمون، البابريكا والبقدونس ومشوي على الفحم الحجري',
    desc_fr: 'Brochettes de viande de bœuf hachée marinée aux épices douces, oignon rouge et persil, saisies sur braises',
    price: 85,
    category: 'grills',
    available: 1,
    featured: 1,
    sort_order: 14,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cotelettes-agneau',
    name_ar: 'ضلوع الغنم المشوية بالأعشاب',
    name_fr: "Côtelettes d'Agneau Grillées aux Herbes de l'Atlas",
    desc_ar: 'ضلوع غنم طرية متبلة بالملح الحي، الكمون والزعتر البري ومشوية على الجمر مع صوص الشرمولة',
    desc_fr: "Côtelettes d'agneau juteuses marinées aux herbes sauvages de l'Atlas, grillées à la flamme vive",
    price: 135,
    category: 'grills',
    available: 1,
    featured: 1,
    sort_order: 15,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'brochettes-poulet',
    name_ar: 'قطبان دجاج متبل بالشرمولة',
    name_fr: 'Brochettes de Poulet Fermier Mariné',
    desc_ar: 'قطع صدر دجاج بلدي طرية منقوعة في خلطة الزنجبيل، الكركم، الليمون الحامض وزيت الزيتون البكر',
    desc_fr: 'Blancs de poulet fondants marinés au citron frais, gingembre, curcuma et huile d’olive, dorés sur la braise',
    price: 80,
    category: 'grills',
    available: 1,
    featured: 0,
    sort_order: 16,
    image: '',
  },
  {
    id: 'mechoui-epaule',
    name_ar: 'كتف غنم مشوي على الطريقة الفاسية',
    name_fr: 'Épaule d’Agneau Méchoui Fondante',
    desc_ar: 'كتف لحم غنم مطهو على نار هادئة لساعات حتى الذوبان، محمر بالسمن والكمون الصافي ويقدم مع الملح والكمون',
    desc_fr: 'Épaule d’agneau rôtie lentement pendant 6 heures, peau dorée croustillante et chair ultra-fondante servie avec cumin et sel gemme',
    price: 180,
    category: 'grills',
    available: 1,
    featured: 1,
    sort_order: 17,
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80',
  },

  // 4. DESSERTS (الحلويات والتحليات)
  {
    id: 'cornes-de-gazelle',
    name_ar: 'كعب غزال تقليدي باللوز',
    name_fr: 'Cornes de Gazelle Authentiques (Trio)',
    desc_ar: 'حلوى مغربية مخملية محشوة بعقدة اللوز الصافي المعطر بماء زهر الليمون البلدي والمسكة الحرة',
    desc_fr: 'Pâtisserie fine traditionnelle marocaine farcie d’une pâte d’amande pure parfumée à l’eau de fleur d’oranger',
    price: 45,
    category: 'desserts',
    available: 1,
    featured: 1,
    sort_order: 18,
    image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'pastilla-lait',
    name_ar: 'جوهرة: بسطيلة بالحليب واللوز',
    name_fr: 'Jawhara (Pastilla au Lait et Fleur d’Oranger)',
    desc_ar: 'ورقات بسطيلة مقرمشة ومورقة محشوة بكريمة الحليب المعطرة بماء الزهر ورشة لوز محمر مهروش والقرفة',
    desc_fr: 'Feuilles croustillantes dorées montées en mille-feuille avec une crème légère à la fleur d’oranger et amandes torréfiées',
    price: 50,
    category: 'desserts',
    available: 1,
    featured: 1,
    sort_order: 19,
    image: '',
  },
  {
    id: 'salade-oranges',
    name_ar: 'سلطة البرتقال بالقرفة وماء الزهر',
    name_fr: 'Salade d’Oranges à la Cannelle et Fleur d’Oranger',
    desc_ar: 'شرائح برتقال طازجة وباردة متبلة بالقرفة الصافية، قطرات ماء الزهر وورقات النعناع الأخضر',
    desc_fr: 'Rondelles d’oranges fraîches du terroir saupoudrées de cannelle fine, eau de fleur d’oranger et feuilles de menthe',
    price: 35,
    category: 'desserts',
    available: 1,
    featured: 0,
    sort_order: 20,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'assortiment-marocain',
    name_ar: 'تشكيلة حلويات مغربية ملكية',
    name_fr: 'Plateau Impérial de Pâtisseries Fassies',
    desc_ar: 'تشكيلة فاخرة من غريبة البهلة، غريبة المعلكة باللوز، بريوات اللوز والمحنشة بالعسل الحر',
    desc_fr: 'Assortiment prestige de ghoriba aux amandes, briouates au miel d’oranger, mhancha et douceurs marocaines',
    price: 65,
    category: 'desserts',
    available: 1,
    featured: 0,
    sort_order: 21,
    image: '',
  },

  // 5. DRINKS (المشروبات والشاي)
  {
    id: 'the-menthe',
    name_ar: 'أتاي مغربي منعنع بالرزة',
    name_fr: 'Thé à la Menthe Fraîche Traditionnel',
    desc_ar: 'شاي أخضر صيني فاخر محضر على الأصول بنعناع البروج الطازج وحبيبات السكر في إبريق فضي تقليدي',
    desc_fr: 'Thé vert Gunpowder infusé aux feuilles de menthe fraîche et arrosé dans un service traditionnel en cuivre argenté',
    price: 25,
    category: 'drinks',
    available: 1,
    featured: 1,
    sort_order: 22,
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'jus-avocat-amandes',
    name_ar: 'عصير الأفوكادو بالحليب واللوز',
    name_fr: 'Jus d’Avocat Crémeux aux Amandes et Dattes',
    desc_ar: 'مشروب مغربي غني وكريمي بالأفوكادو الطازج، الحليب البارد، اللوز البلدي ورشة ماء زهر مع التمر المجهول',
    desc_fr: 'Boisson onctueuse typique à l’avocat frais, lait d’amande, dattes Majhoul et touche de fleur d’oranger',
    price: 40,
    category: 'drinks',
    available: 1,
    featured: 1,
    sort_order: 23,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'jus-orange-carotte',
    name_ar: 'عصير الجزر والبرتقال بالليمون',
    name_fr: 'Nectar d’Orange et Carotte au Citron',
    desc_ar: 'عصير طازج ومنعش محضر من برتقال الشاوية والجزر المبشور مع رشة ماء زهر باردة وليمون حامض',
    desc_fr: 'Pressé de carottes et oranges fraîches, relevé d’une pointe de citron et d’eau de rose',
    price: 30,
    category: 'drinks',
    available: 1,
    featured: 0,
    sort_order: 24,
    image: '',
  },
  {
    id: 'citronnade-menthe',
    name_ar: 'عصير ليمون منعش بالنعناع والزنجبيل',
    name_fr: 'Citronnade Fraîche Menthe et Gingembre Doux',
    desc_ar: 'عصير ليمون بلدي مثلج ومخفوق مع النعناع الأخضر الطازج والزنجبيل ورشة عسل',
    desc_fr: 'Citronnade maison frappée à la menthe fraîche pilée, gingembre doux et touche de miel',
    price: 30,
    category: 'drinks',
    available: 1,
    featured: 0,
    sort_order: 25,
    image: '',
  },
];

// Seed dishes if empty
const countDishes = (db.prepare('SELECT COUNT(*) as count FROM dishes').get() as { count: number }).count;
if (countDishes === 0) {
  const insertDish = db.prepare(`
    INSERT INTO dishes (id, name_ar, name_fr, desc_ar, desc_fr, price, category, available, featured, sort_order, image, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const d of INITIAL_DISHES) {
    insertDish.run(
      d.id,
      d.name_ar,
      d.name_fr,
      d.desc_ar,
      d.desc_fr,
      d.price,
      d.category,
      d.available,
      d.featured,
      d.sort_order,
      d.image || null,
      now,
      now
    );
  }
}
