const API_BASE = "http://localhost:8001";

// --- State ---
let selectedFile = null;
let lastAnalysis = null;
let history = [];
try {
    history = JSON.parse(localStorage.getItem('pneumoHistory') || '[]');
} catch(e) { console.error("History parse fail", e); }
let diagChart = null;

// --- DOM Elements ---
const analyzeBtn = document.getElementById('analyzeBtn');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const patientForm = document.getElementById('patientForm');
const resultsSection = document.getElementById('resultsSection');
const historyBody = document.getElementById('historyBody');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("PneumoScan AI Initializing...");
    
    try { setupUploadLogic(); } catch(e) { console.error("Upload init fail", e); }
    try { setupAnalysisLogic(); } catch(e) { console.error("Analysis init fail", e); }
    try { setupHistoryLogic(); } catch(e) { console.error("History init fail", e); }
    try { setupNavLogic(); } catch(e) { console.error("Nav init fail", e); }
    try { setupChatLogic(); } catch(e) { console.error("Chat init fail", e); }
    
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const gt = document.getElementById('greetingText');
    if (gt) gt.textContent = `${greeting}, Specialist`;
});

function setupUploadLogic() {
    if (!dropZone || !fileInput) return;
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelection(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFileSelection(e.dataTransfer.files[0]);
    });

    const cancelFile = document.getElementById('cancelFile');
    if (cancelFile) {
        cancelFile.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedFile = null;
            document.getElementById('fileInfo').classList.add('hidden');
            dropZone.classList.remove('hidden');
            fileInput.value = '';
            checkButtonState();
        });
    }
}

function handleFileSelection(file) {
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
        selectedFile = file;
        const fn = document.getElementById('fileName');
        if (fn) fn.textContent = file.name;
        const fi = document.getElementById('fileInfo');
        const dz = document.getElementById('dropZone');
        if (fi) fi.classList.remove('hidden');
        if (dz) dz.classList.add('hidden');
        checkButtonState();
    } else if (file) {
        alert("Please select a valid image file (JPEG or PNG).");
    }
}

function checkButtonState() {
    if (!analyzeBtn || !patientForm) return;
    const isFormValid = patientForm.checkValidity();
    analyzeBtn.disabled = !(selectedFile && isFormValid);
}

function setupAnalysisLogic() {
    if (!analyzeBtn) return;
    const loader = analyzeBtn.querySelector('.loader');
    const btnText = analyzeBtn.querySelector('.btn-text');

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;
        analyzeBtn.disabled = true;
        if (loader) loader.classList.remove('hidden');
        if (btnText) btnText.textContent = 'Processing...';

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', document.getElementById('patientName').value);
        formData.append('age', document.getElementById('patientAge').value);
        formData.append('gender', document.getElementById('patientGender').value);
        
        // New Fields
        const blood = document.getElementById('patientBlood').value;
        if (blood) formData.append('blood', blood);
        
        const symptoms = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(cb => cb.value).join(', ');
        if (symptoms) formData.append('symptoms', symptoms);

        try {
            const response = await fetch(`${API_BASE}/predict`, { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            const timestamp = new Date().toLocaleString();
            const historyEntry = { ...data, timestamp, id: Date.now() };
            history.unshift(historyEntry);
            localStorage.setItem('pneumoHistory', JSON.stringify(history));
            
            updateHistoryUI();
            displayResults(data);
            updateChart();
            lastAnalysis = data;
        } catch (err) {
            alert("Analysis Error: " + err.message);
        } finally {
            analyzeBtn.disabled = false;
            if (loader) loader.classList.add('hidden');
            if (btnText) btnText.textContent = '🚀 Run AI Analysis';
            checkButtonState();
        }
    });

    if (patientForm) patientForm.addEventListener('input', checkButtonState);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (resultsSection) resultsSection.classList.add('hidden');
            patientForm.reset();
            const cf = document.getElementById('cancelFile');
            if (cf) cf.click();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadReport);
}

