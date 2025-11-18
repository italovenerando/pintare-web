// js/product-details.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega o ID da URL (ex: product_details.html?id=5)
    const productId = getProductIdFromUrl();

    if (!productId) {
        // Se não tiver ID, mostra um erro
        renderError("Produto não encontrado.");
        return;
    }

    // 2. Busca os dados do produto na API
    fetchProductDetails(productId);
});

/**
 * Pega o parâmetro 'id' da URL
 */
function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

/**
 * Busca os dados de um produto específico na API
 */
async function fetchProductDetails(id) {
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`);

        if (!response.ok) {
            throw new Error(`Erro: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.produto) {
            // 3. Se deu certo, renderiza o produto
            renderProduct(data.produto);
        } else {
            renderError("Produto não encontrado.");
        }
    } catch (err) {
        console.error("Falha ao buscar produto:", err);
        renderError("Não foi possível carregar os detalhes do produto.");
    }
}

/**
 * Exibe uma mensagem de erro na página
 */
function renderError(message) {
    const mainContainer = document.getElementById('product-main-container');
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div class="text-center py-24">
                <h2 class="text-3xl font-bold text-red-500">Erro</h2>
                <p class="text-lg text-neutral-600 dark:text-neutral-400">${message}</p>
                <a href="product_catalog.html" class="mt-6 inline-block rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white">
                    Voltar ao Catálogo
                </a>
            </div>
        `;
    }
}

/**
 * Preenche o HTML da página com os dados do produto
 */
function renderProduct(produto) {
    // Preenche os textos
    document.getElementById('breadcrumb-category').innerText = produto.categoria || 'Produtos';
    document.getElementById('product-name').innerText = produto.nome;

    // Se tiver descrição longa, usa, senão, a curta
    const descriptionHtml = (produto.descricao_longa || produto.descricao_curta || 'Nenhuma descrição disponível.')
        .replace(/\n/g, '<br>'); // Converte quebras de linha em <br>

    document.getElementById('product-description-container').innerHTML = descriptionHtml;

    // Configura a galeria de imagens
    setupImageGallery(produto.imagens);

    // Configura o botão "Adicionar ao Orçamento"
    const quoteButtonContainer = document.getElementById('quote-form-container');
    if (quoteButtonContainer) {
        const nomeProdutoEscapado = produto.nome.replace(/'/g, "\\'");
        quoteButtonContainer.innerHTML = `
            <h3 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Solicitar Orçamento</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
                Adicione este item à sua lista para solicitar uma cotação completa.
            </p>
            <button 
                onclick="CartManager.addToCart(${produto.id}, '${nomeProdutoEscapado}')"
                class="w-full flex items-center justify-center rounded bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary/90">
                Adicionar à Lista de Orçamento
            </button>
        `;
    }
}

/**
 * Configura a galeria de imagens (imagem principal + thumbnails)
 */
function setupImageGallery(images) {
    const mainImageContainer = document.getElementById('product-gallery-main');
    const thumbnailsContainer = document.getElementById('product-gallery-thumbnails');

    if (!mainImageContainer || !thumbnailsContainer) return;

    // Limpa os placeholders
    mainImageContainer.innerHTML = '';
    thumbnailsContainer.innerHTML = '';

    if (!images || images.length === 0) {
        // Se não tiver imagens, mostra um placeholder
        mainImageContainer.innerHTML = `<div class="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg"><span class="text-gray-500">Sem Imagem</span></div>`;
        return;
    }

    // Define a imagem principal (a primeira da lista, ordem 0)
    mainImageContainer.innerHTML = `
        <div class="w-full h-full bg-cover bg-center rounded-lg" 
             style="background-image: url('${images[0].imagem_url}');"
             aria-label="Imagem principal do produto">
        </div>
    `;

    // Cria os thumbnails
    images.forEach(img => {
        const thumbHtml = `
            <div class="col-span-1 row-span-1 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary" 
                 onclick="changeMainImage('${img.imagem_url}')">
                <div class="w-full h-full bg-cover bg-center" 
                     style="background-image: url('${img.imagem_url}');">
                </div>
            </div>
        `;
        thumbnailsContainer.insertAdjacentHTML('beforeend', thumbHtml);
    });
}

/**
 * Função global para trocar a imagem principal
 * (Precisa ser global para ser chamada pelo onclick)
 */
function changeMainImage(newImageUrl) {
    const mainImageContainer = document.getElementById('product-gallery-main');
    if (mainImageContainer) {
        // Pega o div dentro do container e muda o estilo
        mainImageContainer.firstElementChild.style.backgroundImage = `url('${newImageUrl}')`;
    }
}