/* Configuração única dos planos. Todos os preços são provisórios e não geram cobrança. */
export const subscriptionConfig = {
  provisional: true,
  currency: "BRL",
  plans: {
    mensal: { name: "Praxis Mensal", amount: 59.90, months: 1, checkoutUrl: null },
    anual: { name: "Praxis Anual", amount: 478.80, months: 12, checkoutUrl: null }
  }
};
