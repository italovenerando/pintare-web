// js/catalog.js

// Objeto para guardar o estado atual da nossa visualização
const catalogState = {
    currentPage: 1,
    filters: {
        categorias: [],
        tags: []
    },
    searchTerm: null
};

document.addEventListener('DOMContentLoaded', () => {

    // 1. Lê o estado da URL
    const urlParams = new URLSearchParams(window.location.search);
    catalogState.searchTerm = urlParams.get('search');

    // 2. Carrega os filtros da barra lateral
    loadFilters();

    // 3. Carrega os produtos iniciais (página 1, sem filtros)
    loadProducts();

    // 4. Adiciona o listener principal na barra de filtros
    const sidebar = document.getElementById('filter-sidebar');
    if (sidebar) {
        // 'change' é o evento perfeito para checkboxes
        sidebar.addEventListener('change', handleFilterChange);
    }

    // 5. Adiciona o listener no botão de limpar
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', handleClearFilters);
    }
});

/**
 * Busca as opções de filtro da API e as renderiza
 */
async function loadFilters() {
    try {
        const response = await fetch(`${API_URL}/filtros`);
        const data = await response.json();

        if (data.categorias) {
            renderCheckboxList(
                data.categorias,
                'container-filtros-categoria',
                'filtro_categoria'
            );
        }
        if (data.tags) {
            // NOTA: Aqui estamos renderizando TODAS as tags juntas.
            // Se você quiser separar "Marcas" de outras tags,
            // precisaria de uma lógica extra aqui ou no back-end.
            renderCheckboxList(
                data.tags,
                'container-filtros-tag',
                'filtro_tag'
            );
        }

    } catch (error) {
        console.error("Erro ao carregar filtros:", error);
    }
}

/**
 * Pega um array de strings e cria checkboxes em um container
 * @param {string[]} items - Array de strings (ex: ["Pistola", "Tanque"])
 * @param {string} containerId - ID do <div> onde os checkboxes entrarão
 * @param {string} filterName - O 'name' do input (ex: "filtro_categoria")
 */
function renderCheckboxList(items, containerId, filterName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Limpa
    items.forEach(item => {
        const displayName = formatTag(item); // Formata a tag para exibição
        const checkboxHTML = `
            <label class="flex items-center">
                <input 
                    name="${filterName}" 
                    value="${item}" 
                    type="checkbox" 
                    class="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary dark:border-zinc-600 dark:bg-zinc-900 dark:ring-offset-zinc-900" 
                />
                <span class="ml-2 text-sm">${displayName}</span> 
            </label>
        `;
        container.insertAdjacentHTML('beforeend', checkboxHTML);
    });
}

/**
 * Chamado quando qualquer checkbox na barra lateral é clicado
 */
function handleFilterChange() {
    // 1. Lê todos os filtros do DOM
    catalogState.filters.categorias = getCheckedValues('filtro_categoria');
    catalogState.filters.tags = getCheckedValues('filtro_tag');

    // 2. Reseta para a página 1, já que os filtros mudaram
    catalogState.currentPage = 1;

    // 3. Recarrega os produtos
    loadProducts();
}

/**
 * Limpa os filtros e recarrega
 */
function handleClearFilters() {
    // Limpa os checkboxes no DOM
    document.querySelectorAll('#filter-sidebar input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });

    // Limpa o estado
    catalogState.filters.categorias = [];
    catalogState.filters.tags = [];
    catalogState.currentPage = 1;

    // Recarrega
    loadProducts();
}

/**
 * Função chamada pela paginação para mudar de página
 */
function goToPage(pagina) {
    catalogState.currentPage = pagina;
    loadProducts();
}

/**
 * Constrói a string de query para a API a partir do estado
 */
function buildQueryString() {
    const { currentPage, filters, searchTerm } = catalogState;

    let params = new URLSearchParams();
    params.append('pagina', currentPage);
    params.append('limite', 9); // Nosso limite padrão

    if (filters.categorias.length > 0) {
        params.append('categorias', filters.categorias.join(','));
    }
    if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
    }

    if (searchTerm) {
        params.append('search', searchTerm);
    }

    return params.toString(); // ex: "pagina=1&categorias=Filtro%20A&tags=Marca%20B"
}

