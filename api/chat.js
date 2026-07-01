import { getLocalResponse } from './localResponses.js';
import OpenAI from "openai";

// --- FUNCION AUXILIAR OPENWEATHER ---
async function getOpenWeatherData(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) return null;
    const { lat, lon, name, state } = geoData[0];
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${apiKey}`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();

    return {
      location: `${name}${state ? `, ${state}` : ""}`,
      temp: Math.round(weatherData.main.temp),
      description: weatherData.weather[0].description,
      humidity: weatherData.main.humidity
    };
  } catch (err) {
    console.error("Error en OpenWeather:", err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({ text: "Error de configuración: Groq API Key no encontrada." });
  }

  const client = new OpenAI({
    apiKey: groqApiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ text: "Escribe un mensaje para continuar." });
    }

    // --- RESPUESTAS LOCALES ---
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) {
      return res.status(200).json({ text: localResponse });
    }

    // --- DETECTAR SOLICITUD DE CLIMA ---
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes("clima") || lowerMsg.includes("temperatura") || lowerMsg.includes("weather")) {
      let city = "CDMX"; 
      const match = userMessage.match(/(?:en|de|por)\s+([a-zA-Z\s]+)/i);
      if (match && match[1]) {
        city = match[1].trim();
      }

      const weatherInfo = await getOpenWeatherData(city);

      if (weatherInfo) {
        const chatCompletion = await client.chat.completions.create({
          messages: [
            { 
              role: "system", 
              content: "Eres un asistente meteorológico amigable. El usuario te ha pedido el clima y el sistema ha obtenido estos datos reales en tiempo real:\n" +
                       `Ubicación: ${weatherInfo.location}\n` +
                       `Temperatura: ${weatherInfo.temp}°C\n` +
                       `Condición: ${weatherInfo.description}\n` +
                       `Humedad: ${weatherInfo.humidity}%\n\n` +
                       "Redacta una respuesta breve, natural y conversacional en español usando estos datos."
            },
            { role: "user", content: userMessage }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.6, 
          max_tokens: 150, 
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content;
        return res.status(200).json({ text: aiResponse });
      }
    }

    // --- CONSULTA ESTÁNDAR A GROQ ---
    const chatCompletion = await client.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "Eres un asistente inteligente, amable y conciso. Responde en 2 o 3 párrafos cortos." 
        },
        { role: "user", content: userMessage }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6, 
      max_tokens: 350, 
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    return res.status(200).json({ text: aiResponse });

  } catch (error) {
    console.error("Error detallado:", error);
    return res.status(500).json({ text: "Hubo un error al procesar tu mensaje." });
  }
}