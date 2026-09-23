# Feature: Publicación de Landing Page en GitHub Pages y Actualización con Enlaces del Repositorio

Actualizar la landing page y el portal de documentación para que hagan referencia al repositorio oficial publicado (`https://github.com/deimerjr/pi-voice-plugin`), incorporar enlaces directos al repositorio y desplegar la landing page en GitHub Pages (`https://deimerjr.github.io/pi-voice-plugin/`), permitiendo el acceso directo desde el repositorio en GitHub y desde el README.

## Tasks
- [x] Task 1: Actualizar `landing/index.html` y `landing/docs.html` con comandos de instalación reales (`https://github.com/deimerjr/pi-voice-plugin`), enlace al repo en navbar/footer y versión v1.1.0
- [x] Task 2: Configurar `homepage` y `repository` en `package.json` apuntando a GitHub Pages y al repo de GitHub
- [x] Task 3: Actualizar `README.md` con enlaces y botones destacados hacia la Landing Page en vivo (`https://deimerjr.github.io/pi-voice-plugin/`) y al portal de documentación
- [x] Task 4: Reempaquetar `landing/landing.zip` y ejecutar la suite completa de 152 pruebas automatizadas
- [x] Task 5: Desplegar el contenido de `landing/` a la rama `gh-pages` y verificar el estado del sitio en GitHub Pages
- [x] Task 6: Auditar con subagente de verificación, registrar commits en `main` y sincronizar con GitHub

## Evidence & Verification
- GitHub Pages Live Site: `https://deimerjr.github.io/pi-voice-plugin/` (HTTP 200).
- Web Documentation Portal Live Site: `https://deimerjr.github.io/pi-voice-plugin/docs.html` (HTTP 200).
- GitHub Repo Homepage metadata set to: `https://deimerjr.github.io/pi-voice-plugin/`.
- Test suite: 152/152 passing (103 TypeScript unit tests + 49 landing tests).
- Branch `gh-pages` tracking live static build.

