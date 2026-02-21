import { getLocalResponse } from './localResponses.js';
import OpenAI from "openai";

export default async function handler(req, res) {
  // 1. Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 2. Forzar la lectura de tu variable específica
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("Error: La variable GROQ_API_KEY no está definida.");
    return res.status(500).json({ text: "Error de configuración: API Key no encontrada." });
  }

  // 3. Configuración manual del cliente para Groq
  const client = new OpenAI({
    apiKey: apiKey, // Aquí le pasamos tu variable directamente
    baseURL: "https://api.groq.com/openai/v1", // Importante para que no intente ir a OpenAI
  });

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ text: "Escribe un mensaje para continuar." });
    }

    // 4. Tu lógica de respuestas locales
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) {
      return res.status(200).json({ text: localResponse });
    }

    // 5. Consulta a Groq (Llama 3.3 es el modelo más balanceado y potente)
    const chatCompletion = await client.chat.completions.create({
      messages: [
        { role: "system", content: "Eres un asistente inteligente y amable." },
        { role: "user", content: userMessage }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("Respuesta vacía de la IA.");
    }

    return res.status(200).json({ text: aiResponse });

  } catch (error) {
    console.error("Error detallado:", error);

    // Manejo de cuotas o errores de API
    if (error.status === 413 || error.status === 429) {
      return res.status(429).json({ text: "Límite de mensajes alcanzado. Intenta en un momento." });
    }

    return res.status(500).json({ 
      text: "Hubo un error al conectar con el servicio de IA.",
      debug: error.message 
    });
  }
}