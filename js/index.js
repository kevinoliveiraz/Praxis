/**
 * ===========================================================================
 * index.js — Responsável por redirecionar o usuário para a página de login
 * ao acessar a raiz do projeto (index.html).
 * ===========================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  abrirLogin();
});

function abrirLogin() {
  // Redireciona para a página login.html
  window.location.href = "login.html";
}