/**
 * MOVY - FRONTEND SCRIPT ENGINE
 * Implementação de alta performance e acessibilidade:
 * - Controle de Accordion (FAQ) com aria-expanded e transições suaves
 * - Máscara dinâmica de telefone celular brasileiro (BR)
 * - Validação em tempo real e prevenção de envios inválidos
 * - Motor de Qualificação de Leads (SDR Scoring) conforme manual Movy
 * - Disparo condicional de evento Meta Pixel 'Lead'
 * - Redirecionamento com passagem de estado para a página de agradecimento
 */

document.addEventListener('DOMContentLoaded', () => {
  initFaqAccordion();
  initPhoneMask();
  initLeadForm();
  initGsapAnimations();
});

/* ==========================================================================
   1. FAQ ACCORDION
   ========================================================================== */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (!questionBtn || !answer) return;

    questionBtn.addEventListener('click', () => {
      const isExpanded = questionBtn.getAttribute('aria-expanded') === 'true';

      // Fecha todos os outros para manter o foco limpo
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherBtn = otherItem.querySelector('.faq-question');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
        }
      });

      // Alterna o atual
      if (isExpanded) {
        questionBtn.setAttribute('aria-expanded', 'false');
        item.classList.remove('active');
        answer.style.maxHeight = null;
      } else {
        questionBtn.setAttribute('aria-expanded', 'true');
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

/* ==========================================================================
   2. MÁSCARA INTELIGENTE DE TELEFONE (WHATSAPP BR)
   ========================================================================== */
function initPhoneMask() {
  const phoneInput = document.getElementById('whatsapp');
  if (!phoneInput) return;

  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Limita ao tamanho máximo de 11 dígitos (DDD + 9 dígitos)
    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length > 10) {
      // (XX) XXXXX-XXXX
      value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (value.length > 6) {
      // (XX) XXXX-XXXX (fixo ou em digitação)
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (value.length > 2) {
      // (XX) XXXX...
      value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/^(\d{0,2})$/, '($1');
    }

    e.target.value = value;
  });
}

/* ==========================================================================
   3. VALIDAÇÃO & ENVIO DO FORMULÁRIO DE LEADS (INTEGRAÇÃO API MOVY)
   ========================================================================== */
