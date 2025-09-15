document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        // Diperbaiki: URL sekarang mengarah ke server Vercel, sesuai dengan konfigurasi
        const response = await fetch('https://fastgen-ten.vercel.app/backend/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password }),
        });

        if (!response.ok) {
            throw new Error('Invalid username or password.');
        }

        const data = await response.json();
        localStorage.setItem('authToken', data.token); // Simpan token
        window.location.href = '/fastgen'; // Arahkan ke halaman utama

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});
