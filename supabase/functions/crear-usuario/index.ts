// ============================================================================
// Edge Function: crear-usuario
// ============================================================================
// Crea una cuenta de staff. Vive en el servidor porque usa la SERVICE_ROLE_KEY,
// que nunca debe estar en el navegador.
// Solo un administrador autenticado puede invocarla.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DOMINIO_INTERNO = "jovem.local";
const ROLES = ["admin", "asesor", "item_creator"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // 1) Verificar que quien llama sea un administrador activo
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "No autenticado" }, 401);

  const { data: auth } = await admin.auth.getUser(token);
  if (!auth?.user) return json({ error: "No autenticado" }, 401);

  const { data: perfil } = await admin
    .from("profiles").select("role, is_active").eq("id", auth.user.id).single();
  if (perfil?.role !== "admin" || !perfil?.is_active) {
    return json({ error: "Solo un administrador puede crear usuarios" }, 403);
  }

  // 2) Validar los datos
  const { fullName, username, password, role } = await req.json();
  const nombre = String(fullName ?? "").trim();
  const usuario = String(username ?? "").trim().toLowerCase();

  if (!nombre) return json({ error: "Escribe el nombre completo." }, 400);
  if (!usuario) return json({ error: "Escribe el usuario." }, 400);
  if (/\s/.test(usuario)) return json({ error: "El usuario no puede llevar espacios." }, 400);
  if (!password || String(password).length < 4)
    return json({ error: "La contraseña debe tener al menos 4 caracteres." }, 400);
  if (!ROLES.includes(role)) return json({ error: "Rol inválido." }, 400);

  const { data: repetido } = await admin
    .from("profiles").select("id").eq("username", usuario).maybeSingle();
  if (repetido) return json({ error: `El usuario "${usuario}" ya existe.` }, 409);

  // 3) Crear la cuenta y su perfil
  const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO_INTERNO}`,
    password,
    email_confirm: true,
  });
  if (errAuth) return json({ error: errAuth.message }, 400);

  const { error: errPerfil } = await admin.from("profiles").insert({
    id: creado.user.id,
    full_name: nombre,
    username: usuario,
    role,
    is_active: true,
  });

  if (errPerfil) {
    // Si falla el perfil, no dejamos una cuenta huérfana
    await admin.auth.admin.deleteUser(creado.user.id);
    return json({ error: errPerfil.message }, 400);
  }

  return json({ ok: true, id: creado.user.id, username: usuario, role });
});
