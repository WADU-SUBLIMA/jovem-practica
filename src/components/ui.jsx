// ============================================================================
// JOVEM Practica — Identidad visual y componentes compartidos
// ============================================================================
// Todo lo puramente visual vive aquí, sin lógica de datos.
// ============================================================================

import React, { useEffect } from "react";
import { Sprout, Leaf } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";

export const LEVELS = ["Sétimo", "Octavo", "Noveno"];

export const C = {
  bosque: "#1B4332",     // verde profundo — texto de marca, headers
  brote: "#3F8F5F",      // verde brote — interactivo primario
  broteOscuro: "#2D6E47",
  hoja: "#E4F3E8",       // fondo verde muy pálido — tarjetas
  hojaBorde: "#C7E6D1",
  sol: "#F5B942",        // acento cálido — logros, CTA secundario
  solOscuro: "#D99A22",
  coral: "#D64550",      // incorrecto / error
  coralClaro: "#FBE4E6",
  turquesa: "#2A9D8F",   // acento — rol "generador de ítems"
  turquesaClara: "#DFF3F1",
  crema: "#FAFAF6",      // fondo general
  tinta: "#16241C",      // texto principal
  tintaSuave: "#4B5D53",
};

export const ROLES = {
  admin: { label: "Administrador", color: "#1B4332", bg: "#E4F3E8" },
  asesor: { label: "Asesor", color: "#D99A22", bg: "#FFF3DD" },
  item_creator: { label: "Generador de ítems", color: "#2A9D8F", bg: "#DFF3F1" },
};

export function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById("jovem-fonts")) return;
    const link = document.createElement("link");
    link.id = "jovem-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}
export const FONT_DISPLAY = "'Baloo 2', ui-rounded, system-ui, sans-serif";
export const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

export const ILLUSTRATIONS = {
  tienda: { Icon: Store, bg: C.hoja, fg: C.brote },
  reciclaje: { Icon: Recycle, bg: C.hoja, fg: C.broteOscuro },
  manualidad: { Icon: Hammer, bg: C.turquesaClara, fg: C.turquesa },
  dinero: { Icon: Coins, bg: "#FFF3DD", fg: C.solOscuro },
  mercado: { Icon: Tent, bg: C.turquesaClara, fg: C.broteOscuro },
  equipo: { Icon: HeartHandshake, bg: C.hoja, fg: C.brote },
  megafono: { Icon: Megaphone, bg: "#FFF3DD", fg: C.solOscuro },
  presentacion: { Icon: Mic2, bg: C.turquesaClara, fg: C.turquesa },
  idea: { Icon: Lightbulb, bg: "#FFF3DD", fg: C.solOscuro },
  prueba: { Icon: FlaskConical, bg: C.turquesaClara, fg: C.turquesa },
};

export function QuestionIllustration({ topic }) {
  const entry = ILLUSTRATIONS[topic];
  if (!entry) return null;
  const { Icon, bg, fg } = entry;
  return (
    <div className="w-full h-24 rounded-2xl flex items-center justify-center mb-3" style={{ background: bg }}>
      <Icon size={38} color={fg} strokeWidth={1.6} />
    </div>
  );
}

export function ExampleBox({ text }) {
  if (!text) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3.5 mb-3 flex items-start gap-2.5"
      style={{ background: "white", border: `2px solid ${C.hojaBorde}` }}
    >
      <Quote size={16} color={C.brote} strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
      <p style={{ color: C.bosque, fontFamily: FONT_BODY }} className="text-[15px] font-semibold italic leading-snug">
        "{text}"
      </p>
    </div>
  );
}

