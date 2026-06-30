const form = document.querySelector("#chat-form");
const input = document.querySelector("#user-input");
const chatBox = document.querySelector("#chat-box");

// DETECTAR SI LA PETICION DEL USUARIO ES SOBRE EL CLIMA O TEMPERATURA
function normalizeWeatherMessage(message) {
  const lower = message.toLowerCase();
  if (
    lower.includes("clima") ||
    lower.includes("temperatura") ||
    lower.includes("weather") ||
    lower.includes("temperature")
  ) {
    if (lower.match(/[a-z]/)) { 
      return "the weather";
    } else {
      return "la temperatura";
    }
  }
  return message;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let message = input.value.trim();
  if (!message) return;

  // Guardamos el texto original para mostrarlo en la interfaz del usuario
  const originalMessage = message; 
  
  // Normalizamos el mensaje que se enviará a la API externa
  message = normalizeWeatherMessage(message);

  // Mostramos en pantalla lo que el usuario escribió originalmente
  addMessage("user", originalMessage); 
  input.value = "";

  try {
    // Apunta correctamente a tu ruta de la API en el backend
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    console.log("Respuesta del servidor:", data.text || data.error);

    addMessage("bot", data.text || data.error || "No tengo respuesta");
  } catch (err) {
    console.error("Error al enviar mensaje:", err);
    addMessage("bot", "Ocurrió un error al enviar tu mensaje");
  }
});

function addMessage(sender, text) {
  const div = document.createElement("div");
  div.className = sender;
  div.textContent = `${sender === "user" ? "USER:" : "IVÁN:"} ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}