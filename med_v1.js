const API_KEY = "AIzaSyCQRkTbqLQJ3dlJZstX3nka2msxODPXSzE";

// تهيئة مكتبة PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

async function processWithAI(lectureText, fileName) {
    // استخدمنا v1beta/models/gemini-1.5-flash لأنه المسار الأكثر دعماً حالياً
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [{ text: `أنت طبيب وصديق، اشرح لزميلك المحاضرة التالية بأسلوب ودي. قسم الإجابة بوضوح باستخدام [EXPLANATION]، [TERMS]، [MCQ]. النص: ${lectureText}` }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`خطأ من جوجل: ${data.error.message} (كود: ${data.error.code})`);
        }

        const fullOutput = data.candidates[0].content.parts[0].text;
        displayResults(fullOutput, fileName);
        saveToHistory(fileName, fullOutput);

    } catch (error) {
        alert("فشل الاتصال: " + error.message);
    } finally {
        stopLoading();
    }
}

// باقي الدوال المساعدة (نفسها تماماً)
function displayResults(output, fileName) {
    document.getElementById('lecture-content').classList.remove('hidden');
    const exp = output.split('[EXPLANATION]')[1]?.split('[TERMS]')[0] || output;
    const trm = output.split('[TERMS]')[1]?.split('[MCQ]')[0] || "لا يوجد";
    const mcq = output.split('[MCQ]')[1] || "لا يوجد";
    document.getElementById('explanation-tab').innerHTML = `<div class="section-block block-content"><h3>شرح: ${fileName}</h3>${formatText(exp)}</div>`;
    document.getElementById('terms-tab').innerHTML = formatText(trm);
    document.getElementById('mcq-tab').innerHTML = formatText(mcq);
}

function formatText(text) {
    return text.trim().replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function startLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    window.dhikrTimer = setInterval(() => { document.getElementById('dhikr-text').innerText = "اذكر الله علما نكمل..."; }, 3000);
}

function stopLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
    clearInterval(window.dhikrTimer);
}