/**
 * Busca os produtos da API e os renderiza no grid
 */
async function loadProducts() {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    productGrid.innerHTML = '<p class="col-span-full text-center p-8">Carregando produtos...</p>';

    // Limpa a paginação antiga
    document.getElementById('pagination-controls').innerHTML = '';

    // Monta a URL com base no estado atual
    const queryString = buildQueryString();
    const url = `${API_URL}/produtos?${queryString}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.produtos && data.produtos.length > 0) {
            renderProducts(data.produtos);
            renderPagination(data.totalPaginas, data.paginaAtual);
        } else {
            productGrid.innerHTML = '<p class="col-span-full text-center p-8">Nenhum produto encontrado com esses filtros.</p>';
        }

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
        productGrid.innerHTML = '<p class="col-span-full text-center p-8 text-red-500">Falha ao carregar produtos. Tente novamente.</p>';
    }
}

/**
 * Renderiza os cards de produto
 */
function renderProducts(produtos) {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';
    produtos.forEach(produto => {
        const cardHTML = createCardHTML(produto);
        productGrid.insertAdjacentHTML('beforeend', cardHTML);
    });
}

/**
 * Cria o HTML do card (VERSÃO CORRETA E COMPLETA)
 */
function createCardHTML(produto) {
    const imageUrl = produto.imagem_url || 'https://via.placeholder.com/400x300?text=Sem+Imagem';
    const nomeProdutoEscapado = produto.nome.replace(/'/g, "\\'");

    return `
        <div class="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 transition-shadow duration-300 hover:shadow-lg">
            
            <a href="product_details.html?id=${produto.id}" class="h-56 w-full block bg-contain bg-no-repeat bg-center" 
               style="background-image: url('${imageUrl}');"
               aria-label="Ver detalhes de ${produto.nome}">
            </a>
            
            <div class="flex flex-1 flex-col p-6">
                <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
                    <a href="product_details.html?id=${produto.id}" class="hover:underline">${produto.nome}</a>
                </h3>
                <p class="mt-2 flex-grow text-sm text-zinc-600 dark:text-zinc-400">
                    ${produto.descricao_curta || 'Ver detalhes...'}
                </p>
                
                <button 
                    onclick="CartManager.addToCart(${produto.id}, '${nomeProdutoEscapado}')"
                    class="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                    Adicionar ao Orçamento
                </button>
            </div>
        </div>
    `;
}

/**
 * Renderiza a paginação
 */
function renderPagination(totalPaginas, paginaAtual) {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    container.innerHTML = '';

    // Botão "Anterior"
    container.innerHTML += `
        <li>
            <a href="#" onclick="${paginaAtual === 1 ? 'event.preventDefault()' : `goToPage(${paginaAtual - 1})`}" 
               class="flex items-center justify-center px-4 h-10 ml-0 leading-tight rounded-l-lg ${paginaAtual === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'}">
                Anterior
            </a>
        </li>
    `;

    // Botões de Número
    for (let i = 1; i <= totalPaginas; i++) {
        const isCurrent = (i === paginaAtual);
        container.innerHTML += `
            <li>
                <a href="#" onclick="${isCurrent ? 'event.preventDefault()' : `goToPage(${i})`}" 
                   class="flex items-center justify-center px-4 h-10 leading-tight ${isCurrent ? 'z-10 bg-primary/10 text-primary border border-primary dark:bg-primary/20' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'}">
                    ${i}
                </a>
            </li>
        `;
    }

    // Botão "Próximo"
    container.innerHTML += `
        <li>
            <a href="#" onclick="${paginaAtual === totalPaginas ? 'event.preventDefault()' : `goToPage(${paginaAtual + 1})`}" 
               class="flex items-center justify-center px-4 h-10 leading-tight rounded-r-lg ${paginaAtual === totalPaginas ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'}">
                Próximo
            </a>
        </li>
    `;
}

/**
 * Pega os valores de checkboxes marcados
 * @param {string} name - O atributo 'name' dos checkboxes
 */
function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`))
                .map(cb => cb.value);
}