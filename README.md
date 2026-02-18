# Trabot

[![Workflow Status](https://github.com/<OWNER>/<REPO>/actions/workflows/cron-joke.yml/badge.svg)](https://github.com/<OWNER>/<REPO>/actions/workflows/cron-joke.yml)  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()  [![Node.js Version](https://img.shields.io/badge/node-20.x-brightgreen)]()

Automatización simple para enviar mensajes enriquecidos a Discord usando GitHub Actions (cron). Trabot publica saludos, reportes de clima y GIFs — con lógica temporal y logging detallado.

---

## ✨ Funcionalidades principales

- Lectura de base de datos de chistes desde `jokes.csv` (CSV pipe-delimited).
- Reporte de clima para **Posadas** y **Buenos Aires (CABA)** usando `wttr.in` (métrico forzado: `&m`).
- Integración con **Giphy** para enviar GIFs seleccionados según la sensación térmica.
- Sistema de **logs detallados** que registra: inicio, lectura CSV (cantidad cargada), peticiones de clima (URLs + intentos), respuestas de Giphy y estado del envío a Discord.
- Protección contra bloqueos en wttr.in: jitter aleatorio (1–15s) + retry (reintenta 1 vez con 5s de espera).

---

## ⚙️ Lógica de ejecución

- Cron jobs en GitHub Actions ejecutan `discord-sender.js` en dos turnos:
  - **11:00 ART (turno mañana)** → Mensaje completo: *Saludo + Chiste + Clima + GIF + línea separadora*.
  - **15:00 ART (turno tarde)** → Mensaje reducido: *Saludo + Clima + GIF + línea separadora* (el chiste NO se envía).

- Extracción de temperatura desde la respuesta de Posadas y mapeo a tags de Giphy:
  - ≤ 0°C → `congelado gracioso`
  - < 10°C → `frio gracioso`
  - 10–20°C → `fresco gracioso`
  - 20–30°C → `clima perfecto`
  - 30–40°C → `calor gracioso`
  - > 40°C → `infierno gracioso`

- Embed color dinámico:
  - Mañana → celeste `#33ccff` (decimal `3394815`)
  - Tarde → púrpura `#9933ff` (decimal `10040319`)

---

## 🔌 Configuración (Secrets / Variables de entorno)

| Variable | Requerido | Descripción | Ejemplo |
|---|---:|---|---|
| `DISCORD_WEBHOOK` | ✅ | URL del webhook de Discord donde se publican los embeds | `https://discord.com/api/webhooks/...` |
| `GIPHY_API_KEY` | ❌ recomendado | API Key de Giphy (si no está, se enviará mensaje sin GIF) | `AbCdEfGh12345` |

> Añadir los secrets en GitHub: Repository → Settings → Secrets and variables → Actions.

---

## 🚀 Cómo ejecutar localmente

PowerShell (Windows):

```powershell
$env:DISCORD_WEBHOOK = "<tu_webhook>"
$env:GIPHY_API_KEY = "<tu_giphy_key>" # opcional
node discord-sender.js
```

Bash (Linux / macOS):

```bash
export DISCORD_WEBHOOK="<tu_webhook>"
export GIPHY_API_KEY="<tu_giphy_key>" # opcional
node discord-sender.js
```

---

## 📁 Archivos importantes

- `discord-sender.js` — código principal (lector CSV, llamadas wttr.in, Giphy, envío a Discord).
- `jokes.csv` — DB de chistes (formato: `id|setup|punchline`).
- `.github/workflows/cron-joke.yml` — cron jobs que ejecutan el script.

---

## 🛠️ Troubleshooting rápido

- Error: **DISCORD_WEBHOOK no configurado** → Verifica que `DISCORD_WEBHOOK` esté en Secrets.
- Si `wttr.in` devuelve `N/A`, el script reintenta una vez; si persiste, el campo de clima mostrará `N/A` y el proceso continúa.
- Si no aparece GIF, revisa `GIPHY_API_KEY` o los límites de la API de Giphy.

---

## 🧩 Notas para desarrolladores

- Jitter y retry agregados para reducir probabilidad de bloqueos por peticiones masivas a `wttr.in`.
- Conversión de colores hex → decimal ya aplicada en `discord-sender.js` (Discord usa enteros para color).
- Los logs permiten auditar cada paso desde GitHub Actions (output del job).

---

## 📝 Licencia

MIT — ver `package.json`.

---

Si querés, puedo añadir instrucciones para desplegarlo en un contenedor o mejorar los tests. ¿Querés que lo haga?