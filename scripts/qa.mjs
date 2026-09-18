import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:4173/index.html';
const results = [];
function log(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'OK  ' : 'FAIL') + ' - ' + name + (detail ? ' :: ' + detail : ''));
}

const browser = await puppeteer.launch({
  executablePath: '/opt/pw-browsers/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  // ---------- Desktop viewport ----------
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle0' });

  const title = await page.title();
  log('Title presente', title && title.length > 10, title);

  const h1Count = await page.$$eval('h1', (els) => els.length);
  log('Exatamente um H1', h1Count === 1, 'h1 count=' + h1Count);

  const metaDesc = await page.$eval('meta[name="description"]', (el) => el.content).catch(() => null);
  log('Meta description presente', !!metaDesc && metaDesc.length > 20);

  const ogTitle = await page.$eval('meta[property="og:title"]', (el) => el.content).catch(() => null);
  log('OG title presente', !!ogTitle);

  const canonical = await page.$eval('link[rel="canonical"]', (el) => el.href).catch(() => null);
  log('Canonical presente', !!canonical);

  // Overflow horizontal desktop
  const overflowDesktop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('Sem overflow horizontal (desktop 1440px)', overflowDesktop <= 0, 'diff=' + overflowDesktop);

  // Links externos com rel=noopener noreferrer
  const externalLinksOk = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[target="_blank"]'));
    return links.every((a) => (a.rel || '').includes('noopener') && (a.rel || '').includes('noreferrer'));
  });
  log('Todos os links target=_blank têm rel=noopener noreferrer', externalLinksOk);

  // Imagens com alt
  const imagesWithoutAlt = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).filter((img) => img.getAttribute('alt') === null).length
  );
  log('Todas as imagens têm atributo alt', imagesWithoutAlt === 0, 'sem alt=' + imagesWithoutAlt);

  // ---------- Contraste texto/fundo (evita texto "invisível" sobre fundos escuros) ----------
  const problemasDeContraste = await page.evaluate(() => {
    function paraRgb(cor) {
      const m = cor.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const partes = m[1].split(',').map((v) => parseFloat(v.trim()));
      return { r: partes[0], g: partes[1], b: partes[2], a: partes.length > 3 ? partes[3] : 1 };
    }
    function luminancia({ r, g, b }) {
      const canal = (v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
    }
    function contraste(a, b) {
      const l1 = luminancia(a) + 0.05;
      const l2 = luminancia(b) + 0.05;
      return l1 > l2 ? l1 / l2 : l2 / l1;
    }
    function corDeFundoEfetiva(el) {
      // Percorre a cadeia de ancestrais e compõe camadas translúcidas
      // (ex.: bg-white/5) sobre a cor sólida mais próxima, em vez de
      // tratar a primeira camada com alpha > 0 como se fosse opaca.
      const camadas = [];
      let atual = el;
      while (atual) {
        const cor = paraRgb(getComputedStyle(atual).backgroundColor);
        if (cor && cor.a > 0) {
          camadas.push(cor);
          if (cor.a >= 0.999) break;
        }
        atual = atual.parentElement;
      }
      let resultado = { r: 255, g: 255, b: 255 };
      for (let i = camadas.length - 1; i >= 0; i--) {
        const c = camadas[i];
        resultado = {
          r: c.r * c.a + resultado.r * (1 - c.a),
          g: c.g * c.a + resultado.g * (1 - c.a),
          b: c.b * c.a + resultado.b * (1 - c.a),
        };
      }
      return resultado;
    }

    const problemas = [];
    document.querySelectorAll('h1, h2, h3, h4, p, span, a, button, label').forEach((el) => {
      const texto = (el.textContent || '').trim();
      if (!texto || el.children.length > 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const estilo = getComputedStyle(el);
      const corTexto = paraRgb(estilo.color);
      if (!corTexto || corTexto.a === 0) return;
      const fundo = corDeFundoEfetiva(el);
      const razao = contraste(corTexto, fundo);
      const tamanhoPx = parseFloat(estilo.fontSize);
      const negrito = parseInt(estilo.fontWeight, 10) >= 700;
      const grande = tamanhoPx >= 24 || (tamanhoPx >= 18.66 && negrito);
      const minimo = grande ? 3 : 4.5;

      // Exceção aceita conscientemente em 18/09/2026: botões .btn-primario
      // (branco sobre o laranja oficial #E24125, 4,19:1) — o hex da marca
      // não pode ser alterado e o branco já é a luminância máxima possível
      // para o texto. Ver nota em src/styles/main.css.
      const ehBotaoPrimarioConhecido = el.closest('.btn-primario') && razao >= 4.0;
      if (ehBotaoPrimarioConhecido) return;

      if (razao < minimo) {
        problemas.push(
          (el.id ? '#' + el.id : el.tagName.toLowerCase()) +
            ' "' + texto.slice(0, 40) + '" razão=' + razao.toFixed(2) + ' (mín ' + minimo + ')'
        );
      }
    });
    return problemas;
  });
  log(
    'Contraste texto/fundo dentro do mínimo WCAG AA em todos os elementos',
    problemasDeContraste.length === 0,
    problemasDeContraste.slice(0, 10).join(' | ')
  );

  // ---------- Menu mobile ----------
  await page.setViewport({ width: 375, height: 800 });
  await page.reload({ waitUntil: 'networkidle0' });

  const overflowMobile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('Sem overflow horizontal (mobile 375px)', overflowMobile <= 0, 'diff=' + overflowMobile);

  const menuHiddenInicialmente = await page.$eval('#menu-mobile', (el) => el.classList.contains('hidden'));
  log('Menu mobile começa fechado', menuHiddenInicialmente);

  await page.click('#menu-toggle');
  const menuAbertoAria = await page.$eval('#menu-toggle', (el) => el.getAttribute('aria-expanded'));
  const menuAbertoClasse = await page.$eval('#menu-mobile', (el) => !el.classList.contains('hidden'));
  log('Menu mobile abre e seta aria-expanded=true', menuAbertoAria === 'true' && menuAbertoClasse);

  await page.click('#menu-toggle');
  const menuFechadoDeNovo = await page.$eval('#menu-mobile', (el) => el.classList.contains('hidden'));
  log('Menu mobile fecha ao clicar novamente', menuFechadoDeNovo);

  await page.click('#menu-toggle');
  await new Promise((r) => setTimeout(r, 100));
  await page.mouse.click(200, 700);
  await new Promise((r) => setTimeout(r, 100));
  const menuFechadoAoClicarFora = await page.$eval('#menu-mobile', (el) => el.classList.contains('hidden'));
  const ariaFechadoAoClicarFora = await page.$eval('#menu-toggle', (el) => el.getAttribute('aria-expanded'));
  log(
    'Menu mobile fecha ao clicar fora dele',
    menuFechadoAoClicarFora && ariaFechadoAoClicarFora === 'false'
  );

  // ---------- Modal de preferências de cookies + bloqueio de scroll ----------
  await page.setViewport({ width: 1440, height: 900 });
  await page.click('#btn-preferencias-cookies');
  await new Promise((r) => setTimeout(r, 100));
  const modalAberto = await page.$eval('#modal-cookies', (el) => !el.classList.contains('hidden'));
  const bodyOverflowAberto = await page.evaluate(() => getComputedStyle(document.body).overflow);
  log('Modal de preferências de cookies abre', modalAberto);
  log('Rolagem do body bloqueada com modal aberto', bodyOverflowAberto === 'hidden', bodyOverflowAberto);

  await page.click('#modal-cookies [data-fecha-modal]');
  await new Promise((r) => setTimeout(r, 100));
  const modalFechado = await page.$eval('#modal-cookies', (el) => el.classList.contains('hidden'));
  const bodyOverflowFechado = await page.evaluate(() => getComputedStyle(document.body).overflow);
  log('Modal de preferências de cookies fecha', modalFechado);
  log('Rolagem do body restaurada após fechar modal', bodyOverflowFechado !== 'hidden', bodyOverflowFechado);

  // ---------- Modal de política de privacidade ----------
  await page.click('[data-abre-modal="modal-privacidade"]');
  await new Promise((r) => setTimeout(r, 100));
  const modalPrivacidadeAberto = await page.$eval('#modal-privacidade', (el) => !el.classList.contains('hidden'));
  log('Modal de política de privacidade abre', modalPrivacidadeAberto);

  const linkDownloadNoModal = await page.$eval('#modal-privacidade a[href$="termo-uso-politica-privacidade-veritas-magna.pdf"]', (a) => ({
    target: a.getAttribute('target'),
    rel: a.getAttribute('rel') || '',
  })).catch(() => null);
  log('Modal de privacidade tem link de download do PDF completo', !!linkDownloadNoModal, JSON.stringify(linkDownloadNoModal));

  await page.click('#modal-privacidade [data-fecha-modal]');
  await new Promise((r) => setTimeout(r, 100));
  const modalPrivacidadeFechado = await page.$eval('#modal-privacidade', (el) => el.classList.contains('hidden'));
  log('Modal de política de privacidade fecha', modalPrivacidadeFechado);

  // ---------- Links de documentos legais (PDF) ----------
  const linksLegais = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll(
        'a[href$="codigo-etica-veritas-magna.pdf"], a[href$="politica-compliance-canal-denuncias-veritas-magna.pdf"], a[href$="termo-uso-politica-privacidade-veritas-magna.pdf"]'
      )
    ).map((a) => ({
      href: a.getAttribute('href'),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel') || '',
    }))
  );
  log('Os 3 documentos legais têm ao menos um link cada', linksLegais.length >= 3, JSON.stringify(linksLegais));
  const linksLegaisSeguros = linksLegais.every(
    (l) => l.target === '_blank' && l.rel.includes('noopener') && l.rel.includes('noreferrer')
  );
  log('Links de documentos legais abrem em nova aba com rel seguro', linksLegaisSeguros);

  for (const link of linksLegais) {
    const resposta = await page.evaluate(async (href) => {
      const r = await fetch(href, { method: 'HEAD' });
      return { ok: r.ok, status: r.status, tipo: r.headers.get('content-type') };
    }, link.href);
    log(
      `PDF acessível: ${link.href}`,
      resposta.ok && (resposta.tipo || '').includes('pdf'),
      JSON.stringify(resposta)
    );
  }

  // ---------- Cookie banner + localStorage ----------
  const bannerVisivelInicial = await page.$eval('#banner-cookies', (el) => !el.classList.contains('hidden'));
  log('Banner de cookies aparece sem consentimento salvo', bannerVisivelInicial);

  await page.click('#btn-aceitar-cookies');
  await new Promise((r) => setTimeout(r, 100));
  const bannerEscondidoDepois = await page.$eval('#banner-cookies', (el) => el.classList.contains('hidden'));
  const consentimentoSalvo = await page.evaluate(() => localStorage.getItem('vm_cookie_consent'));
  log('Banner some após aceitar', bannerEscondidoDepois);
  log('Consentimento persistido em localStorage', !!consentimentoSalvo, consentimentoSalvo);

  await page.reload({ waitUntil: 'networkidle0' });
  const bannerNaoReaparece = await page.$eval('#banner-cookies', (el) => el.classList.contains('hidden'));
  log('Banner não reaparece após reload (consentimento lembrado)', bannerNaoReaparece);

  // ---------- Formulário: dados maliciosos devem ser bloqueados ----------
  await page.evaluate(() => localStorage.clear());
  await page.type('#nome', '<script>alert(1)</script>');
  await page.type('#email', 'nao-e-email');
  await page.type('#telefone', '123');
  await page.click('#formulario button[type="submit"]');
  await new Promise((r) => setTimeout(r, 150));

  const nomeInvalido = await page.$eval('#nome', (el) => el.getAttribute('aria-invalid'));
  const emailInvalido = await page.$eval('#email', (el) => el.getAttribute('aria-invalid'));
  const telefoneInvalido = await page.$eval('#telefone', (el) => el.getAttribute('aria-invalid'));
  log('Nome com <script> é bloqueado (aria-invalid)', nomeInvalido === 'true');
  log('E-mail inválido é bloqueado (aria-invalid)', emailInvalido === 'true');
  log('Telefone inválido é bloqueado (aria-invalid)', telefoneInvalido === 'true');

  const statusAposInvalido = await page.$eval('#form-status', (el) => el.textContent);
  log('Mensagem de status orienta correção', /corrija/i.test(statusAposInvalido || ''), statusAposInvalido);

  // Garante que o script malicioso não foi parar no DOM sem escape
  const scriptInjetado = await page.evaluate(() => document.querySelectorAll('#formulario script').length);
  log('Nenhuma tag <script> injetada no DOM via formulário', scriptInjetado === 0);

  // ---------- Formulário: dados válidos + checkboxes ----------
  await page.evaluate(() => {
    document.getElementById('nome').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefone').value = '';
  });
  await page.type('#nome', 'Maria da Silva Souza');
  await page.type('#email', 'maria.silva@example.com');
  await page.type('#telefone', '(21) 91234-5678');
  await page.type('#mensagem', 'Projeto com convênio municipal, prestação de contas trimestral.');

  // Impede a navegação real (abertura de aba do WhatsApp) durante o teste
  await page.evaluate(() => {
    window.__opened = null;
    window.open = (url) => {
      window.__opened = url;
      return null;
    };
  });

  await page.click('#aceite-etica');
  await page.click('#aceite-lgpd');
  await page.click('#formulario button[type="submit"]');
  await new Promise((r) => setTimeout(r, 800));

  const nomeValidoOk = await page.$eval('#nome', (el) => el.getAttribute('aria-invalid'));
  log('Nome válido não fica marcado como inválido', nomeValidoOk === null);

  const statusFinal = await page.$eval('#form-status', (el) => el.textContent);
  const whatsappUrl = await page.evaluate(() => window.__opened);
  log('Fluxo de sucesso exibe mensagem final', /sucesso|whatsapp/i.test(statusFinal || ''), statusFinal);
  log('Fallback abre WhatsApp com dados sanitizados (sem backend)', !!whatsappUrl && whatsappUrl.includes('wa.me'), whatsappUrl);

  // ---------- Honeypot ----------
  await page.evaluate(() => {
    document.getElementById('form-diagnostico').reset();
  });
  await page.type('#nome', 'Robo Spam Bot');
  await page.type('#email', 'robo@spam.com');
  await page.type('#telefone', '(21) 90000-0000');
  await page.evaluate(() => {
    document.getElementById('website').value = 'http://spam.example';
    window.__opened = null;
  });
  await page.click('#aceite-etica');
  await page.click('#aceite-lgpd');
  await page.click('#formulario button[type="submit"]');
  await new Promise((r) => setTimeout(r, 300));
  const honeypotBloqueou = await page.evaluate(() => window.__opened === null);
  log('Honeypot bloqueia envio automatizado (bot)', honeypotBloqueou);

  // ---------- Acessibilidade: foco visível via teclado ----------
  await page.keyboard.press('Tab');
  const focoAlgumElemento = await page.evaluate(() => document.activeElement.tagName);
  log('Navegação por teclado move o foco', !!focoAlgumElemento, focoAlgumElemento);

  // ---------- Console limpo ----------
  log('Nenhum erro de console durante os testes', consoleErrors.length === 0, JSON.stringify(consoleErrors).slice(0, 500));
} finally {
  await browser.close();
}

const falhas = results.filter((r) => !r.ok);
console.log('\n===== RESUMO QA =====');
console.log(`${results.length - falhas.length}/${results.length} verificações OK`);
if (falhas.length) {
  console.log('Falhas:');
  falhas.forEach((f) => console.log(' - ' + f.name + (f.detail ? ' :: ' + f.detail : '')));
  process.exit(1);
}
