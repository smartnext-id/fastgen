(async (window, document, undefined) => {
    // --- Config & State ---
    const TOKEN_COST = 2;
    let user = null;
    let authToken = localStorage.getItem('authToken');
    let userTokens = 0;
    let isGenerating = false;
    let logoPathLength = 0;

    if (!authToken) {
        window.location.href = '/login';
        return;
    }

    // --- Backend & ComfyUI Communication ---
    function uuidv4() { return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)); }
    const client_id = uuidv4();

    // !! PENTING: Pastikan URL ngrok ini adalah yang sedang aktif di komputer Anda !!
    const comfy_hostname = "f3c2a11f2fba.ngrok-free.app"; 
    
    // Koneksi WebSocket ke server ComfyUI via ngrok
    const socket = new WebSocket(`wss://${comfy_hostname}/ws?clientId=${client_id}`);
    socket.addEventListener("open", () => console.log("✅ Berhasil terhubung ke server ComfyUI"));
    socket.addEventListener("error", () => console.error("❌ Gagal terhubung ke server ComfyUI. Pastikan ngrok berjalan."));


    async function loadWorkflow() {
        const response = await fetch("/js/base_workflow.json");
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
        enhanceToolBtn: document.getElementById('enhance-tool-btn'),
        leftSidebar: document.getElementById('left-sidebar'),
        closeLeftSidebarBtn: document.getElementById('close-left-sidebar'),
        enhancePromptBtn: document.getElementById('enhance-prompt-btn'),
        enhancePromptInput: document.getElementById('enhance-prompt-input'),
        enhancerResultContainer: document.getElementById('enhancer-result-container'),
        enhancerResult: document.getElementById('enhancer-result'),
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

    // --- API Functions ---
    const api = {
        async fetchUserTokens() {
            if (!authToken) return 0;
            try {
                const response = await fetch('/api/getTokens', {
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
            } catch (error) { console.error("Error fetching tokens:", error); return 0; }
        },
        async deductTokens(amount) {
            if (!authToken) return false;
            try {
                const response = await fetch('/api/deductTokens', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ amount }),
                });
                 if (!response.ok) { // Penanganan error lebih baik
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal mengurangi token.');
                }
                const data = await response.json();
                if (data.success) {
                    userTokens = data.newTokens;
                    updateTokenDisplay();
                    return true;
                } else {
                    alert(data.message || 'Tidak cukup token.');
                    return false;
                }
            } catch (error) {
                console.error("Error deducting tokens:", error);
                alert(error.message);
                return false;
            }
        },
        async enhancePrompt(keyword) {
            if (!authToken) return { error: "Not authenticated" };
            try {
                const response = await fetch('/api/enhancePrompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ keyword }),
                });
                return await response.json();
            } catch (error) {
                console.error("Error enhancing prompt:", error);
                return { error: "Gagal terhubung ke layanan enhance." };
            }
        },
        async requestMoreTokens() {
            alert("Permintaan Anda untuk token tambahan telah dikirim ke administrator.");
            return true;
        }
    };
    
    // --- Core Generation & ComfyUI Logic ---
    async function queue_prompt(promptWorkflow) {
        try {
            const response = await fetch(`https://${comfy_hostname}/prompt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptWorkflow, client_id }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            console.error("Gagal mengirim prompt ke ComfyUI:", error);
            setUIGenerating(false);
            // Refund token jika gagal mengirim
            const refundResponse = await api.deductTokens(-TOKEN_COST);
            if(refundResponse) alert("Gagal mengirim job ke ComfyUI. Token telah dikembalikan.");
        }
    }

    const handleGeneration = async () => {
        if (isGenerating || dom.prompt.value.length < 3) return;
        
        const canAfford = await api.deductTokens(TOKEN_COST);
        if (!canAfford) {
            dom.tokenModal.style.display = 'flex';
            return;
        }
        setUIGenerating(true);
        
        workflow["6"]["inputs"]["text"] = dom.prompt.value;
        workflow["4"]["inputs"]["ckpt_name"] = dom.checkpoint.value;
        workflow["3"]["inputs"]["steps"] = parseInt(dom.steps.value, 10);
        workflow["3"]["inputs"]["cfg"] = parseFloat(dom.cfg.value);
        workflow["3"]["inputs"]["sampler_name"] = dom.sampler.value;
        workflow["5"]["inputs"]["width"] = parseInt(dom.width.value, 10);
        workflow["5"]["inputs"]["height"] = parseInt(dom.height.value, 10);
        workflow["3"]["inputs"]["seed"] = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

        if (dom.lora.value !== "None") {
            workflow["10"]["inputs"]["lora_name"] = dom.lora.value;
            workflow["3"]["inputs"]["model"] = ["10", 0];
        } else {
             workflow["3"]["inputs"]["model"] = ["4", 0];
        }
        await queue_prompt(workflow);
    };

    socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
            const { value, max } = data.data;
            dom.progressText.textContent = `Langkah ${value} dari ${max}`;
            const progress = value / max;
            const offset = logoPathLength * (1 - progress);
            dom.loadingLogoPath.style.strokeDashoffset = offset;
        }
        if (data.type === "executed" && data.data.output.images) {
            dom.loadingLogoPath.style.fillOpacity = 0.8;
            setTimeout(() => {
                setUIGenerating(false);
                const image = data.data.output.images[0];
                const url = `https://${comfy_hostname}/view?filename=${image.filename}&type=${image.type}&subfolder=${image.subfolder}&rand=${Math.random()}`;
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

    dom.enhanceToolBtn.addEventListener('click', () => {
        dom.leftSidebar.classList.toggle('open');
    });

    dom.closeLeftSidebarBtn.addEventListener('click', () => {
        dom.leftSidebar.classList.remove('open');
    });

    dom.enhancePromptBtn.addEventListener('click', async () => {
        const keyword = dom.enhancePromptInput.value;
        if (!keyword || dom.enhancePromptBtn.disabled) return;

        dom.enhancePromptBtn.disabled = true;
        dom.enhancerResult.textContent = 'Meningkatkan prompt...';
        dom.enhancerResultContainer.style.display = 'block';

        const result = await api.enhancePrompt(keyword);

        if (result.enhancedPrompt) {
            dom.enhancerResult.textContent = result.enhancedPrompt;
            dom.enhancerResult.style.cursor = 'pointer';
            dom.enhancerResult.onclick = () => {
                dom.prompt.value = result.enhancedPrompt;
                dom.leftSidebar.classList.remove('open');
            };
        } else {
            dom.enhancerResult.textContent = result.error || 'Gagal meningkatkan prompt.';
        }

        dom.enhancePromptBtn.disabled = false;
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
