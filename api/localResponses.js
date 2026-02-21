import fetch from "node-fetch";

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Palabras clave
export const spanishKeywords = [
    "cómo te llamas", "como te llamas", "cual es tu nombre", "tu nombre",
    "como te llaman", "como te dicen", "quién eres", "quien eres", "tu nombre es",
    "me puedes decir tu nombre"
];

export const englishKeywords = [
    "what's your name", "what is your name", "your name", "what are you called",
    "what do they call you", "who are you", "your name is", "can you tell me your name"
];

export const timeKeywords = [
    "qué hora es", "me puedes decir la hora", "hora actual", "dame la hora", "cual es la hora",
    "la hora", "qué hora tenemos", "puedes decirme la hora", "hora por favor", "me dices la hora",
    "sabes la hora", "qué hora tienes", "qué hora son",
    "what time is it", "current time", "tell me the time", "the time",
    "can you tell me the time", "time now", "what's the time", "do you know the time", "give me the time"
];

export const weatherKeywords = [
    "qué temperatura hace", "cómo está el clima", "temperatura actual", "la temperatura", "qué clima hace",
    "cómo está el tiempo", "dime la temperatura", "dame la temperatura", "dame el clima", "dime el clima",
    "sabes la temperatura", "sabes el clima", "temperatura por favor", "clima actual", "qué temperatura hay",
    "current temperature", "what's the weather", "how's the weather", "the weather", "weather now",
    "current weather", "what's the temperature", "give me the weather", "give me the temperature",
    "temperature now", "tell me the temperature"
];

export const dateKeywords = [
    "qué día es", "qué fecha es", "dame la fecha", "cual es la fecha",
    "today's date", "what is the date", "give me the date", "current date"
];

export const hobbiesKeywords = [
    "qué te gusta hacer", "cuáles son tus hobbies", "qué haces en tu tiempo libre", "qué te gusta",
    "qué te entretiene", "cómo pasas tu tiempo libre", "qué actividades disfrutas", "qué haces para divertirte",
    "tienes algún hobby", "qué hobbies tienes", "qué haces cuando estás libre", "qué te apasiona",
    "qué te interesa hacer", "qué te gusta hacer en tu tiempo libre", "qué aficiones tienes",
    "what do you like to do", "what are your hobbies", "what do you do in your free time",
    "what do you enjoy", "how do you spend your free time", "what activities do you like",
    "what do you do for fun", "do you have any hobbies", "what hobbies do you have",
    "what do you like doing", "what interests you", "what are you passionate about",
    "what do you enjoy doing", "what do you like to do in your free time", "what are your favorite activities"
];

export const petKeywords = [
    "tienes mascotas", "tienes mascota", "como se llama tu mascota", "como se llaman tus mascotas",
    "tienes perro", "tienes gato", "tus mascotas", "nombre de tus mascotas", "nombres de tus mascotas",
    "do you have pets", "pet names", "your pets", "what are your pets called"
];

const hobbiesResponses = [
    "Me encanta crear música, ¡especialmente trap y rock!",
    "Disfruto mucho jugar videojuegos, sobre todo los de estrategia y narrativa.",
    "Me apasiona el arte, la música y la tecnología.",
    "Programar es uno de mis pasatiempos favoritos, siempre me gusta aprender cosas nuevas.",
    "Me gusta tocar instrumentos y componer canciones cuando tengo tiempo libre.",
    "Exploro videojuegos indie porque me encanta descubrir nuevas experiencias.",
    "Pinto y dibujo en mis ratos libres, es una forma de expresarme.",
    "Siempre estoy aprendiendo nuevas tecnologías y practicando programación.",
    "Me encanta asistir a conciertos y descubrir música nueva de distintos géneros.",
    "Juego videojuegos online con amigos, especialmente juegos de aventura y rol.",
    "Disfruto mucho diseñar y crear arte digital en mi tiempo libre.",
    "Me gusta mezclar música y experimentar con distintos sonidos y efectos.",
    "Programar proyectos personales es una de mis formas favoritas de pasar el tiempo.",
    "Me apasiona la música electrónica y aprender sobre producción musical.",
    "Me gustan los juegos retro... bueno de hace 10 años, jajaja como pasa el tiempo"
];

