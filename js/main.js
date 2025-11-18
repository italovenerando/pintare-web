const API_URL = 'http://localhost:3000/api';

// Função genérica para criar o HTML de um card de produto
function criarCardProduto(produto) {
    // Formata o preço para o padrão brasileiro (R$ 1.200,00)
    const precoFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.preco);

    // Verifica se tem alguma tag de destaque para mostrar o "selinho" no canto da imagem
    let seloDestaque = '';
    if (produto.tags && produto.tags.includes('lancamento')) {
        seloDestaque = '<div class="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">Novo</div>';
    } else if (produto.tags && produto.tags.includes('mais_vendido')) {
        seloDestaque = '<div class="absolute top-2 right-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded">Top Seller</div>';
    }

    // Retorna o HTML exato que você já usava, mas com as variáveis do produto
    // Adicionei um link <a> envolvendo o card para ir para a página de detalhes
    return `
        <div class="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-4 flex-shrink-0 transition-all duration-300 hover:scale-105">
            <a href="product_details.html?id=${produto.id}" class="block">
                <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 group bg-white dark:bg-neutral-900">
                    <div class="relative">
                        <img alt="${produto.nome}" class="w-full h-56 object-cover" src="${produto.imagem_url || 'https://via.placeholder.com/300x200?text=Sem+Imagem'}" />
                        ${seloDestaque}
                    </div>
                    <div class="p-4">
                        <h3 class="text-lg font-semibold text-neutral-900 dark:text-white truncate" title="${produto.nome}">
                            ${produto.nome}
                        </h3>
                        <p class="text-sm text-neutral-500 dark:text-neutral-400 truncate mb-2">${produto.descricao_curta || ''}</p>
                        <p class="text-xl font-bold text-primary">Ver mais</p>
                    </div>
                </div>
            </a>
        </div>
    `;
}

// Função principal para carregar uma seção específica
async function carregarSecao(tag, elementoId) {
    const container = document.getElementById(elementoId);
    if (!container) return; // Se não achar o elemento na página, não faz nada

    try {
        // Mostra um "carregando..." enquanto os dados não chegam
        container.innerHTML = '<div class="text-center w-full p-4">Carregando produtos...</div>';

        // Faz a chamada ao nosso Back-end
        const response = await fetch(`${API_URL}/produtos/home?tag=${tag}`);
        const dados = await response.json();

        if (dados.produtos && dados.produtos.length > 0) {
            // Limpa o container e adiciona os cards reais
            container.innerHTML = dados.produtos.map(prod => criarCardProduto(prod)).join('');
        } else {
            container.innerHTML = '<div class="text-center w-full p-4 opacity-50">Nenhum produto encontrado nesta categoria.</div>';
        }
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
        container.innerHTML = '<div class="text-red-500 text-center w-full p-4">Erro ao carregar produtos. Verifique se o servidor está rodando.</div>';
    }
}

// Função para rolar o carrossel manualmente pelos botões
function scrollCarousel(containerId, direction) {
    const container = document.getElementById(containerId);
    if (container) {
        // Pega a largura de um card (aproximadamente) ou um valor fixo
        // Vamos rolar a largura da tela ou 300px
        const scrollAmount = container.clientWidth / 2; // Rola metade da tela

        if (direction === 'left') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
}

// Quando a página terminar de carregar, executa as buscas
document.addEventListener('DOMContentLoaded', () => {
    // Carrega as 3 seções da Home
    carregarSecao('mais_vendido', 'container-mais-vendidos');
    carregarSecao('alta_produtividade', 'container-alta-produtividade');
    carregarSecao('hvlp', 'container-hvlp');
});