import { getLocalResponse } from './localResponses.js';
import OpenAI from "openai";

// --- LOGICA API GROQ ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("Error: La variable GROQ_API_KEY no está definida.");
    return res.status(500).json({ text: "Error de configuración: API Key no encontrada." });
  }

  const client = new OpenAI({
    apiKey: apiKey,
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

// --- CONSULTA A GROQ PARA OPTIMIZAR RESPUESTAS ---
    const chatCompletion = await client.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "Eres un asistente inteligente, amable y conciso. " +
                   "Responde siempre de forma clara y directa, usando un máximo de 2 o 3 párrafos cortos. " +
                   "Evita explicaciones innecesariamente largas o repetitivas, y asegúrate de concluir tu idea por completo." 
        },
        { role: "user", content: userMessage }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6, 
      max_tokens: 350, 
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("Respuesta vacía de la IA.");
    }

    return res.status(200).json({ text: aiResponse });

  } catch (error) {
    console.error("Error detallado:", error);

    if (error.status === 413 || error.status === 429) {
      return res.status(429).json({ text: "Límite de mensajes alcanzado. Intenta en un momento." });
    }

    return res.status(500).json({ 
      text: "Hubo un error al conectar con el servicio de IA.",
      debug: error.message 
    });
  }
}