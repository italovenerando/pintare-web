require('dotenv').config(); // Carrega variáveis de ambiente (vamos criar o arquivo .env jajá)
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Importa nossa conexão com o banco

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares (pré-configurações)
app.use(cors()); // Libera acesso externo (do front-end)
app.use(express.json()); // Permite que o servidor entenda JSON enviado no corpo das requisições

// Rota de teste inicial
app.get('/', (req, res) => {
    res.json({ message: 'Backend Pintare está operacional!' });
});

// --- ROTAS DE PRODUTOS (Públicas) ---

// 1. Pegar TODOS os produtos (para o catálogo completo)
app.get('/api/produtos', (req, res) => {
    // Podemos aceitar filtros via query string, ex: /api/produtos?categoria=pistola
    let sql = 'SELECT * FROM produtos';
    const params = [];

    if (req.query.categoria) {
        sql += ' WHERE categoria = ?';
        params.push(req.query.categoria);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ produtos: rows });
    });
});

// 2. Pegar produtos para a HOME (filtrados por tags)
// Exemplo de uso: /api/produtos/home?tag=mais_vendido
app.get('/api/produtos/home', (req, res) => {
    const tag = req.query.tag;
    if (!tag) {
        return res.status(400).json({ error: 'É necessário informar uma tag (ex: ?tag=mais_vendido)' });
    }

    // Usamos LIKE para verificar se a tag está na lista de tags do produto
    const sql = "SELECT * FROM produtos WHERE tags LIKE ?";
    const params = [`%${tag}%`];

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ produtos: rows });
    });
});

// 3. Pegar UM produto específico (para a página de detalhes)
app.get('/api/produtos/:id', (req, res) => {
    const sql = 'SELECT * FROM produtos WHERE id = ?';
    const params = [req.params.id];

    db.get(sql, params, (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }
        res.json({ produto: row });
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});