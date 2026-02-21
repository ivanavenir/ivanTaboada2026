import { getLocalResponse } from './localResponses.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa el cliente fuera del handler para reutilizar la instancia en "warm starts"
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // 1. Validación de Método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ text: "El mensaje no puede estar vacío." });
    }

    // 2. Lógica de Respuesta Local (Caché/FAQ interna)
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) {
      return res.status(200).json({ text: localResponse, source: 'local' });
    }

    // 3. Validación de API Key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Configuración incompleta: GEMINI_API_KEY ausente.");
    }

    // 4. Configuración del Modelo Gemini
    // Usamos 'gemini-1.5-flash' o 'gemini-3.0-flash' según disponibilidad
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash", // O "gemini-2.0-flash" si ya migraste
      generationConfig: {
        temperature: 0.7, // Balance entre creatividad y precisión
        topP: 0.95,
        maxOutputTokens: 800,
      },
    });

    // 5. Llamada a la IA
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    
    // Verificación de seguridad (Safety Check)
    if (response.promptFeedback?.blockReason) {
      return res.status(400).json({ 
        text: "Lo siento, no puedo responder a eso por políticas de seguridad." 
      });
    }

    const text = response.text();

    // 6. Respuesta Exitosa
    return res.status(200).json({ 
      text: text,
      source: 'ai' 
    });

  } catch (error) {
    console.error("Error en Chat API:", error);
    
    // Diferenciar errores de cuota (Rate Limit) de errores internos
    const statusCode = error.message.includes('429') ? 429 : 500;
    const errorMsg = statusCode === 429 
      ? "Límite de mensajes alcanzado. Intenta de nuevo en un minuto."
      : "Error interno al procesar tu solicitud.";

    return res.status(statusCode).json({ text: errorMsg });
  }
}