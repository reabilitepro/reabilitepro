document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('ai-chat-history');
    const commandInput = document.getElementById('ai-command-input');
    const sendButton = document.getElementById('ai-send-command-btn');
    const adminToken = localStorage.getItem('adminToken'); // Pega o token de admin

    if (!chatHistory || !commandInput || !sendButton) {
        return; // Não executa se não estiver na página certa
    }

    // --- FUNÇÃO PARA ADICIONAR MENSAGENS AO CHAT ---
    function addMessageToChat(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
        
        const messageParagraph = document.createElement('p');
        messageParagraph.classList.add('message-text');
        messageParagraph.textContent = message;

        messageDiv.appendChild(messageParagraph);
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // --- FUNÇÃO PARA LIDAR COM O ENVIO DO COMANDO ---
    async function handleSendCommand() {
        const command = commandInput.value.trim();
        if (command === '') return;

        addMessageToChat(command, 'user');
        commandInput.value = '';
        commandInput.focus();

        // Adiciona uma mensagem de "carregando" para o usuário saber que algo está acontecendo
        const thinkingMessage = addMessageToChat('Processando...', 'ai');

        try {
            const response = await fetch('/api/ai/command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Envia o token para autenticar a requisição
                    'Authorization': `Bearer ${adminToken}` 
                },
                body: JSON.stringify({ command: command })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ocorreu um erro no servidor.');
            }

            const data = await response.json();

            // Atualiza a mensagem de "Processando..." com a resposta real
            // (ou você pode remover a anterior e adicionar esta nova)
            addMessageToChat(data.reply, 'ai');

        } catch (error) {
            console.error('Erro ao enviar comando para a IA:', error);
            addMessageToChat(`Erro: ${error.message}`, 'ai');
        }
    }

    // --- EVENT LISTENERS ---
    sendButton.addEventListener('click', handleSendCommand);

    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendCommand();
        }
    });
});
