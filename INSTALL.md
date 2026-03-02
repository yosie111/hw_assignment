# הוראות התקנה — קבצים מעודכנים

## מה בתוך ה-ZIP

```
.gitignore                                             <- מאפשר screenshots של proof
.env.example                                           <- מסודר, בלי שדות legacy
src/automation/config.js                               <- נקי — בלי BASE_URL/USERNAME/PASSWORD
client/src/pages/SearchPage.jsx                        <- תיקון getSiteDisplayName ל-ToolShop
client/src/pages/PurchasePage.jsx                      <- הוספת שלב Cart Review לפני Checkout
client/src/components/CartReview/CartReview.jsx        <- קומפוננטת עגלה חדשה
client/src/components/CartReview/CartReview.module.css <- CSS לעגלה
scripts/pre-submit-cleanup.sh                          <- מחיקת קוד מת + המרת test-output
```

## צעדים

### 1. העתקה (דרוס על הקיים)
```bash
cd hw_assignment
# פרוס את הקבצים — דורס קיימים
unzip -o updates.zip
```

### 2. הרץ את סקריפט הניקוי
```bash
bash scripts/pre-submit-cleanup.sh
```
הסקריפט:
- מוחק 9 קבצי קוד מת (server2.js, factory.js, debug scripts...)
- ממיר test-output.txt ל-UTF-8
- מכין תיקיית screenshots עם .gitkeep
- מוסיף ל-git את ה-screenshot proof (אם קיים)

### 3. הרץ טסטים — ודא שהכל עובד
```bash
npm test
```

### 4. Commit סופי
```bash
git add -A
git commit -m "Pre-submission: add cart screen, fix config, cleanup dead code"
git push
```
