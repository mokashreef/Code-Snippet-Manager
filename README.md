# 🚀 Code Snippet Manager

أداة احترافية لإدارة وتخزين مقاطع الأكواد البرمجية (Snippets)، مصممة لتسهيل عمل المطورين من خلال حفظ وتصنيف واسترجاع الشيفرات البرمجية بطريقة سريعة ومنظمة.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)](js/app.js)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](index.html)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](css/style.css)

نظام ويب خفيف الوزن يعمل بالكامل في المتصفح، بدون خادم خلفي، مع دعم كامل للبحث، الفلاتر، الترتيب، النسخ الاحتياطي، وتلوين نحوي للغات البرمجية.

## ✨ المميزات

- إدارة كاملة للأكواد: إنشاء، قراءة، تحديث، حذف (CRUD)
- دعم تلوين نحوي متقدم عبر Prism.js
- بحث فوري عبر العنوان، المحتوى، الوصف، والوسوم
- فلترة حسب اللغة والمفضلة والبحث السريع
- ترتيب متعدد: الأحدث، الأقدم، الأبجدي، والمفضلة أولاً
- استيراد وتصدير ملفات JSON
- نسخ احتياطي تلقائي قبل الاستبدال
- دعم الوضع الداكن والفاتح
- تخزين البيانات محلياً داخل المتصفح عبر LocalStorage
- واجهة بسيطة وسريعة لا تحتاج إلى أي تبعيات خارجية

## 🧩 ميزات المشروع

- تطبيق ويب كامل باستخدام HTML + CSS + JavaScript
- تصميم حديث مع واجهة مستخدم نظيفة ومريحة
- إمكانية حفظ شيفرات متعددة في نفس الوقت
- دعم مجموعات وسوم (Tags) لتجميع الأكواد
- إعدادات مخصصة مثل اللغة، التاريخ، والمفضلة
- أمان للبيانات من خلال تنظيف القيم قبل العرض والإدراج

## 🏗️ هيكل المشروع

```text
Code-Snippet-Manager/
├── .github/
│   └── workflows/
│       └── ci.yml
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── ui.js
│   └── utils.js
├── lib/
│   └── prism/
├── tests/
│   ├── storage.test.js
│   └── utils.test.js
├── ARCHITECTURE.md
├── index.html
├── LICENSE
├── package.json
├── README.md
└── .gitignore
```

## 🚀 التشغيل السريع

### الطريقة الأولى: التشغيل مباشرة من المتصفح

افتح ملف `index.html` في متصفحك المفضل.

### الطريقة الثانية: عبر خادم محلي

```bash
python -m http.server 8000
```

ثم انتقل إلى:

```text
http://localhost:8000
```

### الطريقة الثالثة: عبر Node.js

```bash
npm install
npm run serve
```

## 🧪 التشغيل والتجربة

```bash
npm test
```

المشروع يضم اختبارات آلية تغطي:

- إنشاء الأكواد وتحديثها
- التحقق من سلامة البيانات
- البحث والفلترة
- المعالجة الأمنية للمدخلات
- استيراد/تصدير JSON
- النسخ الاحتياطي واستعادة البيانات

## 🔒 الأمان والخصوصية

- جميع البيانات تُخزن محلياً داخل المتصفح
- لا يتم إرسال البيانات إلى خادم خارجي
- تُعالج النصوص المدخلة بشكل آمن لتقليل مخاطر XSS
- يتم التحقق من هيكل ملفات الاستيراد قبل تطبيقها

## 🧠 التقنيات المستخدمة

- HTML5
- CSS3
- JavaScript ES6+
- Prism.js
- LocalStorage
- Node.js Test Runner

## 🤝 المساهمة

نرحب بالمساهمات من جميع المطورين. للمساهمة:

1. Fork المستودع
2. إنشاء فرع جديد (`git checkout -b feature/my-feature`)
3. تنفيذ التعديلات
4. تشغيل الاختبارات (`npm test`)
5. إنشاء Pull Request مع وصف واضح للتغييرات

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT. يمكنك مشاهدة ملف [LICENSE](LICENSE) للتفاصيل كاملة.

## 📌 ملخص سريع

Code Snippet Manager هو تطبيق عملي ومريح لإدارة الشفرات البرمجية، ويهدف إلى تسهيل البحث، التنظيم، والنشر السريع للمقاطع البرمجية في بيئة تطويرية مريحة.

---

English version:

# Code Snippet Manager

A professional web app for managing and organizing code snippets. It helps developers save, search, tag, and retrieve code quickly and efficiently.

### Key features

- Full CRUD support for snippets
- Syntax highlighting for multiple languages
- Live search and filtering
- Tag support and favorites
- Sorting and organization tools
- Import/export in JSON format
- Auto-backup before replacement
- Dark and light themes
- Browser-local storage using LocalStorage

### Tech stack

- HTML5
- CSS3
- JavaScript ES6+
- Prism.js
- Node.js test runner

### Run locally

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Tests

```bash
npm test
```

### License

MIT License. See [LICENSE](LICENSE).
