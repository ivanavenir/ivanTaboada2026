// /api/chat.js
import { getLocalResponse } from './localResponses.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa el cliente con tu API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    const userMessage = (req.body.message || "").trim();
    if (!userMessage) {
      return res.status(400).json({ text: "Por favor escribe un mensaje." });
    }

    console.log("Mensaje recibido:", userMessage);

    // Respuesta local primero
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) {
      console.log("Respuesta local:", localResponse);
      return res.status(200).json({ text: localResponse });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("API key de Gemini no configurada");
      return res.status(500).json({ text: "API key de Gemini no configurada" });
    }

    console.log("Enviando mensaje a Gemini 3.0 Flash usando SDK...");

    // Obtenemos el modelo generativo
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    // Generamos contenido
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = await response.text(); // Devuelve la respuesta en texto plano

    console.log("Respuesta de Gemini:", text);
    res.status(200).json({ text });

  } catch (error) {
    console.error("Hubo un error al conectar con Gemini:", error);
    res.status(500).json({ text: `Error al conectar con Gemini: ${error.message}` });
  }
}