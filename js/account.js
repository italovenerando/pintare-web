// js/account.js

const AccountManager = {
    userData: null,
    isEditing: false,

    init: function() {
        // Verifica token
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Você precisa estar logado para acessar esta página.');
            window.location.href = 'index.html';
            return;
        }
        this.fetchUserData(token);
    },

    fetchUserData: async function(token) {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Falha ao buscar perfil');

            const data = await response.json();
            this.userData = data.user;
            this.render();

        } catch (error) {
            console.error(error);
            alert('Sessão expirada ou erro ao carregar dados.');
            // logout implícito
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    },

    render: function() {
        const u = this.userData;

        // Sidebar
        document.getElementById('sidebar-name').innerText = u.nome_completo || u.nome_fantasia;
        document.getElementById('sidebar-email').innerText = u.email;

        // Form Fields
        // Nome (se PF) ou Fantasia (se PJ)
        const nomeExibicao = u.nome_completo || u.nome_fantasia;
        document.getElementById('display-nome').innerText = nomeExibicao;
        document.getElementById('input-nome').value = nomeExibicao;

        // Labels dinâmicos (PF vs PJ)
        if (u.tipo === 'PJ') {
            document.getElementById('label-nome').innerText = 'Nome Fantasia';
            document.getElementById('label-doc').innerText = 'CNPJ';
            document.getElementById('display-doc').innerText = u.cnpj;
        } else {
            document.getElementById('label-nome').innerText = 'Nome Completo';
            document.getElementById('label-doc').innerText = 'CPF';
            document.getElementById('display-doc').innerText = u.cpf;
        }

        // Contatos
        document.getElementById('display-email').innerText = u.email;

        document.getElementById('display-celular').innerText = u.celular || '-';
        document.getElementById('input-celular').value = u.celular || '';

        document.getElementById('display-telefone').innerText = u.telefone || '-';
        document.getElementById('input-telefone').value = u.telefone || '';
    },

    toggleEditMode: function() {
        this.isEditing = !this.isEditing;
        const btnText = document.getElementById('btn-text');
        const btnIcon = document.querySelector('#btn-editar-perfil span');
        const btn = document.getElementById('btn-editar-perfil');

        const displays = document.querySelectorAll('.editable-display');
        const inputs = document.querySelectorAll('.editable-input');

        if (this.isEditing) {
            // Modo Edição
            btnText.innerText = 'Salvar';
            btnIcon.innerText = 'save';
            btn.classList.remove('bg-primary');
            btn.classList.add('bg-green-600', 'hover:bg-green-700');

            displays.forEach(el => el.classList.add('hidden'));
            inputs.forEach(el => el.classList.remove('hidden'));
        } else {
            // Salvando...
            this.saveData();

            // Volta ao modo visualização
            btnText.innerText = 'Editar';
            btnIcon.innerText = 'edit';
            btn.classList.add('bg-primary');
            btn.classList.remove('bg-green-600', 'hover:bg-green-700');

            displays.forEach(el => el.classList.remove('hidden'));
            inputs.forEach(el => el.classList.add('hidden'));
        }
    },

    saveData: async function() {
        const token = localStorage.getItem('token');

        // Coleta dados
        const updatedData = {
            nome_completo: document.getElementById('input-nome').value, // Para PF
            nome_fantasia: document.getElementById('input-nome').value, // Para PJ (a API decide qual usar)
            celular: document.getElementById('input-celular').value,
            telefone: document.getElementById('input-telefone').value
        };

        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                alert('Dados atualizados com sucesso!');
                // Recarrega dados para garantir consistência e atualizar sidebar
                this.fetchUserData(token);

                // Atualiza o localStorage também (para o "Olá, Fulano" do header não ficar desatualizado)
                const currentUser = JSON.parse(localStorage.getItem('user'));
                currentUser.nome = updatedData.nome_completo; // Atualiza nome local
                localStorage.setItem('user', JSON.stringify(currentUser));
            } else {
                alert('Erro ao salvar dados.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro de conexão.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AccountManager.init();
});