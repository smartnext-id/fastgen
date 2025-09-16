document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        const BACKEND_URL = 'https://fastgen-ten.vercel.app/api'; // Ganti dengan URL Vercel Anda

        const response = await fetch(`${BACKEND_URL}/login`, { // <--- Ini bagian yang salah
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password }),
        });

        if (!response.ok) {
            throw new Error('Invalid username or password.');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        window.location.href = '/fastgen';

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});
