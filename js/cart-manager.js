// js/cart-manager.js

// Este arquivo agora SÓ define o objeto CartManager.
// O app.js será responsável por chamá-lo.

var CartManager = {
    /**
     * Adiciona um produto ao carrinho no localStorage.
     */
    addToCart: function(produtoId, produtoNome, imageUrl) {
        let cart = this.getCart();

        const itemIndex = cart.findIndex(item => item.id === produtoId);

        if (itemIndex > -1) {
            cart[itemIndex].quantity += 1;
        } else {
            cart.push({
                id: produtoId,
                nome: produtoNome,
                quantity: 1,
                imagem: imageUrl
            });
        }

        localStorage.setItem('pintareCart', JSON.stringify(cart));
        this.updateCartIcon();
        alert(`"${produtoNome}" foi adicionado ao seu orçamento!`);
    },

    /**
     * Pega o carrinho atual do localStorage.
     * @returns {Array} O array de itens do carrinho.
     */
    getCart: function() {
        const cartData = localStorage.getItem('pintareCart');
        return cartData ? JSON.parse(cartData) : [];
    },

    /**
     * Retorna o número total de ITENS no carrinho.
     */
    getCartCount: function() {
        let cart = this.getCart();
        return cart.reduce((total, item) => total + item.quantity, 0);
    },

    /**
     * Atualiza o <span> com o número de itens no carrinho.
     */
    updateCartIcon: function() {
        const count = this.getCartCount();
        const cartIconCounter = document.getElementById('cart-count');

        if (cartIconCounter) {
            if (count > 0) {
                cartIconCounter.innerText = count;
                cartIconCounter.classList.remove('hidden');
            } else {
                cartIconCounter.innerText = '0';
                cartIconCounter.classList.add('hidden');
            }
        }
    }
};