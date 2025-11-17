// seed.js
const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log("Inicio seed...");

    // 1. Criar Usuário ADMIN
    // Vamos usar uma senha padrão 'admin123' por enquanto. MUDE ISSO EM PRODUÇÃO!
    const senhaAdmin = await bcrypt.hash('admin123', 10);

    db.run(`INSERT INTO usuarios (tipo, email, senha_hash, nome_completo, isAdmin) 
            VALUES (?, ?, ?, ?, ?)`, ['ADMIN', 'augustotoledo23@gmail.com', senhaAdmin, 'Administrador do Sistema', 1],
        (err) => {
            if (err) {
                // Ignora erro se já existir (por causa do email UNIQUE)
                if (!err.message.includes('UNIQUE constraint failed')) {
                    console.error('Erro ao criar admin:', err.message);
                } else {
                    console.log('ℹ️ Usuário Admin já existe.');
                }
            } else {
                console.log('✅ Usuário ADMIN criado com sucesso (email: augustotoledo23@gmail.com / senha: admin123)');
            }
        }
    );

    // 2. Inserir Produtos Iniciais (Baseado no seu index.html)
    const produtos = [
        // Mais Vendidos
        {
            nome: 'Airless Spray Gun',
            descricao_curta: 'Pistola de alta pressão para acabamentos profissionais.',
            imagem_url: 'src/img/SLG-140-P.png',
            categoria: 'pistola',
            tags: 'mais_vendido,airless',
            destaque: 1
        },
        {
            nome: 'Pressure Pot 10L',
            descricao_curta: 'Tanque de pressão de 10 litros para pintura contínua.',
            imagem_url: 'src/img/JGa-504.png',
            categoria: 'tanque',
            tags: 'mais_vendido',
            destaque: 1
        },
        {
            nome: 'Electrostatic Paint Gun',
            descricao_curta: 'Pistola eletrostática para máxima eficiência de transferência.',
            imagem_url: 'src/img/ADV-P522.png',
            categoria: 'pistola',
            tags: 'mais_vendido,eletrostatica',
            destaque: 1
        },
        {
            nome: 'Paint Mixer',
            descricao_curta: 'Misturador pneumático para tintas e vernizes.',
            imagem_url: 'src/img/TPR-10.png',
            categoria: 'acessorio',
            tags: 'mais_vendido',
            destaque: 1
        },

        // Alta Produtividade
        {
            nome: 'Pistola Alta Produtividade HP-3',
            descricao_curta: 'Ideal para grandes volumes com acabamento superior.',
            imagem_url: 'src/img/HP-3.png',
            categoria: 'pistola',
            tags: 'alta_produtividade,lancamento',
            destaque: 0
        },
        {
            nome: 'Airless HP Plus',
            descricao_curta: 'Versão aprimorada para trabalhos pesados.',
            imagem_url: 'src/img/HP-Plus.png',
            categoria: 'pistola',
            tags: 'alta_produtividade,airless',
            destaque: 0
        },

        // HVLP (Alto Volume, Baixa Pressão)
        {
            nome: 'Pistola HVLP 200',
            descricao_curta: 'Economia de tinta e menor névoa.',
            imagem_url: 'src/img/HVLP-200.png',
            categoria: 'pistola',
            tags: 'hvlp,lancamento',
            destaque: 0
        }
    ];

    // Loop para inserir os produtos
    produtos.forEach(prod => {
        db.run(`INSERT INTO produtos (nome, descricao_curta, imagem_url, categoria, tags, destaque) 
                VALUES (?, ?, ?, ?, ?, ?)`, [prod.nome, prod.descricao_curta, prod.imagem_url, prod.categoria, prod.tags, prod.destaque],
            (err) => {
                if (err) {
                    console.error(`Erro ao inserir ${prod.nome}:`, err.message);
                }
            }
        );
    });

    // Pequeno timeout para garantir que os logs apareçam depois das inserções (SQLite é assíncrono)
    setTimeout(() => {
        console.log('Seed concluído! Pressione Ctrl+C para sair se o processo não terminar sozinho.');
        // Não forçamos exit aqui porque o driver do SQLite pode ter coisas pendentes, 
        // mas num script simples geralmente ok fechar manual se travar.
    }, 1000);
}

seed();