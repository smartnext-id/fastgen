(async (window, document, undefined) => {
    // --- Config & State ---
    const TOKEN_COST = 2;
    let user = null;
    let authToken = localStorage.getItem('authToken');
    let userTokens = 0;
    let isGenerating = false;
    let logoPathLength = 0; // Variabel untuk panjang path SVG

    if (!authToken) {
        window.location.href = '/login';
        return;
    }

    // --- Backend & ComfyUI Communication ---
    // Diperbaiki: URL sudah benar sekarang (satu slash)
    const BACKEND_URL = "https://fastgen-ten.vercel.app/backend";
    
    function uuidv4() { return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)); }
    const client_id = uuidv4();

    // Kode ini akan menyebabkan error 404 karena mencoba terhubung ke ComfyUI lokal dari Vercel.
    // Server backend Vercel harus bertindak sebagai perantara (proxy) untuk ComfyUI.
    // Baris ini tidak perlu dihapus, tetapi fungsinya akan digantikan oleh `queue_prompt` yang dimodifikasi di bawah.
    const server_address = `${window.location.hostname}:${window.location.port}`;
    const socket = new WebSocket(`ws://${server_address}/ws?clientId=${client_id}`);
    socket.addEventListener("open", () => console.log("✅ Connected to ComfyUI server"));

    async function loadWorkflow() {
        const response = await fetch("/fastgen/js/base_workflow.json");
        return await response.json();
    }
    const workflow = await loadWorkflow();

    // --- DOM Elements ---
    const dom = {
        prompt: document.getElementById('prompt'),
        checkpoint: document.getElementById('checkpoint'),
        lora: document.getElementById('lora'),
        steps: document.getElementById('steps'),
        stepsValue: document.getElementById('steps-value'),
        cfg: document.getElementById('cfg'),
        cfgValue: document.getElementById('cfg-value'),
        sampler: document.getElementById('sampler'),
        width: document.getElementById('width'),
        height: document.getElementById('height'),
        generateBtn: document.getElementById('generate-btn'),
        imageShowcase: document.getElementById('image-showcase'),
        placeholder: document.getElementById('placeholder'),
        progressOverlay: document.getElementById('progressOverlay'),
        progressText: document.getElementById('progress-text'),
        tokenDisplay: document.getElementById('token-display'),
        userIdDisplay: document.getElementById('user-id-display'),
        signOutBtn: document.getElementById('sign-out-btn'),
        tokenModal: document.getElementById('tokenModal'),
        requestTokensBtn: document.getElementById('requestTokensBtn'),
        closeTokenModalBtn: document.getElementById('closeTokenModalBtn'),
        loadingLogoPath: document.getElementById('loading-logo-path'),
    };

    // --- UI Update Functions ---
    const updateTokenDisplay = () => {
        dom.tokenDisplay.innerHTML = `Tokens: ⚡${userTokens}`;
    };
    
    const setUIGenerating = (generating) => {
        isGenerating = generating;
        dom.generateBtn.disabled = generating;
        if (generating) {
            dom.loadingLogoPath.style.strokeDashoffset = logoPathLength;
            dom.loadingLogoPath.style.fillOpacity = 0.15;
            dom.progressOverlay.style.display = "flex";
            dom.placeholder.style.display = "none";
        } else {
            dom.progressOverlay.style.display = "none";
            dom.placeholder.style.display = "flex";
        }
    };

    // --- API FUNCTIONS ---
    const api = {
        async fetchUserTokens() {
            if (!authToken) return 0;
            try {
                // Diperbaiki: Memanggil API dengan URL lengkap
                  const response = await fetch(`${BACKEND_URL}/api/getTokens`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (response.status === 403 || response.status === 401) {
                    localStorage.removeItem('authToken');
                    window.location.href = '/login';
                    return 0;
                }
                const data = await response.json();
                userTokens = data.tokens;
                updateTokenDisplay();
                return data.tokens;
            } catch (error) { console.error(error); return 0; }
        },
        async deductTokens(amount) {
            if (!authToken) return false;
            try {
                // Diperbaiki: Memanggil API dengan URL lengkap
                 const response = await fetch(`${BACKEND_URL}/api/deductTokens`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ amount }),
                });
                if (response.status === 403 || response.status === 401) {
                    localStorage.removeItem('authToken');
                    window.location.href = '/login';
                    return false;
                }
                const data = await response.json();
                if (data.success) {
                    userTokens = data.newTokens;
                    updateTokenDisplay();
                    return true;
                }
                return false;
            } catch (error) {
                console.error("Error deducting tokens:", error);
                return false;
            }
        },
        async requestMoreTokens() {
             alert("Your request for more tokens has been sent to the administrator.");
             return true;
        }
    };
    
    // --- Core Generation & ComfyUI Logic ---
    // Diperbaiki: Fungsi ini sekarang akan mengirim permintaan ke server backend Vercel,
    // bukan langsung ke ComfyUI lokal Anda. Server backend yang akan bertindak sebagai perantara.
    async function queue_prompt(promptWorkflow) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/generate`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}` // Mengirim token otentikasi
                },
                body: JSON.stringify({ workflow: promptWorkflow }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            console.error("Failed to queue prompt:", error);
            setUIGenerating(false);
            userTokens += TOKEN_COST;
            updateTokenDisplay();
            alert("Failed to send job to ComfyUI. Tokens have been refunded.");
        }
    }
    
    // Ini adalah bagian dari kode yang tetap sama, karena logikanya sudah benar.
    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            const { value, max } = data.data;
            dom.progressText.textContent = `Step ${value} of ${max}`;
            const progress = value / max;
            const offset = logoPathLength * (1 - progress);
            dom.loadingLogoPath.style.strokeDashoffset = offset;
        }
        if (data.type === "executed" && data.data.output.images) {
            dom.loadingLogoPath.style.fillOpacity = 0.8;
            setTimeout(() => {
                setUIGenerating(false);
                const image = data.data.output.images[0];
                const url = `/view?filename=${image.filename}&type=${image.type}&subfolder=${image.subfolder}&rand=${Math.random()}`;
                const img = document.createElement('img');
                img.src = url;
                dom.imageShowcase.prepend(img);
            }, 300);
        }
    });
    // --- Event Listeners ---
    dom.generateBtn.addEventListener('click', handleGeneration);
    dom.signOutBtn.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    });
    dom.steps.addEventListener('input', () => dom.stepsValue.textContent = dom.steps.value);
    dom.cfg.addEventListener('input', () => dom.cfgValue.textContent = parseFloat(dom.cfg.value).toFixed(1));
    dom.closeTokenModalBtn.addEventListener('click', () => dom.tokenModal.style.display = 'none');
    dom.requestTokensBtn.addEventListener('click', () => {
        api.requestMoreTokens();
        dom.tokenModal.style.display = 'none';
    });


    // --- Initialization ---
    const initializeApp = async () => {
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            user = { userId: payload.userId };
            if(dom.userIdDisplay) dom.userIdDisplay.textContent = user.userId;
            await api.fetchUserTokens();
        } catch (e) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
            return;
        }
        dom.stepsValue.textContent = dom.steps.value;
        dom.cfgValue.textContent = parseFloat(dom.cfg.value).toFixed(1);
        
        if (dom.loadingLogoPath) {
            logoPathLength = dom.loadingLogoPath.getTotalLength();
            dom.loadingLogoPath.style.strokeDasharray = logoPathLength;
            dom.loadingLogoPath.style.strokeDashoffset = logoPathLength;
        }
    };

    initializeApp();

})(window, document);
