import { getLocalResponse } from './localResponses.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Inicialización fuera del handler para optimizar el rendimiento (warm starts)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Solo permitimos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    // Validar que el mensaje no esté vacío
    if (!userMessage) {
      return res.status(400).json({ text: "Por favor, escribe un mensaje válido." });
    }

    // 2. Lógica de Respuesta Local (FAQ o comandos internos)
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) {
      console.log("Respuesta servida desde archivo local.");
      return res.status(200).json({ text: localResponse, source: 'local' });
    }

    // 3. Validación de la API Key
    if (!process.env.GEMINI_API_KEY) {
      console.error("ERROR: No se encontró la variable GEMINI_API_KEY.");
      return res.status(500).json({ text: "Error de configuración en el servidor (Falta API Key)." });
    }

    // 4. Configuración del modelo
    // Usamos 'gemini-1.5-flash' que es el más compatible con el tier gratuito
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1000,
      },
    });

    console.log("Enviando consulta a Google Gemini...");

    // 5. Generar contenido
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    
    // El método .text() es una función, asegúrate de llamarla así:
    const text = response.text();

    if (!text) {
      throw new Error("La IA devolvió una respuesta vacía.");
    }

    console.log("Respuesta recibida exitosamente.");

    // 6. Respuesta final al cliente
    return res.status(200).json({ 
      text: text,
      source: 'ai' 
    });

  } catch (error) {
    console.error("Error detallado en Chat API:", error);

    // Manejo de errores específicos
    if (error.status === 404) {
      return res.status(404).json({ 
        text: "Error: El modelo de Google no fue encontrado. Verifica el nombre del modelo en el código." 
      });
    }

    if (error.status === 429) {
      return res.status(429).json({ 
        text: "Has alcanzado el límite de mensajes gratuitos. Intenta de nuevo en unos instantes." 
      });
    }

    return res.status(500).json({ 
      text: "Hubo un problema al procesar tu mensaje. Inténtalo de nuevo." 
    });
  }
}