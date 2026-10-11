/* Carregado no head, antes do CSS, para aplicar a preferência sem piscar. */
(() => { // Inicia uma função executada imediatamente para isolar as variáveis deste script.
  const key = 'praxis-theme'; // Define key como o texto “praxis-theme”.
  const root = document.documentElement; // Define root como document.documentElement.
  const system = window.matchMedia('(prefers-color-scheme: dark)'); // Define system como a consulta da preferência ou condição de tela o texto “(prefers-color-scheme: dark)”.
  const valid = value => value === 'light' || value === 'dark'; // Define valid como uma função que recebe value.
  let preference = null; // Define preference como null (ausência de valor).

  try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
    const saved = localStorage.getItem(key); // Define saved como o valor salvo na chave key.
    if (valid(saved)) preference = saved; // Verifica o resultado de valid com saved; se verdadeiro, executa a atribuição de saved a preference.
  } catch { /* O tema funciona mesmo quando o armazenamento está bloqueado. */ }

  function apply(theme) { // Declara a função apply com theme.
    root.dataset.theme = theme; // Atualiza root.dataset.theme com theme.
    root.dataset.themePreference = preference || 'system'; // Atualiza root.dataset.themePreference com preference ou, se indisponível, o texto “system”.
    const label = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'; // Define label como o texto “Ativar tema claro” se theme igual, inclusive no tipo, a o texto “dark”; caso contrário, o texto “Ativar tema escuro”.
    document.querySelectorAll('[data-theme-toggle]').forEach(button => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
      button.setAttribute('aria-label', label); // Executa a chamada que produz a definição do atributo o texto “aria-label” em button.
      button.title = label; // Atualiza button.title com label.
      const text = button.querySelector('[data-theme-label]'); // Define text como o primeiro elemento que corresponde ao seletor o texto “[data-theme-label]”.
      if (text) text.textContent = theme === 'dark' ? 'Modo claro' : 'Modo escuro'; // Verifica text; se verdadeiro, executa a atribuição de o texto “Modo claro” se theme igual, inclusive no tipo, a o texto “dark”; caso contrário, o texto “Modo escuro” a text.textContent.
    }); // Encerra o bloco atual.
    document.querySelector('meta[name="theme-color"]')?.setAttribute( // Executa a chamada que produz a definição do atributo o texto “content” em document.querySelector(…).
      'content', theme === 'dark' ? '#06070c' : '#fbfafb' // Fornece o texto “content” à expressão atual.
    ); // Encerra a chamada de document.querySelector(…).setAttribute.
    if (typeof CustomEvent === 'function') { // Verifica o tipo de CustomEvent igual, inclusive no tipo, a o texto “function” para decidir se executa este bloco.
      window.dispatchEvent(new CustomEvent('praxis:theme-changed', { detail: { theme, preference: preference || 'system' } })); // Executa a chamada que produz o resultado de window.dispatchEvent com uma instância de CustomEvent com o texto “praxis:theme-changed” e um objeto com detail.
    } // Encerra o bloco da condição.
  } // Encerra o bloco da função apply.

  const systemTheme = () => system.matches ? 'dark' : 'light'; // Define systemTheme como uma função que recebe nenhum argumento.
  window.PraxisTheme = { // Atualiza window.PraxisTheme com um objeto com getPreference, setPreference.
    getPreference: () => preference || 'system', // Define a propriedade getPreference como uma função que recebe nenhum argumento.
    setPreference(value) { // Define a propriedade setPreference como uma função que recebe value.
      if (!valid(value) && value !== 'system') return; // Verifica a negação de o resultado de valid com value e value diferente, inclusive no tipo, de o texto “system”; se verdadeiro, encerra a função sem retornar um valor.
      preference = valid(value) ? value : null; // Atualiza preference com value se o resultado de valid com value; caso contrário, null (ausência de valor).
      try { // Inicia a tentativa de execução cujo erro será tratado pelo catch.
        if (preference) localStorage.setItem(key, preference); // Verifica preference; se verdadeiro, executa a gravação local da chave key.
        else localStorage.removeItem(key); // Executa a chamada que produz a remoção local da chave key.
      } catch { /* Preferência em memória. */ }
      apply(preference || systemTheme()); // Executa a chamada que produz o resultado de apply com preference ou, se indisponível, o resultado de systemTheme.
    } // Encerra o bloco atual.
  }; // Encerra o objeto.
  apply(preference || systemTheme()); // Executa a chamada que produz o resultado de apply com preference ou, se indisponível, o resultado de systemTheme.

  document.addEventListener('DOMContentLoaded', () => { // Executa a chamada que produz o registro do evento o texto “DOMContentLoaded” em document.
    apply(root.dataset.theme); // Executa a chamada que produz o resultado de apply com root.dataset.theme.
    document.querySelectorAll('[data-theme-toggle]').forEach(button => { // Executa a chamada que produz a execução da função para cada item de document.querySelectorAll(…).
      button.addEventListener('click', () => { // Executa a chamada que produz o registro do evento o texto “click” em button.
        window.PraxisTheme.setPreference(root.dataset.theme === 'dark' ? 'light' : 'dark'); // Executa a chamada que produz o resultado de window.PraxisTheme.setPreference com o texto “light” se root.dataset.theme igual, inclusive no tipo, a o texto “dark”; caso contrário, o texto “dark”.
      }); // Encerra o bloco atual.
    }); // Encerra o bloco atual.
  }); // Encerra o bloco atual.

  system.addEventListener('change', () => { // Executa a chamada que produz o registro do evento o texto “change” em system.
    if (!preference) apply(systemTheme()); // Verifica a negação de preference; se verdadeiro, executa o resultado de apply com o resultado de systemTheme.
  }); // Encerra o bloco atual.

  window.addEventListener('storage', event => { // Executa a chamada que produz o registro do evento o texto “storage” em window.
    if (event.key !== key && event.key !== null) return; // Verifica event.key diferente, inclusive no tipo, de key e event.key diferente, inclusive no tipo, de null (ausência de valor); se verdadeiro, encerra a função sem retornar um valor.
    preference = valid(event.newValue) ? event.newValue : null; // Atualiza preference com event.newValue se o resultado de valid com event.newValue; caso contrário, null (ausência de valor).
    apply(preference || systemTheme()); // Executa a chamada que produz o resultado de apply com preference ou, se indisponível, o resultado de systemTheme.
  }); // Encerra o bloco atual.
})(); // Encerra a função e sua execução imediata.
