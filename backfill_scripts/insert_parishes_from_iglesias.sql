-- Copia todas las iglesias a parishes (parishes esta vacia)
-- Campos comunes: id, name, slug, address, city, phone, email, latitude, longitude, status
-- No se copia: parent_id, deanery (no existen en parishes)

INSERT INTO public.parishes (
  id, name, slug, address, city, phone, email, latitude, longitude, status
)
SELECT
  id,
  name,
  slug,
  address,
  city,
  phone,
  email,
  latitude,
  longitude,
  COALESCE(status, 'active')
FROM public.iglesias
WHERE slug IS NOT NULL;