export const MOTIVATIONAL_PHRASES = [
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
  "Cada error es una lección disfrazada de obstáculo.",
  "Las grandes ideas nacen de mirar un problema pequeño con otros ojos.",
  "No esperes el momento perfecto: crea tú el momento.",
  "Emprender es aprender a caminar mientras construyes el camino.",
  "Tu primera versión no tiene que ser perfecta, solo tiene que existir.",
  "La perseverancia convierte los intentos en resultados.",
  "Una idea sin acción es solo un sueño más.",
  "El fracaso es información, no una sentencia.",
  "Quien se atreve a empezar ya recorrió la mitad del camino.",
  "La innovación empieza por atreverse a preguntar '¿y si lo hacemos distinto?'.",
  "Un equipo unido llega más lejos que un genio solitario.",
  "Cuida el planeta con las mismas ganas con que cuidas tu proyecto.",
  "La disciplina es el puente entre las metas y los logros.",
  "Nadie nace sabiendo emprender: se aprende intentando.",
  "Tu comunidad también gana cuando tu idea prospera.",
  "El talento abre puertas, pero la constancia las mantiene abiertas.",
  "Cada 'no' te acerca un poco más al 'sí' correcto.",
  "Piensa en grande, pero empieza con lo que tienes hoy.",
  "La creatividad se entrena resolviendo problemas reales.",
  "Un prototipo imperfecto enseña más que una idea perfecta sin probar.",
  "El verdadero fracaso es no intentarlo por miedo a fallar.",
  "La confianza se construye con cada pequeño paso cumplido.",
  "Escuchar a tus clientes es la mejor inversión que puedes hacer.",
  "Ser joven no te hace menos capaz: te hace más valiente.",
  "El planeta también es tu cliente: cuídalo en cada decisión.",
  "Los grandes proyectos empiezan en cuadernos, no en oficinas.",
  "Equivocarse rápido y aprender rápido vale más que no intentarlo.",
  "Tu esfuerzo de hoy es tu resultado de mañana.",
  "La honestidad con tus clientes es tu mejor estrategia de ventas.",
  "No necesitas ser el mejor, solo necesitas empezar.",
  "Cada obstáculo es una oportunidad de demostrar de qué estás hecho.",
  "El trabajo en equipo multiplica las ideas y divide el esfuerzo.",
  "Sueña en grande, pero organiza tus pasos en pequeño.",
  "La curiosidad es la primera herramienta de todo emprendedor.",
  "Un problema bien identificado ya está medio resuelto.",
  "Nadie recuerda cuántas veces te caíste, sino cuántas te levantaste.",
  "La mejor propuesta de valor nace de una necesidad real.",
  "Reinventarse también es una forma de perseverar.",
  "Tu idea puede cambiar tu comunidad si te animas a compartirla.",
  "El miedo al error paraliza más que el error mismo.",
  "Cada venta empieza con una conversación honesta.",
  "Ser sostenible no es una opción extra, es parte del proyecto.",
  "La retroalimentación es un regalo, aunque a veces no te guste.",
  "Los emprendedores no evitan el riesgo, aprenden a calcularlo.",
  "Tu actitud vale tanto como tu producto.",
  "Una meta clara convierte el esfuerzo en resultados.",
  "El primer cliente que confía en ti es el más valioso.",
  "Aprender de otros no te hace menos original, te hace más sabio.",
  "La constancia vence al talento cuando el talento no trabaja duro.",
  "Cada feria, cada venta, cada intento te hace mejor emprendedor.",
  "No copies la solución: copia las ganas de resolver problemas.",
  "Un buen equipo se nota en cómo enfrenta las crisis, no en cómo celebra los éxitos.",
  "El cambio empieza por una idea que alguien se atrevió a intentar.",
  "Tu proyecto puede ser pequeño y aun así cambiar algo grande.",
  "La paciencia también es una herramienta de trabajo.",
  "Cada 'todavía no' es distinto de un 'nunca'.",
  "Emprender es también aprender a escuchar el silencio del mercado.",
  "El valor de una idea se mide en la vida de las personas que ayuda.",
  "No hay edad mínima para resolver un problema real.",
  "La perseverancia sin dirección es esfuerzo perdido: ten siempre un objetivo claro.",
  "Cuidar los recursos también es cuidar el futuro de tu proyecto.",
  "Un 'gracias' de un cliente vale más que cualquier elogio.",
  "El primer paso siempre parece el más difícil, hasta que lo das.",
  "Cree en tu proyecto incluso los días en que nadie más lo hace.",
  "La colaboración construye más rápido que la competencia.",
  "Cada desafío superado es una nueva versión más fuerte de ti.",
  "Los errores de hoy son la experiencia que necesitarás mañana.",
  "Vender es, sobre todo, resolver un problema para alguien más.",
  "La resiliencia se entrena, no se hereda.",
  "Tu voz y tu idea importan, aunque seas el más joven del equipo.",
  "Un proyecto sostenible piensa en las personas de hoy y de mañana.",
  "El aprendizaje más valioso casi siempre llega después de un tropiezo.",
  "La motivación te hace empezar; el hábito te hace continuar.",
  "Toda gran empresa comenzó siendo una idea que parecía pequeña.",
  "Preguntar '¿por qué?' es el primer paso de toda innovación.",
  "El respeto por tu equipo se nota en cómo repartes el trabajo.",
  "Tu comunidad necesita más soluciones y menos excusas.",
  "Cuidar el detalle de tu producto es cuidar la confianza del cliente.",
  "Un plan sin acción es solo una buena intención.",
  "La creatividad florece cuando te permites equivocarte.",
  "Ser justo con tus precios también es ser justo contigo mismo.",
  "El verdadero emprendedor convierte los problemas en oportunidades.",
  "Cada persona que confía en tu producto es un voto de esfuerzo bien invertido.",
  "El progreso no siempre se ve, pero siempre se acumula.",
  "Rodéate de personas que quieran ver crecer tu idea, no apagarla.",
  "Un buen líder también sabe escuchar antes de decidir.",
  "El cambio que quieres ver en tu comunidad puede empezar en tu proyecto.",
  "No subestimes lo que puedes lograr en un solo semestre de esfuerzo.",
  "La honestidad en los números construye confianza a largo plazo.",
  "Cada prototipo es un paso más cerca de la solución final.",
  "El coraje no es no tener miedo, es actuar a pesar de él.",
  "Aprender a vender es aprender a comunicar con empatía.",
  "Tu proyecto también es una forma de cuidar a las próximas generaciones.",
  "La disciplina diaria construye lo que la inspiración solo empieza.",
  "Cada meta cumplida es la prueba de que puedes con la siguiente.",
  "Un equipo que celebra juntos también se recupera junto de los tropiezos.",
  "El emprendimiento joven de hoy es el desarrollo de la comunidad de mañana.",
  "Piensa en el planeta antes de pensar solo en la ganancia.",
  "La mejor presentación es la que nace de creer de verdad en tu idea.",
];

