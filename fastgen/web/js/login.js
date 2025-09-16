document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // Sembunyikan pesan error sebelumnya
    errorMessage.style.display = 'none';

    try {
        // Gunakan URL relatif yang akan berfungsi di mana saja
        const response = await fetch('/api/login', {
            method: 'POST', // Pastikan metode adalah POST
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ userId, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Ambil pesan error dari server jika ada, jika tidak, gunakan pesan default
            throw new Error(data.error || 'Invalid username or password.');
        }

        localStorage.setItem('authToken', data.token);
        window.location.href = '/fastgen'; // Arahkan ke halaman utama

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    }
});
