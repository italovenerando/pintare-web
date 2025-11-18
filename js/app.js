// js/app.js
/**
 * Função principal que é executada quando a página termina de carregar
 */
document.addEventListener('DOMContentLoaded', () => {
    loadHeaderAndFooter();
});

/**
 * Formata tags do banco (ex: "pistola_gravidade") para exibição (ex: "Pistola Gravidade")
 */
function formatTag(tag) {
    if (!tag) return '';
    // 1. Substitui underscores por espaços
    let spacedTag = tag.replace(/_/g, ' ');
    // 2. Coloca em "Title Case" (primeira letra de cada palavra maiúscula)
    return spacedTag
        .split(' ')
        .map(word => {
            if (word.length > 0) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        })
        .join(' ');
}

/**
 * Carrega o header, o footer, E O MODAL, e depois executa a lógica global
 */
async function loadHeaderAndFooter() {
    // Carrega o header, o footer e o modal em paralelo
    await Promise.all([
        loadComponent('_header.html', 'header-placeholder'),
        loadComponent('_footer.html', 'footer-placeholder'),
        loadComponent('_auth_modal.html', 'modal-placeholder')
    ]);

    // SÓ DEPOIS que o HTML for injetado, executamos a lógica
    runGlobalLogic();
}

/**
 * Função genérica para buscar um HTML e injetá-lo em um placeholder
 */
async function loadComponent(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Não foi possível carregar ${url}`);

        const html = await response.text();
        const placeholder = document.getElementById(elementId);

        if (placeholder) {
            placeholder.innerHTML = html;
        } else {
            // Se você vir isso no console, você esqueceu o placeholder no HTML
            console.warn(`Placeholder '${elementId}' não encontrado.`);
        }
    } catch (error) {
        console.error(error);
        const placeholder = document.getElementById(elementId);
        if (placeholder) {
            placeholder.innerHTML = `<p class="text-red-500 text-center">Erro ao carregar componente: ${url}</p>`;
        }
    }
}

/**
 * Executa toda a lógica dinâmica que depende do HTML carregado
 */
function runGlobalLogic() {
    // 1. Atualiza o ícone do carrinho (do cart-manager.js)
    if (window.CartManager) {
        CartManager.updateCartIcon();
    }

    // 2. Carrega o menu de produtos dinâmico
    loadProductMenu();

    // 3. Configura os botões do header (avatar, etc.)
    setupHeaderButtons();

    // 4. Configura a barra de pesquisa
    setupSearch();

    // 5. INICIA a lógica do modal (do auth.js)
    // Isso anexa todos os listeners internos do modal
    if (typeof initAuthModal === 'function') {
        initAuthModal();
    } else {
        console.error("ERRO: initAuthModal() não foi encontrada. Verifique se auth.js está sendo carregado ANTES de app.js");
    }
}

/**
 * Busca as categorias/tags e preenche o menu de produtos
 */
async function loadProductMenu() {
    const menuContainer = document.getElementById('product-menu-dropdown');
    if (!menuContainer) return; // Se não estiver no header, sai

    try {
        const response = await fetch(`${API_URL}/filtros`);
        const data = await response.json();
        let menuHtml = '';

        // Adiciona as Categorias
        if (data.categorias && data.categorias.length > 0) {
            data.categorias.forEach(cat => {
                const url = `product_catalog.html?categorias=${encodeURIComponent(cat)}`;
                const displayName = formatTag(cat);
                menuHtml += `<a href="${url}" class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary dark:text-neutral-300 dark:hover:bg-neutral-800">${displayName}</a>`;
            });
        }

        // Adiciona as Tags (com um divisor)
        if (data.tags && data.tags.length > 0) {
            menuHtml += '<div class="border-t border-neutral-100 dark:border-neutral-800 my-1"></div>';
            data.tags.forEach(tag => {
                if (tag !== 'mais_vendido' && tag !== 'lancamento') { // Filtra tags
                    const url = `product_catalog.html?tags=${encodeURIComponent(tag)}`;
                    const displayName = formatTag(tag);
                    menuHtml += `<a href="${url}" class="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-primary dark:text-neutral-300 dark:hover:bg-neutral-800">${displayName}</a>`;
                }
            });
        }

        menuContainer.innerHTML = menuHtml || '<span class="block px-4 py-2 text-sm text-neutral-400">Nenhuma categoria.</span>';

    } catch (error) {
        console.error("Erro ao carregar menu de produtos:", error);
        menuContainer.innerHTML = '<span class="block px-4 py-2 text-sm text-red-500">Erro ao carregar menu.</span>';
    }
}

