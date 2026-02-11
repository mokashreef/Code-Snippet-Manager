# Code Snippet Manager | مدير الأكواد البرمجية

<div align="center">

![Code Snippet Manager](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-ready-brightgreen.svg)

**أداة احترافية لإدارة وتخزين مقاطع الأكواد البرمجية**

[English](#english) | [العربية](#arabic)

</div>

---

<a name="arabic"></a>
## 📖 نظرة عامة

**Code Snippet Manager** هو تطبيق ويب حديث ومتطور يساعد المبرمجين على:

- 💾 **حفظ الأكواد** بسهولة وسرعة
- 🏷️ **تنظيمها** باستخدام نظام Tags ذكي
- 🔍 **البحث الفوري** في جميع الأكواد
- 📋 **النسخ بنقرة واحدة** إلى الحافظة
- 🎨 **عرض احترافي** مع Syntax Highlighting لجميع اللغات

---

## ✨ الميزات الرئيسية

### 🔧 إدارة الأكواد
- ✅ إضافة كود جديد مع كامل التفاصيل
- ✅ تعديل الأكواد الموجودة
- ✅ حذف الأكواد مع تأكيد
- ✅ تخزين تلقائي في المتصفح (localStorage)

### 🏷️ نظام Tags
- ✅ Tags غير محدودة لكل كود
- ✅ فلترة سريعة حسب Tag
- ✅ عدادات تلقائية لكل Tag
- ✅ تصميم جذاب وتفاعلي

### 🔍 البحث الذكي
- ✅ بحث فوري (Live Search)
- ✅ البحث في العنوان، الكود، الوصف، والـ Tags
- ✅ عرض عدد النتائج
- ✅ بدون إعادة تحميل الصفحة

### 🎨 Code Highlighting
- ✅ تلوين تلقائي للأكواد حسب اللغة
- ✅ دعم أكثر من 15 لغة برمجة
- ✅ استخدام مكتبة Prism.js الاحترافية
- ✅ تصميم Dark Mode مريح للعين

### 📋 ميزات إضافية
- ✅ نسخ الكود كاملاً بنقرة واحدة
- ✅ إشعارات نجاح العمليات (Toast Notifications)
- ✅ واجهة عربية كاملة مع دعم RTL
- ✅ تصميم Responsive يعمل على جميع الأجهزة

---

## 🚀 التشغيل السريع

### المتطلبات
- متصفح حديث (Chrome, Firefox, Safari, Edge)
- لا يحتاج إلى خادم أو قاعدة بيانات

### طريقة التشغيل

1. **افتح الملف مباشرة:**
   ```
   افتح ملف index.html في المتصفح
   ```

2. **أو استخدم Live Server:**
   ```bash
   # إذا كان لديك VS Code مع Live Server
   انقر بالزر الأيمن على index.html
   اختر "Open with Live Server"
   ```

3. **أو استخدم Python Server:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # ثم افتح http://localhost:8000
   ```

---

## 📂 هيكل المشروع

```
Code Snippet Manager/
├── index.html              # الصفحة الرئيسية
├── css/
│   └── style.css          # ملف التصميم الكامل
├── js/
│   ├── app.js             # المنطق الرئيسي للتطبيق
│   ├── storage.js         # إدارة التخزين
│   ├── ui.js              # واجهة المستخدم
│   └── utils.js           # دوال مساعدة
├── lib/
│   └── prism/             # مكتبة Code Highlighting
│       ├── prism.css
│       └── prism.js
└── README.md              # هذا الملف
```

---

## 💻 التقنيات المستخدمة

### Frontend
- **HTML5** - بنية دلالية حديثة
- **CSS3** - تصميم متقدم مع CSS Variables
- **JavaScript ES6+** - منطق التطبيق

### Libraries
- **Prism.js** - Syntax Highlighting احترافي
- **localStorage API** - تخزين البيانات محلياً

### Design
- **Dark Mode** - تصميم داكن مريح للعين
- **Glassmorphism** - تأثيرات زجاجية عصرية
- **Responsive Design** - متجاوب مع جميع الأحجام
- **Smooth Animations** - حركات سلسة وجذابة

---

## 🎯 كيفية الاستخدام

### إضافة كود جديد
1. انقر على زر **"إضافة كود جديد"**
2. املأ النموذج:
   - عنوان الكود (مطلوب)
   - لغة البرمجة (مطلوب)
   - الكود البرمجي (مطلوب)
   - الوصف (اختياري)
   - Tags (اختياري - افصل بينها بفاصلة)
3. انقر **"حفظ الكود"**

### البحث في الأكواد
- اكتب في شريط البحث في الأعلى
- البحث تلقائي وفوري
- يبحث في كل محتويات الكود

### الفلترة حسب Tag
- انقر على أي Tag في قسم الوسوم
- ستظهر فقط الأكواد التي تحتوي على هذا الـ Tag
- انقر مرة أخرى لإلغاء الفلتر

### نسخ الكود
- مرر الماوس فوق بطاقة الكود
- انقر على زر **"نسخ"**
- سيتم نسخ الكود كاملاً إلى الحافظة

### تعديل أو حذف
- استخدم الأزرار في أعلى كل بطاقة كود
- التعديل: يفتح النموذج مع البيانات الحالية
- الحذف: يطلب تأكيد قبل الحذف

---

## 🌐 اللغات المدعومة

التطبيق يدعم Syntax Highlighting للغات التالية:

- JavaScript
- Python
- PHP
- HTML
- CSS
- SQL
- Java
- C++
- C#
- TypeScript
- JSON
- Markdown
- Bash/Shell
- Ruby
- Go

---

## 🔮 ميزات مستقبلية محتملة

- [ ] مزامنة سحابية (Cloud Sync)
- [ ] حسابات المستخدمين
- [ ] تصدير/استيراد الأكواد (JSON, CSV)
- [ ] مشاركة الأكواد عبر روابط
- [ ] مجلدات/تصنيفات متقدمة
- [ ] دعم Snippets متعددة الملفات
- [ ] إحصائيات وتقارير
- [ ] Dark/Light Mode Toggle
- [ ] اختصارات لوحة المفاتيح

---

## 📱 التوافق

### المتصفحات
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### الأجهزة
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px+)
- ✅ Tablet (768px+)
- ✅ Mobile (375px+)

---

## 🤝 المساهمة

المساهمات مرحب بها! إذا كان لديك اقتراح:

1. Fork المشروع
2. أنشئ Branch جديد
3. قم بالتعديلات
4. افتح Pull Request

---

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - أنت حر في استخدامه وتعديله كما تشاء.

---

## 👨‍💻 المطور

تم تطوير هذا المشروع بواسطة Antigravity AI

---

<a name="english"></a>
## 🌍 English Version

### Overview
**Code Snippet Manager** is a modern web application for programmers to manage, organize, and quickly access their code snippets with professional syntax highlighting and smart tagging.

### Features
- 💾 Save code snippets with full details
- 🏷️ Organize with unlimited tags
- 🔍 Instant live search
- 📋 One-click copy to clipboard
- 🎨 Beautiful dark mode design
- ✨ Syntax highlighting for 15+ languages
- 📱 Fully responsive

### Quick Start
Simply open `index.html` in your browser. No installation or server required!

### Tech Stack
- HTML5, CSS3, Vanilla JavaScript
- Prism.js for syntax highlighting
- localStorage for data persistence

### Usage
1. Click "Add New Snippet"
2. Fill in the form
3. Search and filter anytime
4. Copy code with one click

---

<div align="center">

**استمتع بإدارة أكوادك باحترافية! 🚀**

**Enjoy Professional Code Management! 🚀**

</div>
