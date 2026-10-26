<div align="center">

# 🚀 Code Snippet Manager (v2.0)
### مدير الأكواد البرمجية الاحترافي

[![Continuous Integration](https://github.com/mokashreef/Code-Snippet-Manager/actions/workflows/ci.yml/badge.svg)](https://github.com/mokashreef/Code-Snippet-Manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)](js/app.js)
[![Tests: Node Native](https://img.shields.io/badge/Tests-Node%20--test%20(34%2F34%20Passed)-brightgreen)](tests/)

**أداة ويب احترافية، سريعة، وآمنة لإدارة وتنظيم الأكواد البرمجية (Snippets) مع تلوين نحوي ذكي، بحث فوري، نظام وسوم ومفضلة، ونسخ احتياطي واستيراد متقدم.**

[🇸🇦 العربية](#-دليل-الاستخدام-باللغة-العربية) • [🇬🇧 English Documentation](#-english-documentation) • [🏛️ Architecture](ARCHITECTURE.md) • [🧪 Tests](#-running-tests)

</div>

---

## 🌟 نظرة عامة (Overview)

تم إعادة بناء وتحديث **Code Snippet Manager** بالكامل (الإصدار 2.0) ليصبح أداة متكاملة وسلسة للمطورين ومديري الأنظمة. يعتمد التطبيق على معمارية ثلاثية الطبقات مفصولة بوضوح، مع دعم كامل للغة العربية (RTL) والإنجليزية، وتصميم عصري يدعم الوضعين الداكن والفاتح (Dark / Light Themes) مع تأثيرات زجاجية (Glassmorphism).

---

## 🇸🇦 دليل الاستخدام باللغة العربية

### ✨ أبرز الميزات الجديدة في الإصدار 2.0

1. **إدارة متكاملة للأكواد (Full CRUD)**:
   - إنشاء، تعديل، حذف، واستعراض الأكواد بسهولة فائقة.
   - التحقق من صحة المدخلات وضمان عدم فقدان المسودات غير المحفوظة عند الإغلاق العرضي.

2. **عارض الأكواد الموسع (Full Snippet Viewer)**:
   - نافذة مخصصة لعرض الكود كاملاً بدون اقتطاع.
   - عداد أسطر، تمييز نحوي كامل، شارة ملونة للغة، وإمكانية النسخ أو التعديل المباشر.

3. **نظام المفضلة والترتيب المتقدم (Favorites & Sorting)**:
   - تمييز الأكواد الهامة بزر النجمة (⭐) لتثبيتها في المفضلة.
   - فلترة مخصصة لعرض "المفضلة فقط".
   - 6 خيارات ترتيب: الأحدث تعديلاً، الأقدم تعديلاً، الأحدث إنشاءً، الأقدم إنشاءً، وترتيب أبجدي من (أ - ي) ومن (ي - أ).

4. **البحث الفوري الذكي (Smart Live Search)**:
   - بحث فوري مع تقنية التخميد (Debounce 250ms) في: العنوان، نصوص الأكواد البرمجية، الوصف، والوسوم.
   - تصفية فورية حسب لغة البرمجة أو النقر المباشر على أي وسم (#tag).

5. **استيراد وتصدير آمن مع النسخ الاحتياطي التلقائي (Import/Export & Auto-Backup)**:
   - تصدير بنية JSON قياسية مع بيانات وصفية وتاريخ التصدير.
   - معاينة ملف الاستيراد قبل التطبيق مع إحصائيات الأكواد الجديدة والمعدلة.
   - خياران للاستيراد: **الدمج الذكي** (Merge) لمنع التكرار، أو **الاستبدال الكامل** (Replace).
   - أخذ لقطة احتياطية تلقائياً قبل أي استبدال، مع إمكانية استعادتها بنقرة واحدة عبر زر "استعادة نسخة".

6. **تلوين نحوي عالي الدقة (Syntax Highlighting)**:
   - دعم أكثر من 20 لغة برمجية عبر Prism.js ومحمل اللغات التلقائي (`prism-autoloader.js`).

7. **دعم الوضعين الداكن والفاتح (Dark & Light Themes)**:
   - تبديل سلس مع حفظ التفضيل تلقائياً في التخزين المحلي.

8. **اختصارات لوحة المفاتيح الإنتاجية (Keyboard Shortcuts)**:
   - دعم اختصارات المطورين وسلوك مفتاح `Tab` للإزاحة بمسافتين داخل محرر الكود.

---

### ⌨️ اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> أو <kbd>/</kbd> | التركيز السريع على شريط البحث |
| <kbd>Alt</kbd> + <kbd>N</kbd> أو <kbd>Ctrl</kbd> + <kbd>B</kbd> | فتح نافذة إضافة كود جديد |
| <kbd>Escape</kbd> | إغلاق أي نافذة منبثقة نشطة |
| <kbd>Tab</kbd> (داخل محرر الكود) | إدراج إزاحة بمسافتين بدلاً من فقدان التركيز |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | فتح دليل اختصارات لوحة المفاتيح |

---

### 🚀 التشغيل السريع (Quick Start)

التطبيق خفيف الوزن ويعمل في أي متصفح حديث دون الحاجة لتثبيت برمجيات خارجية.

#### الطريقة الأولى: التشغيل عبر متصفح الويب مباشرة
افتح ملف `index.html` في متصفحك المفضل (Chrome, Firefox, Edge, Safari).

#### الطريقة الثانية: تشغيل خادم محلي عبر Python
```bash
python -m http.server 8000
# ثم توجه في المتصفح إلى: http://localhost:8000
```

#### الطريقة الثالثة: تشغيل عبر Node.js / NPM
```bash
npm run serve
```

---

## 🇬🇧 English Documentation

### Features Overview
- **Zero-Dependency Native Architecture**: High performance vanilla ES6+ modules with clean separation of concerns.
- **Syntax Highlighting**: Supports 20+ languages powered by Prism.js and dynamic autoloading.
- **Deep Search & Multi-Criteria Sorting**: Real-time debounced queries matching across titles, syntax code, tags, and descriptions.
- **Favorites & Tag Cloud**: Instant tag grouping, usage metrics, and favorite pinning.
- **Full Snippet Inspector Modal**: Dedicated code viewer with line numbers and one-click copy.
- **Disaster Recovery & Safe Import/Export**: Formatted JSON data interchange, schema validation, merge deduplication, and automatic snapshot before destructive replacement.
- **Dark/Light Theme**: Accessible contrast, CSS design tokens, and persistent preference.

---

## 🏛️ هيكل المشروع (Project Structure)

```text
Code-Snippet-Manager/
├── .github/
│   └── workflows/
│       └── ci.yml             # خط أنابيب الفحص والاختبار المستمر (GitHub Actions)
├── css/
│   └── style.css              # ملف التصميم والأنماط والألوان (Dark/Light + Glassmorphism)
├── js/
│   ├── app.js                 # منسق التطبيق ودورة الحياة وإدارة الأحداث (Controller)
│   ├── storage.js             # طبقة التخزين والتحقق من المخطط والبحث والنسخ الاحتياطي
│   ├── ui.js                  # طبقة العرض وتوليد البطاقات وإدارة النوافذ المنبثقة
│   └── utils.js               # دوال مساعدة نقية (UUID, Escape HTML, Dates, Tags)
├── lib/
│   └── prism/                 # مكتبة التلوين النحوي (Prism.js + CSS + Autoloader)
├── tests/
│   ├── storage.test.js        # اختبارات آلية شاملة لطبقة التخزين والبحث والاستيراد
│   └── utils.test.js          # اختبارات آلية للدوال المساعدة والأمان
├── ARCHITECTURE.md            # التوثيق المعماري الشامل للنظام وتدفق البيانات
├── index.html                 # واجهة المستخدم الدلالية والمهيأة لمحركات البحث
├── LICENSE                    # رخصة MIT المفتوحة
├── package.json               # بيانات المشروع وإعدادات الاختبارات الآلية
└── README.md                  # دليل المشروع والتوثيق المكتمل
```

---

## 🧪 تشغيل الاختبارات الآلية (Running Tests)

المشروع مزود بحزمة اختبارات آلية شاملة (34 اختباراً) باستخدام محرك الاختبارات الأصلي في Node.js (`node:test`) دون الحاجة لأي مكتبات خارجية:

```bash
# تشغيل جميع الاختبارات
npm test

# أو تشغيلها عبر Node مباشرة
node --test tests/*.test.js
```

### التغطية الاختبارية تشمل:
- توليد وفحص معرفات UUID v4 ومطابقتها للمعيار القياسي.
- الحماية من هجمات XSS بتعقيم وسوم HTML وخصائص الخواص (Attributes).
- معالجة التواريخ النسبية باللغة العربية واختبار الحالات الشاذة والمستقبلية.
- تجزئة وتطهير الوسوم وحذف التكرار.
- التحقق من مخطط الكود (`validateSnippet`) وتطبيعه (`normalizeSnippet`).
- عمليات التخزين الأساسية (CRUD) والحفاظ على تاريخ الإنشاء الأصلي عند التعديل.
- محرك البحث متعدّد الحقول والفرز بعدة استراتيجيات وتجميع الوسوم.
- استيراد وتصدير JSON والدمج الذكي والنسخ الاحتياطي التلقائي والاستعادة.

---

## 🔒 الأمان وحماية البيانات (Security)

- **حماية XSS**: جميع النصوص والبيانات المدخلة من المستخدمين تمر عبر دالتي `escapeHtml()` و `escapeAttribute()` قبل حقنها في شجرة الـ DOM.
- **حدود استيراد آمنة**: يتم فحص ملفات JSON القادمة من الخارج بواسطة `validateImportData()` للتحقق من بنيتها قبل الكتابة في التخزين.
- **خصوصية مطلقة**: جميع بياناتك تُخزن محلياً داخل متصفحك (Client-Side LocalStorage) دون إرسال أي بايت لخوادم خارجية.

---

## 🤝 المساهمة (Contributing)

نرحب بكافة المساهمات لتطوير الأداة! للمساهمة:
1. Fork للمستودع.
2. أنشئ فرعاً لميزتك (`git checkout -b feature/AmazingFeature`).
3. احرص على تشغيل الاختبارات (`npm test`).
4. احفظ تعديلاتك (`git commit -m 'feat: add amazing feature'`).
5. ارفع الفرع وافتح Pull Request مع توضيح التعديلات.

---

## 📄 الترخيص (License)

هذا المشروع مرخص تحت رخصة **MIT** - راجع ملف [LICENSE](LICENSE) للاطلاع على التفاصيل الكاملة.
