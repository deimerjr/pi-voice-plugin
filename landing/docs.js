/**
 * PI VOICE PLUGIN — DOCUMENTACIÓN TÉCNICA (docs.js)
 * Controlador interactivo: sincronización de tema, drawer móvil,
 * copiado de código al portapapeles, buscador profundo, ScrollSpy y jump-to-top.
 * Sin emojis genéricos.
 */

const THEME_KEY = "pi_voice_theme";

// Iconos vectoriales monocráticos en línea
const ICONS = {
  theme: `<svg class="b-icon-inline" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/></svg>`,
};

/**
 * 1. Sincronización de tema Dark Matrix / Claro
 */
function initThemeToggle() {
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (!btnThemeToggle) return;

  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
      btnThemeToggle.innerHTML = `${ICONS.theme} <span class="theme-label">LIGHT MODE</span>`;
    }
  } catch {}

  btnThemeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {}
    btnThemeToggle.innerHTML = isDark
      ? `${ICONS.theme} <span class="theme-label">LIGHT MODE</span>`
      : `${ICONS.theme} <span class="theme-label">DARK MATRIX</span>`;
  });
}

/**
 * 2. Drawer móvil lateral de navegación
 */
function initMobileDrawer() {
  const btnToggle = document.getElementById("btn-docs-drawer-toggle");
  const sidebar = document.getElementById("docs-sidebar");
  const backdrop = document.getElementById("docs-drawer-backdrop");

  if (!btnToggle || !sidebar || !backdrop) return;

  function toggleDrawer(open) {
    const shouldOpen = typeof open === "boolean" ? open : !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", shouldOpen);
    backdrop.classList.toggle("active", shouldOpen);
    btnToggle.textContent = shouldOpen ? "[X] CERRAR" : "[00] ÍNDICE";
  }

  btnToggle.addEventListener("click", () => toggleDrawer());
  backdrop.addEventListener("click", () => toggleDrawer(false));

  sidebar.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        toggleDrawer(false);
      }
    });
  });
}

/**
 * 3. Copiado de fragmentos de código al portapapeles
 */
function initCodeCopy() {
  const copyButtons = document.querySelectorAll(".btn-copy-code");
  copyButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const codeBox = btn.closest(".docs-code-box");
      const codeEl = codeBox ? codeBox.querySelector("pre code") : null;
      if (!codeEl) return;

      const codeText = codeEl.innerText || codeEl.textContent || "";
      try {
        await navigator.clipboard.writeText(codeText.trim());
        const originalText = btn.textContent;
        btn.textContent = "[OK] COPIADO";
        btn.classList.add("copied");

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove("copied");
        }, 2000);
      } catch (err) {
        btn.textContent = "[!] ERROR";
        setTimeout(() => {
          btn.textContent = "[COPIAR]";
        }, 2000);
      }
    });
  });
}

/**
 * 4. Buscador y filtro en vivo de módulos técnicos
 */
function initDeepSearch() {
  const searchInput = document.getElementById("docs-search-input");
  const countBadge = document.getElementById("search-count-badge");
  const sections = document.querySelectorAll("section.docs-section");

  if (!searchInput || !countBadge) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      sections.forEach(sec => sec.classList.remove("search-hidden"));
      countBadge.textContent = `[${sections.length} MÓDULOS]`;
      return;
    }

    let visibleCount = 0;
    let firstMatch = null;

    sections.forEach(sec => {
      const text = (sec.textContent || "").toLowerCase();
      const match = text.includes(query);
      if (match) {
        sec.classList.remove("search-hidden");
        visibleCount++;
        if (!firstMatch) {
          firstMatch = sec;
        }
      } else {
        sec.classList.add("search-hidden");
      }
    });

    countBadge.textContent = `[${visibleCount} MÓDULO${visibleCount === 1 ? "" : "S"}]`;

    if (firstMatch && window.scrollY > firstMatch.offsetTop) {
      firstMatch.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

/**
 * 5. ScrollSpy y actualización dinámica de breadcrumb
 */
function initScrollSpy() {
  const sections = document.querySelectorAll("section.docs-section");
  const navLinks = document.querySelectorAll(".docs-nav-link");
  const breadcrumbCurrent = document.getElementById("breadcrumb-current");

  if (!sections.length || !navLinks.length) return;

  const sectionTitles = {
    "sec-arquitectura": "[01] ARQUITECTURA",
    "sec-concurrencia": "[02] CONCURRENCIA",
    "sec-configuracion": "[03] CONFIGURACIÓN",
    "sec-kokoro": "[04] KOKORO OFFLINE",
    "sec-changelog": "[05] CHANGELOG",
    "sec-contribucion": "[06] CONTRIBUCIÓN"
  };

  function updateActiveSection() {
    const scrollPos = window.scrollY + 140;
    let activeSecId = null;

    sections.forEach(sec => {
      if (sec.classList.contains("search-hidden")) return;
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        activeSecId = sec.id;
      }
    });

    if (!activeSecId && sections.length > 0) {
      activeSecId = sections[0].id;
    }

    if (activeSecId) {
      navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href === `#${activeSecId}`) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });

      if (breadcrumbCurrent && sectionTitles[activeSecId]) {
        breadcrumbCurrent.textContent = sectionTitles[activeSecId];
      }
    }
  }

  window.addEventListener("scroll", updateActiveSection, { passive: true });
  updateActiveSection();
}

/**
 * 6. Botón de subida rápida al inicio
 */
function initJumpToTop() {
  const btnJumpTop = document.getElementById("btn-jump-top");
  if (!btnJumpTop) return;

  btnJumpTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

// Inicializar todos los subsistemas al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initMobileDrawer();
  initCodeCopy();
  initDeepSearch();
  initScrollSpy();
  initJumpToTop();
});
