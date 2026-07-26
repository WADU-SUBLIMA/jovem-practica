// ============================================================================
// JOVEM Practica — Aplicación (versión conectada a Supabase)
// ============================================================================
// Diferencias clave respecto al prototipo:
//   * Las preguntas, la configuración y los usuarios viven en la base de datos.
//   * La respuesta correcta nunca llega al dispositivo antes de finalizar:
//     la calificación la hace el servidor y devuelve el detalle con explicaciones.
//   * El acceso del staff usa Supabase Auth (contraseñas cifradas).
//   * El estudiante sigue entrando libre y anónimo.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, Lock, Plus, Trash2, Pencil,
  Users, TrendingUp, Award, RotateCcw, BarChart3, Eye, X, Loader2, Sparkles,
  UserPlus, ShieldCheck, KeyRound, Ban, Quote, Archive, ArchiveRestore, Download,
  ShieldAlert, Home, Clock, Settings, Save, Sprout, LogOut, AlertCircle,
} from "lucide-react";

import {
  C, ROLES, LEVELS, useGoogleFonts, FONT_DISPLAY, FONT_BODY,
  QuestionIllustration, ExampleBox, MOTIVATIONAL_PHRASES,
  Logo, VineProgress, OptionButton, ScoreRing, UnitChart, KpiCard,
} from "./components/ui.jsx";

import {
  logVisit, getConfig, saveConfig, getUnits,
  startPractice, submitPractice,
  staffLogin, staffLogout, getSesionStaff,
  listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, restablecerClave,
  listarPreguntas, guardarPregunta, archivarPregunta, eliminarPregunta,
  getImpacto, configError,
} from "./lib/jovem-api.js";

/* Historial de versiones
   2.0.0 — Versión conectada a Supabase. Las preguntas, la configuración y las
           cuentas ya no viven en el navegador. La calificación se hace en el
           servidor y las respuestas correctas nunca viajan al dispositivo
           durante la práctica. El acceso del staff usa Supabase Auth.
*/
const APP_VERSION = "2.0.0";
const APP_CREDITS = "Wayvas · Wayller Vargas Sandoval";

/* ========================================================================== */
/* Utilidades                                                                 */
/* ========================================================================== */
function Shell({ children }) {
  return (
    <div className="min-h-screen w-full" style={{ background: C.crema, fontFamily: FONT_BODY }}>
      <div className="max-w-md mx-auto min-h-screen flex flex-col">{children}</div>
    </div>
  );
}

function Cargando({ texto = "Cargando…" }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-24">
      <Loader2 className="animate-spin" size={28} color={C.brote} />
      <span style={{ fontFamily: FONT_BODY, color: C.tintaSuave }} className="text-sm">{texto}</span>
    </div>
  );
}

function AvisoError({ mensaje, onReintentar }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8 py-24 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.coralClaro }}>
        <AlertCircle size={24} color={C.coral} />
      </div>
      <p className="text-sm font-semibold" style={{ color: C.tinta }}>No se pudo conectar</p>
      <p className="text-xs" style={{ color: C.tintaSuave }}>{mensaje}</p>
      {onReintentar && (
        <button onClick={onReintentar} className="mt-2 rounded-2xl px-5 py-2.5 font-bold text-white text-sm"
          style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
          Reintentar
        </button>
      )}
    </div>
  );
}

function PieCreditos({ className = "" }) {
  return (
    <p className={`text-center text-[10px] ${className}`} style={{ color: C.tintaSuave, opacity: 0.75 }}>
      JOVEM Practica v{APP_VERSION} · Creado por {APP_CREDITS}
    </p>
  );
}