// Normalizar mensaje
function normalizeMessage(message) {
    return message.toLowerCase().trim()
        .replace(/^¿+/, "")
        .replace(/\?+$/, "")
        .replace(/\s+/g, " ")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Extraer ciudad
function extractCity(message) {
    const regex = /en\s+([a-zA-ZÀ-ÿ\s]+)/i;
    const match = message.match(regex);
    if (match && match[1]) return match[1].trim();
    return "Mexico City";
}

// Detectar idioma
function detectLanguage(message) {
    const normalized = normalizeMessage(message);
    const englishWords = ["what", "weather", "temperature"];
    return englishWords.some(word => normalized.includes(word)) ? "en" : "es";
}

// Función principal
export async function getLocalResponse(userMessage) {
    const normalizedMessage = normalizeMessage(userMessage);
    const lang = detectLanguage(userMessage);

    const isSpanishName = spanishKeywords.some(keyword => normalizedMessage.includes(normalizeMessage(keyword)));
    const isEnglishName = englishKeywords.some(keyword => normalizedMessage.includes(normalizeMessage(keyword)));
    const isTime = timeKeywords.some(keyword => normalizedMessage.includes(normalizeMessage(keyword)));
    const isWeather = weatherKeywords.some(keyword => new RegExp(`\\b${normalizeMessage(keyword)}\\b`).test(normalizedMessage));
    const isDate = dateKeywords.some(keyword => normalizedMessage.includes(normalizeMessage(keyword)));
    const isHobby = hobbiesKeywords.some(keyword => normalizedMessage.includes(normalizeMessage(keyword)));

    let respuesta = null;

    // Nombre
    if (isSpanishName) {
        const respuestas = [
            "Me gusta que me digan Iván",
            "Puedes llamarme Iván, suena bien, ¿no crees?",
            "Me conocen como Iván",
            "Me puedes llamar Iván"
        ];
        respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    }
    if (isEnglishName) {
        const respuestas = [
            "You can call me Ivan, sounds nice, right?",
            "People know me as Ivan",
            "My name is Ivan"
        ];
        respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    }

    // Hora
    if (isTime) {
        const now = new Date();
        const options = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' };
        respuesta = lang === "en" ?
            `The current time is ${new Intl.DateTimeFormat('en-US', options).format(now)}` :
            `La hora actual es ${new Intl.DateTimeFormat('es-ES', options).format(now)}`;
    }

    // Fecha
    if (isDate) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' };
        respuesta = lang === "en" ?
            `Today's date is ${new Intl.DateTimeFormat('en-US', options).format(now)}` :
            `La fecha de hoy es ${new Intl.DateTimeFormat('es-ES', options).format(now)}`;
    }

    if (isPet) {
        if (lang === "en") {
            respuesta = "I have a kitty named Ophelia and two doggies named Kyoto and Akira!";
        } else {
            const respuestas = [
                "¡Sí! Tengo una gatita que se llama Ophelia y dos perritas que se llaman Kyoto y Akira.",
                "Mis compañeras son Ophelia (mi gatita) y mis dos perritas, Kyoto y Akira.",
                "Tengo tres: la gatita Ophelia y mis dos perritas Kyoto y Akira. ¡Son adorables!"
            ];
            respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
        }
    }

    // Hobbies
    if (isHobby) {
        respuesta = hobbiesResponses[Math.floor(Math.random() * hobbiesResponses.length)];
    }

    // Clima
    if (isWeather) {
        try {
            const apiKey = process.env.OPENWEATHER_API_KEY;
            const city = extractCity(userMessage);
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=${lang}`;
            const weatherRes = await fetch(url);
            const data = await weatherRes.json();

            if (data?.main?.temp != null) {
                const temp = Math.round(data.main.temp);
                respuesta = lang === "en" ?
                    `The current temperature in ${city} is ${temp}°C` :
                    `La temperatura actual en ${city} es ${temp}°C`;
            } else {
                respuesta = lang === "en" ?
                    "I couldn't get the temperature" :
                    "No pude obtener la temperatura";
            }
        } catch (err) {
            console.error("Error obteniendo el clima:", err);
            respuesta = lang === "en" ?
                "I couldn't get the temperature" :
                "No pude obtener la temperatura";
        }
    }

    // Delay aleatorio
    if (respuesta) {
        await sleep(1000 + Math.random() * 1000);
    }

    return respuesta;
}
