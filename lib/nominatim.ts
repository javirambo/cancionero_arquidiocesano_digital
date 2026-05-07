// Cliente de OpenStreetMap Nominatim para búsqueda de parroquias (CU-19.1).
// Política de uso: https://operations.osmfoundation.org/policies/nominatim/
//   - User-Agent identificable obligatorio.
//   - Rate limit de 1 req/seg como máximo.
// Llamar siempre desde el servidor (este módulo) para no exponer User-Agent
// del cliente y evitar CORS.

import https from "node:https";
import dns from "node:dns";

const ENDPOINT = "https://nominatim.openstreetmap.org";
const USER_AGENT =
  "CancioneroArquidiocesanoDigital/0.1 (https://github.com/javirambo/cancionero_arquidiocesano_digital)";

// Workaround para fetch/undici que falla con ETIMEDOUT al resolver ciertos
// hosts en Node 24 (Overpass mirrors). Usa el módulo `https` nativo, fuerza
// IPv4 vía DNS lookup con family=4, y aplica timeout explícito.
function postFormIPv4(
  url: string,
  body: string,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method: "POST",
        host: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        timeout: timeoutMs,
        lookup: (hostname, options, cb) =>
          dns.lookup(hostname, { ...options, family: 4 }, cb),
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body).toString(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(text);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error(`timeout ${timeoutMs}ms`));
    });
    req.write(body);
    req.end();
  });
}

export type ParishCandidate = {
  name: string;
  address: string;
  city: string;
  lat: number;
  lon: number;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: {
    amenity?: string;
    place_of_worship?: string;
    church?: string;
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

function toCandidate(r: NominatimResult): ParishCandidate {
  const a = r.address ?? {};
  const name =
    r.name ?? a.amenity ?? a.place_of_worship ?? a.church ?? r.display_name.split(",")[0];
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const cityName = a.city ?? a.town ?? a.village ?? a.suburb ?? a.neighbourhood ?? "";
  const address = [street, cityName, a.state, a.country].filter(Boolean).join(", ");
  return {
    name,
    address,
    city: cityName,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  };
}

// Filtra a resultados que sean iglesias o lugares de culto. Nominatim taggea
// inconsistente: a veces `amenity=place_of_worship`, a veces el `amenity` lleva
// el nombre propio ("Parroquia Santa Rosa"); también validamos por palabra
// religiosa en el nombre o display_name.
const NAME_HINT = /\b(parroquia|iglesia|capilla|catedral|santuario|basilica|basílica|templo)\b/i;
function isChurch(r: NominatimResult): boolean {
  const a = r.address ?? {};
  if (a.amenity === "place_of_worship" || a.place_of_worship || a.church) return true;
  if (NAME_HINT.test(r.name ?? "")) return true;
  if (NAME_HINT.test(a.amenity ?? "")) return true;
  if (NAME_HINT.test(r.display_name ?? "")) return true;
  return false;
}

export type SearchResult = {
  results: ParishCandidate[];
  totalFiltered: number; // total de iglesias encontradas, sin recortar
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Búsqueda por texto libre, restringida a iglesias en Argentina. Si el usuario
// no incluye la palabra "parroquia"/"iglesia"/"capilla", se le antepone para
// orientar a Nominatim hacia lugares de culto y no ciudades.
// Si se pasan `lat`/`lon`, los resultados se ordenan por cercanía a ese punto.
// Convención: si el texto trae una coma, lo de antes se interpreta como
// nombre y lo de después como ciudad ("maria auxiliadora, rosario").
export async function searchParishes(
  q: string,
  origin?: { lat: number; lon: number }
): Promise<SearchResult> {
  const trimmed = q.trim();
  const [namePartRaw, ...cityPartRaw] = trimmed.split(",");
  const namePart = namePartRaw.trim();
  const cityPart = cityPartRaw.join(",").trim();

  const lower = namePart.toLowerCase();
  const hasReligiousHint = /\b(parroquia|iglesia|capilla|catedral|santuario)\b/.test(
    lower
  );
  const finalQuery = hasReligiousHint ? trimmed : `parroquia ${trimmed}`;

  const url = new URL(`${ENDPOINT}/search`);
  url.searchParams.set("q", finalQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "50");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set("countrycodes", "ar");
  // Sesgar resultados hacia la ubicación del usuario (sin acotar): Nominatim
  // suele devolver primero los más populares globalmente; con `viewbox` los
  // cercanos pesan más en su ranking interno.
  if (origin) {
    const delta = 0.5; // ~55 km
    url.searchParams.set(
      "viewbox",
      `${origin.lon - delta},${origin.lat + delta},${origin.lon + delta},${origin.lat - delta}`
    );
  }

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 60 },
  });
  if (!res.ok) return { results: [], totalFiltered: 0 };
  const data = (await res.json()) as NominatimResult[];
  const churches = data.filter(isChurch);

  // Quitar la palabra "parroquia/iglesia/..." del término del usuario para no
  // exigir que esté literalmente en el nombre de cada resultado.
  const nameTerms = normalize(namePart)
    .replace(/\b(parroquia|iglesia|capilla|catedral|santuario)\b/g, "")
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  const cityTerms = normalize(cityPart)
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  const matched = churches.filter((r) => {
    const a = r.address ?? {};
    const nameHaystack = normalize(
      r.name ?? r.display_name?.split(",")[0] ?? a.amenity ?? ""
    );
    const nameOk = nameTerms.every((t) => nameHaystack.includes(t));
    if (!nameOk) return false;

    if (cityTerms.length === 0) return true;
    const cityHaystack = normalize(
      [a.city, a.town, a.village, a.suburb, a.neighbourhood, a.state]
        .filter(Boolean)
        .join(" ")
    );
    return cityTerms.every((t) => cityHaystack.includes(t));
  });

  console.log(
    `[nominatim] q="${finalQuery}" raw=${data.length} church=${churches.length} matched=${matched.length} origin=${
      origin ? `${origin.lat},${origin.lon}` : "none"
    }`
  );

  let candidates = matched.map(toCandidate);
  if (origin) {
    candidates = candidates
      .map((c) => {
        const dLat = c.lat - origin.lat;
        const dLon = c.lon - origin.lon;
        return { c, d2: dLat * dLat + dLon * dLon };
      })
      .sort((a, b) => a.d2 - b.d2)
      .map(({ c }) => c);
  }

  return {
    results: candidates.slice(0, 8),
    totalFiltered: candidates.length,
  };
}

