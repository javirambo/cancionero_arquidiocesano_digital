# Dominio y DNS — liturgia.click

Última actualización: 2026-07-16

## Resumen

| | |
|---|---|
| Dominio | `liturgia.click` |
| Registrador | AWS Route 53 Domains |
| Cuenta AWS | Efficast — `243311703958` (región `us-east-1` para Route 53) |
| DNS autoritativo | Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) |
| App | Vercel, proyecto `cancionero-arquidiocesano-digital` |
| Base de datos | Supabase, endpoint default `*.supabase.co` (sin custom domain) |
| Alta | 2026-07-16 |
| Vencimiento | 2027-07-16, **auto-renew activado** |
| Costo | USD 3/año (registro y renovación al mismo precio) |

> **Dependencia cruzada importante:** el dominio está registrado en la cuenta AWS de **Efficast**, que es de otro proyecto. No hay una cuenta AWS separada para el cancionero. Si esa cuenta se cierra, cambia de dueño o se queda sin medio de pago, **este dominio se pierde**. Es la deuda técnica consciente de este setup.

## Cómo funciona (registrador vs DNS)

Son dos roles distintos y acá están en proveedores distintos:

- **Registrador = Route 53.** Es quien "posee" el dominio ante el registry de `.click` y lo renueva todos los años.
- **DNS autoritativo = Vercel.** Es quien responde "¿a qué IP apunta liturgia.click?".

```
Registry .click  ──delega──>  ns1/ns2.vercel-dns.com  ──responde──>  IPs de Vercel
      ▲
      │ renueva / administra
  Route 53 Domains (cuenta AWS Efficast)
```

Consecuencia práctica: **los registros DNS se cargan en el panel de Vercel, no en AWS.** En AWS solo se administra la renovación y a quién se delega.

## Estado actual

**Online y funcionando** desde el 2026-07-16.

