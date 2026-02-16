const fs = require("fs");
const path = require("path");

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK_URL) {
  console.error("Error: DISCORD_WEBHOOK no configurado.");
  process.exit(1);
}

async function getWeather(city) {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=%t+%C`;
    const response = await fetch(url);

    if (!response.ok) {
      return "N/A";
    }

    return (await response.text()).trim();
  } catch (error) {
    return "Error al obtener clima";
  }
}

function getRandomJoke() {
  const csvPath = path.join(__dirname, "jokes.csv");
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

  if (jokes.length === 0) {
    throw new Error("No se encontraron chistes válidos en jokes.csv");
  }

  return jokes[Math.floor(Math.random() * jokes.length)];
}

async function run() {
  const randomJoke = getRandomJoke();

  const [weatherPosadas, weatherCABA] = await Promise.all([
    getWeather("Posadas,Misiones"),
    getWeather("BuenosAires"),
  ]);

  const currentHour = (new Date().getUTCHours() - 3 + 24) % 24;
  const timeGreeting =
    currentHour < 12
      ? "Buenos días"
      : currentHour < 20
      ? "Buenas tardes"
      : "Buenas noches";

  const embedColor = currentHour >= 6 && currentHour < 20 ? 0x00b894 : 0x2d3436;

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

  const randomPhrase =
    customGreetings[Math.floor(Math.random() * customGreetings.length)];

  const embedMessage = {
    embeds: [
      {
        title: `${timeGreeting}, ${randomPhrase}`,
        description: `### ${randomJoke.setup}\n*${randomJoke.punchline}*`,
        color: embedColor,
        fields: [
          {
            name: "📍 Posadas",
            value: `\`${weatherPosadas}\``,
            inline: true,
          },
          {
            name: "📍 Buenos Aires",
            value: `\`${weatherCABA}\``,
            inline: true,
          },
        ],
        footer: {
          text: "Bot de Chistes Personalizado | 2026",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embedMessage),
    });

    if (response.ok) {
      console.log("Mensaje enviado con éxito.");
    } else {
      console.error("Error Discord:", response.status, response.statusText);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error de red:", error);
    process.exit(1);
  }
}

run();
