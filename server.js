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
    let sql = `
        SELECT p.*, pi.imagem_url AS imagem_url
        FROM produtos p
        LEFT JOIN produto_imagens pi ON p.id = pi.produto_id AND pi.ordem = 0
    `;
    const params = [];

    if (req.query.categoria) {
        sql += ' WHERE p.categoria = ?';
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

    const sql = `
        SELECT p.*, pi.imagem_url AS imagem_url
        FROM produtos p
        LEFT JOIN produto_imagens pi ON p.id = pi.produto_id AND pi.ordem = 0
        WHERE p.tags LIKE ?
    `;
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
    // Agora esperamos um array 'imagens' no body
    const { nome, descricao_curta, descricao_longa, categoria, tags, destaque, imagens } = req.body;

    const sqlProduto = `INSERT INTO produtos (nome, descricao_curta, descricao_longa, categoria, tags, destaque) 
                        VALUES (?, ?, ?, ?, ?, ?)`;
    const sqlImagem = `INSERT INTO produto_imagens (produto_id, imagem_url, ordem) VALUES (?, ?, ?)`;

    // db.serialize garante que os comandos rodem em ordem
    db.serialize(() => {
        // Inicia a transação
        db.run('BEGIN TRANSACTION');

        // 1. Insere o produto
        db.run(sqlProduto, [nome, descricao_curta, descricao_longa, categoria, tags, !!destaque], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Erro ao criar produto', error: err.message });
            }

            const produtoId = this.lastID; // Pega o ID do produto que acabamos de criar

            // 2. Insere as imagens
            if (imagens && imagens.length > 0) {
                const imgStmt = db.prepare(sqlImagem);
                let ordem = 0;
                for (const url of imagens) {
                    if (url) { // Só insere se a URL não estiver vazia
                        imgStmt.run(produtoId, url, ordem, (imgErr) => {
                            if (imgErr) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ message: 'Erro ao salvar imagem', error: imgErr.message });
                            }
                        });
                        ordem++;
                    }
                }
                imgStmt.finalize();
            }

            // 3. Finaliza a transação
            db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                    return res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr.message });
                }
                res.status(201).json({ message: 'Produto e imagens criados com sucesso!', id: produtoId });
            });
        });
    });
});

// 2. ATUALIZAR um produto
app.put('/api/admin/produtos/:id', [verificarToken, verificarAdmin], (req, res) => {
    const { id } = req.params;
    const { nome, descricao_curta, descricao_longa, categoria, tags, destaque, imagens } = req.body;

    const sqlUpdateProduto = `UPDATE produtos SET 
                                nome = ?, descricao_curta = ?, descricao_longa = ?, 
                                categoria = ?, tags = ?, destaque = ? 
                              WHERE id = ?`;
    const sqlDeleteImagens = `DELETE FROM produto_imagens WHERE produto_id = ?`;
    const sqlInsertImagem = `INSERT INTO produto_imagens (produto_id, imagem_url, ordem) VALUES (?, ?, ?)`;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Atualiza os dados do produto
        db.run(sqlUpdateProduto, [nome, descricao_curta, descricao_longa, categoria, tags, !!destaque, id], function(err) {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ message: 'Erro ao atualizar produto', error: err.message });
            }

            // 2. Deleta as imagens antigas
            db.run(sqlDeleteImagens, [id], (deleteErr) => {
                if (deleteErr) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Erro ao limpar imagens antigas', error: deleteErr.message });
                }

                // 3. Insere as novas imagens
                if (imagens && imagens.length > 0) {
                    const imgStmt = db.prepare(sqlInsertImagem);
                    let ordem = 0;
                    for (const url of imagens) {
                        if (url) { // Só insere se a URL não estiver vazia
                            imgStmt.run(id, url, ordem, (imgErr) => {
                                if (imgErr) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ message: 'Erro ao salvar nova imagem', error: imgErr.message });
                                }
                            });
                            ordem++;
                        }
                    }
                    imgStmt.finalize();
                }

                // 4. Finaliza a transação
                db.run('COMMIT', (commitErr) => {
                    if (commitErr) {
                        return res.status(500).json({ message: 'Erro ao finalizar transação', error: commitErr.message });
                    }
                    res.json({ message: 'Produto atualizado com sucesso!' });
                });
            });
        });
    });
});

// 3. DELETAR um produto
app.get('/api/produtos/:id', (req, res) => {
    const sqlProduto = 'SELECT * FROM produtos WHERE id = ?';
    const sqlImagens = 'SELECT * FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC';
    const params = [req.params.id];

    // Precisamos de duas buscas
    db.get(sqlProduto, params, (err, produto) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!produto) {
            return res.status(404).json({ message: 'Produto não encontrado' });
        }

        // Agora busca as imagens
        db.all(sqlImagens, params, (imgErr, imagens) => {
            if (imgErr) {
                return res.status(500).json({ error: imgErr.message });
            }

            // Combina os resultados
            produto.imagens = imagens; // Adiciona o array de imagens ao objeto do produto
            res.json({ produto: produto });
        });
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});