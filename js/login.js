document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
            const BACKEND_URL = "https://fastgen-green.vercel.app/api/login";
            const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password }),
        });

        if (!response.ok) {
            throw new Error('Invalid username or password.');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.token); // Simpan token
        window.location.href = '/fastgen';// Arahkan ke halaman utama

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});




