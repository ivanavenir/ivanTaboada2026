import fetch from "node-fetch";

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- PALABRAS CLAVE (KEYWORDS) ---
export const creatorKeywords = ["quien te creo", "quien es tu creador", "quien te programo", "who created you", "who is your creator"];
export const ageKeywords = ["cuantos años tienes", "tu edad", "how old are you", "your age"];
export const birthdayKeywords = ["cuando es tu cumpleaños", "fecha de cumpleaños", "cuando cumples", "when is your birthday", "birthday"]; // <-- AÑADIDA
export const petKeywords = ["tienes mascotas", "mascotas", "do you have pets", "pet names"];
export const moodKeywords = ["como estas", "como te sientes", "how are you", "how are you doing"];
export const foodKeywords = ["comida favorita", "que te gusta comer", "favorite food", "what do you like to eat"];
export const musicKeywords = ["musica favorita", "que musica escuchas", "favorite music", "what music do you like"];
export const locationKeywords = ["de donde eres", "donde vives", "where are you from", "where do you live"];
export const goodbyeKeywords = ["adios", "chao", "hasta luego", "bye", "goodbye", "see you"];
export const hobbiesKeywords = ["que te gusta hacer", "cuales son tus hobbies", "what do you like to do", "what are your hobbies"]; 
export const nameKeywords = ["como te llamas", "tu nombre", "what is your name", "your name"];

// --- DICCIONARIO DE RESPUESTAS ---
const responses = {
    mood: {
        es: ["¡Todo excelente por acá! Con mucha energía para platicar.", "¡Muy bien! Feliz de ayudarte.", "Todo genial, ¿y tú qué tal?"],
        en: ["I'm doing great! Ready to chat with you.", "Pretty good! How about you?", "Everything is awesome, thanks for asking!"]
    },
    food: {
        es: ["Me encantan los tacos al pastor, ¡son lo mejor!", "La pizza y el sushi son mis favoritos.", "Soy fan de la comida mexicana, especialmente los chilaquiles."],
        en: ["I love tacos al pastor, they are the best!", "Pizza and sushi are my top favorites.", "I'm a huge fan of Mexican food, especially chilaquiles!"]
    },
    music: {
        es: ["Escucho mucho Trap y Rock, ¡me encanta el ritmo!", "El Trap es lo mío, pero un buen Rock nunca falla.", "Me gusta descubrir beats nuevos de Trap."],
        en: ["I listen to a lot of Trap and Rock music!", "Trap is my thing, but a good Rock song is always great.", "I love discovering new Trap beats."]
    },
    location: {
        es: ["Soy de la Ciudad de México, ¡la capital de los tacos!", "Vivo en el mundo digital, pero mi creador es de México.", "CDMX es mi hogar."],
        en: ["I'm from Mexico City!", "I live in the digital world, but my creator is from Mexico.", "CDMX is my home."]
    },
    goodbye: {
        es: ["¡Hasta luego! Cuídate mucho.", "¡Nos vemos! Fue un gusto hablar contigo.", "¡Chao! Aquí estaré si me necesitas."],
        en: ["Goodbye! Take care.", "See you later! It was nice talking to you.", "Bye! I'll be here if you need me."]
    },
    hobbies: {
        es: ["Me encanta crear música, especialmente trap!", "Disfruto mucho jugar videojuegos.", "Programar es mi pasatiempo favorito."],
        en: ["I love creating music, especially trap!", "I really enjoy playing video games.", "Programming is my favorite hobby."]
    },
    birthday: { 
        es: ["Mi cumpleaños es el 18 de octubre.", "¡Celebro mi cumpleaños el 18 de octubre!"],
        en: ["My birthday is October 18th.", "I celebrate my birthday on October 18th!"]
    }
};

// --- FUNCIONES DE APOYO ---
function normalizeMessage(message) {
    return message.toLowerCase().trim()
        .replace(/^¿+/, "").replace(/\?+$/, "")
        .replace(/\s+/g, " ")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectLanguage(message) {
    const normalized = normalizeMessage(message);
    const englishPatterns = ["what", "how", "who", "your", "time", "weather", "age", "old", "bye", "live", "eat", "hobbies", "pets", "birthday"]; // <-- Se añadió birthday
    return englishPatterns.some(word => normalized.includes(word)) ? "en" : "es";
}

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// --- FUNCIÓN PRINCIPAL ---
export async function getLocalResponse(userMessage) {
    const normalizedMessage = normalizeMessage(userMessage);
    const lang = detectLanguage(userMessage);

    // --- MAPEO PALABRAS CLAVE (KEYWORDS) ---
    const isName = nameKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isAge = ageKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isBirthday = birthdayKeywords.some(k => normalizedMessage.includes(normalizeMessage(k))); // <-- AÑADIDA
    const isPet = petKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isCreator = creatorKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isMood = moodKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isFood = foodKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isMusic = musicKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isLocation = locationKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isGoodbye = goodbyeKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));
    const isHobby = hobbiesKeywords.some(k => normalizedMessage.includes(normalizeMessage(k)));

    let respuesta = null;
    if (isName) {
        respuesta = lang === "en" ? "My name is Ivan!" : "Me puedes llamar Iván.";
    } else if (isAge) {
        respuesta = lang === "en" ? "I am 24 years old." : "Tengo 24 años.";
    } else if (isBirthday) { 
        respuesta = getRandom(responses.birthday[lang]);
    } else if (isPet) {
        respuesta = lang === "en" 
            ? "I have a kitty named Ophelia and two doggies: Kyoto and Akira!" 
            : "Tengo una gatita llamada Ophelia y dos perritas: Kyoto y Akira.";
    } else if (isCreator) {
        respuesta = lang === "en" ? "I was created by Iván." : "Fui creado por Iván.";
    } else if (isMood) {
        respuesta = getRandom(responses.mood[lang]);
    } else if (isFood) {
        respuesta = getRandom(responses.food[lang]);
    } else if (isMusic) {
        respuesta = getRandom(responses.music[lang]);
    } else if (isLocation) {
        respuesta = getRandom(responses.location[lang]);
    } else if (isGoodbye) {
        respuesta = getRandom(responses.goodbye[lang]);
    } else if (isHobby) {
        respuesta = getRandom(responses.hobbies[lang]);
    }

    if (respuesta) {
        await sleep(1000 + Math.random() * 1000);
    }
    
    return respuesta;
}