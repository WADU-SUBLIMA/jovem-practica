// ============================================================================
// JOVEM Practica — Capa de datos sobre Supabase
// ============================================================================
// Reemplaza el almacenamiento local del prototipo. Cada función corresponde
// a algo que la app ya hace hoy.
//
// Requiere:  npm install @supabase/supabase-js
// Variables: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//            (o NEXT_PUBLIC_… si usas Next.js)
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configError =
  !url || !anonKey
    ? "Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el despliegue."
    : null;

export const supabase = configError
  ? null
  : createClient(url, anonKey);

// ---------------------------------------------------------------------------
// Identificador anónimo del dispositivo.
// NO identifica personas: solo evita contar dos veces la misma visita.
// ---------------------------------------------------------------------------
export function getDeviceKey() {
  const CLAVE = "jovem:device-key";
  let k = localStorage.getItem(CLAVE);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(CLAVE, k);
  }
  return k;
}

// ---------------------------------------------------------------------------
// Métricas de impacto (anónimas)
// ---------------------------------------------------------------------------
export async function logVisit() {
  await supabase.rpc("log_event", { p_event_type: "visit", p_device_key: getDeviceKey() });
}

export async function logPracticeStarted() {
  await supabase.rpc("log_event", { p_event_type: "practice_started", p_device_key: getDeviceKey() });
}

// ---------------------------------------------------------------------------
// Configuración de las prácticas (tiempo y cantidad de preguntas)
// ---------------------------------------------------------------------------
export async function getConfig() {
  const { data, error } = await supabase
    .from("practice_config")
    .select("time_limit_minutes, question_count, passing_score")
    .single();
  if (error) throw error;
  return {
    timeLimitMinutes: data.time_limit_minutes,
    questionCount: data.question_count,
    passingScore: data.passing_score,
  };
}

export async function saveConfig({ timeLimitMinutes, questionCount, passingScore }) {
  const { error } = await supabase
    .from("practice_config")
    .update({
      time_limit_minutes: timeLimitMinutes,
      question_count: questionCount,
      ...(passingScore != null ? { passing_score: passingScore } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw error;
}

export async function getUnits() {
  const { data, error } = await supabase.from("units").select("*").order("id");
  if (error) throw error;
  return data.map((u) => ({ id: u.id, name: u.name, short: u.short_name }));
}

// ---------------------------------------------------------------------------
// Práctica del estudiante
// ---------------------------------------------------------------------------

// Devuelve las preguntas SIN la respuesta correcta, con las opciones ya
// barajadas. Cada opción trae su índice original en `i`, que es lo que se
// envía de vuelta al finalizar.
export async function startPractice({ mode = "full", unitId = null } = {}) {
  const { data, error } = await supabase.rpc("get_practice", {
    p_mode: mode,
    p_unit_id: unitId,
  });
  if (error) throw error;
  await logPracticeStarted();
  return data; // [{ id, unit_id, type, scenario, example, image, stem, options:[{i,text}] }]
}

// answers: [{ question_id, selected }]  — selected = índice original, o null
export async function submitPractice(answers, level = null) {
  const { data, error } = await supabase.rpc("submit_practice", {
    p_answers: answers,
    p_device_key: getDeviceKey(),
    p_level: level,
  });
  if (error) throw error;
  return data; // { score, correct, wrong, total, passed, unit_breakdown, detail[] }
}

// ---------------------------------------------------------------------------
// Acceso del staff (Supabase Auth)
// ---------------------------------------------------------------------------
// El staff escribe un usuario, no un correo. Se traduce a un correo interno
// para Supabase Auth. Cambia el dominio por el tuyo si lo prefieres.
const DOMINIO_INTERNO = "jovem.local";
const aCorreo = (usuario) => `${String(usuario).trim().toLowerCase()}@${DOMINIO_INTERNO}`;

export async function staffLogin(usuario, clave) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: aCorreo(usuario),
    password: clave,
  });
  if (error) return { ok: false, motivo: "credenciales" };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (!perfil) return { ok: false, motivo: "sin-perfil" };
  if (!perfil.is_active) {
    await supabase.auth.signOut();
    return { ok: false, motivo: "inactivo" };
  }
  return { ok: true, usuario: perfil };
}

export async function staffLogout() {
  await supabase.auth.signOut();
}

export async function getSesionStaff() {
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return null;
  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  return perfil?.is_active ? perfil : null;
}

// ---------------------------------------------------------------------------
// Gestión de usuarios (solo admin)
// ---------------------------------------------------------------------------
// Crear usuarios y cambiar contraseñas requiere la clave de servicio, que
// NUNCA debe estar en el navegador. Por eso van por Edge Functions.
// Ver: supabase/functions/  y el README.
export async function listarUsuarios() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function crearUsuario({ fullName, username, password, role }) {
  const { data, error } = await supabase.functions.invoke("crear-usuario", {
    body: { fullName, username, password, role },
  });
  if (error) throw error;
  return data;
}

export async function restablecerClave(userId, nuevaClave) {
  const { error } = await supabase.functions.invoke("restablecer-clave", {
    body: { userId, nuevaClave },
  });
  if (error) throw error;
}

export async function actualizarUsuario(id, { fullName, username, role, isActive }) {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, username, role, is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarUsuario(id) {
  const { data: perfil } = await supabase
    .from("profiles").select("is_primary").eq("id", id).single();
  if (perfil?.is_primary) throw new Error("El administrador principal no se puede eliminar.");
  const { error } = await supabase.functions.invoke("eliminar-usuario", { body: { userId: id } });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Banco de preguntas (admin y generador de ítems)
// ---------------------------------------------------------------------------
export async function listarPreguntas() {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("unit_id")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function guardarPregunta(p) {
  const fila = {
    unit_id: p.unit,
    type: p.type,
    scenario: p.scenario || null,
    example: p.example || null,
    image: p.image || null,
    stem: p.stem,
    options: p.options,
    correct_index: p.correct,
    explanation: p.explanation,
    updated_at: new Date().toISOString(),
  };
  // status solo se envía al CREAR (una pregunta ya existente conserva su estado;
  // pasar de "pending" a "approved" es una acción aparte, ver aprobarPregunta).
  if (!p.id && p.status) fila.status = p.status;

  const q = p.id
    ? supabase.from("questions").update(fila).eq("id", p.id)
    : supabase.from("questions").insert(fila);
  const { error } = await q;
  if (error) throw error;
}

export async function aprobarPregunta(id) {
  const { error } = await supabase
    .from("questions")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function archivarPregunta(id, archivada) {
  const { error } = await supabase.from("questions").update({ archived: archivada }).eq("id", id);
  if (error) throw error;
}

export async function eliminarPregunta(id) {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Panel de impacto
// ---------------------------------------------------------------------------
// rango: 'hoy' | '7d' | '30d' | null (todo)
export async function getImpacto(rango = null) {
  let desde = null;
  if (rango) {
    const d = new Date();
    if (rango === "hoy") d.setHours(0, 0, 0, 0);
    else if (rango === "7d") d.setDate(d.getDate() - 7);
    else if (rango === "30d") d.setDate(d.getDate() - 30);
    desde = d.toISOString();
  }
  const { data, error } = await supabase.rpc("impact_stats", { p_since: desde });
  if (error) throw error;
  return data;
}
