import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------
// ⚠️ ضع مفتاح الـ API الخاص بك بين القوسين أدناه
const API_KEY = "AIzaSyCG4a0pNIiTNlPedXWD2uoosjpPgrlY-fA"; 
// ---------------------------------------------------------

const genAI = new GoogleGenerativeAI(API_KEY);

// تهيئة مكتبة معالجة الـ PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// حفظ بيانات المستخدم (الاسم والكلية)
window.saveUserData = function() {
    const name = document.getElementById('user-name').value;
    const college = document.getElementById('user-college').value;
    if (name && college) {
        localStorage.setItem('med_user_name', name);
        localStorage.setItem('med_user_college', college);
        document.getElementById('welcome-overlay').classList.add('hidden');
        loadDashboard();
    } else {
        alert("لطفاً أدخل اسمك وكليتك للمتابعة");
    }
};

function loadDashboard() {
    const name = localStorage.getItem('med_user_name');
    const college = localStorage.getItem('med_user_college');
    if (name) {
        document.getElementById('display-name').innerText = name;
        document.getElementById('display-college').innerText = college;
        updateHistoryList();
    }
}

// تشغيل الواجهة عند التحميل
if (localStorage.getItem('med_user_name')) {
    document.getElementById('welcome-overlay').classList.add('hidden');
    loadDashboard();
}

// تبديل الوضع الليلي
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? "☀️ المود النهاري" : "🌙 المود الليلي";
});

// التعامل مع رفع الملفات
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    startLoading();
    let extractedText = "";

    try {
        if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                extractedText += content.items.map(s => s.str).join(" ") + " ";
            }
        } else {
            extractedText = await file.text();
        }

        if (extractedText.trim().length < 10) {
            throw new Error("الملف فارغ أو لا يحتوي على نصوص قابلة للقراءة");
        }

        await processWithAI(extractedText, file.name);

    } catch (error) {
        stopLoading();
        alert("خطأ في قراءة الملف: " + error.message);
    }
});

async function processWithAI(lectureText, fileName) {
    // استخدام موديل Gemini 1.5 Flash للسرعة
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    أنت طبيب وصديق مقرب لطالب طب، اشرح له المحاضرة التالية بأسلوب ودي وسلس.
    
    الهيكل المطلوب (التزم به تماماً):
    1. [EXPLANATION]: ابدأ بفقرة تذكير (5-10 أسطر) بالمحاضرة السابقة المرتبطة بهذا الموضوع. 
       ثم فقرة "كيف تكون الحالة الطبيعية للجسم بدون هذا المرض". 
       ثم شرح تفصيلي للمحاضرة فقرة بفقرة، مع ذكر الأسماء التجارية لأي دواء، وشرح ميكانيكية أي فحص طبي يُذكر.
    2. [TERMS]: قائمة بالمصطلحات الطبية الصعبة التي وردت ومعانيها بتبسيط.
    3. [MCQ]: 5 أسئلة بنظام الحالات المرضية (Case Scenarios) تتدرج من الصعوبة إلى شديدة الصعوبة.

    نص المحاضرة:
    ${lectureText}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const fullOutput = response.text();

        displayResults(fullOutput, fileName);
        saveToHistory(fileName, fullOutput);
    } catch (error) {
        console.error("AI Error:", error);
        alert("حدث خطأ في الاتصال بالذكاء الاصطناعي. تأكد من أن مفتاح الـ API يعمل وأنه غير محظور.");
    } finally {
        stopLoading();
    }
}

function displayResults(output, fileName) {
    document.getElementById('lecture-content').classList.remove('hidden');
    
    // تقسيم النص بناءً على العلامات التي وضعناها في الـ prompt
    const explanationPart = output.split('[EXPLANATION]')[1]?.split('[TERMS]')[0] || "لم يتم توليد الشرح بنجاح";
    const termsPart = output.split('[TERMS]')[1]?.split('[MCQ]')[0] || "لا توجد مصطلحات مستخرجة";
    const mcqPart = output.split('[MCQ]')[1] || "لم يتم توليد الأسئلة";

    document.getElementById('explanation-tab').innerHTML = `
        <div class="section-block block-content">
            <h2 class="bold-text">📍 موضوع المحاضرة: ${fileName}</h2>
            ${formatText(explanationPart)}
        </div>`;
    
    document.getElementById('terms-tab').innerHTML = `<div class="section-block block-reminder">${formatText(termsPart)}</div>`;
    document.getElementById('mcq-tab').innerHTML = `<div class="section-block block-normal">${formatText(mcqPart)}</div>`;
    
    window.scrollTo({ top: document.getElementById('lecture-content').offsetTop, behavior: 'smooth' });
}

function formatText(text) {
    return text
        .trim()
        .replace(/\n/g, '<br>') // تحويل السطور الجديدة لـ HTML
        .replace(/\*\*(.*?)\*\*/g, '<strong class="bold-text">$1</strong>'); // تحويل النجوم لخط عريض
}

function startLoading() {
    document.getElementById('loading-screen').classList.remove('hidden');
    const adhkars = [
        "ربِّ زدني علماً",
        "اللهم انفعنا بما علمتنا",
        "اللهم علمنا ما ينفعنا",
        "لا حول ولا قوة إلا بالله",
        "سبحان الله وبحمده"
    ];
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
    // حفظ آخر 10 محاضرات فقط لتقليل مساحة التخزين
    if (history.length > 10) history.shift();
    history.push({ name, data, date: new Date().toLocaleDateString() });
    localStorage.setItem('med_history', JSON.stringify(history));
    updateHistoryList();
}

function updateHistoryList() {
    const list = document.getElementById('lecture-history');
    let history = JSON.parse(localStorage.getItem('med_history') || "[]");
    list.innerHTML = history.map((item, index) => 
        `<li onclick="loadFromHistory(${index})">
            <strong>${item.name}</strong><br>
            <small>${item.date}</small>
        </li>`
    ).reverse().join('');
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
