// /api/chat.js
import { getLocalResponse } from './localResponses.js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Método no permitido' });
        }

        //Recibir y limpiar mensaje
        const userMessage = (req.body.message || "").trim();
        if (!userMessage) {
            return res.status(400).json({ text: "Por favor escribe un mensaje." });
        }

        console.log("Mensaje recibido:", userMessage);

        //Verificar primero la respuesta local (nombre, hora, clima)
        const localResponse = await getLocalResponse(userMessage);
        if (localResponse) {
            console.log("Respuesta local detectada:", localResponse);
            return res.status(200).json({ text: localResponse });
        }

        // Validar que la API key exista
        if (!process.env.OPENAI_API_KEY) {
            console.error("API key de OpenAI no configurada");
            return res.status(500).json({ text: "API key de OpenAI no configurada" });
        }

        //Si no hay respuesta local, enviar a OpenAI
        console.log("No se detectó respuesta local, enviando a OpenAI...");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Eres un asistente útil y amable." },
                    { role: "user", content: userMessage },
                ],
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error HTTP de OpenAI:", response.status, errorText);
            return res.status(500).json({ text: `Error de OpenAI: ${errorText}` });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "No tengo respuesta";

        console.log("Respuesta de OpenAI:", text);
        res.status(200).json({ text });

    } catch (error) {
        console.error("Error interno del servidor:", error);
        res.status(500).json({ text: `Error interno del servidor: ${error.message}` });
    }
}