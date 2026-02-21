import { getLocalResponse } from './localResponses.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Forzamos la inicialización limpia
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requerido' });

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    if (!userMessage) return res.status(400).json({ text: "Mensaje vacío" });

    // Respuesta local
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) return res.status(200).json({ text: localResponse });

    // 2. CAMBIO CLAVE: Usamos el nombre base del modelo 
    // Si 'gemini-1.5-flash-latest' falla con 404, el nombre estándar es 'gemini-1.5-flash'
    // En 2026, si ya existe Gemini 2, usa 'gemini-2.0-flash'
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    console.log("Intentando conectar con el modelo estable...");

    // 3. Estructura de llamada compatible con v1 estable
    const result = await model.generateContent(userMessage);
    
    // Verificación de la respuesta
    const response = result.response;
    const text = response.text();

    if (!text) throw new Error("Respuesta de IA vacía");

    return res.status(200).json({ text });

  } catch (error) {
    console.error("Error detectado:", error.message);

    // Si vuelve a dar 404, intentamos con el modelo Pro como último recurso
    if (error.message.includes("404")) {
        return res.status(404).json({ 
            text: "El modelo 'gemini-1.5-flash' no se encontró. Verifica en Google AI Studio si tu API Key tiene permisos para este modelo o si debes usar 'gemini-pro'." 
        });
    }

    return res.status(500).json({ text: "Error de conexión con la IA." });
  }
}