from pydantic import BaseModel,Field
from datetime import date
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, ForwardRef,Literal
import uuid
from typing import Literal

# --- Base Schemas ---
class WishImageBase(BaseModel):
    image_url: str
    image_order: int = 0

class WishLinkBase(BaseModel):
    url: str
    title: Optional[str] = None

class WishBase(BaseModel):
    name: str
    description: Optional[str] = None
    estimated_price: Decimal
    priority: Literal['low', 'medium', 'high'] = 'medium'
    category_id: Optional[int] = None
    deadline: Optional[date] = None

class UserProfile(BaseModel):
    id: int
    display_name: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True

class CategorySimple(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None

    class Config:
        from_attributes = True

class WishImage(WishImageBase):
    id: int
    wish_id: int

    class Config:
        from_attributes = True

class WishLinkCreate(WishLinkBase):
    pass

class WishLink(WishLinkBase):
    id: int
    wish_id: int

    class Config:
        from_attributes = True

class WishApprovalBase(BaseModel):
    status: Literal['approved', 'rejected', 'modifications_requested', 'conditional']
    feedback: Optional[str] = None
    conditional_note: Optional[str] = None

class WishApprovalCreate(WishApprovalBase):
    pass

class WishApproval(WishApprovalBase):
    id: int
    wish_id: int
    approver_user_id: int
    approver: UserProfile

    class Config:
        from_attributes = True

class WishHistory(BaseModel):
    id: int
    user: UserProfile
    action: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AccountSimple(BaseModel):
    id: int
    name: str
    balance: Decimal
    goal_amount: Optional[Decimal] = None

    class Config:
        from_attributes = True

# --- Main Wish Schema ---
class Wish(WishBase):
    id: int
    status: Literal['draft', 'pending', 'approved', 'conditional', 'modifications_requested', 'rejected', 'completed']
    owner_user_id: int
    family_id: int
    goal_account_id: Optional[int] = None

    owner: UserProfile
    category: Optional[CategorySimple] = None
    images: List[WishImage] = []
    links: List[WishLink] = []
    approvals: List[WishApproval] = []
    goal_account: Optional[AccountSimple] = None
    history: List[WishHistory] = []

    class Config:
        from_attributes = True

class AccountHistoryBase(BaseModel):
    action: str
    details: Optional[dict] = None

class AccountHistory(AccountHistoryBase):
    id: int
    account_id: int
    user_id: Optional[int] = None
    timestamp: datetime
    user: Optional[UserProfile] = None

    class Config:
        from_attributes = True


# --- Account Schema ---
class AccountBase(BaseModel):
    name: str
    type: str
    goal_amount: Optional[Decimal] = None
    goal_date: Optional[date] = None

class AccountCreate(AccountBase):
    viewer_ids: list[int] = []
    show_on_dashboard: bool = False

class Account(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    viewers: list[UserProfile] = []
    owner_user: Optional[UserProfile] = None
    status: Literal['active', 'archived']
    # === EZ AZ ÚJ SOR ===
    wishes: List[Wish] = []
    history_entries: List[AccountHistory] = [] 

    class Config:
        from_attributes = True

# Rebuild models to resolve forward references
Account.model_rebuild()
Wish.model_rebuild()

# ... (a többi séma változatlan)
# (A teljesség kedvéért a többi sémát is beilleszthetnénk, de a lényeg a fenti változtatás)
from pydantic import BaseModel,Field
from datetime import date
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, ForwardRef,Literal
import uuid
from typing import Literal


# Simple user profile - cirkuláris referenciák elkerüléséhez
class UserProfile(BaseModel):
    id: int
    display_name: str
    avatar_url: str | None = None

    class Config:
        from_attributes = True

# --- Base modellek ---
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

# Simple Category without children for avoiding recursion
class CategorySimple(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class CategoryWithParent(CategorySimple):
    parent: Optional['CategorySimple'] = None # A hiányzó láncszem

# Full Category with children - használd csak akkor, amikor tényleg kell
class Category(CategoryBase):
    id: int
    children: List['Category'] = []

    class Config:
        from_attributes = True
        # Recursion limit beállítás
        validate_assignment = True

# Response model kategóriákhoz - ez használható a legtöbb API válaszban
class CategoryResponse(CategoryBase):
    id: int
    has_children: bool = False  # Jelzi, hogy vannak-e gyerekei

    class Config:
        from_attributes = True


# --- Várható Költség Sémák ---
class ExpectedExpenseBase(BaseModel):
    description: str
    estimated_amount: Decimal
    priority: Literal['magas', 'közepes', 'alacsony'] = 'közepes'
    category_id: Optional[int] = None
    is_recurring: bool = False
    recurring_frequency: Optional[str] = None

class ExpectedExpenseCreate(ExpectedExpenseBase):
    # A frontendtől vagy egy konkrét dátum, vagy egy opció érkezik
    due_date: Optional[date] = None
    # JAVÍTÁS: A hiányzó mező hozzáadva
    due_date_option: Optional[Literal['specific_date', 'this_month', 'next_month']] = 'specific_date'

class ExpectedExpense(ExpectedExpenseBase):
    id: int
    due_date: date # A DB-ből már mindig konkrét dátum jön vissza
    actual_amount: Optional[Decimal] = None
    status: Literal['tervezett', 'teljesült', 'törölve']
    owner_id: int
    family_id: int
    transaction_id: Optional[int] = None

    owner: 'UserProfile'
    category: Optional[CategoryWithParent] = None


    class Config:
        from_attributes = True

class ExpectedExpenseComplete(BaseModel):
    actual_amount: Decimal
    account_id: int

class UpcomingEvent(BaseModel):
    date: date
    description: str
    amount: Decimal
    type: str  # 'bevétel', 'kiadás', 'átutalás', 'tervezett kiadás'
    owner_name: str
    is_recurring: bool

    class Config:
        from_attributes = True
# --- Base modellek ---
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

# Simple Category without children for avoiding recursion
class CategorySimple(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class CategoryWithParent(CategorySimple):
    parent: Optional['CategorySimple'] = None # A hiányzó láncszem

# Full Category with children - használd csak akkor, amikor tényleg kell
class Category(CategoryBase):
    id: int
    children: List['Category'] = []

    class Config:
        from_attributes = True
        # Recursion limit beállítás
        validate_assignment = True

# Response model kategóriákhoz - ez használható a legtöbb API válaszban
class CategoryResponse(CategoryBase):
    id: int
    has_children: bool = False  # Jelzi, hogy vannak-e gyerekei

    class Config:
        from_attributes = True

# --- Task Sémák ---
class TaskBase(BaseModel):
    title: str
    status: str = 'nyitott'
    reward_type: str | None = None
    reward_value: str | None = None
    owner_id: int | None = None

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int

    class Config:
        from_attributes = True

# --- User sémák ---
class UserBase(BaseModel):
    name: str
    display_name: str
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    avatar_url: str | None = None
    bio: str | None = None
    status: str | None = None
    role: str

class UserCreate(UserBase):
    pin: str
    family_id: int

class UserUpdate(BaseModel):
    name: str | None = None
    display_name: str | None = None
    email: str | None = None
    phone: str | None = None
    birth_date: date | None = None
    avatar_url: str | None = None
    bio: str | None = None
    status: str | None = None

# User without family reference
class User(UserBase):
    id: int
    family_id: int
    last_active: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    expected_expenses: List[ExpectedExpense] = []

    class Config:
        from_attributes = True

# --- Family sémák ---
class FamilyBase(BaseModel):
    name: str

class FamilyCreate(FamilyBase):
    pass

# Family without members to avoid recursion
class FamilySimple(FamilyBase):
    id: int

    class Config:
        from_attributes = True

# Full family with members - csak ha tényleg kell
class Family(FamilyBase):
    id: int
    members: list[UserProfile] = []
    # FRISSÍTÉS: Hozzáadjuk a várható költségeket
    expected_expenses: List[ExpectedExpense] = []

    class Config:
        from_attributes = True

# --- Transaction sémák ---
class TransactionBase(BaseModel):
    description: str
    amount: Decimal
    type: str # 'bevétel' vagy 'kiadás'
    category_id: Optional[int] = None
    creator_id: Optional[int] = None  # Csak ID-t tárolunk

class TransactionCreate(TransactionBase):
    pass

# Simple transaction response
class TransactionSimple(TransactionBase):
    id: int
    date: datetime
    account_id: int
    transfer_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

# Full transaction with related objects
class Transaction(TransactionBase):
    id: int
    date: datetime
    account_id: int
    category: Optional[CategoryResponse] = None  # CategoryResponse használata
    creator: Optional[UserProfile] = None
    transfer_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

# --- Transfer séma ---
class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal
    description: str

# --- Account sémák ---
class AccountBase(BaseModel):
    name: str
    type: str
    goal_amount: Optional[Decimal] = None
    goal_date: Optional[date] = None

class AccountCreate(AccountBase):
    viewer_ids: list[int] = []
    show_on_dashboard: bool = False

# Simple account response
class AccountSimple(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None

    class Config:
        from_attributes = True

# Full account with related objects - használd csak akkor, amikor kell
class Account(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    # transactions: list[TransactionSimple] = []  # TransactionSimple használata
    viewers: list[UserProfile] = []
    owner_user: Optional[UserProfile] = None
    wishes: List[Wish] = []
    status: Literal['active', 'archived']


    class Config:
        from_attributes = True

# Account response transactions nélkül - a legtöbb esetben ezt használd
class AccountResponse(AccountBase):
    id: int
    balance: Decimal
    family_id: int
    owner_user_id: int | None = None
    viewers: list[UserProfile] = []
    owner_user: Optional[UserProfile] = None
    show_on_dashboard: bool = False

    class Config:
        from_attributes = True

# --- Recurring Rule sémák ---
class RecurringRuleBase(BaseModel):
    description: str
    amount: Decimal
    type: str # 'bevétel', 'kiadás', vagy 'átutalás'
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    frequency: str
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    month_of_year: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None

class RecurringRuleCreate(RecurringRuleBase):
    pass

class RecurringRule(RecurringRuleBase):
    id: int
    owner_id: int
    next_run_date: date
    is_active: bool

    class Config:
        from_attributes = True


class WishImageBase(BaseModel):
    image_url: str
    image_order: int = 0

class WishImage(WishImageBase):
    id: int
    wish_id: int

    class Config:
        from_attributes = True

class WishLinkBase(BaseModel):
    url: str
    title: Optional[str] = None

class WishLinkCreate(WishLinkBase): # Létrehozunk egy külön Create sémát
    pass

class WishLink(WishLinkBase):
    id: int
    wish_id: int

    class Config:
        from_attributes = True

class WishApprovalBase(BaseModel):
    status: Literal['approved', 'rejected', 'modifications_requested', 'conditional']
    feedback: Optional[str] = None
    conditional_note: Optional[str] = None

class WishApprovalCreate(WishApprovalBase):
    pass # A többi adatot a végpontból és a felhasználóból vesszük

# A meglévő WishApproval séma maradjon, csak a Base-ből örököljön
class WishApproval(WishApprovalBase):
    id: int
    wish_id: int
    approver_user_id: int
    approver: UserProfile

    class Config:
        from_attributes = True

class WishApproval(BaseModel):
    id: int
    wish_id: int
    approver_user_id: int
    status: Literal['approved', 'rejected', 'modifications_requested', 'conditional']
    feedback: Optional[str] = None
    conditional_note: Optional[str] = None
    approver: UserProfile

    class Config:
        from_attributes = True

class WishBase(BaseModel):
    name: str
    description: Optional[str] = None
    estimated_price: Decimal
    priority: Literal['low', 'medium', 'high'] = 'medium'
    category_id: Optional[int] = None
    deadline: Optional[date] = None

class WishCreate(WishBase):
    images: Optional[List[str]] = [] # Base64 kódolt képek listája
    links: Optional[List[WishLinkCreate]] = []
    submit_now: bool = False


class WishHistory(BaseModel):
    id: int
    user: UserProfile
    action: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Wish(WishBase):
    id: int
    status: Literal['draft', 'pending', 'approved', 'conditional', 'modifications_requested', 'rejected', 'completed']
    owner_user_id: int
    family_id: int
    goal_account_id: Optional[int] = None

    # Kapcsolódó adatok
    owner: UserProfile
    category: Optional[CategorySimple] = None
    images: List[WishImage] = []
    links: List[WishLink] = []
    approvals: List[WishApproval] = []
    goal_account: Optional[AccountSimple] = None
    history: List[WishHistory] = []

    class Config:
        from_attributes = True

class Notification(BaseModel):
    type: str
    message: str
    link: str

class WishActivationRequest(BaseModel):
    goal_account_id: Optional[int] = Field(None, description="ID of an existing goal account to link to.")

# --- Célkassza Lezárás Séma ---
class GoalCloseRequest(BaseModel):
    final_amount: Decimal = Field(..., description="A vásárlás végleges összege.")
    description: str = Field(..., description="A vásárlás leírása.")
    category_id: Optional[int] = Field(None, description="A létrehozandó statisztikai tranzakció kategóriája.")
    remainder_destination_account_id: Optional[int] = Field(None, description="A maradványösszeg célkasszájának ID-ja.")

class FinancialSummary(BaseModel):
    total_balance: float
    personal_balance: float
    monthly_income: float
    monthly_expense: float
    monthly_savings: float
    view_type: str
    personal_income: float
    personal_expense: float

class ForecastData(BaseModel):
    projected_income: float
    projected_expenses: float

class Forecast(BaseModel):
    personal: Optional[ForecastData] = None
    family: Optional[ForecastData] = None
    view_type: str

class Goals(BaseModel):
    personal_goals: List[Account]
    family_goals: List[Account]

class DashboardResponse(BaseModel):
    financial_summary: FinancialSummary
    current_month_forecast: Optional[Forecast] = None
    next_month_forecast: Optional[Forecast] = None
    goals: Optional[Goals] = None

# --- User Settings Schemas ---
class UserSettingsBase(BaseModel):
    push_notifications: bool = True
    email_notifications: bool = True
    desktop_notifications: bool = False
    profile_visibility: str = 'family'
    show_online_status: bool = True
    language: str = 'hu'
    theme: str = 'light'

class UserSettingsCreate(UserSettingsBase):
    user_id: int

class UserSettingsUpdate(BaseModel):
    push_notifications: bool | None = None
    email_notifications: bool | None = None
    desktop_notifications: bool | None = None
    profile_visibility: str | None = None
    show_online_status: bool | None = None
    language: str | None = None
    theme: str | None = None

class UserSettings(UserSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- User Event Schemas ---
class UserEventBase(BaseModel):
    title: str
    event_type: str
    start_time: datetime
    end_time: datetime | None = None
    color: str | None = None
    source: str | None = None
    is_recurring: bool = False

class UserEventCreate(UserEventBase):
    user_id: int

class UserEventUpdate(BaseModel):
    title: str | None = None
    event_type: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    color: str | None = None
    source: str | None = None
    is_recurring: bool | None = None

class UserEvent(UserEventBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- User Status History Schemas ---
class UserStatusHistoryBase(BaseModel):
    status: str
    changed_until: datetime | None = None
    note: str | None = None

class UserStatusHistoryCreate(UserStatusHistoryBase):
    user_id: int

class UserStatusHistory(UserStatusHistoryBase):
    id: int
    user_id: int
    changed_at: datetime

    class Config:
        from_attributes = True
    next_month_forecast: Forecast
    current_month_forecast: Forecast
    goals: Goals

    class Config:
        from_attributes = True


# Forward reference frissítések
Wish.model_rebuild()
User.model_rebuild() # Ha a User sémába is bekerül a Wish
Family.model_rebuild() # Ha a Family sémába is bekerül a Wish
Category.model_rebuild()
CategoryWithParent.model_rebuild()
ExpectedExpense.model_rebuild()

# === TIME MANAGEMENT SCHEMAS ===

# Shift Template Schemas
class ShiftTemplateBase(BaseModel):
    name: str
    start_time: str  # "07:00"
    end_time: str    # "15:00"
    location: str = "office"  # "office", "home", "field", "other"
    location_details: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    description: Optional[str] = None
    is_active: bool = True

class ShiftTemplateCreate(ShiftTemplateBase):
    pass

class ShiftTemplateUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    location_details: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ShiftTemplate(ShiftTemplateBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Shift Assignment Schemas
class ShiftAssignmentBase(BaseModel):
    template_id: int
    date: date
    status: str = "scheduled"  # scheduled, completed, cancelled
    notes: Optional[str] = None

class ShiftAssignmentCreate(ShiftAssignmentBase):
    pass

class ShiftAssignmentUpdate(BaseModel):
    template_id: Optional[int] = None
    date: Optional["date"] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ShiftAssignment(ShiftAssignmentBase):
    id: int
    user_id: int
    template: ShiftTemplate
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Monthly Schedule Schema
class MonthlyScheduleEntry(BaseModel):
    date: "date"
    assignment: Optional[ShiftAssignment] = None
    template: Optional[ShiftTemplate] = None

class MonthlySchedule(BaseModel):
    user_id: int
    month: int
    year: int
    entries: List[MonthlyScheduleEntry]

class WorkShiftBase(BaseModel):
    name: str
    start_time: str  # "07:00"
    end_time: str    # "15:00"
    days_of_week: str  # "1,2,3,4,5"
    color: Optional[str] = "#3b82f6"
    is_active: bool = True

class WorkShiftCreate(WorkShiftBase):
    pass

class WorkShiftUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days_of_week: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None

class WorkShift(WorkShiftBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CalendarIntegrationBase(BaseModel):
    name: str
    type: str  # 'google', 'outlook', 'school', 'icloud'
    sync_enabled: bool = True

class CalendarIntegrationCreate(CalendarIntegrationBase):
    pass

class CalendarIntegrationUpdate(BaseModel):
    name: Optional[str] = None
    sync_enabled: Optional[bool] = None
    status: Optional[str] = None

class CalendarIntegration(CalendarIntegrationBase):
    id: int
    user_id: int
    status: str
    last_sync: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TimeConflictBase(BaseModel):
    title: str
    description: str
    suggestion: Optional[str] = None
    severity: str = 'medium'  # 'high', 'medium', 'low'
    conflict_date: date
    conflict_time_start: Optional[str] = None
    conflict_time_end: Optional[str] = None

class TimeConflictCreate(TimeConflictBase):
    affected_user_id: int

class TimeConflictUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    suggestion: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    snooze_until: Optional[datetime] = None

class TimeConflict(TimeConflictBase):
    id: int
    family_id: int
    affected_user_id: int
    status: str
    resolved_at: Optional[datetime] = None
    snooze_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class FamilyEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str  # 'family', 'work', 'school', 'health', 'transport'
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    color: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    involves_members: Optional[str] = None  # "1,2,3" user IDs

class FamilyEventCreate(FamilyEventBase):
    pass

class FamilyEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    color: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    involves_members: Optional[str] = None

class FamilyEvent(FamilyEventBase):
    id: int
    family_id: int
    creator_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None
    until: Optional[datetime] = None

class DashboardTimeData(BaseModel):
    family_members: List[dict]
    upcoming_events: List[dict]
    conflicts: List[TimeConflict]
    calendar_sync_status: List[CalendarIntegration]