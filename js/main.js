document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("header");

  //CR
  let navWrap = header.querySelector(".wrap.nav");
  if (!navWrap) {
    navWrap = document.createElement("div");
    navWrap.classList.add("wrap", "nav");

    const inPages = window.location.pathname.includes("/pages/");

    //ENRUTAR LINKS
    const indexLink = inPages ? "../index.html" : "index.html";
    const proyectosLink = inPages ? "proyectos.html" : "pages/proyectos.html";
    const acercaLink = inPages ? "acerca.html" : "pages/acerca.html";
    const katoLink = inPages ? "sandbox.html" : "pages/sandbox.html";
    const chatLink = inPages ? "chatbot.html" : "pages/chatbot.html";
    const ezdawLink = inPages ? "ezdaw.html" : "pages/ezdaw.html";

    navWrap.innerHTML = `
      <div class="brand">
        <a href="${indexLink}" class="logo-link">
          <img src="${inPages ? '../' : ''}assets/img/ui/logo.svg" alt="logo" class="logo">
        </a>
        <div class="brand-text">
          <h1>Ivan Taboada</h1>
        </div>
      </div>
      <nav class="nav-links">
        <a href="${indexLink}">HELLO</a>
        <a href="${proyectosLink}">PROJECTS</a>
        <a href="${acercaLink}">CONTACT ME</a>
        <a href="${katoLink}">KATO</a>
        <a href="${chatLink}">CHAT</a>
        <a href="${ezdawLink}">EZDAW</a>
      </nav>
    `;
    header.appendChild(navWrap);
  }

  const navLinks = navWrap.querySelector(".nav-links");

  //BOTÓN HAMBURGUESA
  let hamburger = navWrap.querySelector(".hamburger");
  if (!hamburger) {
    hamburger = document.createElement("div");
    hamburger.classList.add("hamburger");
    hamburger.innerHTML = "<span></span><span></span><span></span>";
    navWrap.appendChild(hamburger);
  }

  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navLinks.classList.remove("active"));
  });

  //RESALTAR LINK ACTIVO
  const currentPage = window.location.pathname.split("/").pop();
  navLinks.querySelectorAll("a").forEach(link => {
    if (link.getAttribute("href").includes(currentPage)) link.classList.add("active");
  });

  //LOOP IDIOMAS H1
  class TypeWriterLoop {
    constructor(element, texts, speed = 80, pause = 1500) {
      this.element = element;
      this.texts = texts;
      this.speed = speed;
      this.pause = pause;
      this.txtIndex = 0;
      this.charIndex = 0;
      this.isDeleting = false;
      this.element.textContent = "";
      this.element.classList.add("visible");
      this.type();
    }

    type() {
      const currentText = this.texts[this.txtIndex];
      let displayedText = this.isDeleting
        ? currentText.substring(0, this.charIndex--)
        : currentText.substring(0, this.charIndex++);

      if (this.isDeleting && this.charIndex <= 0) displayedText = "";

      this.element.textContent = displayedText;

      let speed = this.speed;
      if (!this.isDeleting && this.charIndex === currentText.length) {
        speed = this.pause;
        this.isDeleting = true;
      } else if (this.isDeleting && this.charIndex <= 0) {
        this.isDeleting = false;
        this.txtIndex = (this.txtIndex + 1) % this.texts.length;
        speed = 500;
      }

      setTimeout(() => this.type(), speed);
    }
  }

  const helloEl = document.querySelector("h1.typewriter");
  if (helloEl) {
    new TypeWriterLoop(helloEl, [
      "Hello World!",
      "¡Hola Mundo!",
      "Bonjour le Monde!",
      "Hallo Welt!",
      "Ciao Mondo!",
      "こんにちは世界！",
      "안녕하세요 세계!",
      "Olá Mundo!",
      "Привет, мир!"
    ]);
  }

  //TYPEWRITER H2 + P
  class TypeWriter {
    constructor(element, text, speed = 100, callback = null) {
      this.element = element;
      this.text = text;
      this.speed = speed;
      this.index = 0;
      this.callback = callback;
      this.element.textContent = "";
      this.element.classList.add("visible");
      this.type();
    }
    type() {
      if (this.index < this.text.length) {
        this.element.textContent += this.text[this.index];
        this.index++;
        setTimeout(() => this.type(), this.speed);
      } else if (this.callback) {
        this.callback();
      }
    }
  }

  const nameEl = document.querySelector("h2.typewriter");
  const descEl = document.querySelector("p.typewriter.desc");

  if (nameEl && descEl) {
    const nameText = nameEl.dataset.text || nameEl.textContent;
    const descText = descEl.dataset.text || descEl.textContent;

    nameEl.textContent = "";
    descEl.textContent = "";

    new TypeWriter(nameEl, nameText, 100, () => {
      new TypeWriter(descEl, descText, 50);
    });
  }


  //NAVBAR OCULTAR/SHRINK AL SCROLL
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const currentScroll = window.scrollY;
    if (currentScroll > lastScroll && currentScroll > 50) {
      header.classList.add("hide");
      header.classList.remove("shrink");
    } else if (currentScroll < lastScroll) {
      header.classList.remove("hide");
      header.classList.add("shrink");
    }
    if (currentScroll <= 0) header.classList.remove("shrink");
    lastScroll = currentScroll;
  });
});
