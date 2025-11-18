// js/admin.js

const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

// --- Seletores do DOM ---
const formProduto = document.getElementById('form-produto');
const formTitulo = document.getElementById('form-titulo');
const inputProdutoId = document.getElementById('produto-id');
const tabelaCorpo = document.getElementById('tabela-produtos-corpo');

// --- O PORTEIRO (GATE) ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. O usuário não está logado?
    // 2. O usuário está logado, MAS não é admin?
    if (!token || !user || !user.isAdmin) {
        alert('Acesso negado. Você será redirecionado para a página inicial.');
        window.location.href = 'index.html';
        return; // Para a execução do script
    }

    // Se chegou até aqui, o usuário é Admin.
    console.log('Acesso de Admin concedido. Carregando painel...');

    // Carrega os produtos na tabela
    carregarProdutosAdmin();

    // Adiciona o listener para o formulário
    formProduto.addEventListener('submit', handleFormSubmit);
});

// --- FUNÇÃO 1: Carregar Produtos na Tabela (Read) ---
async function carregarProdutosAdmin() {
    tabelaCorpo.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-neutral-500">Carregando produtos...</td></tr>';

    try {
        // Usamos a rota pública mesmo, não precisa de token para LER produtos
        const response = await fetch(`${API_URL}/produtos`);
        const dados = await response.json();

        if (dados.produtos && dados.produtos.length > 0) {
            tabelaCorpo.innerHTML = ''; // Limpa a tabela
            dados.produtos.forEach(produto => {
                const tr = document.createElement('tr');
                tr.classList.add('border-b', 'dark:border-neutral-700');
                tr.innerHTML = `
                    <td class="p-4">${produto.nome}</td>
                    <td class="p-4">${produto.tags}</td>
                    <td class="p-4">${produto.categoria || 'N/A'}</td>
                    <td class="p-4 space-x-2">
                        <button onclick="editarProduto(${produto.id})" class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">Editar</button>
                        <button onclick="deletarProduto(${produto.id})" class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">Excluir</button>
                    </td>
                `;
                tabelaCorpo.appendChild(tr);
            });
        } else {
            tabelaCorpo.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-neutral-500">Nenhum produto cadastrado.</td></tr>';
        }
    } catch (err) {
        tabelaCorpo.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">Erro ao carregar produtos: ${err.message}</td></tr>`;
    }
}

// --- FUNÇÃO 2: Lidar com o Formulário (Create / Update) ---
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(formProduto);
    const produtoParcial = Object.fromEntries(formData.entries());

    // 1. Pega os dados básicos (exceto imagens)
    const produto = {
        nome: produtoParcial.nome,
        descricao_curta: produtoParcial.descricao_curta,
        descricao_longa: produtoParcial.descricao_longa,
        categoria: produtoParcial.categoria,
        tags: produtoParcial.tags,
        destaque: !!produtoParcial.destaque // (Se você adicionar um checkbox de destaque)
    };

    // 2. Coleta as imagens em um array
    produto.imagens = [
            produtoParcial['imagem-1'],
            produtoParcial['imagem-2'],
            produtoParcial['imagem-3'],
            produtoParcial['imagem-4']
        ]
        .filter(url => url)
        .map(url => normalizarCaminhoImagem(url)); // Filtra para remover campos vazios


    const produtoId = inputProdutoId.value;
    let metodo, url;

    if (produtoId) {
        metodo = 'PUT';
        url = `${API_URL}/admin/produtos/${produtoId}`;
    } else {
        metodo = 'POST';
        url = `${API_URL}/admin/produtos`;
    }

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(produto) // Envia o objeto completo
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            limparFormulario();
            carregarProdutosAdmin();
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        alert(`Erro de conexão: ${err.message}`);
    }
}

// --- FUNÇÃO 3: Popular o Formulário para Edição ---
async function editarProduto(id) {
    console.log(`Editando produto ${id}`);

    // A API agora retorna o produto COM o array de imagens
    try {
        const response = await fetch(`${API_URL}/produtos/${id}`);
        const dados = await response.json();

        if (response.ok && dados.produto) {
            const produto = dados.produto;

            // Preenche o formulário
            formTitulo.innerText = 'Editando Produto';
            inputProdutoId.value = produto.id;
            document.getElementById('produto-nome').value = produto.nome;
            // document.getElementById('produto-preco').value = produto.preco; // Já removemos
            document.getElementById('produto-descricao-curta').value = produto.descricao_curta || '';
            document.getElementById('produto-descricao-longa').value = produto.descricao_longa || '';
            document.getElementById('produto-categoria').value = produto.categoria || '';
            document.getElementById('produto-tags').value = produto.tags || '';

            // Limpa os campos de imagem antes de preencher
            document.getElementById('produto-imagem-1').value = '';
            document.getElementById('produto-imagem-2').value = '';
            document.getElementById('produto-imagem-3').value = '';
            document.getElementById('produto-imagem-4').value = '';

            // Preenche os campos de imagem (até 4)
            if (produto.imagens && produto.imagens.length > 0) {
                produto.imagens.forEach((imagem, index) => {
                    if (index < 4) { // Garante que não passemos de 4 campos
                        document.getElementById(`produto-imagem-${index + 1}`).value = imagem.imagem_url;
                    }
                });
            }

            window.scrollTo(0, 0);
        } else {
            alert('Produto não encontrado.');
        }
    } catch (err) {
        alert(`Erro ao buscar produto: ${err.message}`);
    }
}

// --- FUNÇÃO 4: Deletar um Produto (Delete) ---
async function deletarProduto(id) {
    // Pede confirmação
    if (!confirm(`Tem certeza que deseja excluir o produto ID ${id}? Esta ação não pode ser desfeita.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/produtos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}` // Envia o "crachá"
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            carregarProdutosAdmin(); // Recarrega a tabela
        } else {
            alert(`Erro: ${result.message}`);
        }
    } catch (err) {
        alert(`Erro de conexão: ${err.message}`);
    }
}

// --- FUNÇÃO UTILITÁRIA: Limpar o formulário ---
function limparFormulario() {
    formProduto.reset();
    inputProdutoId.value = '';
    formTitulo.innerText = 'Adicionar Novo Produto';
    // Garante que os campos de imagem sejam limpos (o reset() às vezes falha)
    document.getElementById('produto-imagem-1').value = '';
    document.getElementById('produto-imagem-2').value = '';
    document.getElementById('produto-imagem-3').value = '';
    document.getElementById('produto-imagem-4').value = '';
}

function normalizarCaminhoImagem(caminho) {
    if (!caminho) return "";
    return caminho.replace(/\\/g, "/");
}