export function Logo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: size + 16, height: size + 16, background: C.hoja }}
      >
        <Sprout size={size} color={C.brote} strokeWidth={2.4} />
      </div>
      <span style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-xl font-bold tracking-tight">
        JOVEM <span style={{ color: C.brote }}>Practica</span>
      </span>
    </div>
  );
}

export function VineProgress({ answered, total, current, studentName, studentLevel }) {
  const pct = total ? (answered / total) * 100 : 0;
  return (
    <div className="w-full">
      {studentName && (
        <p className="text-xs font-semibold mb-2" style={{ color: C.brote, fontFamily: FONT_BODY }}>
          👋 {studentName}{studentLevel ? ` · ${studentLevel}` : ""}
        </p>
      )}
      <div className="relative h-3 rounded-full overflow-visible" style={{ background: C.hoja }}>
        <div
          className="h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.brote}, ${C.sol})` }}
        />
        <div
          className="absolute top-1/2 flex items-center justify-center rounded-full shadow-md transition-all duration-500 ease-out"
          style={{
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: 26,
            height: 26,
            background: "white",
            border: `2px solid ${C.brote}`,
          }}
        >
          <Leaf size={14} color={C.brote} />
        </div>
      </div>
      <p className="mt-3 text-sm font-medium" style={{ color: C.tintaSuave, fontFamily: FONT_BODY }}>
        Pregunta {current + 1} de {total}
      </p>
    </div>
  );
}

export function OptionButton({ label, letter, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl border-2 px-4 py-3.5 transition-all duration-150 flex items-start gap-3 active:scale-[0.99]"
      style={{
        borderColor: selected ? C.brote : C.hojaBorde,
        background: selected ? C.hoja : "white",
        fontFamily: FONT_BODY,
      }}
    >
      <span
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          background: selected ? C.brote : C.hoja,
          color: selected ? "white" : C.bosque,
        }}
      >
        {letter}
      </span>
      <span className="text-[15px] leading-snug pt-0.5" style={{ color: C.tinta }}>
        {label}
      </span>
    </button>
  );
}

export function ScoreRing({ score, passed }) {
  const color = passed ? C.brote : C.coral;
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke={C.hoja} strokeWidth="12" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-3xl font-extrabold">{score}</span>
        <span className="text-xs font-medium" style={{ color: C.tintaSuave }}>de 100</span>
      </div>
    </div>
  );
}

export function UnitChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={C.hojaBorde} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: C.tintaSuave }} unit="%" />
        <YAxis type="category" dataKey="short" width={110} tick={{ fontSize: 11, fill: C.tinta }} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Acierto"]}
          contentStyle={{ borderRadius: 12, border: `1px solid ${C.hojaBorde}`, fontFamily: FONT_BODY, fontSize: 12 }}
        />
        <Bar dataKey="pct" radius={[0, 8, 8, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.pct >= 70 ? C.brote : d.pct >= 40 ? C.sol : C.coral} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function KpiCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "white", border: `1px solid ${C.hojaBorde}` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.tintaSuave }}>{label}</span>
        <Icon size={16} color={accent || C.brote} />
      </div>
      <span style={{ fontFamily: FONT_DISPLAY, color: C.bosque }} className="text-2xl font-bold">{value}</span>
    </div>
  );
}