/* ========================================================================== */
/* App                                                                        */
/* ========================================================================== */
export default function App() {
  useGoogleFonts();

  const [vista, setVista] = useState("cargando");
  const [errorCarga, setErrorCarga] = useState(null);

  const [units, setUnits] = useState([]);
  const [config, setConfig] = useState({ timeLimitMinutes: 80, questionCount: 30, passingScore: 70 });

  // Práctica en curso
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState([]);   // índice original elegido, o null
  const [actual, setActual] = useState(0);
  const [finTiempo, setFinTiempo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Datos del estudiante (solo en memoria, nunca se guardan)
  const [nombre, setNombre] = useState("");
  const [nivel, setNivel] = useState("");
  const [pendiente, setPendiente] = useState(null);   // { mode, unitId }
  const [ultimoInicio, setUltimoInicio] = useState({ mode: "full", unitId: null });

  const [mostrarUnidades, setMostrarUnidades] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [confirmarFin, setConfirmarFin] = useState(false);

  const [staff, setStaff] = useState(null);
  const visitaRegistrada = useRef(false);

  async function cargarInicial() {
    setVista("cargando");
    setErrorCarga(null);
    if (configError) {
      setErrorCarga(configError);
      setVista("error");
      return;
    }
    try {
      const [u, c, sesion] = await Promise.all([getUnits(), getConfig(), getSesionStaff()]);
      setUnits(u);
      setConfig(c);
      setStaff(sesion);
      if (!visitaRegistrada.current) {
        visitaRegistrada.current = true;
        logVisit().catch(() => {});
      }
      setVista("portada");
    } catch (e) {
      setErrorCarga(e?.message || "Revisa tu conexión a internet.");
      setVista("error");
    }
  }

  useEffect(() => { cargarInicial(); }, []);

  async function iniciarPractica(mode, unitId) {
    setVista("cargando");
    try {
      const qs = await startPractice({ mode, unitId });
      if (!qs?.length) {
        setErrorCarga("No hay preguntas disponibles para esta práctica.");
        setVista("error");
        return;
      }
      setPreguntas(qs);
      setRespuestas(new Array(qs.length).fill(null));
      setActual(0);
      setResultado(null);
      setUltimoInicio({ mode, unitId });
      setPendiente(null);
      setFinTiempo(Date.now() + config.timeLimitMinutes * 60 * 1000);
      setVista("examen");
    } catch (e) {
      setErrorCarga(e?.message || "No se pudo iniciar la práctica.");
      setVista("error");
    }
  }

  function elegirOpcion(indiceOriginal) {
    const copia = [...respuestas];
    copia[actual] = indiceOriginal;
    setRespuestas(copia);
  }

  function intentarFinalizar() {
    if (respuestas.some((r) => r === null)) setConfirmarFin(true);
    else finalizar();
  }

  async function finalizar() {
    if (enviando) return;
    setConfirmarFin(false);
    setEnviando(true);
    try {
      const payload = preguntas.map((q, i) => ({ question_id: q.id, selected: respuestas[i] }));
      const r = await submitPractice(payload, nivel || null);
      setResultado(r);
      setVista("resultados");
    } catch (e) {
      setErrorCarga(e?.message || "No se pudo enviar la práctica.");
      setVista("error");
    } finally {
      setEnviando(false);
    }
  }

  function salirExamen() {
    setConfirmarSalida(false);
    setPreguntas([]); setRespuestas([]); setActual(0);
    setResultado(null); setFinTiempo(null);
    setVista("portada");
  }

  async function cerrarSesionStaff() {
    await staffLogout();
    setStaff(null);
    setVista("portada");
  }

  /* ---------------------------------------------------------------------- */
  if (vista === "cargando") return <Shell><Cargando /></Shell>;
  if (vista === "error")
    return <Shell><AvisoError mensaje={errorCarga} onReintentar={cargarInicial} /></Shell>;

  return (
    <Shell>
      {vista === "portada" && (
        <Portada
          staff={staff}
          onPracticaCompleta={() => { setPendiente({ mode: "full", unitId: null }); setVista("datos"); }}
          onElegirUnidad={() => setMostrarUnidades(true)}
          onStaff={() => setVista(staff ? "panel" : "acceso")}
        />
      )}

      {mostrarUnidades && (
        <SelectorUnidades
          units={units}
          onCerrar={() => setMostrarUnidades(false)}
          onElegir={(id) => { setMostrarUnidades(false); setPendiente({ mode: "unit", unitId: id }); setVista("datos"); }}
        />
      )}

      {vista === "datos" && pendiente && (
        <DatosEstudiante
          modo={pendiente.mode}
          nombre={nombre} setNombre={setNombre}
          nivel={nivel} setNivel={setNivel}
          onVolver={() => { setPendiente(null); setVista("portada"); }}
          onComenzar={() => iniciarPractica(pendiente.mode, pendiente.unitId)}
        />
      )}

      {vista === "examen" && preguntas.length > 0 && (
        <VistaExamen
          pregunta={preguntas[actual]}
          indice={actual}
          total={preguntas.length}
          respondidas={respuestas.filter((r) => r !== null).length}
          elegida={respuestas[actual]}
          onElegir={elegirOpcion}
          onSiguiente={() => actual < preguntas.length - 1 && setActual(actual + 1)}
          onAnterior={() => actual > 0 && setActual(actual - 1)}
          onFinalizar={intentarFinalizar}
          nombre={nombre} nivel={nivel}
          finTiempo={finTiempo}
          onTiempoAgotado={finalizar}
          onSalir={() => setConfirmarSalida(true)}
          enviando={enviando}
        />
      )}

      {confirmarSalida && (
        <ConfirmarSalida
          respondidas={respuestas.filter((r) => r !== null).length}
          onCancelar={() => setConfirmarSalida(false)}
          onConfirmar={salirExamen}
        />
      )}

      {confirmarFin && (
        <ConfirmarFin
          faltantes={respuestas.filter((r) => r === null).length}
          onCancelar={() => setConfirmarFin(false)}
          onConfirmar={finalizar}
        />
      )}

      {vista === "resultados" && resultado && (
        <VistaResultados
          resultado={resultado}
          units={units}
          nombre={nombre} nivel={nivel}
          onNuevoIntento={() => iniciarPractica(ultimoInicio.mode, ultimoInicio.unitId)}
          onInicio={() => setVista("portada")}
        />
      )}

      {vista === "acceso" && (
        <AccesoStaff
          onVolver={() => setVista("portada")}
          onEntrar={(perfil) => { setStaff(perfil); setVista("panel"); }}
        />
      )}

      {vista === "panel" && staff && (
        <Panel
          staff={staff}
          units={units}
          config={config}
          setConfig={setConfig}
          onSalir={cerrarSesionStaff}
          onInicio={() => setVista("portada")}
        />
      )}
    </Shell>
  );
}

/* ========================================================================== */
/* Portada                                                                    */
/* ========================================================================== */
function Portada({ staff, onPracticaCompleta, onElegirUnidad, onStaff }) {
  const [frase] = useState(
    () => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]
  );
  return (
    <div className="flex flex-col flex-1 px-6 pt-10 pb-8">
      <Logo />

      <div className="flex-1 flex flex-col justify-center gap-6 py-10">
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.brote }}>
            Guía JOVEM · Innovación y Emprendimiento
          </p>
          <h1 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-3xl font-extrabold leading-tight">
            Prepárate para tu examen de certificación
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: C.tintaSuave }}>
            Practica con preguntas de conceptos y casos reales de las 7 unidades.
            Sin registro, sin contraseña: solo entra y empieza.
          </p>
        </div>

        <button onClick={onPracticaCompleta}
          className="w-full rounded-2xl py-4 px-6 font-bold text-white text-lg shadow-lg active:scale-[0.98] transition-transform"
          style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
          ✨ Práctica Completa
        </button>

        <button onClick={onElegirUnidad}
          className="w-full rounded-2xl py-3.5 px-6 font-semibold text-[15px] active:scale-[0.98] transition-transform"
          style={{ background: "white", color: C.bosque, border: `2px solid ${C.hojaBorde}` }}>
          Practicar una unidad específica
        </button>

        <div className="grid grid-cols-2 gap-3 mt-2">
          {[
            { icon: CheckCircle2, label: "Casos reales contextualizados" },
            { icon: Award, label: "Nota y estadísticas al final" },
          ].map((f, i) => (
            <div key={i} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: C.hoja }}>
              <f.icon size={16} color={C.brote} />
              <span className="text-xs font-medium" style={{ color: C.bosque }}>{f.label}</span>
            </div>
          ))}
        </div>

        <div className="relative rounded-3xl p-5 mt-1 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${C.brote}, ${C.broteOscuro})` }}>
          <Quote size={64} color="rgba(255,255,255,0.15)" className="absolute -top-2 -right-2" strokeWidth={2.5} />
          <p style={{ fontFamily: FONT_DISPLAY, color: "white" }}
            className="relative text-[15px] leading-snug font-semibold italic">
            "{frase}"
          </p>
        </div>
      </div>

      <div className="pt-4 border-t" style={{ borderColor: C.hojaBorde }}>
        <div className="flex items-center justify-center">
          <button onClick={onStaff} className="text-xs font-medium flex items-center gap-1" style={{ color: C.tintaSuave }}>
            <Lock size={13} /> {staff ? `Panel · ${staff.full_name}` : "Acceso para personal"}
          </button>
        </div>
        <PieCreditos className="mt-3" />
      </div>
    </div>
  );
}

