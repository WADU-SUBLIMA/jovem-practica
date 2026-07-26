# Conectar JOVEM Practica con Supabase

Guía para pasar del prototipo (que guarda todo en el navegador) a una base de
datos real, aprovechando que ya tienes Supabase conectado a GitHub.

---

## 1. Qué contiene cada archivo

```
supabase/
  migrations/
    0001_schema.sql              Tablas, seguridad (RLS) y funciones
    0002_seed.sql                7 unidades + las 100 preguntas + configuración
  functions/
    crear-usuario/index.ts       Alta de staff (necesita clave de servicio)
src/lib/
  jovem-api.js                   Cliente: reemplaza window.storage del prototipo
```

Ambas migraciones fueron validadas con el analizador oficial de PostgreSQL, y
las 100 preguntas se compararon una por una contra el prototipo: coinciden
todas, incluidas las respuestas correctas.

---

## 2. Aplicar las migraciones

Como tu proyecto ya está enlazado a GitHub, Supabase aplica sola cualquier
archivo nuevo dentro de `supabase/migrations/` al hacer push:

```bash
git add supabase/ src/
git commit -m "Base de datos JOVEM Practica en Supabase"
git push
```

Si prefieres hacerlo a mano, copia el contenido de cada archivo en el
**SQL Editor** del panel de Supabase y ejecútalos **en orden** (0001, luego 0002).

Para verificar que quedó bien:

```sql
select count(*) from public.questions;   -- debe dar 100
select * from public.practice_config;    -- 80 minutos, 30 preguntas
```

---

## 3. Crear el primer administrador

Las cuentas de staff usan Supabase Auth. Como el staff escribe un *usuario* y no
un correo, se guarda internamente como `usuario@jovem.local`.

1. En el panel: **Authentication → Users → Add user**
   - Correo: `administrador@jovem.local`
   - Contraseña: la que definas (**no uses `1234` en producción**)
   - Marca *Auto Confirm User*
2. Copia el `id` que aparece y ejecuta en el SQL Editor:

```sql
insert into public.profiles (id, full_name, username, role, is_active, is_primary)
values ('PEGA-AQUÍ-EL-ID', 'Administrador Principal', 'administrador', 'admin', true, true);
```

A partir de ahí, ese admin crea a los demás desde el panel de la app.

---

## 4. Conectar la aplicación

```bash
npm install @supabase/supabase-js
```

Crea un archivo `.env` (y agrégalo a `.gitignore`):

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

> La clave `anon` es pública y puede ir en el navegador: la seguridad la dan las
> políticas RLS, no la clave. La `service_role`, en cambio, **nunca** debe salir
> del servidor.

Luego reemplaza las llamadas del prototipo:

| Prototipo | Supabase |
|---|---|
| `storageGet("jovem:questions")` | `listarPreguntas()` |
| `storageSet("jovem:questions", …)` | `guardarPregunta(p)` |
| `bumpStat("visits")` | `logVisit()` |
| `buildExam(...)` | `startPractice({ mode, unitId })` |
| calificar en el navegador | `submitPractice(answers, nivel)` |
| `loadUsers()` | `listarUsuarios()` |
| validar clave en el navegador | `staffLogin(usuario, clave)` |
| `storageGet("jovem:config")` | `getConfig()` / `saveConfig()` |

---

## 5. Cambios importantes de seguridad

Estas diferencias respecto al prototipo son intencionales y conviene conocerlas:

**Las contraseñas ya no se guardan en texto plano.** El prototipo las guardaba
tal cual, lo cual está bien para probar pero sería un riesgo real en producción.
Ahora las administra Supabase Auth, que las almacena cifradas. Por eso crear
usuarios y restablecer claves pasa por Edge Functions y no directo desde el
navegador.

**La respuesta correcta ya no viaja al dispositivo.** Antes el examen completo,
con respuestas incluidas, llegaba al navegador: cualquiera podía verlas
inspeccionando la página. Ahora las preguntas se sirven por una vista que no
incluye la respuesta, y la calificación ocurre dentro de la base de datos. Las
explicaciones llegan solo al finalizar.

**Se mantiene el anonimato del estudiante.** No hay cuentas ni datos personales:
solo se guarda un identificador aleatorio del navegador para no contar dos veces
la misma visita, más el nivel (Sétimo/Octavo/Noveno) para las estadísticas.
El nombre que escribe el estudiante se usa únicamente para mostrarlo en su
reporte y **no se envía a la base de datos**.

---

## 6. Sobre la escala

El diseño soporta los 10 000 usuarios simultáneos previstos:

- La práctica es de **lectura pública y cacheable**; no requiere sesiones.
- Cada estudiante hace **dos escrituras por intento** (inicio y entrega), no una
  por pregunta.
- Las estadísticas se calculan con funciones agregadas y con índices por fecha.

Si el uso crece mucho, el siguiente paso natural es guardar `impact_stats` en
una vista materializada que se refresque cada pocos minutos, en lugar de
calcularla en cada carga del panel.
