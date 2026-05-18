import csv
import time
from pathlib import Path
from geopy.geocoders import Nominatim

INPUT_CSV = Path(__file__).parent / "iglesias_geocodificadas.csv"
OUTPUT_CSV = Path(__file__).parent / "iglesias_geocodificadas_ciudad.csv"

CIUDAD_EXCLUIDA = "Rosario"

geolocator = Nominatim(user_agent="geocodificador_ciudades_arquidiocesis")


def normalizar(valor):
    if valor is None:
        return ""
    valor = valor.strip()
    if valor.lower() == "null":
        return ""
    return valor


def geocodificar_ciudad(city):
    query = f"{city}, Santa Fe, Argentina"
    try:
        loc = geolocator.geocode(query, timeout=10)
        if loc:
            return loc.latitude, loc.longitude, query, "ok_ciudad"
        return None, None, query, "no_encontrado"
    except Exception as e:
        return None, None, query, f"error: {e}"


def main():
    with INPUT_CSV.open("r", encoding="utf-8", newline="") as f_in:
        filas = list(csv.DictReader(f_in))

    pendientes = [
        f for f in filas
        if f.get("status", "") not in ("ok", "ok_fallback")
    ]

    iglesias_a_procesar = [
        f for f in pendientes
        if normalizar(f.get("city", "")).lower() != CIUDAD_EXCLUIDA.lower()
        and normalizar(f.get("city", "")) != ""
    ]

    ciudades_unicas = sorted({normalizar(f["city"]) for f in iglesias_a_procesar})

    print(f"Iglesias sin geo: {len(pendientes)}")
    print(f"Iglesias a procesar (excluye {CIUDAD_EXCLUIDA} y sin ciudad): {len(iglesias_a_procesar)}")
    print(f"Ciudades unicas a geocodificar: {len(ciudades_unicas)}")
    print()

    cache_ciudades = {}
    for i, ciudad in enumerate(ciudades_unicas, start=1):
        lat, lon, query, status = geocodificar_ciudad(ciudad)
        cache_ciudades[ciudad] = (lat, lon, query, status)
        etiqueta = "[OK]" if status == "ok_ciudad" else "[FAIL]"
        print(f"{etiqueta} ({i}/{len(ciudades_unicas)}) {ciudad} -> {lat}, {lon}")
        time.sleep(1)

    print()
    campos = ["id", "name", "city", "query_usada", "latitude", "longitude", "status"]

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f_out:
        writer = csv.DictWriter(f_out, fieldnames=campos)
        writer.writeheader()

        for fila in iglesias_a_procesar:
            ciudad = normalizar(fila["city"])
            lat, lon, query, status = cache_ciudades[ciudad]
            writer.writerow({
                "id": fila.get("id", ""),
                "name": normalizar(fila.get("name", "")),
                "city": ciudad,
                "query_usada": query,
                "latitude": lat if lat is not None else "",
                "longitude": lon if lon is not None else "",
                "status": status,
            })

    print(f"Listo. Resultados en {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
