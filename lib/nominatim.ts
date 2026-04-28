// Cliente de OpenStreetMap Nominatim para búsqueda de parroquias (CU-19.1).
// Política de uso: https://operations.osmfoundation.org/policies/nominatim/
//   - User-Agent identificable obligatorio.
//   - Rate limit de 1 req/seg como máximo.
// Llamar siempre desde el servidor (este módulo) para no exponer User-Agent
// del cliente y evitar CORS.

const ENDPOINT = "https://nominatim.openstreetmap.org";
const USER_AGENT =
  "CancioneroArquidiocesanoDigital/0.1 (https://github.com/javirambo/cancionero_arquidiocesano_digital)";

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
export async function searchNearby(
  lat: number,
  lon: number
): Promise<ParishCandidate[]> {
  const delta = 0.05; // ~5 km
  const left = lon - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bottom = lat - delta;

  const url = new URL(`${ENDPOINT}/search`);
  url.searchParams.set("q", "parroquia");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("accept-language", "es");
  url.searchParams.set("viewbox", `${left},${top},${right},${bottom}`);
  url.searchParams.set("bounded", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimResult[];
  // Si tenemos resultados con tags de iglesia los preferimos; si no, devolvemos
  // todos los del viewbox (Nominatim a veces no taggea bien).
  const churches = data.filter(isChurch);
  const final = churches.length > 0 ? churches : data;
  return final.map(toCandidate);
}
