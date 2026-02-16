https://notebooklm.google.com/
שימש להורדת הסרטונים תמלול וסיכום שלהם, גם בעברית ובאנגלית.

עיקר הביצוע בוצע על ידי claude.ai.

קודם תכנון הפרויקט בצורה כללית



סיכום השיחות (מתחילת הפרויקט)

הפרויקט התנהל בשיחה אחת ארוכה, שעברה את השלבים הבאים:

שלב 1 — הגדרת תשתית ותכנון ארכיטקטורה: הגדרת ארכיטקטורת 5 שכבות (UI → API → Services → Domain → Automation) לפי עקרונות Clean Architecture. נבחר Playwright על פני Selenium, גישת bottom-up לבנייה.

שלב 2 — בניית שכבת Automation: נבנו 14 קבצים כולל browserFactory, selectors, loginFlow, searchFlow, cartFlow, checkoutFlow, וכלי עזר כמו retry, normalizePrice, stepLogger (Observer Pattern), ו-selectProduct (cheapest-first policy). כולל 6 צילומי מסך לכל רכישה. נבנה run\_demo.js כ-PoC שעובד מקצה לקצה.

שלב 3 — תכנון ובניית שכבת Domain: נוצרו מודלים Product, Cart, Order באמצעות Factory Functions + Object.freeze (אימוטביליות). פותח ה-"Oracle Pattern" — cartCalculator מחשב מס באופן עצמאי ומשווה מול ערכי DOM עם Epsilon של 0.02. הושגו 115 בדיקות יחידה עוברות.

שלב 4 — תכנון שכבת Services: נוצרה תוכנית V3 מפורטת ל-statusStore, searchService, purchaseService, כולל Fire-and-Forget pattern (API מחזיר 202 מיד). נכתבו תוכניות גם ל-API ו-UI.

שלב 5 — Handoff: בסוף השיחה הוכן מסמך סיכום מלא ופרומפט פתיחה לשיחה חדשה, לצורך המשך בנייה של Services → API → UI.





gemini היה בשימוש רב ב Deep Research לחקור את הפרויקט ואת הביצוע

והציע תוענית וביקורת לתוכנית של claude.

לאחר מכן הוצע לקוד להגיב על הביקורת של gemini, כאן קלוד לפעמים קיבל את הביקורת

לפעמים הוא סירב והסביר בטעם את סירובו





היה שימוש גם בטרמינל לתיקון באגים הקוד

עדיין לא השתמשתי ב Sub-Agents



GitHub Copilot
הנידון- שכבת automation על אתר קניון דמו https://www.saucedemo.com/
להוסיף בשכבת ה automation ספשרות לבחור אתר נוס
את אתר אמזון https://www.amazon.com/.
הוסף מסך בחירה באיזה אתר שכבת automation תעבוד
הוסף את כל הלוגיקה והקבצים לשימוש ב automation על אתר  https://www.amazon.com/
שים לב להפרדת השכבות







הוספת אתר אמזון נתקלה בקשיים רבים עקב החסימות שמפעילה אמזון נגד בוטים

לא ראיתי חלק מתפקידי ליצור פריצות לאמזון

