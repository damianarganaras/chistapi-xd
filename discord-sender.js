const fs = require("fs");
const path = require("path");

// URL del Webhook desde variable de entorno (GitHub Secrets)
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

if (!DISCORD_WEBHOOK_URL) {
  console.error("Error: No se encontró la variable DISCORD_WEBHOOK");
  process.exit(1);
}

// 1. Leer y parsear el CSV
const csvPath = path.join(__dirname, "jokes.csv");
const data = fs.readFileSync(csvPath, "utf8");
const lines = data.split("\n").filter((line) => line.trim() !== "");
const jokes = lines.slice(1).map((line) => {
  const parts = line.split("|");
  return { setup: parts[1], punchline: parts[2] };
});

// 2. Elegir chiste al azar
const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

// 3. Lógica de saludos e insultos (Tu lógica de Zapier mejorada)
const currentHour = new Date().getHours(); // Ojo: La hora en GitHub Actions suele ser UTC
let timeGreeting = "Buenas"; // Genérico porque UTC varía

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

// 4. Formatear mensaje para Discord
// Discord usa **negrita** igual que Markdown estándar
const messageContent = `${timeGreeting}, ${randomPhrase}\n\n**${randomJoke.setup}**\n${randomJoke.punchline}`;

// 5. Enviar a Discord (Fetch nativo en Node 18+)
async function sendToDiscord() {
  try {
    const response = await fetch(`https://discord.com/api/webhooks/1473028443972305043/h9xej66w_KYtRPOXmlbI_XbtBpFLYj2vpJzvwgPVgvKhdLBEht0j7VIHD2dRJVHjQ5e8`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: messageContent }),
    });

    if (response.ok) {
      console.log("Mensaje enviado a Discord con éxito.");
    } else {
      console.error("Error al enviar a Discord:", response.statusText);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error de red:", error);
    process.exit(1);
  }
}

sendToDiscord();
