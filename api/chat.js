// /api/chat.js
import { getLocalResponse } from './localResponses.js';
import fetch from 'node-fetch';

console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "OK" : "No definido");

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

        // Validar API key de Google Gemini
        if (!process.env.GEMINI_API_KEY) {
            console.error("API key de Gemini no configurada");
            return res.status(500).json({ text: "API key de Gemini no configurada" });
        }

        console.log("Enviando mensaje a Google Gemini...");

        // Llamada al endpoint de Google Generative Language
        const googleResponse = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateText?key=" +
            process.env.GEMINI_API_KEY,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: {
                        text: userMessage
                    },
                    // Opciones de máximo output
                    maxOutputTokens: 200
                }),
            }
        );

        if (!googleResponse.ok) {
            const errorText = await googleResponse.text();
            console.error("Error HTTP Gemini:", googleResponse.status, errorText);
            return res.status(500).json({ text: `Error de Gemini: ${errorText}` });
        }

        const data = await googleResponse.json();
        const text = data.candidates?.[0]?.outputText?.trim() || "No tengo respuesta";

        console.log("Respuesta de Gemini:", text);
        res.status(200).json({ text });

    } catch (error) {
        console.error("Error interno del servidor:", error);
        res.status(500).json({ text: `Error interno del servidor: ${error.message}` });
    }
}