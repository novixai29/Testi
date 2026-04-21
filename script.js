let currentUser = null;

// Dark mode
function toggleMode() {
  document.body.classList.toggle("dark");
}

// Save student (first time only)
function saveStudent() {
  let name = document.getElementById("name").value;
  let college = document.getElementById("college").value;

  if (!name || !college) return alert("املأ البيانات");

  currentUser = { name, college };

  localStorage.setItem("med_user", JSON.stringify(currentUser));

  document.getElementById("studentBox").style.display = "none";
  document.getElementById("app").style.display = "block";

  loadHistory();
}

// Load user on refresh
window.onload = () => {
  let user = localStorage.getItem("med_user");
  if (user) {
    currentUser = JSON.parse(user);
    document.getElementById("studentBox").style.display = "none";
    document.getElementById("app").style.display = "block";
    loadHistory();
  }
};

// Upload lecture (fake AI placeholder)
function uploadLecture() {
  let file = document.getElementById("fileInput").files[0];
  if (!file) return alert("اختر ملف");

  document.getElementById("loading").style.display = "block";

  setTimeout(() => {
    document.getElementById("loading").style.display = "none";

    let lectureText = `
    📌 التذكير:
    - مراجعة الأساسيات السابقة...
    - فهم المرض السابق مهم لفهم الجديد...

    📌 الحالة الطبيعية:
    الجسم الطبيعي يعمل بتوازن كامل بدون أي اضطراب.

    📌 الشرح:
    (هنا يتم شرح المحاضرة بشكل تفصيلي لكل فقرة على حدة)

    💊 الأدوية:
    يتم ذكر الاسم العلمي + التجاري الشائع

    🧪 الفحوصات:
    شرح طريقة كل اختبار خطوة بخطوة
    `;

    document.getElementById("output").innerText = lectureText;

    saveToHistory(lectureText);

  }, 5000);
}

// Save history
function saveToHistory(text) {
  let history = JSON.parse(localStorage.getItem("lectures") || "[]");
  history.push(text);
  localStorage.setItem("lectures", JSON.stringify(history));
}

// Load history
function loadHistory() {
  let history = JSON.parse(localStorage.getItem("lectures") || "[]");
  document.getElementById("history").innerHTML =
    history.map((h, i) => `<p>محاضرة ${i+1}</p>`).join("");
}

// Tabs
function showTab(id) {
  document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
  document.getElementById(id).style.display = "block";
}
