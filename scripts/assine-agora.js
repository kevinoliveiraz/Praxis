import { subscriptionConfig as config } from "./planos.js"; // Importa config do módulo ./planos.js.

/* Intl mantém a formatação monetária brasileira e calcula a economia a partir dos valores. */
const money = (value) => new Intl.NumberFormat("pt-BR", { // Define money como uma função que recebe value.
  style: "currency", currency: config.currency // Define a propriedade style como o texto “currency”.
}).format(value); // Utiliza o valor de format.
const monthly = config.plans.mensal; // Define monthly como config.plans.mensal.
const annual = config.plans.anual; // Define annual como config.plans.anual.
const annualAverage = annual.amount / annual.months; // Define annualAverage como annual.amount dividido por annual.months.
const saving = monthly.amount * annual.months - annual.amount; // Define saving como monthly.amount vezes annual.months menos annual.amount.
const savingPercent = Math.round(saving / (monthly.amount * annual.months) * 100); // Define savingPercent como o arredondamento de saving dividido por expressão vezes 100 para o inteiro mais próximo.

document.querySelector("[data-monthly-price]").textContent = money(monthly.amount); // Atualiza document.querySelector(…).textContent com o resultado de money com monthly.amount.
document.querySelector("[data-annual-average]").textContent = money(annualAverage); // Atualiza document.querySelector(…).textContent com o resultado de money com annualAverage.
document.querySelector("[data-annual-total]").textContent = money(annual.amount); // Atualiza document.querySelector(…).textContent com o resultado de money com annual.amount.
document.querySelectorAll("[data-saving-percent]").forEach((node) => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
  node.textContent = savingPercent + "%"; // Atualiza node.textContent com savingPercent mais o texto “%”.
}); // Encerra o bloco atual.
document.querySelector("[data-saving-amount]").textContent = money(saving); // Atualiza document.querySelector(…).textContent com o resultado de money com saving.
document.querySelectorAll("[data-provisional]").forEach((node) => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
  node.hidden = !config.provisional; // Atualiza node.hidden com a negação de config.provisional.
}); // Encerra o bloco atual.

/* O dialog nativo contém o foco, aceita Escape e devolve o foco à ação selecionada. */
const dialog = document.getElementById("plan-dialog"); // Define dialog como o elemento cujo ID é o texto “plan-dialog”.
const continueLink = document.getElementById("plan-continue"); // Define continueLink como o elemento cujo ID é o texto “plan-continue”.
const dialogNote = document.getElementById("plan-dialog-note"); // Define dialogNote como o elemento cujo ID é o texto “plan-dialog-note”.

document.querySelectorAll("[data-plan]").forEach((link) => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
  link.addEventListener("click", (event) => { // Executa a chamada que produz o registro do evento o texto “click” em link.
    const plan = config.plans[link.dataset.plan]; // Define plan como config.plans[link.dataset.plan].
    if (!plan || typeof dialog.showModal !== "function") return; // Verifica a negação de plan ou, se indisponível, o tipo de dialog.showModal diferente, inclusive no tipo, de o texto “function”; se verdadeiro, encerra a função sem retornar um valor.
    event.preventDefault(); // Executa a chamada que produz o cancelamento da ação padrão do evento.
    document.getElementById("plan-dialog-title").textContent = plan.name; // Atualiza document.getElementById(…).textContent com plan.name.
    document.getElementById("plan-dialog-total").textContent = money(plan.amount); // Atualiza document.getElementById(…).textContent com o resultado de money com plan.amount.
    document.getElementById("plan-dialog-period").textContent = // Atualiza document.getElementById(…).textContent com o texto “12 meses” se plan.months igual, inclusive no tipo, a 12; caso contrário, o texto “1 mês”.
      plan.months === 12 ? "12 meses" : "1 mês"; // Acessa plan.months.
    document.getElementById("plan-dialog-price-label").textContent = // Atualiza document.getElementById(…).textContent com o texto “Valor provisório” se config.provisional; caso contrário, o texto “Valor do plano”.
      config.provisional ? "Valor provisório" : "Valor do plano"; // Acessa config.provisional.
    const checkout = getCheckout(plan.checkoutUrl); // Define checkout como o resultado de getCheckout com plan.checkoutUrl.
    continueLink.href = checkout || "criar-conta.html"; // Atualiza continueLink.href com checkout ou, se indisponível, o texto “criar-conta.html”.
    continueLink.textContent = checkout ? "Continuar para pagamento" : "Criar minha conta"; // Atualiza continueLink.textContent com o texto “Continuar para pagamento” se checkout; caso contrário, o texto “Criar minha conta”.
    dialogNote.textContent = checkout // Atualiza dialogNote.textContent com o texto “Confira as condições e o valor final no ambiente de pagamento antes de confirma…” se checkout; caso contrário, o texto “Esta é uma prévia da assinatura com valores provisórios. O pagamento ainda não …”.
      ? "Confira as condições e o valor final no ambiente de pagamento antes de confirmar." // Fornece o texto “Confira as condições e o valor final no ambiente de pagamento antes de confirma…” à expressão atual.
      : "Esta é uma prévia da assinatura com valores provisórios. O pagamento ainda não está disponível. Criar uma conta não ativa a assinatura nem gera cobrança."; // Fornece o texto “Esta é uma prévia da assinatura com valores provisórios. O pagamento ainda não …” à expressão atual.
    dialog.showModal(); // Executa a chamada que produz o resultado de dialog.showModal.
  }); // Encerra o bloco atual.
}); // Encerra o bloco atual.

/* Um checkout só fica disponível depois de preço aprovado e URL HTTPS configurada. */
function getCheckout(url) { // Declara a função getCheckout com url.
  if (config.provisional || !url) return null; // Verifica config.provisional ou, se indisponível, a negação de url; se verdadeiro, retorna null (ausência de valor).
  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const parsed = new URL(url); // Define parsed como uma instância de URL com url.
    return parsed.protocol === "https:" && !parsed.username && !parsed.password // Retorna parsed.href se parsed.protocol igual, inclusive no tipo, a https: e a negação de parsed.username e a negação de parsed.password; caso contrário, null (ausência de valor).
      ? parsed.href : null; // Acessa parsed.href.
  } catch { return null; } // Encerra a tentativa e inicia o tratamento de uma falha.
} // Encerra o bloco da função getCheckout.

document.getElementById("plan-dialog-close").addEventListener("click", () => dialog.close()); // Executa a chamada que produz o registro do evento o texto “click” em document.getElementById(…).
dialog.addEventListener("click", (event) => { // Executa a chamada que produz o registro do evento o texto “click” em dialog.
  if (event.target !== dialog) return; // Verifica event.target diferente, inclusive no tipo, de dialog; se verdadeiro, encerra a função sem retornar um valor.
  const rect = dialog.getBoundingClientRect(); // Define rect como as dimensões e a posição de dialog.
  if (event.clientX < rect.left || event.clientX > rect.right || // Verifica event.clientX menor que rect.left ou, se indisponível, event.clientX maior que rect.right ou, se indisponível, event.clientY menor que rect.top ou, se indisponível, event.clientY maior que rect.bottom para decidir se executa este bloco.
      event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); // Acessa event.clientY.
}); // Encerra o bloco atual.