function SelectorUnidades({ units, onCerrar, onElegir }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4">
      <div className="w-full max-w-md rounded-3xl p-5" style={{ background: "white" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-lg font-bold">Elige una unidad</h3>
          <button onClick={onCerrar}><X size={20} color={C.tintaSuave} /></button>
        </div>
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {units.map((u) => (
            <button key={u.id} onClick={() => onElegir(u.id)}
              className="text-left rounded-xl px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
              style={{ background: C.hoja }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: C.brote }}>{u.id}</span>
              <span className="text-sm font-medium" style={{ color: C.bosque }}>{u.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Datos del estudiante                                                       */
/* ========================================================================== */
function DatosEstudiante({ modo, nombre, setNombre, nivel, setNivel, onVolver, onComenzar }) {
  const valido = nombre.trim().length > 0 && !!nivel;
  return (
    <div className="flex flex-col flex-1 px-6 pt-10 pb-8">
      <button onClick={onVolver} className="flex items-center gap-1 text-sm font-medium mb-6 self-start" style={{ color: C.tintaSuave }}>
        <ChevronLeft size={16} /> Volver
      </button>

      <div className="flex-1 flex flex-col justify-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: C.hoja }}>
          <Sprout size={22} color={C.brote} />
        </div>
        <h1 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-2xl font-extrabold leading-tight mb-1">
          {modo === "unit" ? "Antes de empezar esta unidad" : "Antes de empezar tu práctica"}
        </h1>
        <p className="text-[15px] mb-6" style={{ color: C.tintaSuave }}>
          Necesitamos tu nombre y tu nivel para generar tu reporte final.
        </p>

        <p className="text-xs font-semibold mb-2" style={{ color: C.tintaSuave }}>Nombre completo</p>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Escribí tu nombre" autoFocus
          className="w-full rounded-2xl px-4 py-3 text-[15px] outline-none mb-5"
          style={{ background: "white", border: `2px solid ${C.hojaBorde}`, color: C.tinta }} />

        <p className="text-xs font-semibold mb-2" style={{ color: C.tintaSuave }}>Nivel</p>
        <div className="grid grid-cols-3 gap-2 mb-6">
          {LEVELS.map((lv) => (
            <button key={lv} onClick={() => setNivel(lv)}
              className="rounded-2xl py-3 text-sm font-semibold text-center"
              style={{
                background: nivel === lv ? C.brote : "white",
                color: nivel === lv ? "white" : C.bosque,
                border: `2px solid ${nivel === lv ? C.brote : C.hojaBorde}`,
              }}>{lv}</button>
          ))}
        </div>

        <button onClick={onComenzar} disabled={!valido}
          className="w-full rounded-2xl py-4 font-bold text-white shadow-lg disabled:opacity-40"
          style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
          Comenzar práctica
        </button>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Examen                                                                     */
/* ========================================================================== */
function Temporizador({ fin, onAgotado }) {
  const [restante, setRestante] = useState(() => Math.max(0, fin - Date.now()));
  const disparado = useRef(false);

  useEffect(() => {
    disparado.current = false;
    setRestante(Math.max(0, fin - Date.now()));
    const id = setInterval(() => {
      const queda = Math.max(0, fin - Date.now());
      setRestante(queda);
      if (queda <= 0 && !disparado.current) {
        disparado.current = true;
        clearInterval(id);
        onAgotado();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [fin]);

  const seg = Math.floor(restante / 1000);
  const mm = String(Math.floor(seg / 60)).padStart(2, "0");
  const ss = String(seg % 60).padStart(2, "0");
  const poco = seg <= 300;

  return (
    <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 flex-shrink-0"
      style={{ background: poco ? C.coralClaro : C.hoja }}>
      <Clock size={13} color={poco ? C.coral : C.broteOscuro} strokeWidth={2.5} />
      <span className="text-xs font-bold tabular-nums" style={{ color: poco ? C.coral : C.broteOscuro }}>
        {mm}:{ss}
      </span>
    </div>
  );
}

function VistaExamen({
  pregunta, indice, total, respondidas, elegida, onElegir, onSiguiente, onAnterior,
  onFinalizar, nombre, nivel, finTiempo, onTiempoAgotado, onSalir, enviando,
}) {
  const letras = ["A", "B", "C"];
  const ultima = indice === total - 1;

  return (
    <div className="flex flex-col flex-1 px-6 pt-8 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onSalir}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold flex-shrink-0"
          style={{ background: "white", color: C.tintaSuave, border: `1.5px solid ${C.hojaBorde}` }}>
          <X size={14} /> Salir
        </button>
        <div className="flex-1" />
        {finTiempo && <Temporizador fin={finTiempo} onAgotado={onTiempoAgotado} />}
      </div>

      <VineProgress answered={respondidas} total={total} current={indice}
        studentName={nombre} studentLevel={nivel} />

      <div className="flex-1 mt-5">
        <span className="inline-block text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3"
          style={{
            background: pregunta.type === "caso" ? "#FFF3DD" : C.hoja,
            color: pregunta.type === "caso" ? C.solOscuro : C.broteOscuro,
          }}>
          {pregunta.type === "caso" ? "Caso de la vida real" : "Concepto"}
        </span>

        <QuestionIllustration topic={pregunta.image} />
        <ExampleBox text={pregunta.example} />

        {pregunta.scenario && (
          <div className="rounded-2xl p-4 mb-3" style={{ background: C.bosque }}>
            <p className="text-sm leading-relaxed text-white/95 italic">{pregunta.scenario}</p>
          </div>
        )}

        <h2 style={{ fontFamily: FONT_DISPLAY, color: C.tinta }} className="text-xl font-bold leading-snug mb-5">
          {pregunta.stem}
        </h2>

        <div className="flex flex-col gap-3">
          {pregunta.options.map((op, pos) => (
            <OptionButton
              key={op.i}
              letter={letras[pos]}
              label={op.text}
              selected={elegida === op.i}
              onClick={() => onElegir(op.i)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-6">
        <button onClick={onAnterior} disabled={indice === 0}
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-30"
          style={{ background: "white", border: `2px solid ${C.hojaBorde}` }}>
          <ChevronLeft size={20} color={C.bosque} />
        </button>

        {ultima ? (
          <button onClick={onFinalizar} disabled={enviando}
            className="flex-1 rounded-2xl py-3.5 font-bold text-white shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: C.sol, fontFamily: FONT_DISPLAY }}>
            {enviando ? <><Loader2 size={16} className="animate-spin" /> Calificando…</> : "Finalizar práctica"}
          </button>
        ) : (
          <button onClick={onSiguiente}
            className="flex-1 rounded-2xl py-3.5 font-bold text-white shadow-md flex items-center justify-center gap-1"
            style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
            Siguiente <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function ConfirmarSalida({ respondidas, onCancelar, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: "white" }}>
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: C.coralClaro }}>
          <ShieldAlert size={26} color={C.coral} />
        </div>
        <h3 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-lg font-bold mb-1">
          ¿Seguro que deseas salir?
        </h3>
        <p className="text-sm mb-5" style={{ color: C.tintaSuave }}>
          Perderás tu avance{respondidas > 0 ? ` (${respondidas} ${respondidas === 1 ? "pregunta respondida" : "preguntas respondidas"})` : ""} y esta práctica no se guardará.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: C.hoja, color: C.bosque }}>
            Seguir practicando
          </button>
          <button onClick={onConfirmar} className="flex-1 rounded-xl py-3 font-semibold text-sm text-white" style={{ background: C.coral }}>
            Sí, salir
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmarFin({ faltantes, onCancelar, onConfirmar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: "white" }}>
        <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: C.coralClaro }}>
          <XCircle size={26} color={C.coral} />
        </div>
        <h3 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-lg font-bold mb-1">
          Te faltan {faltantes} {faltantes === 1 ? "pregunta" : "preguntas"}
        </h3>
        <p className="text-sm mb-5" style={{ color: C.tintaSuave }}>
          Las preguntas sin responder contarán como incorrectas. ¿Deseas finalizar de todas formas?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 rounded-xl py-3 font-semibold text-sm" style={{ background: C.hoja, color: C.bosque }}>
            Seguir practicando
          </button>
          <button onClick={onConfirmar} className="flex-1 rounded-xl py-3 font-semibold text-sm text-white" style={{ background: C.coral }}>
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Resultados                                                                 */
/* ========================================================================== */
function escaparHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function armarReporteHTML({ resultado, units, nombre, nivel, datosGrafica }) {
  const fecha = new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "long", year: "numeric" });
  const encabezado = `${escaparHtml(nombre)}${nivel ? " · " + escaparHtml(nivel) : ""}`;

  const barras = datosGrafica.map((d) => `
    <div class="bar-row">
      <span class="bar-label">${escaparHtml(d.short)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${d.pct}%;background:${d.pct >= 70 ? "#3F8F5F" : d.pct >= 40 ? "#F5B942" : "#D64550"}"></span></span>
      <span class="bar-pct">${d.pct}%</span>
    </div>`).join("");

  const preguntas = (resultado.detail || []).map((d, i) => {
    const ok = d.is_correct;
    const tuya = d.selected === null || d.selected === undefined
      ? `<p class="wrong">Sin responder</p>`
      : ok ? "" : `<p class="wrong">Tu respuesta: ${escaparHtml(d.options[d.selected])}</p>`;
    return `
    <div class="q ${ok ? "q-ok" : "q-bad"}">
      <p class="q-stem">${i + 1}. ${ok ? "✔" : "✘"} ${escaparHtml(d.stem)}</p>
      ${d.scenario ? `<p class="q-scenario">${escaparHtml(d.scenario)}</p>` : ""}
      ${tuya}
      <p class="right">Correcta: ${escaparHtml(d.options[d.correct_index])}</p>
      <p class="expl">${escaparHtml(d.explanation)}</p>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Reporte JOVEM - ${encabezado}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; color:#16241C; margin:0; font-size:12px; line-height:1.45; }
  h1 { font-size:19px; margin:0 0 2px; color:#1B4332; }
  .sub { color:#4B5D53; font-size:12px; margin:0 0 14px; }
  .score-box { border:2px solid #C7E6D1; border-radius:12px; padding:14px; text-align:center; margin-bottom:14px; }
  .score { font-size:40px; font-weight:800; color:${resultado.passed ? "#3F8F5F" : "#D64550"}; line-height:1; }
  .score-label { font-size:11px; color:#4B5D53; margin-top:2px; }
  .verdict { display:inline-block; margin-top:8px; padding:4px 12px; border-radius:999px; font-weight:700; font-size:12px;
    background:${resultado.passed ? "#E4F3E8" : "#FBE4E6"}; color:${resultado.passed ? "#1B4332" : "#D64550"}; }
  .kpis { display:flex; gap:10px; margin-bottom:16px; }
  .kpi { flex:1; border:1px solid #C7E6D1; border-radius:10px; padding:10px; text-align:center; }
  .kpi b { display:block; font-size:20px; } .kpi span { font-size:10px; color:#4B5D53; }
  h2 { font-size:13px; color:#1B4332; margin:18px 0 8px; }
  .bar-row { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
  .bar-label { width:115px; font-size:10px; }
  .bar-track { flex:1; height:10px; background:#E4F3E8; border-radius:999px; overflow:hidden; }
  .bar-fill { display:block; height:10px; border-radius:999px; }
  .bar-pct { width:34px; text-align:right; font-size:10px; font-weight:700; color:#4B5D53; }
  .q { border:1px solid #C7E6D1; border-left-width:4px; border-radius:8px; padding:9px 11px; margin-bottom:7px; page-break-inside:avoid; }
  .q-ok { border-left-color:#3F8F5F; } .q-bad { border-left-color:#D64550; }
  .q-stem { font-weight:700; margin:0 0 4px; }
  .q-scenario { margin:0 0 4px; font-style:italic; color:#4B5D53; font-size:11px; }
  .wrong { margin:0 0 2px; color:#D64550; font-size:11px; }
  .right { margin:0 0 3px; color:#1B4332; font-size:11px; }
  .expl { margin:0; color:#4B5D53; font-size:11px; }
  .footer { margin-top:18px; padding-top:8px; border-top:1px solid #C7E6D1; text-align:center; font-size:9px; color:#4B5D53; }
</style></head>
<body>
  <h1>JOVEM Practica · Reporte de práctica</h1>
  <p class="sub">${encabezado} — ${fecha}</p>
  <div class="score-box">
    <div class="score">${Math.round(resultado.score)}</div>
    <div class="score-label">de 100</div>
    <div class="verdict">${resultado.passed ? "¡Aprobado!" : "Aún no alcanza — ¡sigue practicando!"}</div>
  </div>
  <div class="kpis">
    <div class="kpi"><b style="color:#3F8F5F">${resultado.correct}</b><span>Correctas</span></div>
    <div class="kpi"><b style="color:#D64550">${resultado.wrong}</b><span>Incorrectas</span></div>
    <div class="kpi"><b>${resultado.total}</b><span>Total</span></div>
  </div>
  <h2>Desempeño por unidad</h2>
  ${barras}
  <h2>Repaso de preguntas</h2>
  ${preguntas}
  <div class="footer">JOVEM Practica v${APP_VERSION} · Creado por ${escaparHtml(APP_CREDITS)}</div>
</body></html>`;
}

function imprimirReporte(html) {
  document.getElementById("jovem-print-frame")?.remove();
  const marco = document.createElement("iframe");
  marco.id = "jovem-print-frame";
  Object.assign(marco.style, { position: "fixed", right: 0, bottom: 0, width: 0, height: 0, border: 0 });
  document.body.appendChild(marco);
  const doc = marco.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  const lanzar = () => {
    try { marco.contentWindow.focus(); marco.contentWindow.print(); }
    catch { window.print(); }
  };
  if (doc.readyState === "complete") setTimeout(lanzar, 150);
  else marco.onload = () => setTimeout(lanzar, 150);
}

function VistaResultados({ resultado, units, nombre, nivel, onNuevoIntento, onInicio }) {
  const [verRepaso, setVerRepaso] = useState(false);
  const nota = Math.round(resultado.score);

  const datosGrafica = useMemo(() => units.map((u) => {
    const b = resultado.unit_breakdown?.[String(u.id)];
    if (!b || !b.total) return null;
    return { short: u.short, pct: Math.round((b.correct / b.total) * 100) };
  }).filter(Boolean), [resultado, units]);

  return (
    <div className="flex flex-col flex-1 px-6 pt-8 pb-8">
      <Logo size={22} />

      <p className="text-sm font-semibold mt-5 mb-1" style={{ color: C.tintaSuave }}>
        Reporte de práctica de {nombre}{nivel ? ` · ${nivel}` : ""}
      </p>

      <div className="flex flex-col items-center mt-3 mb-2">
        <ScoreRing score={nota} passed={resultado.passed} />
        <span className="mt-3 text-sm font-bold px-3 py-1 rounded-full"
          style={{
            background: resultado.passed ? C.hoja : C.coralClaro,
            color: resultado.passed ? C.broteOscuro : C.coral,
          }}>
          {resultado.passed ? "¡Aprobado!" : "Aún no alcanza — ¡sigue practicando!"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 my-5">
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: C.hoja }}>
          <CheckCircle2 size={22} color={C.brote} />
          <div>
            <p style={{ fontFamily: FONT_DISPLAY }} className="text-xl font-bold">{resultado.correct}</p>
            <p className="text-xs" style={{ color: C.tintaSuave }}>Correctas</p>
          </div>
        </div>
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: C.coralClaro }}>
          <XCircle size={22} color={C.coral} />
          <div>
            <p style={{ fontFamily: FONT_DISPLAY }} className="text-xl font-bold">{resultado.wrong}</p>
            <p className="text-xs" style={{ color: C.tintaSuave }}>Incorrectas</p>
          </div>
        </div>
      </div>

      {datosGrafica.length > 0 && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: "white", border: `1px solid ${C.hojaBorde}` }}>
          <p className="text-sm font-bold mb-2" style={{ color: C.bosque, fontFamily: FONT_DISPLAY }}>Desempeño por unidad</p>
          <UnitChart data={datosGrafica} />
        </div>
      )}

      <button onClick={() => setVerRepaso((v) => !v)}
        className="w-full rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 mb-3"
        style={{ background: verRepaso ? C.hoja : "white", color: C.bosque, border: `2px solid ${C.hojaBorde}`, fontFamily: FONT_DISPLAY }}>
        <Eye size={17} /> {verRepaso ? "Ocultar preguntas" : `Revisar preguntas (${resultado.total})`}
        <ChevronRight size={16} style={{ transform: verRepaso ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>

      {verRepaso && (
        <div className="flex flex-col gap-3 mb-5">
          {(resultado.detail || []).map((d, i) => (
            <div key={d.question_id || i} className="rounded-2xl p-4 border-l-4"
              style={{
                background: "white", borderColor: d.is_correct ? C.brote : C.coral,
                borderTop: `1px solid ${C.hojaBorde}`, borderRight: `1px solid ${C.hojaBorde}`, borderBottom: `1px solid ${C.hojaBorde}`,
              }}>
              <div className="flex items-start gap-2 mb-1.5">
                <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: C.tintaSuave }}>{i + 1}.</span>
                {d.is_correct
                  ? <CheckCircle2 size={16} color={C.brote} className="mt-0.5 flex-shrink-0" />
                  : <XCircle size={16} color={C.coral} className="mt-0.5 flex-shrink-0" />}
                <p className="text-sm font-semibold" style={{ color: C.tinta }}>{d.stem}</p>
              </div>
              {d.scenario && <p className="text-xs mb-1.5 ml-6 italic" style={{ color: C.tintaSuave }}>{d.scenario}</p>}
              {d.selected === null || d.selected === undefined
                ? <p className="text-xs mb-1 ml-6" style={{ color: C.coral }}>Sin responder</p>
                : !d.is_correct && <p className="text-xs mb-1 ml-6" style={{ color: C.coral }}>Tu respuesta: {d.options[d.selected]}</p>}
              <p className="text-xs mb-1.5 ml-6" style={{ color: C.broteOscuro }}>Correcta: {d.options[d.correct_index]}</p>
              <p className="text-xs ml-6 leading-relaxed" style={{ color: C.tintaSuave }}>{d.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => imprimirReporte(armarReporteHTML({ resultado, units, nombre, nivel, datosGrafica }))}
        className="w-full rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 mb-3"
        style={{ background: C.sol, color: C.tinta, fontFamily: FONT_DISPLAY }}>
        <Download size={17} /> Guardar PDF
      </button>

      <button onClick={onNuevoIntento}
        className="w-full rounded-2xl py-4 font-bold text-white shadow-lg flex items-center justify-center gap-2"
        style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
        <RotateCcw size={18} /> Nuevo Intento
      </button>
      <button onClick={onInicio} className="w-full py-3 font-semibold text-sm flex items-center justify-center gap-1.5 mt-1"
        style={{ color: C.tintaSuave }}>
        <Home size={14} /> Volver al inicio
      </button>
      <PieCreditos className="mt-4" />
    </div>
  );
}

/* ========================================================================== */
/* Acceso del personal                                                        */
/* ========================================================================== */
function AccesoStaff({ onVolver, onEntrar }) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

  async function entrar() {
    if (verificando) return;
    setVerificando(true);
    setError("");
    try {
      const r = await staffLogin(usuario, clave);
      if (r.ok) onEntrar(r.usuario);
      else if (r.motivo === "inactivo") setError("Esta cuenta está desactivada. Contacta al administrador.");
      else if (r.motivo === "sin-perfil") setError("La cuenta existe pero no tiene un perfil asignado.");
      else setError("Usuario o clave incorrectos.");
    } catch {
      setError("No se pudo conectar. Revisa tu internet.");
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6 pt-10 pb-8 justify-center">
      <button onClick={onVolver} className="flex items-center gap-1 text-sm font-medium mb-8 self-start" style={{ color: C.tintaSuave }}>
        <ChevronLeft size={16} /> Volver
      </button>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: C.hoja }}>
        <Lock size={22} color={C.brote} />
      </div>
      <h2 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-xl font-bold mb-1">Acceso para personal</h2>
      <p className="text-sm mb-5" style={{ color: C.tintaSuave }}>Administradores, asesores y generadores de ítems.</p>

      <input type="text" value={usuario} autoCapitalize="none" autoCorrect="off"
        onChange={(e) => { setUsuario(e.target.value); setError(""); }} placeholder="Usuario"
        className="w-full rounded-xl px-4 py-3 mb-2 outline-none"
        style={{ border: `2px solid ${error ? C.coral : C.hojaBorde}` }} />
      <input type="password" value={clave}
        onChange={(e) => { setClave(e.target.value); setError(""); }} placeholder="Clave"
        onKeyDown={(e) => e.key === "Enter" && entrar()}
        className="w-full rounded-xl px-4 py-3 mb-2 outline-none"
        style={{ border: `2px solid ${error ? C.coral : C.hojaBorde}` }} />

      {error && (
        <p className="text-xs mb-3 flex items-start gap-1 font-semibold" style={{ color: C.coral }}>
          <ShieldAlert size={12} className="flex-shrink-0 mt-0.5" /> {error}
        </p>
      )}

      <button onClick={entrar} disabled={verificando}
        className="w-full rounded-2xl py-3.5 font-bold text-white mt-3 disabled:opacity-60"
        style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
        {verificando ? "Verificando…" : "Entrar"}
      </button>
    </div>
  );
}

/* ========================================================================== */
/* Panel de personal                                                          */
/* ========================================================================== */
function Panel({ staff, units, config, setConfig, onSalir, onInicio }) {
  const rol = staff.role;
  const esAdmin = rol === "admin";
  const puedeEditarItems = rol === "admin" || rol === "item_creator";
  const puedeConfigurar = rol === "admin" || rol === "asesor";

  const pestanaInicial = rol === "item_creator" ? "preguntas" : "impacto";
  const [pestana, setPestana] = useState(pestanaInicial);

  const [impacto, setImpacto] = useState(null);
  const [rango, setRango] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [editandoPregunta, setEditandoPregunta] = useState(null);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [reiniciandoClave, setReiniciandoClave] = useState(null);
  const [configForm, setConfigForm] = useState(config);
  const [configGuardada, setConfigGuardada] = useState(false);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const tareas = [];
      if (rol !== "item_creator") tareas.push(getImpacto(rango).then(setImpacto));
      if (puedeEditarItems) tareas.push(listarPreguntas().then(setPreguntas));
      if (esAdmin) tareas.push(listarUsuarios().then(setUsuarios));
      await Promise.all(tareas);
    } catch (e) {
      setError(e?.message || "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [rango]);

  const datosGrafica = useMemo(() => {
    if (!impacto?.per_unit) return [];
    return units.map((u) => {
      const b = impacto.per_unit[String(u.id)] || { correct: 0, total: 0 };
      return { short: u.short, pct: b.total ? Math.round((b.correct / b.total) * 100) : 0 };
    });
  }, [impacto, units]);

  async function guardarConfiguracion() {
    const limpio = {
      timeLimitMinutes: Math.max(1, Number(configForm.timeLimitMinutes) || 80),
      questionCount: Math.max(1, Number(configForm.questionCount) || 30),
    };
    await saveConfig(limpio);
    setConfigForm({ ...configForm, ...limpio });
    setConfig({ ...config, ...limpio });
    setConfigGuardada(true);
    setTimeout(() => setConfigGuardada(false), 2000);
  }

  const pestanas = [
    ...(rol !== "item_creator" ? [{ id: "impacto", label: "Impacto", icon: BarChart3 }] : []),
    ...(puedeEditarItems ? [{ id: "preguntas", label: "Preguntas", icon: Pencil }] : []),
    ...(esAdmin ? [{ id: "usuarios", label: "Usuarios", icon: Users }] : []),
    ...(puedeConfigurar ? [{ id: "config", label: "Prácticas", icon: Settings }] : []),
  ];

  const infoRol = ROLES[rol] || ROLES.asesor;

  return (
    <div className="flex flex-col flex-1 px-6 pt-8 pb-8">
      <div className="flex items-center justify-between mb-1">
        <Logo size={20} />
        <div className="flex gap-2">
          <button onClick={onInicio} className="text-xs font-semibold" style={{ color: C.tintaSuave }}>Inicio</button>
          <button onClick={onSalir} className="text-xs font-semibold flex items-center gap-1" style={{ color: C.coral }}>
            <LogOut size={12} /> Salir
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ background: infoRol.bg, color: infoRol.color }}>{infoRol.label}</span>
        <span className="text-xs" style={{ color: C.tintaSuave }}>{staff.full_name}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {pestanas.map((p) => (
          <button key={p.id} onClick={() => setPestana(p.id)}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1"
            style={{
              background: pestana === p.id ? C.brote : "white",
              color: pestana === p.id ? "white" : C.bosque,
              border: `2px solid ${pestana === p.id ? C.brote : C.hojaBorde}`,
            }}>
            <p.icon size={13} /> {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl px-3 py-2.5 flex items-start gap-2 mb-4" style={{ background: C.coralClaro }}>
          <ShieldAlert size={14} color={C.coral} className="mt-0.5 flex-shrink-0" />
          <p className="text-[12px] font-semibold" style={{ color: C.coral }}>{error}</p>
        </div>
      )}

      {cargando ? <Cargando /> : (
        <>
          {pestana === "impacto" && impacto && (
            <PestanaImpacto impacto={impacto} datosGrafica={datosGrafica} rango={rango} setRango={setRango} />
          )}

          {pestana === "preguntas" && (
            <PestanaPreguntas
              units={units} preguntas={preguntas}
              onNueva={() => setEditandoPregunta({})}
              onEditar={(q) => setEditandoPregunta(q)}
              onArchivar={async (q) => { await archivarPregunta(q.id, !q.archived); cargar(); }}
              onEliminar={async (q) => { await eliminarPregunta(q.id); cargar(); }}
            />
          )}

          {pestana === "usuarios" && (
            <PestanaUsuarios
              usuarios={usuarios}
              onNuevo={() => setEditandoUsuario({ nuevo: true })}
              onEditar={(u) => setEditandoUsuario(u)}
              onClave={(u) => setReiniciandoClave(u)}
              onActivar={async (u) => { await actualizarUsuario(u.id, { fullName: u.full_name, username: u.username, role: u.role, isActive: !u.is_active }); cargar(); }}
              onEliminar={async (u) => { await eliminarUsuario(u.id); cargar(); }}
            />
          )}

          {pestana === "config" && (
            <PestanaConfig
              form={configForm} setForm={setConfigForm}
              guardada={configGuardada} onGuardar={guardarConfiguracion}
            />
          )}
        </>
      )}

      {editandoPregunta && (
        <FormularioPregunta
          units={units}
          inicial={editandoPregunta}
          onCancelar={() => setEditandoPregunta(null)}
          onGuardar={async (p) => { await guardarPregunta(p); setEditandoPregunta(null); cargar(); }}
        />
      )}

      {editandoUsuario && (
        <FormularioUsuario
          inicial={editandoUsuario}
          existentes={usuarios}
          onCancelar={() => setEditandoUsuario(null)}
          onGuardar={async (u) => {
            if (editandoUsuario.nuevo) await crearUsuario(u);
            else await actualizarUsuario(editandoUsuario.id, u);
            setEditandoUsuario(null);
            cargar();
          }}
        />
      )}

      {reiniciandoClave && (
        <FormularioClave
          usuario={reiniciandoClave}
          onCancelar={() => setReiniciandoClave(null)}
          onGuardar={async (clave) => { await restablecerClave(reiniciandoClave.id, clave); setReiniciandoClave(null); }}
        />
      )}

      <PieCreditos className="mt-6" />
    </div>
  );
}

/* --------------------------- Pestaña: impacto --------------------------- */
function PestanaImpacto({ impacto, datosGrafica, rango, setRango }) {
  const tasaFin = impacto.practice_started
    ? Math.round((impacto.practice_completed / impacto.practice_started) * 100) : 0;

  const rangos = [
    { id: null, label: "Todo" }, { id: "hoy", label: "Hoy" },
    { id: "7d", label: "7 días" }, { id: "30d", label: "30 días" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {rangos.map((r) => (
          <button key={String(r.id)} onClick={() => setRango(r.id)}
            className="flex-1 rounded-lg py-1.5 text-xs font-semibold"
            style={{
              background: rango === r.id ? C.hoja : "white",
              color: rango === r.id ? C.broteOscuro : C.tintaSuave,
              border: `1px solid ${rango === r.id ? C.brote : C.hojaBorde}`,
            }}>{r.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Visitas" value={impacto.visits} icon={Users} />
        <KpiCard label="Prácticas iniciadas" value={impacto.practice_started} icon={TrendingUp} />
        <KpiCard label="Completadas" value={impacto.practice_completed} icon={CheckCircle2} />
        <KpiCard label="Tasa de finalización" value={`${tasaFin}%`} icon={BarChart3} />
        <KpiCard label="Nota promedio" value={impacto.avg_score} icon={Award} accent={C.sol} />
        <KpiCard label="% de aprobación" value={`${impacto.pass_rate}%`} icon={Sprout} />
      </div>

      <div className="rounded-2xl p-4" style={{ background: "white", border: `1px solid ${C.hojaBorde}` }}>
        <p className="text-sm font-bold mb-2" style={{ color: C.bosque, fontFamily: FONT_DISPLAY }}>Acierto por unidad</p>
        <UnitChart data={datosGrafica} />
      </div>

      <p className="text-xs text-center" style={{ color: C.tintaSuave }}>
        Métricas agregadas y anónimas: no identifican a ninguna persona.
      </p>
    </div>
  );
}

/* -------------------------- Pestaña: preguntas -------------------------- */
function PestanaPreguntas({ units, preguntas, onNueva, onEditar, onArchivar, onEliminar }) {
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onNueva}
        className="w-full rounded-xl py-3 font-semibold text-sm text-white flex items-center justify-center gap-1.5"
        style={{ background: C.brote }}>
        <Plus size={16} /> Nueva pregunta
      </button>

      {units.map((u) => {
        const qs = preguntas.filter((q) => q.unit_id === u.id);
        if (!qs.length) return null;
        return (
          <div key={u.id}>
            <p className="text-xs font-bold uppercase tracking-wide mt-2 mb-1.5" style={{ color: C.tintaSuave }}>
              {u.name} ({qs.length})
            </p>
            <div className="flex flex-col gap-2">
              {qs.map((q) => (
                <div key={q.id} className="rounded-xl p-3 flex items-start justify-between gap-2"
                  style={{ background: "white", border: `1px solid ${C.hojaBorde}`, opacity: q.archived ? 0.55 : 1 }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase"
                      style={{ color: q.type === "caso" ? C.solOscuro : C.broteOscuro }}>
                      {q.type}{q.archived && " · archivada"}
                    </span>
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: C.tinta }}>{q.stem}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => onArchivar(q)} title={q.archived ? "Activar" : "Archivar"}
                      className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.hoja }}>
                      {q.archived ? <ArchiveRestore size={13} color={C.brote} /> : <Archive size={13} color={C.tintaSuave} />}
                    </button>
                    <button onClick={() => onEditar(q)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.hoja }}>
                      <Pencil size={13} color={C.brote} />
                    </button>
                    <button onClick={() => onEliminar(q)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.coralClaro }}>
                      <Trash2 size={13} color={C.coral} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------- Pestaña: usuarios -------------------------- */
function PestanaUsuarios({ usuarios, onNuevo, onEditar, onClave, onActivar, onEliminar }) {
  return (
    <div className="flex flex-col gap-3">
      <button onClick={onNuevo}
        className="w-full rounded-xl py-3 font-semibold text-sm text-white flex items-center justify-center gap-1.5"
        style={{ background: C.brote }}>
        <UserPlus size={16} /> Nuevo usuario
      </button>
      <p className="text-xs" style={{ color: C.tintaSuave }}>
        Cuentas de administradores, asesores y generadores de ítems. Los estudiantes no tienen cuenta.
      </p>

      <div className="flex flex-col gap-2">
        {usuarios.map((u) => {
          const r = ROLES[u.role] || ROLES.asesor;
          return (
            <div key={u.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "white", border: `1px solid ${C.hojaBorde}`, opacity: u.is_active ? 1 : 0.55 }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: r.bg }}>
                <ShieldCheck size={15} color={r.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.tinta }}>{u.full_name}</p>
                <p className="text-xs truncate" style={{ color: C.tintaSuave }}>@{u.username}</p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                  style={{ background: r.bg, color: r.color }}>
                  {r.label}{!u.is_active && " · inactivo"}{u.is_primary && " · principal"}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => onClave(u)} title="Restablecer clave"
                  className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.hoja }}>
                  <KeyRound size={13} color={C.brote} />
                </button>
                <button onClick={() => onActivar(u)} title={u.is_active ? "Desactivar" : "Activar"}
                  className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.hoja }}>
                  {u.is_active ? <Ban size={13} color={C.tintaSuave} /> : <CheckCircle2 size={13} color={C.brote} />}
                </button>
                <button onClick={() => onEditar(u)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.hoja }}>
                  <Pencil size={13} color={C.brote} />
                </button>
                {u.is_primary ? (
                  <div title="El administrador principal no se puede eliminar"
                    className="w-7 h-7 rounded-lg flex items-center justify-center opacity-40" style={{ background: C.coralClaro }}>
                    <ShieldAlert size={13} color={C.coral} />
                  </div>
                ) : (
                  <button onClick={() => onEliminar(u)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: C.coralClaro }}>
                    <Trash2 size={13} color={C.coral} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------- Pestaña: prácticas -------------------------- */
function PestanaConfig({ form, setForm, guardada, onGuardar }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed" style={{ color: C.tintaSuave }}>
        Estos valores aplican a la <strong>práctica completa</strong>. La práctica por unidad
        siempre muestra todas las preguntas activas de esa unidad.
      </p>

      <div className="rounded-2xl p-4" style={{ background: "white", border: `1px solid ${C.hojaBorde}` }}>
        <p className="text-sm font-bold mb-1" style={{ color: C.bosque, fontFamily: FONT_DISPLAY }}>Tiempo por práctica</p>
        <p className="text-xs mb-3" style={{ color: C.tintaSuave }}>Minutos para terminar. Por defecto: 80.</p>
        <div className="flex items-center gap-2">
          <Clock size={16} color={C.brote} />
          <input type="number" min={1} value={form.timeLimitMinutes}
            onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value })}
            className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${C.hojaBorde}` }} />
          <span className="text-xs font-semibold" style={{ color: C.tintaSuave }}>minutos</span>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: "white", border: `1px solid ${C.hojaBorde}` }}>
        <p className="text-sm font-bold mb-1" style={{ color: C.bosque, fontFamily: FONT_DISPLAY }}>Cantidad de preguntas</p>
        <p className="text-xs mb-3" style={{ color: C.tintaSuave }}>Preguntas al azar por práctica. Por defecto: 30.</p>
        <div className="flex items-center gap-2">
          <Sparkles size={16} color={C.brote} />
          <input type="number" min={1} value={form.questionCount}
            onChange={(e) => setForm({ ...form, questionCount: e.target.value })}
            className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${C.hojaBorde}` }} />
          <span className="text-xs font-semibold" style={{ color: C.tintaSuave }}>preguntas</span>
        </div>
      </div>

      <button onClick={onGuardar}
        className="w-full rounded-2xl py-3.5 font-bold text-white shadow-md flex items-center justify-center gap-2"
        style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
        <Save size={16} /> {guardada ? "¡Guardado!" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* ========================================================================== */
/* Formularios                                                                */
/* ========================================================================== */
function FormularioPregunta({ units, inicial, onCancelar, onGuardar }) {
  const [form, setForm] = useState({
    id: inicial.id,
    unit: inicial.unit_id ?? units[0]?.id ?? 1,
    type: inicial.type ?? "concepto",
    scenario: inicial.scenario ?? "",
    example: inicial.example ?? "",
    image: inicial.image ?? "",
    stem: inicial.stem ?? "",
    options: inicial.options ?? ["", "", ""],
    correct: inicial.correct_index ?? 0,
    explanation: inicial.explanation ?? "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const setOpcion = (i, v) => {
    const o = [...form.options]; o[i] = v;
    setForm({ ...form, options: o }); setError("");
  };

  async function guardar() {
    if (!form.stem.trim()) return setError("Escribe el enunciado de la pregunta.");
    if (form.options.some((o) => !String(o).trim())) return setError("Completa las tres opciones.");
    if (!form.explanation.trim()) return setError("Escribe la explicación de la respuesta correcta.");
    setGuardando(true);
    try {
      await onGuardar({ ...form, options: form.options.map((o) => String(o).trim()) });
    } catch (e) {
      setError(e?.message || "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5" style={{ background: "white" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-lg font-bold">
            {form.id ? "Editar pregunta" : "Nueva pregunta"}
          </h3>
          <button onClick={onCancelar}><X size={20} color={C.tintaSuave} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: Number(e.target.value) })}
              className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${C.hojaBorde}` }}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.short}</option>)}
            </select>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ border: `1px solid ${C.hojaBorde}` }}>
              <option value="concepto">Concepto</option>
              <option value="caso">Caso real</option>
            </select>
          </div>

          {form.type === "caso" && (
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Escenario del caso</p>
              <textarea value={form.scenario} rows={4}
                onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                placeholder="Escenario de la vida real…"
                className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-y"
                style={{ border: `1px solid ${C.hojaBorde}`, minHeight: 90 }} />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Enunciado de la pregunta</p>
            <textarea value={form.stem} rows={4}
              onChange={(e) => { setForm({ ...form, stem: e.target.value }); setError(""); }}
              className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-y"
              style={{ border: `1px solid ${C.hojaBorde}`, minHeight: 90 }} />
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Opciones (marca la correcta)</p>
            <div className="flex flex-col gap-2">
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => setForm({ ...form, correct: i })} title="Marcar como correcta"
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: form.correct === i ? C.brote : C.hoja, color: form.correct === i ? "white" : C.bosque }}>
                    {"ABC"[i]}
                  </button>
                  <input value={o} onChange={(e) => setOpcion(i, e.target.value)} placeholder={`Opción ${"ABC"[i]}`}
                    className="flex-1 rounded-lg px-3 py-2 text-sm"
                    style={{ border: `1px solid ${form.correct === i ? C.brote : C.hojaBorde}` }} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Explicación de la respuesta correcta</p>
            <textarea value={form.explanation} rows={3}
              onChange={(e) => { setForm({ ...form, explanation: e.target.value }); setError(""); }}
              className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed resize-y"
              style={{ border: `1px solid ${C.hojaBorde}`, minHeight: 70 }} />
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background: C.coralClaro }}>
              <ShieldAlert size={14} color={C.coral} className="mt-0.5 flex-shrink-0" />
              <p className="text-[12px] font-semibold" style={{ color: C.coral }}>{error}</p>
            </div>
          )}
        </div>

        <button onClick={guardar} disabled={guardando}
          className="w-full rounded-2xl py-3.5 font-bold text-white mt-4 disabled:opacity-60"
          style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
          {guardando ? "Guardando…" : "Guardar pregunta"}
        </button>
        <button onClick={onCancelar} className="w-full py-2.5 text-sm font-semibold mt-1" style={{ color: C.tintaSuave }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FormularioUsuario({ inicial, existentes, onCancelar, onGuardar }) {
  const nuevo = !!inicial.nuevo;
  const [form, setForm] = useState({
    fullName: inicial.full_name ?? "",
    username: inicial.username ?? "",
    password: "",
    role: inicial.role ?? "asesor",
    isActive: inicial.is_active ?? true,
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const refs = { fullName: useRef(null), username: useRef(null), password: useRef(null) };

  function sugerir(nombreCompleto) {
    const p = nombreCompleto.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!p.length) return "";
    const base = p.length > 1 ? p[0][0] + p[p.length - 1] : p[0];
    return base.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  }

  function cambiarNombre(v) {
    const sincronizado = nuevo && (!form.username || form.username === sugerir(form.fullName));
    setForm({ ...form, fullName: v, username: sincronizado ? sugerir(v) : form.username });
    setErrores({});
  }

  async function guardar() {
    const nombre = form.fullName.trim();
    const usuario = form.username.trim();
    const clave = form.password.trim();
    const e = {};

    if (!nombre) e.fullName = "Escribe el nombre completo de la persona.";
    if (!usuario) e.username = "Escribe el usuario con el que iniciará sesión.";
    else if (/\s/.test(usuario)) e.username = "El usuario no puede llevar espacios. Ej.: jalvarez";
    else if ((existentes || []).some((u) => u.id !== inicial.id && String(u.username).toLowerCase() === usuario.toLowerCase()))
      e.username = `El usuario "${usuario}" ya existe. Elige otro.`;
    if (nuevo && !clave) e.password = "Escribe una contraseña inicial.";

    if (Object.keys(e).length) {
      setErrores(e);
      const primero = ["fullName", "username", "password"].find((k) => e[k]);
      const el = refs[primero]?.current;
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el.focus(), 250); }
      return;
    }

    setGuardando(true);
    try {
      await onGuardar({ fullName: nombre, username: usuario, password: clave, role: form.role, isActive: form.isActive });
    } catch (err) {
      setErrores({ username: err?.message || "No se pudo guardar." });
      setGuardando(false);
    }
  }

  const estilo = (campo) => ({
    border: `2px solid ${errores[campo] ? C.coral : C.hojaBorde}`,
    background: errores[campo] ? C.coralClaro : "white",
  });

  const Msg = ({ campo }) => errores[campo] ? (
    <p className="text-[11px] font-semibold mt-1 flex items-start gap-1" style={{ color: C.coral }}>
      <ShieldAlert size={12} className="flex-shrink-0 mt-0.5" /> {errores[campo]}
    </p>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5" style={{ background: "white" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-lg font-bold">
            {nuevo ? "Nuevo usuario" : "Editar usuario"}
          </h3>
          <button onClick={onCancelar}><X size={20} color={C.tintaSuave} /></button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Nombre completo</p>
            <input ref={refs.fullName} value={form.fullName} onChange={(e) => cambiarNombre(e.target.value)}
              placeholder="Ej. Juan Alberto Álvarez"
              className="w-full rounded-lg px-3 py-2.5 text-sm" style={estilo("fullName")} />
            <Msg campo="fullName" />
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Usuario (con el que inicia sesión)</p>
            <input ref={refs.username} value={form.username} autoCapitalize="none" autoCorrect="off"
              onChange={(e) => { setForm({ ...form, username: e.target.value }); setErrores({}); }}
              placeholder="Ej. jalvarez"
              className="w-full rounded-lg px-3 py-2.5 text-sm" style={estilo("username")} />
            <Msg campo="username" />
            {nuevo && !errores.username && (
              <p className="text-[11px] mt-1" style={{ color: C.tintaSuave }}>
                Se sugiere solo, pero puedes cambiarlo. Sin espacios.
              </p>
            )}
          </div>

          {nuevo && (
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Contraseña inicial</p>
              <input ref={refs.password} type="password" value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrores({}); }}
                placeholder="Mínimo 4 caracteres"
                className="w-full rounded-lg px-3 py-2.5 text-sm" style={estilo("password")} />
              <Msg campo="password" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-1.5" style={{ color: C.tintaSuave }}>Rol</p>
            <div className="flex flex-col gap-2">
              {Object.entries(ROLES).map(([key, r]) => (
                <button key={key} onClick={() => setForm({ ...form, role: key })}
                  className="text-left rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                  style={{ background: form.role === key ? r.bg : "white", border: `2px solid ${form.role === key ? r.color : C.hojaBorde}` }}>
                  <ShieldCheck size={15} color={r.color} />
                  <span className="text-sm font-medium" style={{ color: C.tinta }}>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {!nuevo && (
            <label className="flex items-center gap-2 text-sm mt-1" style={{ color: C.tinta }}>
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Cuenta activa
            </label>
          )}
        </div>

        <button onClick={guardar} disabled={guardando}
          className="w-full rounded-2xl py-3.5 font-bold text-white mt-4 disabled:opacity-60"
          style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
          {guardando ? "Guardando…" : "Guardar usuario"}
        </button>
        <button onClick={onCancelar} className="w-full py-2.5 text-sm font-semibold mt-1" style={{ color: C.tintaSuave }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function FormularioClave({ usuario, onCancelar, onGuardar }) {
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    if (clave.trim().length < 4) return setError("La contraseña debe tener al menos 4 caracteres.");
    setGuardando(true);
    try { await onGuardar(clave.trim()); }
    catch (e) { setError(e?.message || "No se pudo cambiar."); setGuardando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5" style={{ background: "white" }}>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-lg font-bold">Restablecer clave</h3>
          <button onClick={onCancelar}><X size={20} color={C.tintaSuave} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: C.tintaSuave }}>Cuenta: @{usuario.username}</p>

        <input type="password" value={clave} autoFocus
          onChange={(e) => { setClave(e.target.value); setError(""); }}
          placeholder="Nueva contraseña"
          className="w-full rounded-lg px-3 py-2.5 text-sm mb-2"
          style={{ border: `2px solid ${error ? C.coral : C.hojaBorde}` }} />
        {error && <p className="text-[11px] font-semibold mb-2" style={{ color: C.coral }}>{error}</p>}

        <button onClick={guardar} disabled={guardando}
          className="w-full rounded-2xl py-3.5 font-bold text-white mt-2 disabled:opacity-60"
          style={{ background: C.brote, fontFamily: FONT_DISPLAY }}>
          {guardando ? "Guardando…" : "Guardar nueva clave"}
        </button>
      </div>
    </div>
  );
}