- `https://liturgia.click` responde HTTP 200 desde el proyecto de Vercel.
- El registry de `.click` delega a `ns1/ns2.vercel-dns.com`; los resolvers públicos ya lo ven.
- Vercel configuró el A record del apex automáticamente y emitió el SSL (Let's Encrypt) solo. Lo renueva sin intervención.
- La hosted zone de Route 53 fue **eliminada** (ver Historial). El DNS vive 100% en Vercel.
- **Solo el apex** `liturgia.click` está configurado. `www.liturgia.click` **no resuelve** — fue una decisión explícita. Si algún día se quiere, se agrega como dominio aparte en Vercel (Project → Settings → Domains) con redirect al apex.

## Decisiones y por qué

**DNS en Vercel y no en Route 53.** Vercel gestiona sus propios registros y sigue sus migraciones de rango IP sin intervención. De hecho durante el setup Vercel ya estaba migrando de `76.76.21.21` al rango `216.198.79.x` — con DNS en Vercel eso no es problema nuestro. El costo es que la hosted zone de Route 53 queda de más (ver Pendientes).

**Supabase sin custom domain.** Un `api.liturgia.click` cuesta **USD 10/mes** de add-on y exige plan **Pro (USD 25/mes)** — entre USD 120 y 420 al año. La app le pega a Supabase desde el código y el usuario final nunca ve esa URL. Se puede prender más adelante si se quiere marca propia en los mails de auth o en los redirects de OAuth. Si se prende, el CNAME va **en el panel de Vercel**, no en AWS.

**`.click` y no `.com`.** `liturgia-rosario.com` estaba disponible a USD 16/año; se eligió `.click` a USD 3/año. Contra: `.click` es un TLD nuevo y algunos filtros de spam lo tratan con más desconfianza. Tenerlo en cuenta **si algún día se manda mail desde `@liturgia.click`** — puede requerir trabajo extra de reputación (SPF/DKIM/DMARC bien puestos y warm-up).

## Operaciones comunes

Todos los comandos van con `--region us-east-1` (Route 53 Domains solo vive ahí) y contra la cuenta AWS de Efficast.

```bash
# Ver estado, vencimiento, nameservers y auto-renew
aws route53domains get-domain-detail --domain-name liturgia.click --region us-east-1

# Cambiar a qué nameservers se delega (ej. volver a AWS o migrar a otro proveedor)
aws route53domains update-domain-nameservers --region us-east-1 \
  --domain-name liturgia.click \
  --nameservers Name=ns1.vercel-dns.com Name=ns2.vercel-dns.com

# Verificar qué delega realmente el registry (no confiar solo en AWS: hay lag de propagación)
dig +norecurse NS liturgia.click @$(dig +short NS click. | head -1)

# Verificar resolución pública
dig +short A liturgia.click @8.8.8.8

# Seguir una operación asincrónica de Route 53 Domains
aws route53domains get-operation-detail --operation-id <ID> --region us-east-1
```

## Gotchas de registrar un dominio siendo argentino

El registry rechaza el alta con `InvalidInput` si no se respeta esto:

- **`State` no va.** Para Argentina el campo provincia **no debe enviarse**. Mandarlo da `OWNER.STATE is not required for Argentina, and should not be set`.
- **El ZipCode tiene que ser CPA**, no el código viejo de 4 dígitos. Formato `A1234AAA` (letra de provincia + 4 dígitos + 3 letras). Para este domicilio: **`S2001STB`**. Mandar `2000` da `does not resemble A1234AAA`.
- **El teléfono va con punto**, no espacio: `+54.3413814812`.
- **Terraform NO puede registrar dominios.** El recurso `aws_route53domains_registered_domain` solo administra uno ya existente (contactos, nameservers, auto-renew); no lo crea ni lo destruye vía API. El alta es sí o sí por CLI o consola.

### Contacto usado en el registro

Guardado acá porque el `contact.json` original vivía en un temporal de sesión que ya no existe. Sirve para re-registrar, transferir o actualizar contactos:

```json
{
  "FirstName": "Javier",
  "LastName": "Rambaldo",
  "ContactType": "PERSON",
  "AddressLine1": "Loreto 3470",
  "City": "Rosario",
  "CountryCode": "AR",
  "ZipCode": "S2001STB",
  "PhoneNumber": "+54.3413814812",
  "Email": "javierrambaldo@gmail.com"
}
```

Privacy protection **activada** en los tres contactos (registrant, admin, tech), así que estos datos no aparecen en el WHOIS público. En Route 53 no tiene costo extra.

> **ICANN:** al registrar llega un mail de verificación al registrant. Hay **15 días** para confirmarlo o el dominio se suspende. Ya fue confirmado el 2026-07-16.

## Pendientes

Ninguno. El setup está cerrado.

Cosas a considerar sólo si el proyecto cambia de escala:

- `www.liturgia.click` (hoy no resuelve, por decisión).
- Custom domain de Supabase (hoy descartado por costo).
- Mail desde `@liturgia.click` (requiere SPF/DKIM/DMARC en el DNS de Vercel, y ojo con la reputación de `.click`).

## Historial

- **2026-07-16** — Alta del dominio en Route 53 (USD 3/año, auto-renew, privacy ON). Verificación de ICANN confirmada el mismo día. Route 53 creó automáticamente la hosted zone `Z06918652K3J6I3I97OBZ`.
- **2026-07-16** — Delegación cambiada a `ns1/ns2.vercel-dns.com`. Vercel configuró el A record y emitió el SSL solo. Sitio online.
- **2026-07-16** — Hosted zone `Z06918652K3J6I3I97OBZ` eliminada: quedó sin uso al mover el DNS a Vercel y solo generaba costo. Contenía únicamente los `NS`/`SOA` por defecto. La cuenta AWS quedó sin hosted zones.

## Costos

| Concepto | Costo | Estado |
|---|---|---|
| Dominio `.click` | USD 3/año | Activo, auto-renew |
| DNS en Vercel | USD 0 | Activo |
| Hosted zone Route 53 | USD 0,50/mes | Eliminada 2026-07-16 |
| Supabase Custom Domain | USD 10/mes + Pro USD 25/mes | Descartado |

**Costo total del dominio: USD 3/año.**
