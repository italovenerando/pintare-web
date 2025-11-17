require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// 1. REGISTRO DE NOVO USUÁRIO (PF ou PJ)
app.post('/api/auth/registrar', async(req, res) => {
    const { tipo, email, senha, ...dados } = req.body; // Pega 'tipo', 'email', 'senha' e o resto dos dados

    if (!email || !senha || !tipo) {
        return res.status(400).json({ message: 'Email, senha e tipo são obrigatórios.' });
    }

    try {
        // Criptografa a senha (NUNCA salve senhas em texto puro)
        const senhaHash = await bcrypt.hash(senha, 10); // 10 é o "custo" do hash

        // Monta a query de inserção com base no tipo
        // Isso é complexo, mas cobre os campos que você pediu
        let campos, valores, params;

        if (tipo === 'PF') {
            campos = '(tipo, email, senha_hash, nome_completo, cpf, celular, telefone, data_nascimento)';
            valores = '(?, ?, ?, ?, ?, ?, ?, ?)';
            params = [
                tipo, email, senhaHash,
                dados.nome_completo, dados.cpf, dados.rg,
                dados.celular, dados.telefone, dados.nascimento
            ];
        } else if (tipo === 'PJ') {
            campos = '(tipo, email, senha_hash, nome_completo, cpf, razao_social, nome_fantasia, cnpj, inscricao_estadual, celular, telefone, data_nascimento)';
            valores = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            params = [
                tipo, email, senhaHash,
                dados.nome_completo, // Nome do Responsável
                dados.cpf, // CPF do Responsável
                dados.razao_social,
                dados.nome_fantasia,
                dados.cnpj,
                dados.inscricao_estadual,
                dados.celular,
                dados.telefone,
                dados.nascimento // Nascimento do Responsável
            ];
        } else {
            return res.status(400).json({ message: 'Tipo de usuário inválido (deve ser PF ou PJ).' });
        }

        const sql = `INSERT INTO usuarios ${campos} VALUES ${valores}`;

        db.run(sql, params, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: usuarios.email')) {
                    return res.status(409).json({ message: 'Este email já está cadastrado.' });
                }
                return res.status(500).json({ message: 'Erro ao registrar usuário.', error: err.message });
            }
            res.status(201).json({ message: 'Usuário registrado com sucesso!', id: this.lastID });
        });

    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.', error: error.message });
    }
});


// 2. LOGIN (PF, PJ ou Admin)
app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const sql = 'SELECT * FROM usuarios WHERE email = ?';

    db.get(sql, [email], async(err, usuario) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor.', error: err.message });
        }

        // Usuário não encontrado
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Compara a senha enviada com a senha criptografada no banco
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Se a senha estiver correta, GERAR O TOKEN (o "crachá")
        const payload = {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome_completo || usuario.nome_fantasia,
            isAdmin: !!usuario.isAdmin // Converte 0/1 para false/true
        };

        // Assina o token com nosso segredo e define a expiração (24h)
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, { expiresIn: '24h' } // Exatamente como você pediu!
        );

        // Envia o token e os dados básicos do usuário para o front-end
        res.json({
            message: 'Login bem-sucedido!',
            token: token,
            user: payload
        });
    });
});

// Esta função vai "parar" requisições que precisam de login
// e verificar se o token (crachá) é válido.
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // O token vem no formato "Bearer [token]"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    // Verifica se o token é válido e se não expirou
    jwt.verify(token, process.env.JWT_SECRET, (err, dadosDoToken) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
            }
            return res.status(403).json({ message: 'Token inválido.' });
        }

        // Se o token for válido, salvamos os dados dele na requisição
        // para as próximas rotas saberem quem é o usuário.
        req.user = dadosDoToken;
        next(); // Permite que a requisição continue
    });
}

// --- O "SEGURANÇA" (Middleware de Verificação de ADMIN) ---
// Este SÓ DEVE ser usado DEPOIS do verificarToken
function verificarAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado. Rota exclusiva para administradores.' });
    }
    // Se req.user.isAdmin for true, continue
    next();
}

// --- ROTAS PROTEGIDAS (Exemplos) ---
// Rotas que SÓ funcionam se o usuário estiver logado (enviar o token)

// Rota de teste para verificar se o token funciona
app.get('/api/perfil', verificarToken, (req, res) => {
    // Graças ao middleware, 'req.user' agora contém os dados do token
    res.json({
        message: 'Você está vendo uma rota protegida!',
        usuarioLogado: req.user
    });
});

// Rota para checar se o usuário é ADMIN
app.get('/api/admin/check', verificarToken, (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado. Somente administradores.' });
    }
    res.json({ message: 'Olá, Admin!', admin: req.user });
});

// --- ROTAS DE ADMIN (CRUD de Produtos) ---
// Todas as rotas aqui são protegidas e exigem login de admin

// 1. CRIAR um novo produto
app.post('/api/admin/produtos', [verificarToken, verificarAdmin], (req, res) => {
    const { nome, descricao_curta, descricao_longa, preco, imagem_url, categoria, tags } = req.body;

    const sql = `INSERT INTO produtos (nome, descricao_curta, descricao_longa, preco, imagem_url, categoria, tags, destaque) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`; // Novos produtos não são destaque por padrão

    db.run(sql, [nome, descricao_curta, descricao_longa, preco, imagem_url, categoria, tags], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao criar produto', error: err.message });
        }
        res.status(201).json({ message: 'Produto criado com sucesso!', id: this.lastID });
    });
});

// 2. ATUALIZAR um produto
app.put('/api/admin/produtos/:id', [verificarToken, verificarAdmin], (req, res) => {
    const { id } = req.params;
    const { nome, descricao_curta, descricao_longa, preco, imagem_url, categoria, tags, destaque } = req.body;

    const sql = `UPDATE produtos SET 
                    nome = ?, 
                    descricao_curta = ?, 
                    descricao_longa = ?, 
                    preco = ?, 
                    imagem_url = ?, 
                    categoria = ?, 
                    tags = ?, 
                    destaque = ? 
                 WHERE id = ?`;

    db.run(sql, [nome, descricao_curta, descricao_longa, preco, imagem_url, categoria, tags, !!destaque, id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao atualizar produto', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Produto não encontrado para atualização.' });
        }
        res.json({ message: 'Produto atualizado com sucesso!' });
    });
});

// 3. DELETAR um produto
app.delete('/api/admin/produtos/:id', [verificarToken, verificarAdmin], (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM produtos WHERE id = ?';

    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao deletar produto', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Produto não encontrado para deletar.' });
        }
        res.json({ message: 'Produto deletado com sucesso!' });
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});