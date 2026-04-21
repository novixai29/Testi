const API_KEY = "AIzaSyCQRkTbqLQJ3dlJZstX3nka2msxODPXSzE";

// تهيئة مكتبة PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// دالة المعالجة الأساسية
async function processWithAI(lectureText, fileName) {
    // هذا الرابط هو "العمود الفقري" لـ Gemini حالياً ومستقر جداً
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: `أنت طبيب وصديق، اشرح لزميلك المحاضرة التالية بأسلوب ودي.
                قسم الإجابة بوضوح باستخدام الوسوم: [EXPLANATION]، [TERMS]، [MCQ].
                النص: ${lectureText}`
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // فحص وجود خطأ في الرد
        if (data.error) {
            if (data.error.status === "PERMISSION_DENIED") {
                throw new Error("المفتاح غير مفعل أو يحتاج لتغيير إعدادات المنطقة في Google AI Studio.");
            }
            throw new Error(data.error.message);
        }

        if (data.candidates && data.candidates[0].content) {
            const fullOutput = data.candidates[0].content.parts[0].text;
            displayResults(fullOutput, fileName);
            saveToHistory(fileName, fullOutput);
        } else {
            throw new Error("جوجل لم تعطي رداً، قد يكون النص طويلاً جداً أو مخالفاً لسياسات الأمان.");
        }

    } catch (error) {
        console.error("AI Error:", error);
        alert("فشل الاتصال: " + error.message);
    } finally {
        stopLoading();
    }
}

// دالة عرض النتائج المحدثة لضمان القراءة الصحيحة
function displayResults(output, fileName) {
    document.getElementById('lecture-content').classList.remove('hidden');
    
    // تقسيم النص بذكاء أكبر
    const exp = output.includes('[EXPLANATION]') ? output.split('[EXPLANATION]')[1].split('[TERMS]')[0] : output;
    const trm = output.includes('[TERMS]') ? output.split('[TERMS]')[1].split('[MCQ]')[0] : "لا توجد مصطلحات";
    const mcq = output.includes('[MCQ]') ? output.split('[MCQ]')[1] : "لا توجد أسئلة";

    document.getElementById('explanation-tab').innerHTML = `<div class="section-block block-content"><h3>شرح: ${fileName}</h3>${formatText(exp)}</div>`;
    document.getElementById('terms-tab').innerHTML = `<div class="section-block block-reminder">${formatText(trm)}</div>`;
    document.getElementById('mcq-tab').innerHTML = `<div class="section-block block-normal">${formatText(mcq)}</div>`;
}

function formatText(text) {
    return text.trim().replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// باقي الدوال (startLoading, stopLoading, saveUserData) تبقى كما هي في الكود السابق
