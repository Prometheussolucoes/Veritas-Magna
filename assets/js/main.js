'use strict';

/**
 * Veritas Magna Consultoria — landing page
 * JavaScript vanilla: menu mobile, modais, cookie banner (LGPD) e
 * validação/sanitização do formulário de diagnóstico.
 * Nenhuma dependência externa. Nenhum uso de innerHTML com dado de usuário.
 */
(function () {
  var body = document.body;
  var modaisAbertos = 0;

  /* ---------------------------------------------------------------------
   * Utilidades de segurança
   * ------------------------------------------------------------------- */

  // Remove marcação HTML e caracteres de controle antes de qualquer uso do
  // valor (defesa em profundidade — o DOM nunca recebe innerHTML com dados
  // de usuário nesta página; todo texto dinâmico é escrito via textContent).
  function sanitizarTexto(valor) {
    return String(valor || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim();
  }

  // Padrões associados a tentativas de XSS/SQLi. Bloqueia o envio do
  // formulário caso qualquer campo de texto contenha um destes padrões.
  var PADROES_SUSPEITOS = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
    /union\s+select/i,
    /select\s+.*\s+from/i,
    /insert\s+into/i,
    /drop\s+table/i,
    /--\s*$/,
    /;\s*--/,
    /'\s*or\s*'?1'?\s*=\s*'?1/i,
  ];

  function contemPadraoSuspeito(valor) {
    return PADROES_SUSPEITOS.some(function (padrao) {
      return padrao.test(valor);
    });
  }

  /* ---------------------------------------------------------------------
   * Menu mobile
   * ------------------------------------------------------------------- */
  (function menuMobile() {
    var botao = document.getElementById('menu-toggle');
    var menu = document.getElementById('menu-mobile');
    var iconeAbrir = document.getElementById('icone-menu-abrir');
    var iconeFechar = document.getElementById('icone-menu-fechar');
    if (!botao || !menu) return;

    function abrir() {
      menu.classList.remove('hidden');
      botao.setAttribute('aria-expanded', 'true');
      botao.setAttribute('aria-label', 'Fechar menu de navegação');
      iconeAbrir.classList.add('hidden');
      iconeFechar.classList.remove('hidden');
    }

    function fechar() {
      menu.classList.add('hidden');
      botao.setAttribute('aria-expanded', 'false');
      botao.setAttribute('aria-label', 'Abrir menu de navegação');
      iconeAbrir.classList.remove('hidden');
      iconeFechar.classList.add('hidden');
    }

    botao.addEventListener('click', function () {
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      if (aberto) {
        fechar();
      } else {
        abrir();
      }
    });

    menu.querySelectorAll('[data-fecha-menu]').forEach(function (link) {
      link.addEventListener('click', fechar);
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
        fechar();
        botao.focus();
      }
    });

    // Fecha ao clicar/tocar fora do menu e do botão que o abre
    document.addEventListener('click', function (evento) {
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      if (!aberto) return;
      if (menu.contains(evento.target) || botao.contains(evento.target)) return;
      fechar();
    });

    // Evita que o menu mobile fique "preso" aberto ao redimensionar para desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) fechar();
    });
  })();

  /* ---------------------------------------------------------------------
   * Modais (Política de Privacidade / Preferências de cookies)
   * ------------------------------------------------------------------- */
  var ultimoFocoAntesDoModal = null;

  function travarRolagem() {
    modaisAbertos += 1;
    body.style.overflow = 'hidden';
  }

  function destravarRolagem() {
    modaisAbertos = Math.max(0, modaisAbertos - 1);
    if (modaisAbertos === 0) {
      body.style.overflow = '';
    }
  }

  function abrirModal(id, elementoDisparador) {
    var modal = document.getElementById(id);
    if (!modal) return;
    ultimoFocoAntesDoModal = elementoDisparador || document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    travarRolagem();

    var focavel = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focavel) focavel.focus();
  }

  function fecharModal(id) {
    var modal = document.getElementById(id);
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    destravarRolagem();
    if (ultimoFocoAntesDoModal && typeof ultimoFocoAntesDoModal.focus === 'function') {
      ultimoFocoAntesDoModal.focus();
    }
  }

  function modalAberto(modal) {
    return modal && !modal.classList.contains('hidden');
  }

  document.querySelectorAll('[data-abre-modal]').forEach(function (gatilho) {
    gatilho.addEventListener('click', function () {
      abrirModal(gatilho.getAttribute('data-abre-modal'), gatilho);
    });
  });

  document.querySelectorAll('[data-fecha-modal]').forEach(function (gatilho) {
    gatilho.addEventListener('click', function () {
      fecharModal(gatilho.getAttribute('data-fecha-modal'));
    });
  });

  // Fecha ao clicar no fundo (backdrop) do modal
  document.querySelectorAll('#modal-privacidade, #modal-cookies').forEach(function (modal) {
    modal.addEventListener('click', function (evento) {
      if (evento.target === modal) fecharModal(modal.id);
    });
  });

  // Fecha o modal mais recente com Escape e mantém o foco preso dentro dele (Tab)
  document.addEventListener('keydown', function (evento) {
    var modalVisivel = Array.prototype.find.call(
      document.querySelectorAll('#modal-privacidade, #modal-cookies'),
      modalAberto
    );
    if (!modalVisivel) return;

    if (evento.key === 'Escape') {
      fecharModal(modalVisivel.id);
      return;
    }

    if (evento.key === 'Tab') {
      var focaveis = modalVisivel.querySelectorAll(
        'button, [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focaveis.length) return;
      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  });

  /* ---------------------------------------------------------------------
   * Banner de cookies (LGPD) — persistência em localStorage
   * ------------------------------------------------------------------- */
  (function cookieBanner() {
    var CHAVE = 'vm_cookie_consent';
    var banner = document.getElementById('banner-cookies');
    var botaoWhats = document.getElementById('botao-whatsapp');
    var btnAceitar = document.getElementById('btn-aceitar-cookies');
    var btnPreferencias = document.getElementById('btn-preferencias-cookies');
    var btnSalvarPreferencias = document.getElementById('btn-salvar-preferencias');
    var btnAceitarTodosModal = document.getElementById('btn-aceitar-todos-modal');
    var checkAnalise = document.getElementById('cookie-analise');
    var checkMarketing = document.getElementById('cookie-marketing');
    if (!banner) return;

    function lerConsentimento() {
      try {
        var bruto = window.localStorage.getItem(CHAVE);
        return bruto ? JSON.parse(bruto) : null;
      } catch (erro) {
        return null;
      }
    }

    function gravarConsentimento(preferencias) {
      try {
        window.localStorage.setItem(
          CHAVE,
          JSON.stringify({
            necessary: true,
            analytics: !!preferencias.analytics,
            marketing: !!preferencias.marketing,
            ts: new Date().toISOString(),
          })
        );
      } catch (erro) {
        /* localStorage indisponível (modo privado/bloqueado) — segue sem persistir */
      }
    }

    function ajustarPosicaoWhatsapp() {
      if (!botaoWhats) return;
      if (banner.classList.contains('hidden')) {
        botaoWhats.style.bottom = '';
      } else {
        botaoWhats.style.bottom = banner.offsetHeight + 24 + 'px';
      }
    }

    function esconderBanner() {
      banner.classList.add('hidden');
      ajustarPosicaoWhatsapp();
    }

    function mostrarBanner() {
      banner.classList.remove('hidden');
      ajustarPosicaoWhatsapp();
    }

    if (!lerConsentimento()) {
      mostrarBanner();
    }

    window.addEventListener('resize', ajustarPosicaoWhatsapp);

    if (btnAceitar) {
      btnAceitar.addEventListener('click', function () {
        gravarConsentimento({ analytics: true, marketing: true });
        esconderBanner();
      });
    }

    if (btnPreferencias) {
      btnPreferencias.addEventListener('click', function () {
        abrirModal('modal-cookies', btnPreferencias);
      });
    }

    if (btnAceitarTodosModal) {
      btnAceitarTodosModal.addEventListener('click', function () {
        if (checkAnalise) checkAnalise.checked = true;
        if (checkMarketing) checkMarketing.checked = true;
        gravarConsentimento({ analytics: true, marketing: true });
        fecharModal('modal-cookies');
        esconderBanner();
      });
    }

    if (btnSalvarPreferencias) {
      btnSalvarPreferencias.addEventListener('click', function () {
        gravarConsentimento({
          analytics: checkAnalise ? checkAnalise.checked : false,
          marketing: checkMarketing ? checkMarketing.checked : false,
        });
        fecharModal('modal-cookies');
        esconderBanner();
      });
    }
  })();

  /* ---------------------------------------------------------------------
   * Formulário de diagnóstico — validação estrita + sanitização
   * ------------------------------------------------------------------- */
  (function formularioDiagnostico() {
    var form = document.getElementById('form-diagnostico');
    if (!form) return;

    var statusEl = document.getElementById('form-status');

    var REGEX = {
      nome: /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{4,120}$/,
      email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/,
      // Aceita (DD) 90000-0000, DD90000-0000, +55 (DD) 90000-0000, etc.
      telefone: /^(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/,
    };

    var CAMPOS = [
      {
        input: form.querySelector('#nome'),
        erro: document.getElementById('erro-nome'),
        obrigatorio: true,
        validar: function (valor) {
          if (!REGEX.nome.test(valor)) return 'Informe um nome válido (apenas letras e espaços).';
          if (valor.trim().split(/\s+/).filter(Boolean).length < 2) return 'Informe nome e sobrenome.';
          return '';
        },
      },
      {
        input: form.querySelector('#email'),
        erro: document.getElementById('erro-email'),
        obrigatorio: true,
        validar: function (valor) {
          if (!REGEX.email.test(valor)) return 'Informe um e-mail válido.';
          return '';
        },
      },
      {
        input: form.querySelector('#telefone'),
        erro: document.getElementById('erro-telefone'),
        obrigatorio: true,
        validar: function (valor) {
          var normalizado = valor.replace(/[()\s-]/g, '');
          if (!REGEX.telefone.test(valor) || normalizado.replace(/^\+?55/, '').length < 10) {
            return 'Informe um WhatsApp válido com DDD. Ex.: (21) 90000-0000.';
          }
          return '';
        },
      },
      {
        input: form.querySelector('#mensagem'),
        erro: document.getElementById('erro-mensagem'),
        obrigatorio: false,
        validar: function (valor) {
          if (valor.length > 1000) return 'A mensagem deve ter no máximo 1000 caracteres.';
          return '';
        },
      },
    ];

    function exibirErro(campo, mensagem) {
      if (!campo.input) return;
      campo.input.setAttribute('aria-invalid', 'true');
      if (campo.erro) {
        campo.erro.textContent = mensagem;
        campo.erro.classList.remove('hidden');
      }
    }

    function limparErro(campo) {
      if (!campo.input) return;
      campo.input.removeAttribute('aria-invalid');
      if (campo.erro) {
        campo.erro.textContent = '';
        campo.erro.classList.add('hidden');
      }
    }

    function validarCampo(campo) {
      var valorBruto = campo.input.value;
      var valor = sanitizarTexto(valorBruto);

      if (contemPadraoSuspeito(valorBruto)) {
        exibirErro(campo, 'Este campo contém caracteres não permitidos.');
        return false;
      }

      if (!valor && campo.obrigatorio) {
        exibirErro(campo, 'Este campo é obrigatório.');
        return false;
      }

      if (valor) {
        var mensagemErro = campo.validar(valor);
        if (mensagemErro) {
          exibirErro(campo, mensagemErro);
          return false;
        }
      }

      limparErro(campo);
      return true;
    }

    CAMPOS.forEach(function (campo) {
      if (!campo.input) return;
      campo.input.addEventListener('input', function () {
        limparErro(campo);
      });
      campo.input.addEventListener('blur', function () {
        validarCampo(campo);
      });
    });

    function validarConsentimento(id, erroId, mensagem) {
      var input = document.getElementById(id);
      var erro = document.getElementById(erroId);
      if (!input) return true;
      if (!input.checked) {
        if (erro) {
          erro.textContent = mensagem;
          erro.classList.remove('hidden');
        }
        return false;
      }
      if (erro) erro.classList.add('hidden');
      return true;
    }

    ['aceite-etica', 'aceite-lgpd'].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('change', function () {
        var erro = document.getElementById(id === 'aceite-etica' ? 'erro-etica' : 'erro-lgpd');
        if (input.checked && erro) erro.classList.add('hidden');
      });
    });

    function montarMensagemWhatsapp(dados) {
      var linhas = [
        'Olá, quero solicitar uma análise técnica da prestação de contas do meu projeto.',
        'Nome: ' + dados.nome,
        'E-mail: ' + dados.email,
        'WhatsApp: ' + dados.telefone,
        'Organização: ' + dados.organizacao,
      ];
      if (dados.mensagem) linhas.push('Contexto: ' + dados.mensagem);
      return linhas.join('\n');
    }

    form.addEventListener('submit', function (evento) {
      evento.preventDefault();

      // Honeypot: campo invisível que só um robô preencheria
      var honeypot = form.querySelector('#website');
      if (honeypot && honeypot.value) {
        return;
      }

      var formularioValido = true;
      CAMPOS.forEach(function (campo) {
        if (!campo.input) return;
        if (!validarCampo(campo)) formularioValido = false;
      });

      var lgpdOk = validarConsentimento(
        'aceite-lgpd',
        'erro-lgpd',
        'É necessário autorizar o tratamento de dados para prosseguir.'
      );
      var eticaOk = validarConsentimento(
        'aceite-etica',
        'erro-etica',
        'É necessário confirmar a leitura do Código de Ética.'
      );

      if (!formularioValido || !lgpdOk || !eticaOk) {
        var primeiroInvalido = form.querySelector('[aria-invalid="true"]');
        if (primeiroInvalido) {
          primeiroInvalido.focus();
        }
        if (statusEl) {
          statusEl.textContent = 'Corrija os campos destacados antes de enviar.';
        }
        return;
      }

      var dados = {
        nome: sanitizarTexto(form.nome.value),
        email: sanitizarTexto(form.email.value),
        telefone: sanitizarTexto(form.telefone.value),
        organizacao: sanitizarTexto(form.organizacao.value),
        mensagem: sanitizarTexto(form.mensagem.value),
      };

      var botaoEnviar = form.querySelector('button[type="submit"]');
      if (botaoEnviar) botaoEnviar.disabled = true;
      if (statusEl) statusEl.textContent = 'Enviando solicitação...';

      // Em produção: substituir por chamada a um endpoint seguro (HTTPS,
      // proteção CSRF e rate limiting no backend). Na ausência de backend,
      // a solicitação segue por WhatsApp com os dados já validados.
      var controlador = new AbortController();
      var tempoLimite = setTimeout(function () {
        controlador.abort();
      }, 4000);

      fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
        signal: controlador.signal,
      })
        .then(function (resposta) {
          clearTimeout(tempoLimite);
          if (!resposta.ok) throw new Error('Endpoint indisponível');
          if (statusEl) {
            statusEl.textContent = 'Solicitação enviada com sucesso. Em breve entraremos em contato.';
          }
          form.reset();
        })
        .catch(function () {
          clearTimeout(tempoLimite);
          var url = 'https://wa.me/5521976803952?text=' + encodeURIComponent(montarMensagemWhatsapp(dados));
          window.open(url, '_blank', 'noopener,noreferrer');
          if (statusEl) {
            statusEl.textContent = 'Solicitação preparada. Concluímos o envio agora pelo WhatsApp.';
          }
          form.reset();
        })
        .finally(function () {
          if (botaoEnviar) botaoEnviar.disabled = false;
        });
    });
  })();

  /* ---------------------------------------------------------------------
   * Rodapé — ano corrente
   * ------------------------------------------------------------------- */
  var anoEl = document.getElementById('ano-atual');
  if (anoEl) anoEl.textContent = String(new Date().getFullYear());
})();
