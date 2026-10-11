/* Configuração única dos planos. Todos os preços são provisórios e não geram cobrança. */
export const subscriptionConfig = { // Exporta a configuração compartilhada que a página de assinatura usa para exibir os planos.
  provisional: true, // Indica que os preços exibidos são provisórios.
  currency: "BRL", // Define o real brasileiro como a moeda usada na formatação dos valores.
  plans: { // Agrupa as opções de assinatura mensal e anual.
    mensal: { name: "Praxis Mensal", amount: 59.90, months: 1, checkoutUrl: null }, // Define o nome, o preço provisório de R$ 59,90, o período de um mês e a ausência de um endereço de pagamento.
    anual: { name: "Praxis Anual", amount: 478.80, months: 12, checkoutUrl: null } // Define o nome, o preço provisório total de R$ 478,80, o período de doze meses e a ausência de um endereço de pagamento.
  } // Encerra a lista de configurações dos planos.
}; // Encerra a configuração exportada para a página de assinatura.
