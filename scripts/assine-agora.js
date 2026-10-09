import { subscriptionConfig as config } from "./planos.js";

/* Intl mantém a formatação monetária brasileira e calcula a economia a partir dos valores. */
const money = (value) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: config.currency
}).format(value);
const monthly = config.plans.mensal;
const annual = config.plans.anual;
const annualAverage = annual.amount / annual.months;
const saving = monthly.amount * annual.months - annual.amount;
const savingPercent = Math.round(saving / (monthly.amount * annual.months) * 100);

document.querySelector("[data-monthly-price]").textContent = money(monthly.amount);
document.querySelector("[data-annual-average]").textContent = money(annualAverage);
document.querySelector("[data-annual-total]").textContent = money(annual.amount);
document.querySelectorAll("[data-saving-percent]").forEach((node) => {
  node.textContent = savingPercent + "%";
});
document.querySelector("[data-saving-amount]").textContent = money(saving);
document.querySelectorAll("[data-provisional]").forEach((node) => {
  node.hidden = !config.provisional;
});

/* O dialog nativo contém o foco, aceita Escape e devolve o foco à ação selecionada. */
const dialog = document.getElementById("plan-dialog");
const continueLink = document.getElementById("plan-continue");
const dialogNote = document.getElementById("plan-dialog-note");

document.querySelectorAll("[data-plan]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const plan = config.plans[link.dataset.plan];
    if (!plan || typeof dialog.showModal !== "function") return;
    event.preventDefault();
    document.getElementById("plan-dialog-title").textContent = plan.name;
    document.getElementById("plan-dialog-total").textContent = money(plan.amount);
    document.getElementById("plan-dialog-period").textContent =
      plan.months === 12 ? "12 meses" : "1 mês";
    document.getElementById("plan-dialog-price-label").textContent =
      config.provisional ? "Valor provisório" : "Valor do plano";
    const checkout = getCheckout(plan.checkoutUrl);
    continueLink.href = checkout || "criar-conta.html";
    continueLink.textContent = checkout ? "Continuar para pagamento" : "Criar minha conta";
    dialogNote.textContent = checkout
      ? "Confira as condições e o valor final no ambiente de pagamento antes de confirmar."
      : "Esta é uma prévia da assinatura com valores provisórios. O pagamento ainda não está disponível. Criar uma conta não ativa a assinatura nem gera cobrança.";
    dialog.showModal();
  });
});

/* Um checkout só fica disponível depois de preço aprovado e URL HTTPS configurada. */
function getCheckout(url) {
  if (config.provisional || !url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? parsed.href : null;
  } catch { return null; }
}

document.getElementById("plan-dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
