const fs = require("fs");
const path = require("path");
const WMO_CODES = require("./wmo-codes.json");

// ============================================================
// CONFIGURACIÓN
// ============================================================

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

// Open-Meteo — gratuito, sin API key, devuelve JSON
const WEATHER_URL_POSADAS =
  "https://api.open-meteo.com/v1/forecast?latitude=-27.3671&longitude=-55.8961&current_weather=true&timezone=America%2FArgentina%2FCordoba";
const WEATHER_URL_CABA =
  "https://api.open-meteo.com/v1/forecast?latitude=-34.6037&longitude=-58.3816&current_weather=true&timezone=America%2FArgentina%2FBuenos_Aires";

const COLOR_CELESTE = 3394815;   // #33ccff → decimal
const COLOR_PURPURA = 10040319;  // #9933ff → decimal

if (!DISCORD_WEBHOOK_URL) {
  console.error("❌ [Config] DISCORD_WEBHOOK no configurado.");
  process.exit(1);
}

// ============================================================
// UTILIDADES
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArgentinaHour() {
  const now = new Date();
  return (now.getUTCHours() - 3 + 24) % 24;
}

/** Turno mañana (11:00 ART) → true | Turno tarde (15:00 ART) → false */
function isMorningTurn(hour) {
  return hour < 14;
}

// ============================================================
// CLIMA — Open-Meteo (JSON, sin API key) + Jitter + Retry
// ============================================================

/**
 * Consulta Open-Meteo y devuelve { temp: number, description: string, image: string }.
 * Usa wmo-codes.json para textos en español con distinción día/noche.
 * Incluye jitter y un retry con 5s de espera.
 */
async function getWeather(url, cityLabel) {
  const jitterMs = Math.floor(Math.random() * 14000) + 1000;
  console.log(
    `⏳ [Clima ${cityLabel}] Jitter de ${(jitterMs / 1000).toFixed(1)}s antes de consultar...`,
  );
  await sleep(jitterMs);

  console.log(`🌐 [Clima ${cityLabel}] GET ${url}`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Trabot/1.0" },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      console.log(
        `📡 [Clima ${cityLabel}] JSON crudo: ${JSON.stringify(json.current_weather)}`,
      );

      const cw = json?.current_weather;
      if (!cw || typeof cw.temperature !== "number") {
        throw new Error("Respuesta JSON sin campo current_weather.temperature");
      }

      const temp    = Math.round(cw.temperature);
      const isDay   = cw.is_day === 1 ? "day" : "night";
      const codeKey = String(cw.weathercode ?? -1);
      const wmoEntry = WMO_CODES[codeKey]?.[isDay];

      const description = wmoEntry?.description ?? "Clima desconocido";
      const image       = wmoEntry?.image ?? null;

      console.log(
        `✅ [Clima ${cityLabel}] Intento ${attempt} OK — ${temp}°C | WMO ${codeKey} (${isDay}) → "${description}"`,
      );
      return { temp, description, image };
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(
        `⚠️ [Clima ${cityLabel}] Intento ${attempt} falló: ${error.message}`,
      );
      if (attempt === 1) {
        console.log(`🔄 [Clima ${cityLabel}] Reintentando en 5 segundos...`);
        await sleep(5000);
      }
    }
  }

  console.error(`❌ [Clima ${cityLabel}] Falló después de 2 intentos.`);
  return { temp: null, description: "Clima no disponible", image: null };
}

// ============================================================
// TEMPERATURA → TAG DE GIPHY
// ============================================================

function getGiphyTagByTemperature(temp) {
  if (temp === null) return "buenos dias";
  if (temp <= 0) return "congelado gracioso";
  if (temp < 10) return "frio gracioso";
  if (temp <= 20) return "fresco gracioso";
  if (temp <= 30) return "clima perfecto";
  if (temp <= 40) return "calor gracioso";
  return "infierno gracioso";
}

// ============================================================
// GIF DE GIPHY
// ============================================================

