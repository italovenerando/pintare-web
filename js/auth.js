// js/auth.js

// --- Seletores do DOM ---
const modal = document.getElementById('auth-modal');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLoginContainer = document.getElementById('form-login-container');
const formRegisterContainer = document.getElementById('form-register-container');
const tipoContaSelect = document.getElementById('tipo-conta');
const camposPf = document.getElementById('campos-pf');
const camposPj = document.getElementById('campos-pj');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const authMessage = document.getElementById('auth-message');

// --- Funções de Controle do Modal ---

function openModal(tab = 'login') {
    modal.classList.remove('hidden');
    showTab(tab);
}

function closeModal() {
    modal.classList.add('hidden');
    // Limpa mensagens de erro ao fechar
    showAuthMessage('', 'info', true);
}

function showTab(tabName) {
    if (tabName === 'login') {
        // Mostra Login
        formLoginContainer.classList.remove('hidden');
        formRegisterContainer.classList.add('hidden');
        // Estiliza Tab
        tabLogin.classList.add('border-primary', 'text-primary');
        tabLogin.classList.remove('border-transparent', 'text-gray-500');
        tabRegister.classList.add('border-transparent', 'text-gray-500');
        tabRegister.classList.remove('border-primary', 'text-primary');
    } else {
        // Mostra Cadastro
        formLoginContainer.classList.add('hidden');
        formRegisterContainer.classList.remove('hidden');
        // Estiliza Tab
        tabRegister.classList.add('border-primary', 'text-primary');
        tabRegister.classList.remove('border-transparent', 'text-gray-500');
        tabLogin.classList.add('border-transparent', 'text-gray-500');
        tabLogin.classList.remove('border-primary', 'text-primary');
    }
    // Limpa qualquer mensagem de erro ao trocar de aba
    showAuthMessage('', 'info', true);
}

// Mostra/esconde campos PF/PJ no formulário de registro
function toggleRegistrationFields() {
    const tipo = tipoContaSelect.value;

    // Pega os inputs de PF e PJ
    const inputsPf = camposPf.querySelectorAll('input');
    const inputsPj = camposPj.querySelectorAll('input');

    if (tipo === 'PF') {
        camposPf.classList.remove('hidden');
        camposPj.classList.add('hidden');

        // Habilita inputs PF (para o 'required' funcionar) e desabilita PJ
        inputsPf.forEach(input => input.disabled = false);
        inputsPj.forEach(input => input.disabled = true);

        // Corrige o bug dos campos "nome_completo" e "cpf" duplicados
        document.getElementById('reg-nome_completo-pj').disabled = true;
        document.getElementById('reg-cpf-pj').disabled = true;
        document.getElementById('reg-nascimento-pj').disabled = true;
        document.getElementById('reg-nome_completo-pf').disabled = false;
        document.getElementById('reg-cpf-pf').disabled = false;
        document.getElementById('reg-nascimento-pf').disabled = false;

    } else { // 'PJ'
        camposPf.classList.add('hidden');
        camposPj.classList.remove('hidden');

        // Desabilita inputs PF e habilita PJ
        inputsPf.forEach(input => input.disabled = true);
        inputsPj.forEach(input => input.disabled = false);

        // Corrige o bug dos campos duplicados
        document.getElementById('reg-nome_completo-pj').disabled = false;
        document.getElementById('reg-cpf-pj').disabled = false;
        document.getElementById('reg-nascimento-pj').disabled = false;
        document.getElementById('reg-nome_completo-pf').disabled = true;
        document.getElementById('reg-cpf-pf').disabled = true;
        document.getElementById('reg-nascimento-pf').disabled = true;
    }
}

// Exibe uma mensagem (erro ou sucesso) no modal
function showAuthMessage(message, type = 'error', hide = false) {
    if (hide || !message) {
        authMessage.classList.add('hidden');
        authMessage.textContent = '';
        return;
    }
    authMessage.textContent = message;
    authMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'bg-green-100', 'text-green-700');

    if (type === 'error') {
        authMessage.classList.add('bg-red-100', 'text-red-700');
    } else { // success
        authMessage.classList.add('bg-green-100', 'text-green-700');
    }
}


// --- Lógica de Submissão ---

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(formLogin);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Sucesso! Guarda o token e o usuário
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            // Fecha o modal e recarrega a página para atualizar o estado (ex: mostrar "Olá, Usuário")
            closeModal();
            window.location.reload();
        } else {
            // Erro (ex: senha errada)
            showAuthMessage(result.message || 'Erro ao fazer login.', 'error');
        }
    } catch (err) {
        showAuthMessage('Não foi possível conectar ao servidor.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(formRegister);

    // Filtra apenas os campos habilitados (para não enviar dados de PF e PJ ao mesmo tempo)
    const data = {};
    formData.forEach((value, key) => {
        const input = formRegister.querySelector(`[name="${key}"]`);
        // Pega todos os inputs com o mesmo nome (ex: nome_completo)
        const inputs = formRegister.querySelectorAll(`[name="${key}"]`);

        // Verifica se pelo menos um dos inputs com esse nome está habilitado
        let isEnabled = false;
        inputs.forEach(inp => {
            if (!inp.disabled) isEnabled = true;
        });

        if (isEnabled && value) {
            data[key] = value;
        }
    });

    try {
        const response = await fetch(`${API_URL}/auth/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Sucesso!
            showAuthMessage('Usuário registrado com sucesso! Faça o login para continuar.', 'success');
            // Muda para a aba de login
            showTab('login');
        } else {
            // Erro (ex: email já existe)
            showAuthMessage(result.message || 'Erro ao registrar.', 'error');
        }
    } catch (err) {
        showAuthMessage('Não foi possível conectar ao servidor.', 'error');
    }
}

// --- Event Listeners ---
// Ouve tudo quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    // Escuta cliques nos forms
    formLogin.addEventListener('submit', handleLogin);
    formRegister.addEventListener('submit', handleRegister);

    // Escuta mudança no seletor PF/PJ
    tipoContaSelect.addEventListener('change', toggleRegistrationFields);

    // Garante que os campos certos estão sendo mostrados
    toggleRegistrationFields();
});