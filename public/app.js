document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.endsWith('professional-registration.html')) {
        setupProfessionalRegistration();
    } else if (path.endsWith('professional-login.html')) {
        setupProfessionalLogin();
    } else if (path.endsWith('professional-dashboard.html')) {
        loadProfessionalDashboard();
    } else if (path.endsWith('patient-login.html')) {
        setupPatientLogin();
    } else if (path.endsWith('patient-dashboard.html')) {
        loadPatientDashboard();
    } else if (path.endsWith('patient-registration.html')){
        setupPatientRegistration();
    }
});

function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(item => {
        item.addEventListener('click', (event) => {
            const passwordInput = event.target.previousElementSibling;
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                event.target.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                event.target.textContent = '👁️';
            }
        });
    });
}

function getEmailFromInput() {
    const emailUserInput = document.getElementById('email-user');
    return emailUserInput ? `${emailUserInput.value}@reabilite.pro` : null;
}

async function handleApiResponse(response) {
    if (response.ok) {
        return response.json();
    } else {
        // Try to get JSON error message first, then fallback to text
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorJson = await response.json();
            throw new Error(errorJson.message || 'Ocorreu um erro no servidor.');
        } else {
            const errorText = await response.text();
            console.error("Server response (not JSON):", errorText);
            throw new Error('Não foi possível conectar ao servidor. Verifique o console para detalhes.');
        }
    }
}

function setupProfessionalRegistration() {
    const form = document.getElementById('professional-registration-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.email = getEmailFromInput();
        delete data['email-user'];

        try {
            const response = await fetch('/api/professionals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await handleApiResponse(response);
            alert(result.message);
            window.location.href = '/professional-login.html';
        } catch (error) {
            alert(error.message);
        }
    });
    setupPasswordToggle();
}

function setupProfessionalLogin() {
    const form = document.getElementById('professional-login-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.email = getEmailFromInput();
        delete data['email-user'];

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await handleApiResponse(response);
            localStorage.setItem('accessToken', result.accessToken);
            window.location.href = '/professional-dashboard.html';
        } catch (error) {
            alert(error.message);
        }
    });
    setupPasswordToggle();
}

function setupPatientLogin() {
    const form = document.getElementById('patient-login-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/patient/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await handleApiResponse(response);
            localStorage.setItem('accessToken', result.accessToken);
            window.location.href = '/patient-dashboard.html';
        } catch (error) {
            alert(error.message);
        }
    });
}

function setupPatientRegistration(){}

async function loadProfessionalDashboard() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/professional-login.html';
        return;
    }
    try {
        const response = await fetch('/api/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await handleApiResponse(response);
        document.querySelector('h2').textContent = `Bem-vindo, ${data.name}!`;
        const linksList = document.querySelector('#invitation-links ul');
        linksList.innerHTML = '';
        data.invitation_links.forEach(link => {
            const listItem = document.createElement('li');
            const anchor = document.createElement('a');
            anchor.href = link;
            anchor.textContent = window.location.origin + link;
            anchor.target = '_blank';
            listItem.appendChild(anchor);
            linksList.appendChild(listItem);
        });
    } catch (error) {
         handleAuthError(error);
    }
}

async function loadPatientDashboard() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/patient-login.html';
        return;
    }

    try {
        const response = await fetch('/api/patient/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await handleApiResponse(response);
        document.querySelector('h2').textContent = `Bem-vindo, ${data.name}!`;
        document.getElementById('patient-name').textContent = data.name;
        document.getElementById('patient-dob').textContent = data.dob;
        document.getElementById('patient-phone').textContent = data.phone;
    } catch (error) {
        handleAuthError(error, true);
    }
}

function handleAuthError(error, isPatient = false) {
    // We now get a proper error object
    alert(error.message);
    // Optional: Check for specific error types if needed
    // For now, simple redirect is fine
    localStorage.removeItem('accessToken');
    window.location.href = isPatient ? '/patient-login.html' : '/professional-login.html';
}
