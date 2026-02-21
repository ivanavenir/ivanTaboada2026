import { getLocalResponse } from './localResponses.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializamos el cliente. 
// Nota: El SDK de Google selecciona automáticamente la mejor versión de API (v1).
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // 1. Verificación de seguridad básica
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ text: "El mensaje está vacío." });
    }

    // 2. Prioridad: Respuestas locales (FAQ/Caché)
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) {
      return res.status(200).json({ text: localResponse });
    }

    // 3. Verificación de API Key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("La clave GEMINI_API_KEY no está configurada en las variables de entorno.");
    }

    // 4. Configuración del modelo - IMPORTANTE:
    // Usamos "gemini-1.5-flash-latest" para asegurar que apunte a la versión estable actual
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest" 
    });

    console.log("--- Iniciando consulta a Gemini 1.5 Flash ---");

    // 5. Generación de contenido con manejo de errores de red
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Google retornó una respuesta vacía.");
    }

    // 6. Éxito
    return res.status(200).json({ text });

  } catch (error) {
    // 7. Manejo robusto de errores
    console.error("Error en la API de Chat:", error.message);

    // Error 404: El modelo no existe o la ruta de la API cambió
    if (error.message.includes("404") || error.message.includes("not found")) {
      return res.status(404).json({
        text: "Error de configuración: El modelo de IA solicitado no está disponible. Por favor, contacta al administrador."
      });
    }

    // Error 429: Límite de cuota excedido (común en cuentas gratuitas)
    if (error.message.includes("429") || error.message.includes("quota")) {
      return res.status(429).json({
        text: "Demasiadas solicitudes. Por favor, espera un minuto antes de volver a intentarlo."
      });
    }

    // Error genérico
    return res.status(500).json({
      text: "Lo siento, hubo un error técnico al procesar tu mensaje."
    });
  }
}