/**
 * Configura a barra de pesquisa do header
 */
function setupSearch() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');

    if (!searchForm || !searchInput) return;

    // 1. Preenche a barra de pesquisa se já estivermos em uma página de pesquisa
    const urlParams = new URLSearchParams(window.location.search);
    searchInput.value = urlParams.get('search') || '';

    // 2. Adiciona o listener para o envio (clique ou Enter)
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();

        // Redireciona para a página de catálogo com o termo da pesquisa
        // (Isso vai recarregar a página product_catalog.html)
        window.location.href = `product_catalog.html?search=${encodeURIComponent(searchTerm)}`;
    });
}


/**
 * Configura toda a lógica de login/logout do avatar
 */
function setupHeaderButtons() {
    const avatarButton = document.getElementById('avatar-button');
    const avatarDropdownMenu = document.getElementById('avatar-dropdown-menu');
    const notAuthenticatedOptions = document.getElementById('not-authenticated-options');
    const authenticatedOptions = document.getElementById('authenticated-options');

    if (!avatarButton || !avatarDropdownMenu || !notAuthenticatedOptions || !authenticatedOptions) {
        console.warn("Elementos do dropdown do avatar não encontrados.");
        return;
    }

    // --- Lógica de Estado (Logado / Deslogado) ---
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const isAuthenticated = !!token && !!user;

    if (isAuthenticated) {
        notAuthenticatedOptions.classList.add('hidden');
        authenticatedOptions.classList.remove('hidden');
    } else {
        notAuthenticatedOptions.classList.remove('hidden');
        authenticatedOptions.classList.add('hidden');
    }

    // --- Listeners dos Botões do Header ---

    // Botões "Login" e "Cadastro" (no dropdown)
    const loginBtn = notAuthenticatedOptions.querySelector('a[href="#"]');
    const registerBtn = notAuthenticatedOptions.querySelectorAll('a[href="#"]')[1];

    // Botão "Solicitar um orçamento" (principal)
    const quoteButton = document.getElementById('btn-solicitar-orcamento');

    // As funções openModal() e closeModal() são definidas no auth.js
    // Verificamos se elas existem antes de usá-las
    if (typeof openModal === 'function') {
        if (loginBtn) loginBtn.onclick = (e) => {
            e.preventDefault();
            openModal('login');
        };
        if (registerBtn) registerBtn.onclick = (e) => {
            e.preventDefault();
            openModal('register');
        };
    } else {
        console.error("ERRO: openModal() não foi definida. Verifique auth.js");
    }

    if (quoteButton) {
        quoteButton.onclick = (e) => {
            e.preventDefault();

            // Tenta pegar o nome do usuário logado
            const user = JSON.parse(localStorage.getItem('user'));
            // Se estiver logado, usa o nome dele, senão usa "Fulano"

            const fone = '5511943875028'; // 55 (código do Brasil) + seu número
            const msg = user ? `Oi, sou o ${user.nome}, gostaria de falar com um atendente.` : `Oi, gostaria de falar com um atendente.`;
            const url = `https://wa.me/${fone}?text=${encodeURIComponent(msg)}`;

            window.open(url, '_blank'); // Abre o WhatsApp em uma nova aba
        };
    }
    // Ação de Logout
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('pintareCart');
            window.location.reload();
        };
    }

    // Lógica de clique do Avatar
    avatarButton.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarDropdownMenu.classList.toggle('active');
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (event) => {
        if (avatarDropdownMenu && avatarDropdownMenu.classList.contains('active') && !avatarButton.contains(event.target) && !avatarDropdownMenu.contains(event.target)) {
            avatarDropdownMenu.classList.remove('active');
        }
    });
}