document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('ai-chat-history');
    const commandInput = document.getElementById('ai-command-input');
    const sendButton = document.getElementById('ai-send-command-btn');

    if (!chatHistory || !commandInput || !sendButton) {
        // Se os elementos não existirem (ex: em outra página), não faz nada.
        return;
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

        // Rola para a mensagem mais recente
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // --- FUNÇÃO PARA LIDAR COM O ENVIO DO COMANDO ---
    function handleSendCommand() {
        const command = commandInput.value.trim();
        if (command === '') return;

        // 1. Adiciona o comando do usuário à interface
        addMessageToChat(command, 'user');

        // 2. Limpa o campo de entrada
        commandInput.value = '';
        commandInput.focus();

        // 3. Simula uma resposta da IA e dá a instrução de fluxo
        setTimeout(() => {
            const aiResponse = `Comando recebido: "${command}". Por enquanto, nosso fluxo é híbrido. Por favor, copie este comando e cole no chat do IDE para que eu possa executá-lo com minhas ferramentas.`;
            addMessageToChat(aiResponse, 'ai');
        }, 500); // Meio segundo de delay para simular o "pensamento"
    }

    // --- EVENT LISTENERS ---
    sendButton.addEventListener('click', handleSendCommand);

    // Permite enviar com "Enter" (ou "Shift+Enter" para nova linha)
    commandInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Impede a criação de uma nova linha
            handleSendCommand();
        }
    });

});
