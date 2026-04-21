// Med Tutorial - Final Stable Version
const API_KEY = "AIzaSyCQRkTbqLQJ3dlJZstX3nka2msxODPXSzE";

// تهيئة مكتبة PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

window.saveUserData = function() {
    const name = document.getElementById('user-name').value;
    const college = document.getElementById('user-college').value;
    if (name && college) {
        localStorage.setItem('med_user_name', name);
        localStorage.setItem('med_user_college', college);
        document.getElementById('welcome-overlay').classList.add('hidden');
        loadDashboard();
    }
};

function loadDashboard() {
    document.getElementById('display-name').innerText = localStorage.getItem('med_user_name') || "";
    document.getElementById('display-college').innerText = localStorage.getItem('med_user_college') || "";
    updateHistoryList();
}

if (localStorage.getItem('med_user_name')) {
    document.getElementById('welcome-overlay').classList.add('hidden');
    loadDashboard();
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    startLoading();
    let text = "";
    try {
        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(s => s.str).join(" ") + " ";
            }
        } else {
            text = await file.text();
        }
        await processWithAI(text, file.name);
    } catch (err) {
        alert("خطأ في قراءة الملف: " + err.message);
        stopLoading();
    }
});

async function processWithAI(lectureText, fileName) {
    // الرابط المباشر لـ Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [{ text: `اشرح هذه المحاضرة الطبية بأسلوب صديق يشرح لصديقه، مع تقسيم الرد إلى [EXPLANATION] و [TERMS] و [MCQ]. النص: ${lectureText}` }]
        }],
        // تعطيل فلاتر الأمان لضمان عدم حظر المصطلحات الطبية
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            // سيعطيك الموقع الآن رسالة واضحة جداً عن سبب المشكلة
            throw new Error(`خطأ من جوجل: ${data.error.message} (كود: ${data.error.code})`);
        }

        const fullOutput = data.candidates[0].content.parts[0].text;
        displayResults(fullOutput, fileName);
        saveToHistory(fileName, fullOutput);

    } catch (error) {
        console.error(error);
        alert(error.message); 
    } finally {
        stopLoading();
    }
}

// الدوال المساعدة (نفسها كما في السابق)
function displayResults(output, fileName) {
    document.getElementById('lecture-content').classList.remove('hidden');
    const parts = output.split(/\[EXPLANATION\]|\[TERMS\]|\[MCQ\]/);
    document.getElementById('explanation-tab').innerHTML = `<div class="section-block block-content"><h3>شرح: ${fileName}</h3>${formatText(parts[1] || output)}</div>`;
    document.getElementById('terms-tab').innerHTML = formatText(parts[2] || "");
    document.getElementById('mcq-tab').innerHTML = formatText(parts[3] || "");
}

function formatText(text) {
    return text.trim().replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong class="bold-text">$1</strong>');
}

function startLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    window.dhikrTimer = setInterval(() => { document.getElementById('dhikr-text').innerText = "اذكر الله علما نكمل..."; }, 3000);
}

function stopLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
    clearInterval(window.dhikrTimer);
}

function updateHistoryList() {
    const list = document.getElementById('lecture-history');
    let history = JSON.parse(localStorage.getItem('med_history') || "[]");
    list.innerHTML = history.map((item, index) => `<li onclick="loadFromHistory(${index})">${item.name}</li>`).reverse().join('');
}
