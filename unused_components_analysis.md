# Aktív komponensek elemzése

## Használt komponensek (main.jsx és oldalak alapján):

### Routing komponensek (main.jsx):
- ProtectedRoute
- AdminRoute  
- ParentRoute

### Oldal komponensek (pages):
- DashboardPage
- TasksPage
- FamilySetupPage
- AdminSetupPage
- LoginPage
- UserManagementPage
- FinancesPage
- CategoryManagementPage
- AccountDetailPage
- AnalyticsPage
- WishesPage
- ProfilePage
- TimeManagementPage

### Aktív komponensek az oldalakból:
- AuthLayout (setup és login oldalak)
- FamilyScheduler (TimeManagementPage)
- UserModal (UserManagementPage)
- WishCard, CreateWishModal, ApprovalModal, WishHistoryLog, AssignGoalModal (WishesPage)
- ModernTransactionsList, CloseGoalModal (AccountDetailPage)
- CategoryModal, CategoryCard (CategoryManagementPage)
- FAB, TaskModal (TasksPage)
- UpcomingEventsCard, NotificationBar, TransactionModal, ForecastCard (DashboardPage)
- SimplifiedFinancesOverview (FinancesPage)

### App.jsx komponensek:
- Nav
- MobileNav

## Valószínűleg nem használt komponensek:

### TimeManagement variánsok (csak FamilyScheduler használt):
- TimeManagement.jsx
- TimeManagement_Beautiful.jsx
- TimeManagement_Final.jsx
- TimeManagement_backup.jsx
- NewTimeManagement.jsx
- ModernTimeManagement.jsx

### CSS fájlok ezekhez:
- TimeManagement.css
- TimeManagement_Beautiful.css
- TimeManagement_Clean.css
- TimeManagement_Final.css
- TimeManagement_Modern.css
- TimeManagement_New.css
- TimeManager.css
- ModernTimeManagement.css

### Egyéb komponensek amelyek nincsenek importálva:
- BentoCard.jsx
- BentoGrid.jsx
- CalendarModal.jsx
- DailyTimelineView.jsx
- FamilyCalendar.css
- FamilyCalendar.jsx
- FamilyMemberCard.jsx
- MonthlyCalendarView.jsx
- MonthlyScheduleManager.jsx
- RecurringRuleModal.jsx
- ShiftTemplateManager.jsx
- SimpleCalendar.jsx
- SimpleForecastCard.jsx
- WeeklyTableView.jsx
- AccountModal.jsx (ha nincs használva)
- TransferModal.jsx (ha nincs használva)
- CalendarModal.jsx
- ProfileEditModal.jsx (ha nincs használva)

### Más fájlok:
- clean_css.py
- index_clean.css
- test-multiday-events.js
