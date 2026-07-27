# JOVEM Práctica

App web de práctica para el examen de certificación de Innovación y Emprendimiento (Guía JOVEM, Costa Rica).

Creado por **Wayvas · Wayller Vargas Sandoval**

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completar con la URL y clave anon de Supabase
npm run dev
```

## Estructura

- `src/` — aplicación React (Vite + Tailwind)
- `supabase/migrations/` — esquema y datos de la base (ya aplicados al proyecto JOVEM PEI)
- `supabase/functions/` — funciones de servidor (alta de staff)
- `README_SUPABASE.md` — guía completa de conexión

## Despliegue

Conectar este repositorio a Vercel o Netlify y definir las variables
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
