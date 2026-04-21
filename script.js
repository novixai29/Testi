import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDv4onWbhHEGYAxznRFD9j46K-oyVChXww";
const genAI = new GoogleGenerativeAI(API_KEY);

// تهيئة pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

window.saveUserData = function() {
    const name = document.getElementById('user-name').value;
    const college = document.getElementById('user-college').value;
    if (name && college) {
        localStorage.setItem('med_user_name', name);
        localStorage.setItem('med_user_college', college);
        document.getElementById('welcome-overlay').classList.add('hidden');
        loadDashboard();
    } else {
        alert("لطفاً أدخل اسمك وكليتك");
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

// تبديل المود الليلي
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// قراءة ملف الـ PDF وتحويله لنص
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    startLoading();
    let text = "";

    if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(s => s.str).join(" ");
        }
    } else {
        text = await file.text();
    }

    processWithAI(text, file.name);
});

async function processWithAI(lectureText, fileName) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    بصفتك صديقاً مقرباً لطالب طب، اشرح له المحاضرة التالية المرفقة نصوصها.
    المتطلبات:
    1. ابدأ بفقرة "تذكير بالمحاضرة السابقة" (بين 5 و 10 أسطر) بأسلوب ممتع.
    2. أضف فقرة "كيف تكون الحالة الطبيعية للجسم بدون هذا المرض".
    3. اشرح المحاضرة فقرة بفقرة (ليس سردياً) بأسلوب "صديق يشرح لصديقه".
    4. أي دواء يذكر، اذكر اسمه التجاري المشهور.
    5. أي فحص طبي، اشرح كيف يتم وأساسياته.
    6. في النهاية، استخرج قائمة بالمصطلحات الصعبة ومعانيها.
    7. صغ 5 أسئلة MCQ بنمط Case Scenario (صعبة جداً).
    
    نص المحاضرة:
    ${lectureText}
    
    قم بتقسيم الإجابة باستخدام وسوم [EXPLANATION], [TERMS], [MCQ] لسهولة العرض.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const fullOutput = response.text();

        displayResults(fullOutput, fileName);
        saveToHistory(fileName, fullOutput);
    } catch (error) {
        alert("حدث خطأ في الاتصال بالذكاء الاصطناعي. تأكد من مفتاح API.");
        console.error(error);
    } finally {
        stopLoading();
    }
}

function displayResults(output, fileName) {
    document.getElementById('lecture-content').classList.remove('hidden');
    
    const parts = output.split(/\[EXPLANATION\]|\[TERMS\]|\[MCQ\]/);
    
    document.getElementById('explanation-tab').innerHTML = `<div class="section-block block-content"><h3>شرح: ${fileName}</h3>${formatText(parts[1])}</div>`;
    document.getElementById('terms-tab').innerHTML = formatText(parts[2]);
    document.getElementById('mcq-tab').innerHTML = formatText(parts[3]);
}

function formatText(text) {
    if (!text) return "";
    return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>');
}

function startLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    const adhkars = ["ربِّ زدني علماً", "اللهم انفعنا بما علمتنا", "سبحان الله وبحمده", "لا حول ولا قوة إلا بالله"];
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

function saveToHistory(name, data) {
    let history = JSON.parse(localStorage.getItem('med_history') || "[]");
    history.push({ name, data, date: new Date().toLocaleDateString() });
    localStorage.setItem('med_history', JSON.stringify(history));
    updateHistoryList();
}

function updateHistoryList() {
    const list = document.getElementById('lecture-history');
    let history = JSON.parse(localStorage.getItem('med_history') || "[]");
    list.innerHTML = history.map((item, index) => `<li onclick="loadFromHistory(${index})">${item.name}<br><small>${item.date}</small></li>`).join('');
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