function initLeadForm() {
  const form = document.getElementById('leadForm');
  const submitBtn = document.getElementById('submitBtn');
  const formWrapper = document.querySelector('.form-wrapper');
  if (!form) return;

  const API_ENDPOINT = 'http://localhost:3001/api/leads/capture';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearErrors();

    const formData = {
      nome: form.nome ? form.nome.value.trim() : '',
      whatsapp: form.whatsapp ? form.whatsapp.value.trim() : '',
      deliveryNome: form.deliveryNome ? form.deliveryNome.value.trim() : '',
      segmento: form.segmento ? form.segmento.value : '',
      cidade: form.cidade ? form.cidade.value.trim() : '',
    };

    let hasError = false;

    if (!formData.nome || formData.nome.length < 3) {
      showError('nome', 'Por favor, informe seu nome completo.');
      hasError = true;
    }

    const cleanPhone = formData.whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      showError('whatsapp', 'Informe um WhatsApp válido com DDD (Ex: (11) 99999-9999).');
      hasError = true;
    }

    if (!formData.deliveryNome) {
      showError('deliveryNome', 'Informe o nome do seu delivery.');
      hasError = true;
    }

    if (!formData.segmento) {
      showError('segmento', 'Selecione o segmento principal da sua operação.');
      hasError = true;
    }

    if (!formData.cidade) {
      showError('cidade', 'Informe a sua cidade e estado (Ex: Campinas / SP).');
      hasError = true;
    }

    if (hasError) {
      const firstError = document.querySelector('.field-error.visible');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Desativa botão e sinaliza envio
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Enviando dados...</span>';

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || 'Falha ao processar formulário.';
        throw new Error(message);
      }

      // Disparo do Pixel da Meta se configurado
      if (typeof fbq === 'function') {
        try {
          fbq('track', 'Lead', {
            content_name: 'Diagnostico Delivery',
            content_category: formData.segmento,
            currency: 'BRL',
          });
        } catch (pixelErr) {
          console.warn('Erro ao disparar Meta Pixel:', pixelErr);
        }
      }

      // Feedback visual de sucesso premium sem quebrar em página 404
      if (formWrapper) {
        formWrapper.innerHTML = `
          <div style="text-align: center; padding: 2.5rem 1rem;">
            <div style="width: 64px; height: 64px; margin: 0 auto 1.5rem; background: rgba(229, 9, 20, 0.15); border: 2px solid #E50914; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E50914" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff;">
              Diagnóstico Solicitado com Sucesso!
            </h3>
            <p style="color: #A3A3A3; line-height: 1.6; font-size: 1rem; margin-bottom: 1.5rem;">
              Recebemos as informações de <strong>${formData.deliveryNome}</strong>.<br>
              Nosso time de assessoria já foi notificado e entrará em contato via WhatsApp no número <strong>${formData.whatsapp}</strong>.
            </p>
            <div style="display: inline-block; padding: 0.75rem 1.25rem; background: #171717; border: 1px solid #262626; border-radius: 8px; color: #737373; font-size: 0.875rem;">
              ⏱️ Tempo médio de retorno: até 30 minutos em horário comercial
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error('Erro na submissão do lead:', err);
      alert('Não foi possível enviar seus dados no momento. Verifique sua conexão e tente novamente.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });
}

function calculateLeadScore(data) {
  let score = 0;

  // Critério 1: Verba para anúncios
  if (data.verba === 'Sim, tenho verba disponível') {
    score += 50;
  } else if (data.verba === 'Preciso avaliar com sócio') {
    score += 25;
  } else {
    score += 0;
  }

  // Critério 2: Capacidade de atendimento
  if (data.capacidade === 'Sim, estamos prontos') {
    score += 30;
  } else if (data.capacidade === 'Com pequenos ajustes') {
    score += 20;
  } else {
    score += 5;
  }

  // Critério 3: Canal Principal / Maturidade
  if (data.canalPrincipal === 'Cardápio próprio' || data.canalPrincipal === 'WhatsApp') {
    score += 20;
  } else if (data.canalPrincipal === 'iFood') {
    score += 15;
  } else {
    score += 5;
  }

  let tier = 'Baixo';
  let isQualified = false;

  if (score >= 70) {
    tier = 'Alta Prioridade (Lead Quente)';
    isQualified = true;
  } else if (score >= 40) {
    tier = 'Média Prioridade';
    isQualified = true;
  } else {
    tier = 'Baixa Prioridade / Educativo';
    isQualified = false;
  }

  return { score, tier, isQualified };
}

function showError(fieldId, message) {
  const errorElem = document.getElementById(`error-${fieldId}`);
  if (errorElem) {
    errorElem.textContent = message;
    errorElem.classList.add('visible');
  }
}

function clearErrors() {
  const errors = document.querySelectorAll('.field-error');
  errors.forEach(err => {
    err.textContent = '';
    err.classList.remove('visible');
  });
}

/* ==========================================================================
   4. GSAP CORE ANIMATION ENGINE (Alta Performance & Acessibilidade)
   ========================================================================== */
function initGsapAnimations() {
  if (typeof gsap === 'undefined') {
    console.warn('GSAP Core não carregado. Fallback para CSS padrão.');
    return;
  }

  // Define defaults globais do GSAP conforme boas práticas
  gsap.defaults({
    duration: 0.6,
    ease: 'power2.out'
  });

  // Utiliza gsap.matchMedia() para garantir acessibilidade (prefers-reduced-motion)
  // e comportamento responsivo limpo
  const mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: '(min-width: 768px)',
      isMobile: '(max-width: 767px)',
      reduceMotion: '(prefers-reduced-motion: reduce)'
    },
    (context) => {
      const { reduceMotion, isDesktop } = context.conditions;

      // Se o usuário solicitou menos movimento no SO, desabilita animações para evitar tontura/vertigem
      if (reduceMotion) {
        return;
      }

      // 1. Entrada fluida do Hero (Proposta de valor com Stagger)
      gsap.from('.hero-content > *', {
        y: isDesktop ? 22 : 14,
        autoAlpha: 0,
        stagger: 0.1,
        duration: 0.75,
        ease: 'power2.out',
        clearProps: 'transform,visibility,opacity'
      });

      // 2. Entrada do Card de Captura (Hero Form)
      gsap.from('.hero-form-container .form-wrapper', {
        y: isDesktop ? 30 : 18,
        autoAlpha: 0,
        duration: 0.85,
        delay: 0.15,
        ease: 'power3.out',
        clearProps: 'transform,visibility,opacity'
      });

      // 3. Animação de entrada dos cards de problemas em lote
      gsap.from('.card-problem', {
        y: 20,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 0.6,
        delay: 0.3,
        ease: 'power1.out',
        clearProps: 'transform,visibility,opacity'
      });

      // 4. Animação dos nós do Ecossistema Interligado
      gsap.from('.ecosystem-hub', {
        scale: 0.95,
        autoAlpha: 0,
        duration: 0.7,
        ease: 'power2.out',
        clearProps: 'transform,visibility,opacity'
      });

      gsap.from('.ecosystem-node', {
        y: 24,
        autoAlpha: 0,
        stagger: 0.1,
        duration: 0.65,
        ease: 'power2.out',
        clearProps: 'transform,visibility,opacity'
      });
    }
  );
}