// Búsqueda de parroquias cerca de un punto. Usa Nominatim con `viewbox`
// alrededor del punto + `bounded=1`. El radio efectivo se controla con `delta`
// (en grados ≈ 111 km por grado de latitud).
// Búsqueda de parroquias cercanas vía Overpass API (datos OSM por tags).
// Filtra `amenity=place_of_worship` con denominación católica o,
// como fallback, religion=christian. Una sola request, sin heurística de
// nombre, devuelve también ways/relations con su centroide.
type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

function overpassToCandidate(el: OverpassElement): ParishCandidate | null {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  const name =
    t.name ?? t["name:es"] ?? t.official_name ?? t.alt_name ?? "Iglesia";
  const street = [t["addr:street"], t["addr:housenumber"]]
    .filter(Boolean)
    .join(" ");
  const cityName =
    t["addr:city"] ?? t["addr:town"] ?? t["addr:village"] ?? "";
  const address = [street, cityName, t["addr:state"], t["addr:country"]]
    .filter(Boolean)
    .join(", ");
  return { name, address, city: cityName, lat, lon };
}

export async function searchNearby(
  lat: number,
  lon: number
): Promise<ParishCandidate[]> {
  const radius = 5000; // metros
  // Traemos:
  //   - todo place_of_worship con denomination católica
  //   - todo place_of_worship con religion=christian (sin filtrar denominación
  //     en la query para no perder los que la dejaron vacía); el filtro fino
  //     por nombre/denominación se aplica abajo.
  const query = `[out:json][timeout:25];
(
  nwr["amenity"="place_of_worship"]["denomination"~"catholic|roman_catholic",i](around:${radius},${lat},${lon});
  nwr["amenity"="place_of_worship"]["religion"="christian"](around:${radius},${lat},${lon});
);
out center tags;`;

  let elements: OverpassElement[] = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const body = await postFormIPv4(endpoint, `data=${encodeURIComponent(query)}`, 15000);
      const data = JSON.parse(body) as { elements?: OverpassElement[] };
      elements = data.elements ?? [];
      break;
    } catch (err) {
      console.warn(`[overpass] ${endpoint} failed:`, (err as Error).message);
    }
  }
  if (elements.length === 0) return [];
  // Dedupe por id+type.
  const seen = new Set<string>();
  const unique: OverpassElement[] = [];
  for (const el of elements) {
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(el);
  }
  // Solo aceptar lo que sea católico de manera positiva: denominación
  // explícita o nombre canónico católico (parroquia/catedral/santuario/basílica/capilla).
  const candidates = unique
    .filter(isCatholic)
    .map(overpassToCandidate)
    .filter((c): c is ParishCandidate => c !== null);
  // Ordenar por cercanía al punto consultado.
  candidates.sort(
    (a, b) => haversine(lat, lon, a.lat, a.lon) - haversine(lat, lon, b.lat, b.lon)
  );
  return candidates;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const CATHOLIC_NAME_HINT =
  /\b(parroquia|catedral|santuario|bas[ií]lica|capilla)\b/i;

function isCatholic(el: OverpassElement): boolean {
  const t = el.tags ?? {};
  const denomination = (t.denomination ?? "").toLowerCase();
  if (denomination.includes("catholic")) return true;
  const name = (t.name ?? "").trim();
  if (CATHOLIC_NAME_HINT.test(name)) return true;
  return false;
}
