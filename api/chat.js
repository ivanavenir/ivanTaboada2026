import { getLocalResponse } from './localResponses.js';
import OpenAI from "openai";

// Inicializamos Groq usando la librería de OpenAI
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1", // Esto redirige a Groq
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST requerido' });

  try {
    const { message } = req.body;
    const userMessage = (message || "").trim();

    if (!userMessage) return res.status(400).json({ text: "Mensaje vacío" });

    // 1. Tu lógica local sigue funcionando igual
    const localResponse = await getLocalResponse(userMessage);
    if (localResponse) return res.status(200).json({ text: localResponse });

    // 2. Llamada a Groq (Usando Llama 3.1 70B o 3.3 70B)
    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: "user", content: userMessage }],
      model: "llama-3.1-70b-versatile", // El modelo gratuito más potente actualmente
      temperature: 0.7,
      max_tokens: 1024,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (!aiResponse) throw new Error("No se recibió respuesta de la IA.");

    return res.status(200).json({ text: aiResponse });

  } catch (error) {
    console.error("Error en Groq API:", error);
    
    return res.status(500).json({ 
      text: "Error al conectar con el cerebro de la IA. Inténtalo de nuevo." 
    });
  }
}