async function getRandomGifUrl(tag) {
  if (!GIPHY_API_KEY) {
    console.warn("⚠️ [Giphy] GIPHY_API_KEY no configurado. Se enviará sin GIF.");
    return null;
  }

  console.log(`🎬 [Giphy] Buscando GIF con tag: "${tag}"`);

  try {
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      tag,
      rating: "g",
    });

    const response = await fetch(
      `https://api.giphy.com/v1/gifs/random?${params.toString()}`,
    );

    if (!response.ok) {
      console.warn(`⚠️ [Giphy] HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const payload = await response.json();
    const gifUrl = payload?.data?.images?.original?.url;

    if (typeof gifUrl === "string" && gifUrl.length > 0) {
      console.log(`✅ [Giphy] GIF obtenido: ${gifUrl}`);
      return gifUrl;
    }

    console.warn("⚠️ [Giphy] No se encontró URL de GIF en la respuesta.");
    return null;
  } catch (error) {
    console.error(`❌ [Giphy] Error: ${error.message}`);
    return null;
  }
}

// ============================================================
// CHISTES
// ============================================================

function getRandomJoke() {
  const csvPath = path.join(__dirname, "jokes.csv");
  console.log(`📖 [Chistes] Leyendo: ${csvPath}`);

  const data = fs.readFileSync(csvPath, "utf8");

  const lines = data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const jokes = lines
    .slice(1)
    .map((line) => {
      const parts = line.split("|");
      return {
        setup: (parts[1] || "").trim(),
        punchline: (parts[2] || "").trim(),
      };
    })
    .filter((joke) => joke.setup && joke.punchline);

  console.log(`✅ [Chistes] ${jokes.length} chistes cargados desde CSV.`);

  if (jokes.length === 0) {
    throw new Error("No se encontraron chistes válidos en jokes.csv");
  }

  const selected = jokes[Math.floor(Math.random() * jokes.length)];
  console.log(`🎲 [Chistes] Seleccionado: "${selected.setup}"`);
  return selected;
}

// ============================================================
// SALUDOS PERSONALIZADOS
// ============================================================

const customGreetings = [
  "Buendicioooones!!",
  "Los te ka emeee.",
  "BORJA LA CONCHA DE TU MADRE!",
  "Bello día para que Alexis se pague la coca...",
  "Poing devolveme la plata que me debés.",
  "Nano, acá te va un chiste:",
  "Asel, soltá el Tinder de trabas un rato y leé esto.",
  "Puro, dejá de hacerte el misterioso.",
  "German, activá que te estamos esperando.",
  "Marce, ¿hoy se labura o se hace facha?",
  "Dyno, reportándose desde la estratósfera.",
  "Un saludo a todos, menos a Borja.",
  "¿Alguien vio a Asel? Dicen que se fue con un camión con acoplado.",
  "Alexis, sigo esperando la coca, rata inmunda.",
  "Poing, cada día que pasa los intereses suben.",
  "Nano, confirmame si este chiste rompe producción.",
  "Atención, llegó la alegría (y no es el sueldo).",
  "Asel, guardá la peluca y prestá atención.",
  "Puro humo este grupo, igual los quiero.",
  "Si Alexis paga la coca, mañana nieva.",
  "Poing, acepto Mercado Pago, Transferencia o USDT.",
  "Nano, ¿esto compila o explota?",
  "Bendiciones para todos, menos para los que deben plata.",
  "Asel, aflojale a los videos de 'sorpresas'.",
  "Buendicioooones!!",
  "Los te ka emeee.",
  "BORJA LA CONCHA DE TU MADRE!",
  "Bello día para que Alexis se pague la coca...",
  "Poing devolveme la plata que me debés.",
  "Nano, acá te va un chiste:",
  "Asel, soltá el Tinder de trabas un rato y leé esto.",
  "Puro, dejá de hacerte el misterioso.",
  "German, activá que te estamos esperando.",
  "Marce, ¿hoy se labura o se hace facha?",
  "Dyno, reportándose desde la estratósfera.",
  "Un saludo a todos, menos a Borja.",
  "¿Alguien vio a Asel? Dicen que se fue con un camión con acoplado.",
  "Alexis, sigo esperando la coca, rata inmunda.",
  "Poing, cada día que pasa los intereses suben.",
  "Nano, confirmame si este chiste rompe producción.",
  "Atención, llegó la alegría (y no es el sueldo).",
  "Asel, guardá la peluca y prestá atención.",
  "Puro humo este grupo, igual los quiero.",
  "German, ¿seguís vivo o te secuestraron?",
  "Marce, largá la pala un rato.",
  "Dyno, dejá de jugar y mirá esto.",
  "Basta de amores, que vuelva el fútbol.",
  "Si Alexis paga la coca, mañana nieva.",
  "Poing, acepto Mercado Pago, Transferencia o USDT.",
  "Asel, me dijeron que te vieron en la zona roja buscando ofertas.",
  "Che, ¿quién le dio admin a Nano?",
  "Puro, no te hagas el sordo que te estoy hablando.",
  "German, aparecé que no cobramos entrada.",
  "Marce, sos la luz de mis ojos (mentira, pagame).",
  "Dyno, ¿ese lag es mental o de internet?",
  "Hoy es un buen día para que Borja haga un gol (o se vaya).",
  "Asel, con ese criterio mejor dedicate a la cría de caniches.",
  "Alexis, la billetera no muerde, usala.",
  "Poing, moroso incobrable.",
  "Nano, ¿esto compila o explota?",
  "Bendiciones para todos, menos para los que deben plata.",
  "Asel, aflojale a los videos de 'sorpresas'.",
  "Puro, ¿estás ahí o sos un bot?",
  "German, te extrañamos (dijo nadie nunca).",
];

// ============================================================
// EJECUCIÓN PRINCIPAL
// ============================================================

async function run() {
  console.log("🚀 [Inicio] Ejecutando discord-sender.js...");
  console.log(`🕐 [Hora] UTC: ${new Date().toISOString()}`);

  const currentHour = getArgentinaHour();
  const morning = isMorningTurn(currentHour);

  console.log(
    `🇦🇷 [Hora] Argentina (ART): ${currentHour}:00 — Turno: ${morning ? "MAÑANA (11:00)" : "TARDE (15:00)"}`,
  );

  // ── Chiste (solo turno mañana) ──────────────────────────
  let randomJoke = null;
  if (morning) {
    randomJoke = getRandomJoke();
  } else {
    console.log("ℹ️ [Chistes] Turno tarde → no se incluye chiste.");
  }

  // ── Clima (jitter + retry en paralelo) ──────────────────
  console.log("🌤️ [Clima] Iniciando consultas de clima...");
  const [weatherPosadas, weatherCABA] = await Promise.all([
    getWeather(WEATHER_URL_POSADAS, "Posadas"),
    getWeather(WEATHER_URL_CABA, "Buenos Aires"),
  ]);

  // ── GIF basado en temperatura de Posadas ────────────────
  const tempPosadas = weatherPosadas.temp;
  console.log(
    `🌡️ [Temperatura] Posadas: ${tempPosadas !== null ? tempPosadas + "°C" : "No disponible"} — ${weatherPosadas.description}`,
  );

  const giphyTag = getGiphyTagByTemperature(tempPosadas);
  console.log(`🏷️ [Giphy] Tag seleccionado por temperatura: "${giphyTag}"`);

  const gifUrl = await getRandomGifUrl(giphyTag);

  // ── Saludo y color ──────────────────────────────────────
  const timeGreeting =
    currentHour < 12
      ? "Buen día"
      : currentHour < 20
        ? "Buenas tardes"
        : "Buenas noches";

  const embedColor = morning ? COLOR_CELESTE : COLOR_PURPURA;
  console.log(
    `🎨 [Embed] Color: ${morning ? "Celeste (#33ccff)" : "Púrpura (#9933ff)"} → ${embedColor}`,
  );

  const randomPhrase =
    customGreetings[Math.floor(Math.random() * customGreetings.length)];

  // ── Construir embed ─────────────────────────────────────
  const description = randomJoke
    ? `### ${randomJoke.setup}\n${randomJoke.punchline}\n\n━━━━━━━━━━━━━━━━━━━━`
    : "━━━━━━━━━━━━━━━━━━━━";

  const embedMessage = {
    embeds: [
      {
        title: `${timeGreeting}, ${randomPhrase}`,
        description,
        color: embedColor,
        ...(gifUrl ? { image: { url: gifUrl } } : {}),
        fields: [
          {
            name: "📍 Posadas",
            value: tempPosadas !== null
              ? `\`${tempPosadas}°C\` ${weatherPosadas.description}`
              : `\`${weatherPosadas.description}\``,
            inline: true,
          },
          {
            name: "📍 Buenos Aires",
            value: weatherCABA.temp !== null
              ? `\`${weatherCABA.temp}°C\` ${weatherCABA.description}`
              : `\`${weatherCABA.description}\``,
            inline: true,
          },
        ],
      },
    ],
  };

  // ── Enviar a Discord ────────────────────────────────────
  console.log("📤 [Discord] Enviando mensaje al webhook...");

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embedMessage),
    });

    console.log(`📊 [Discord] Webhook status: HTTP ${response.status} ${response.statusText}`);

    if (response.ok) {
      console.log(
        `✅ [Discord] Mensaje enviado con éxito (HTTP ${response.status}).`,
      );
    } else {
      const body = await response.text();
      console.error(
        `❌ [Discord] Error: HTTP ${response.status} ${response.statusText}`,
      );
      console.error(`❌ [Discord] Body: ${body}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ [Discord] Error de red: ${error.message}`);
    process.exit(1);
  }
}

run();
