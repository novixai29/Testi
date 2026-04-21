// Med Tutorial - Final Fix (Model Name & Version)
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
    // التعديل هنا: استخدام v1 بدلاً من v1beta وتصحيح مسار الموديل
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [{ text: `أنت طبيب وصديق مقرب لطالب طب، اشرح له المحاضرة التالية بأسلوب ودي وسلس ومفصل جداً.
                الهيكل المطلوب (قسم الإجابة بوضوح):
                [EXPLANATION]
                (ابدأ بتذكير بالمحاضرة السابقة 5-10 سطور، ثم الحالة الطبيعية للجسم، ثم شرح تفصيلي فقرة بفقرة مع ذكر الأسماء التجارية للأدوية وشرح الفحوصات).
                [TERMS]
                (قائمة بالمصطلحات الصعبة ومعانيها).
                [MCQ]
                (5 أسئلة Case Scenarios صعبة جداً).
                
                نص المحاضرة: ${lectureText}` }]
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
            throw new Error(`خطأ من جوجل: ${data.error.message}`);
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("لم يقم الذكاء الاصطناعي بتوليد استجابة، ربما بسبب قيود المحتوى.");
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

function displayResults(output, fileName) {
    document.getElementById('lecture-content').classList.remove('hidden');
    
    // تقسيم النصوص بناءً على التاجات
    const exp = output.split('[EXPLANATION]')[1]?.split('[TERMS]')[0] || output;
    const trm = output.split('[TERMS]')[1]?.split('[MCQ]')[0] || "لا يوجد";
    const mcq = output.split('[MCQ]')[1] || "لا يوجد";

    document.getElementById('explanation-tab').innerHTML = `<div class="section-block block-content"><h3>شرح: ${fileName}</h3>${formatText(exp)}</div>`;
    document.getElementById('terms-tab').innerHTML = `<div class="section-block block-reminder">${formatText(trm)}</div>`;
    document.getElementById('mcq-tab').innerHTML = `<div class="section-block block-normal">${formatText(mcq)}</div>`;
    
    window.scrollTo({ top: document.getElementById('lecture-content').offsetTop, behavior: 'smooth' });
}

function formatText(text) {
    return text.trim().replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong class="bold-text">$1</strong>');
}

function startLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    const adhkars = ["ربِّ زدني علماً", "اللهم انفعنا بما علمتنا", "سبحان الله", "الحمد لله"];
    let i = 0;
    window.dhikrTimer = setInterval(() => { 
        document.getElementById('dhikr-text').innerText = adhkars[i % adhkars.length]; 
        i++;
    }, 3000);
}

function stopLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
    clearInterval(window.dhikrTimer);
}

function updateHistoryList() {
    const list = document.getElementById('lecture-history');
    let history = JSON.parse(localStorage.getItem('med_history') || "[]");
    list.innerHTML = history.map((item, index) => `<li onclick="loadFromHistory(${index})"><strong>${item.name}</strong></li>`).reverse().join('');
}

window.loadFromHistory = function(index) {
    let history = JSON.parse(localStorage.getItem('med_history'));
    displayResults(history[index].data, history[index].name);
};

window.showTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    event.currentTarget.classList.add('active');
};
