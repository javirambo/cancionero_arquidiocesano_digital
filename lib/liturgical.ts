// `romcal` no tiene tipos publicados; lo importamos como any.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const romcal = require("romcal");

// `moment` puede venir como objeto Moment.js (con `.format()`) o, si el
// objeto fue serializado a través de un boundary RSC, como string ISO o
// como `{ _isAMomentObject: true, ... }`. Normalizamos siempre a YYYY-MM-DD.
type RomcalDay = {
  moment: unknown;
  type: string;
  name: string;
  key: string;
  data: { season?: { key: string; value?: string }; meta?: unknown };
};

function dayDate(d: RomcalDay): string {
  const m = d.moment as
    | { format?: (fmt: string) => string }
    | string
    | Date
    | undefined;
  if (m && typeof (m as { format?: unknown }).format === "function") {
    return (m as { format: (fmt: string) => string }).format("YYYY-MM-DD");
  }
  // Fallback: convertir vía Date (acepta string ISO o Date).
  const date = new Date(m as string | number | Date);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export type LiturgicalDay = {
  date: string;            // YYYY-MM-DD
  name: string;            // nombre en español si lo conocemos, sino el de romcal (en)
  type: string;            // SOLEMNITY | FEAST | MEMORIAL | OPT_MEMORIAL | SUNDAY | FERIA
  seasonKey: string | null; // ej: "ORDINARY_TIME", "ADVENT", "CHRISTMASTIDE", "LENT", "EASTER"
  seasonName: string;       // español
  rank: number;             // 1 = solemnidad, 2 = fiesta, ... 5 = feria
};

const TYPE_RANK: Record<string, number> = {
  SOLEMNITY: 1,
  SUNDAY: 2,
  FEAST: 3,
  MEMORIAL: 4,
  OPT_MEMORIAL: 5,
  FERIA: 6,
};

// Romcal devuelve `season.key` con varias formas según versión: "Easter",
// "EASTER", "ordinary_time", etc. Normalizamos a UPPER_SNAKE_CASE.
const SEASON_NAMES_ES: Record<string, string> = {
  ADVENT: "Adviento",
  CHRISTMASTIDE: "Tiempo de Navidad",
  CHRISTMAS: "Tiempo de Navidad",
  EARLY_ORDINARY_TIME: "Tiempo Ordinario",
  LATER_ORDINARY_TIME: "Tiempo Ordinario",
  ORDINARY_TIME: "Tiempo Ordinario",
  LENT: "Cuaresma",
  HOLY_WEEK: "Semana Santa",
  PASCHAL_TRIDUUM: "Triduo Pascual",
  EASTER: "Tiempo Pascual",
  EASTERTIDE: "Tiempo Pascual",
};

function normalizeSeasonKey(raw: string | undefined | null): string | null {
  if (!raw) return null;
  // CamelCase / lowerCase → UPPER_SNAKE
  return raw
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

// Traducciones de festividades comunes (general + Argentina).
// El resto cae al nombre en inglés que devuelve romcal — visible pero
// reemplazable canción por canción a futuro.
const NAME_ES: Record<string, string> = {
  // Solemnidades del Señor
  maryMotherOfGod: "Santa María, Madre de Dios",
  epiphany: "Epifanía del Señor",
  baptismOfTheLord: "Bautismo del Señor",
  presentationOfTheLord: "Presentación del Señor",
  ashWednesday: "Miércoles de Ceniza",
  palmSunday: "Domingo de Ramos",
  holyThursday: "Jueves Santo",
  goodFriday: "Viernes Santo",
  holySaturday: "Sábado Santo",
  easterVigil: "Vigilia Pascual",
  easter: "Domingo de Resurrección",
  divineMercySunday: "Domingo de la Divina Misericordia",
  ascension: "Ascensión del Señor",
  pentecostSunday: "Pentecostés",
  trinitySunday: "Santísima Trinidad",
  corpusChristi: "Corpus Christi",
  mostSacredHeartOfJesus: "Sagrado Corazón de Jesús",
  // Cristo Rey
  ourLordJesusChristKingOfTheUniverse: "Cristo Rey del Universo",
  immaculateConception: "Inmaculada Concepción",
  christmas: "Natividad del Señor",
  holyFamily: "Sagrada Familia",
  // María
  ourLadyOfLourdes: "Nuestra Señora de Lourdes",
  annunciationOfTheLord: "Anunciación del Señor",
  visitationOfTheBlessedVirginMary: "Visitación de la Virgen María",
  assumption: "Asunción de la Virgen María",
  birthOfTheBlessedVirginMary: "Natividad de la Virgen María",
  ourLadyOfTheRosary: "Nuestra Señora del Rosario",
  presentationOfTheBlessedVirginMary: "Presentación de la Virgen María",
  ourLadyOfGuadalupe: "Nuestra Señora de Guadalupe",
  ourLadyOfMountCarmel: "Nuestra Señora del Carmen",
  ourLadyOfSorrows: "Nuestra Señora de los Dolores",
  immaculateHeartOfMary: "Inmaculado Corazón de María",
  // Santos populares
  saintJoseph: "San José, esposo de la Bienaventurada Virgen María",
  saintsPeterAndPaul: "Santos Pedro y Pablo, apóstoles",
  saintCajetan: "San Cayetano",
  allSaints: "Todos los Santos",
  allSouls: "Todos los Fieles Difuntos",
  saintFrancisOfAssisi: "San Francisco de Asís",
  saintAnthonyOfPadua: "San Antonio de Padua",
  saintTeresaOfAvila: "Santa Teresa de Jesús",
  saintMaryMagdalene: "Santa María Magdalena",
  // Argentina
  ourLadyOfLujan: "Nuestra Señora de Luján, patrona de Argentina",
  saintRoseOfLima: "Santa Rosa de Lima",
};

function translateName(key: string, fallback: string): string {
  return NAME_ES[key] ?? fallback;
}

const _calendarCache = new Map<number, RomcalDay[]>();
function calendarFor(year: number): RomcalDay[] {
  const cached = _calendarCache.get(year);
  if (cached) return cached;
  const cal = romcal.Calendar.calendarFor({
    country: "argentina",
    year,
    locale: "en",
  }) as RomcalDay[];
  _calendarCache.set(year, cal);
  return cal;
}

export function getLiturgicalDay(date: Date = new Date()): LiturgicalDay | null {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const target = `${yyyy}-${mm}-${dd}`;

  const cal = calendarFor(yyyy);
  // Puede haber varias entradas para el mismo día (memorias opcionales que
  // coinciden con feria, etc.). Tomamos la de mayor rango.
  const matches = cal.filter((d) => dayDate(d) === target);
  if (matches.length === 0) return null;

  matches.sort(
    (a, b) => (TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99)
  );
  const top = matches[0];

  const seasonKey = normalizeSeasonKey(top.data?.season?.key);
  const seasonName =
    (seasonKey && SEASON_NAMES_ES[seasonKey]) ?? "Tiempo Ordinario";

  return {
    date: target,
    name: translateName(top.key, top.name),
    type: top.type,
    seasonKey,
    seasonName,
    rank: TYPE_RANK[top.type] ?? 99,
  };
}