async function downloadReport() {
    if (!lastAnalysis) return;
    try {
        const response = await fetch(`${API_BASE}/generate_report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient: lastAnalysis.patient,
                results: {
                    prediction: lastAnalysis.prediction,
                    confidence: lastAnalysis.confidence,
                    severity: lastAnalysis.severity,
                    recommendations: lastAnalysis.recommendations
                }
            })
        });
        if (!response.ok) throw new Error('Server failed to generate PDF');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PneumoScan_Report_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (err) { alert("Report failed: " + err.message); }
}

function displayResults(data) {
    if (!resultsSection) return;
    resultsSection.classList.remove('hidden');
    document.getElementById('resPrediction').textContent = data.prediction;
    document.getElementById('resConfidence').textContent = `${(data.confidence * 100).toFixed(1)}%`;
    document.getElementById('resSeverity').textContent = data.severity;
    const predEl = document.getElementById('resPrediction');
    predEl.style.color = data.prediction === 'Pneumonia' ? 'var(--danger)' : 'var(--success)';
    document.getElementById('originalImg').src = data.original_image;
    document.getElementById('heatmapImg').src = data.heatmap_image;
    document.getElementById('insightsList').innerHTML = data.insights.map(ins => `
        <div class="insight-item ${ins.type}"><strong>${ins.title}</strong><p>${ins.body}</p></div>`).join('');
    document.getElementById('recsList').innerHTML = data.recommendations.map(rec => `<div class="rec-item">• ${rec}</div>`).join('');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function setupHistoryLogic() { updateHistoryUI(); initChart(); }

function updateHistoryUI() {
    if (!historyBody) return;
    if (history.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No history found.</td></tr>';
        return;
    }
    historyBody.innerHTML = history.map(item => `
        <tr>
            <td>${item.timestamp}</td>
            <td>${item.patient ? item.patient.name : 'Unknown'}</td>
            <td style="color: ${item.prediction === 'Pneumonia' ? 'var(--danger)' : 'var(--success)'}">${item.prediction}</td>
            <td>${(item.confidence * 100).toFixed(1)}%</td>
            <td><button class="btn-micro" onclick="viewHistoryItem(${item.id})">👁️ View</button></td>
        </tr>`).join('');
}

window.viewHistoryItem = (id) => {
    const item = history.find(h => h.id === id);
    if (item) { displayResults(item); document.querySelector('[data-view="dashboard"]').click(); }
}

function initChart() {
    const canvas = document.getElementById('confidenceChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = history.slice(-10).map((_, i) => `Scan ${i + 1}`);
    const values = history.slice(-10).map(h => (h.confidence * 100).toFixed(1));
    diagChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Confidence (%)', data: values, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, fill: true, pointRadius: 5 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 }, x: {} } }
    });
}

function updateChart() {
    if (!diagChart) return;
    const labels = history.slice(-10).map((_, i) => `Scan ${i + 1}`);
    const values = history.slice(-10).map(h => (h.confidence * 100).toFixed(1));
    diagChart.data.labels = labels;
    diagChart.data.datasets[0].data = values;
    diagChart.update();
}

function setupNavLogic() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-view');
            const targetEl = document.getElementById(`${target}View`);
            if (targetEl) {
                navItems.forEach(ni => ni.classList.remove('active'));
                item.classList.add('active');
                views.forEach(v => v.classList.remove('active'));
                targetEl.classList.add('active');
            }
        });
    });
}

function setupChatLogic() {
    const chatToggle = document.getElementById('chatbotToggle');
    const closeChat = document.getElementById('closeChat');
    const sendMessage = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');
    const chatWindow = document.getElementById('chatbotWindow');
    if (chatToggle) chatToggle.addEventListener('click', () => chatWindow.classList.toggle('hidden'));
    if (closeChat) closeChat.addEventListener('click', () => chatWindow.classList.add('hidden'));
    if (sendMessage) sendMessage.addEventListener('click', submitChat);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitChat(); });
}

async function submitChat() {
    const chatInput = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    const text = chatInput.value.trim();
    if (!text || !chatBody) return;
    appendMessage('user', text);
    chatInput.value = '';
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, context: lastAnalysis ? { prediction: lastAnalysis.prediction, confidence: lastAnalysis.confidence, severity: lastAnalysis.severity } : null })
        });
        const data = await response.json();
        appendMessage('bot', data.response);
    } catch (err) { appendMessage('bot', "Connection error."); }
}

function appendMessage(role, text) {
    const chatBody = document.getElementById('chatBody');
    if (!chatBody) return;
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
}
