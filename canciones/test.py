import csv
import time
from pathlib import Path
from geopy.geocoders import Nominatim

INPUT_CSV = Path(__file__).parent / "iglesias_supabase.csv"
OUTPUT_CSV = Path(__file__).parent / "iglesias_geocodificadas.csv"

geolocator = Nominatim(user_agent="geocodificador_iglesias_arquidiocesis")


def normalizar(valor):
    # El CSV usa el string literal "null" para celdas vacias
    if valor is None:
        return ""
    valor = valor.strip()
    if valor.lower() == "null":
        return ""
    return valor


def geocodificar(name, address, city):
    if address:
        query = f"{name}, {address}, {city}, Santa Fe, Argentina"
        try:
            loc = geolocator.geocode(query, timeout=10)
            if loc:
                return loc.latitude, loc.longitude, query, "ok"
        except Exception as e:
            return None, None, query, f"error: {e}"
        time.sleep(1)

    query = f"{name}, {city}, Santa Fe, Argentina"
    try:
        loc = geolocator.geocode(query, timeout=10)
        if loc:
            status = "ok_fallback" if address else "ok"
            return loc.latitude, loc.longitude, query, status
        return None, None, query, "no_encontrado"
    except Exception as e:
        return None, None, query, f"error: {e}"


def main():
    with INPUT_CSV.open("r", encoding="utf-8", newline="") as f_in:
        filas = list(csv.DictReader(f_in))

    total = len(filas)
    print(f"Iniciando geocodificacion de {total} iglesias...")
    print(f"Salida: {OUTPUT_CSV.name}")
    print()

    campos = ["id", "name", "city", "address", "query_usada", "latitude", "longitude", "status"]

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f_out:
        writer = csv.DictWriter(f_out, fieldnames=campos)
        writer.writeheader()

        for i, fila in enumerate(filas, start=1):
            name = normalizar(fila.get("name", ""))
            city = normalizar(fila.get("city", ""))
            address = normalizar(fila.get("address", ""))
            iglesia_id = fila.get("id", "")

            lat, lon, query, status = geocodificar(name, address, city)

            writer.writerow({
                "id": iglesia_id,
                "name": name,
                "city": city,
                "address": address,
                "query_usada": query,
                "latitude": lat if lat is not None else "",
                "longitude": lon if lon is not None else "",
                "status": status,
            })
            f_out.flush()

            etiqueta = {
                "ok": "[OK]",
                "ok_fallback": "[OK-FB]",
                "no_encontrado": "[FAIL]",
            }.get(status, "[ERR]")

            if status in ("ok", "ok_fallback"):
                print(f"{etiqueta} ({i}/{total}) {name} ({city}) -> {lat}, {lon}")
            else:
                print(f"{etiqueta} ({i}/{total}) {name} ({city}) -> {status}")

            time.sleep(1)

    print()
    print(f"Listo. Resultados en {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
