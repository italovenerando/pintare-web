// js/cart.js

// Usamos o CartManager que já criamos e importamos
document.addEventListener('DOMContentLoaded', () => {
    // 1. Pega os elementos principais da página
    const emptyContainer = document.getElementById('cart-empty-container');
    const fullContainer = document.getElementById('cart-full-container');
    const itemList = document.getElementById('cart-item-list');
    const btnFinalizar = document.getElementById('btn-finalizar-orcamento');

    // 2. Carrega o estado do carrinho
    const cart = CartManager.getCart();

    if (cart.length === 0) {
        // CARRINHO VAZIO
        emptyContainer.classList.remove('hidden');
        fullContainer.classList.add('hidden');
    } else {
        // CARRINHO CHEIO
        emptyContainer.classList.add('hidden');
        fullContainer.classList.remove('hidden');
        renderCartItems(cart, itemList);
    }

    // 3. Adiciona os listeners
    btnFinalizar.addEventListener('click', handleFinalizarOrcamento);
});

/**
 * Renderiza os itens do carrinho na lista <ul>
 */
function renderCartItems(cart, itemListElement) {
    itemListElement.innerHTML = ''; // Limpa a lista

    cart.forEach(item => {
        const li = document.createElement('li');
        li.className = 'flex items-center py-6 px-4 sm:px-6';
        // (O HTML é baseado no seu full_cart.html)
        // (Ainda não temos imagens, então usaremos um placeholder)
        li.innerHTML = `
            <div class="flex-shrink-0">
                <img alt="${item.nome}" class="h-24 w-24 rounded-lg object-cover" src="https://via.placeholder.com/100x100?text=Produto"/>
            </div>
            <div class="ml-6 flex flex-1 flex-col">
                <div class="flex justify-between">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">${item.nome}</h3>
                    </div>
                    <div class="flex items-center">
                        <div class="flex items-center rounded border border-neutral-300 dark:border-neutral-600">
                            <button onclick="updateQuantity(${item.id}, -1)" class="px-2 py-1 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-l">-</button>
                            <input class="w-12 border-x border-neutral-300 dark:border-neutral-600 bg-transparent text-center font-medium" type="text" value="${item.quantity}" readonly />
                            <button onclick="updateQuantity(${item.id}, 1)" class="px-2 py-1 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-r">+</button>
                        </div>
                    </div>
                </div>
                <div class="mt-4 flex items-end justify-end">
                    <button onclick="removeItem(${item.id})" class="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500">
                        <span class="material-symbols-outlined text-base">delete</span>
                        Remover
                    </button>
                </div>
            </div>
        `;
        itemListElement.appendChild(li);
    });
}

/**
 * Atualiza a quantidade de um item
 */
function updateQuantity(produtoId, change) {
    let cart = CartManager.getCart();
    const itemIndex = cart.findIndex(item => item.id === produtoId);

    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            // Se a quantidade for 0 ou menos, remove o item
            cart.splice(itemIndex, 1);
        }
        localStorage.setItem('pintareCart', JSON.stringify(cart));
        window.location.reload(); // Recarrega a página para mostrar a mudança
    }
}

/**
 * Remove um item do carrinho
 */
function removeItem(produtoId) {
    let cart = CartManager.getCart();
    cart = cart.filter(item => item.id !== produtoId); // Filtra, mantendo todos *exceto* este
    localStorage.setItem('pintareCart', JSON.stringify(cart));
    window.location.reload(); // Recarrega a página
}

/**
 * Lida com o clique de "Solicitar Orçamento"
 */
async function handleFinalizarOrcamento() {
    const token = localStorage.getItem('token');

    // 1. O usuário está logado?
    if (!token) {
        alert("Você precisa fazer login para solicitar um orçamento.");
        openModal('login'); // Abre o modal de login
        return;
    }

    // 2. O usuário está logado. Pega o carrinho.
    const cart = CartManager.getCart();
    if (cart.length === 0) {
        alert("Seu carrinho está vazio.");
        return;
    }

    const btnFinalizar = document.getElementById('btn-finalizar-orcamento');
    btnFinalizar.innerText = "Enviando...";
    btnFinalizar.disabled = true;

    try {
        // 3. Envia para a API que criamos
        const response = await fetch(`${API_URL}/orcamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ itens: cart })
        });

        const result = await response.json();

        if (response.ok) {
            // 4. SUCESSO!
            alert(`Orçamento #${result.orcamentoId} solicitado com sucesso! Nossa equipe entrará em contato.`);

            // Limpa o carrinho
            localStorage.removeItem('pintareCart');

            // Redireciona para o WhatsApp (como sugerimos)
            const waMessage = `Olá! Acabei de enviar o orçamento Nº #${result.orcamentoId} pelo site.`;
            const waURL = `https://wa.me/5511999998888?text=${encodeURIComponent(waMessage)}`; // <-- TROQUE PELO SEU NÚMERO

            // Redireciona o usuário
            window.location.href = waURL;

        } else {
            // 5. Erro da API
            alert(`Erro: ${result.message}`);
            btnFinalizar.innerText = "Solicitar Orçamento";
            btnFinalizar.disabled = false;
        }

    } catch (err) {
        // 6. Erro de rede
        alert("Erro de conexão. Não foi possível enviar o orçamento.");
        btnFinalizar.innerText = "Solicitar Orçamento";
        btnFinalizar.disabled = false;
    }
}