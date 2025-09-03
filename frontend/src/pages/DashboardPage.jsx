import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, User, Users, CheckCircle, Clock, RefreshCw, AlertCircle, PieChart as PieChartIcon, BarChart3, Eye, ArrowRight, Plus, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../components/Dashboard.css';
import ForecastCard from '../components/ForecastCard';
import UpcomingEventsCard from '../components/UpcomingEventsCard';
import NotificationBar from '../components/NotificationBar';
import TransactionModal from '../components/TransactionModal';

// Kompakt Cél Kártya komponens (Változatlan)
const CompactGoalCard = ({ goal, type = "personal" }) => {
  const navigate = useNavigate();
  const isFamily = type === "family";
  const balance = goal.balance || 0;
  const goalAmount = goal.goal_amount || 0;
  const progress = goalAmount > 0 ? Math.min((balance / goalAmount) * 100, 100) : 0;
  const remainingAmount = Math.max(goalAmount - balance, 0);
  
  const handleCardClick = () => {
    navigate(`/finances/account/${goal.id}`);
  };

  return (
    <div className="compact-goal-card" onClick={handleCardClick}>
      <div className="compact-goal-header">
        <div className="compact-goal-info">
          <div className={`compact-goal-icon ${isFamily ? 'family' : 'personal'}`}>
            {isFamily ? <Users size={18} /> : <Target size={18} />}
          </div>
          <div className="compact-goal-details">
            <h4 className="compact-goal-name">{goal.name}</h4>
            {goal.owner_user && (
              <span className="compact-goal-owner">
                <User size={12} />
                {goal.owner_user.display_name}
              </span>
            )}
          </div>
        </div>
        
        <div className="compact-goal-amount-section">
          <div className="compact-goal-current">
            {balance.toLocaleString('hu-HU')} Ft
          </div>
          <div className="compact-goal-target">
            / {goalAmount.toLocaleString('hu-HU')} Ft
          </div>
        </div>
      </div>
      
      <div className="compact-goal-progress">
        <div className="compact-progress-bar">
          <div 
            className={`compact-progress-fill ${isFamily ? 'family' : 'personal'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="compact-progress-info">
          <span className="compact-progress-percentage">{progress.toFixed(0)}%</span>
          {goal.goal_date && (
            <span className="compact-goal-date">
              <Calendar size={12} />
              {new Date(goal.goal_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {remainingAmount > 0 && (
        <div className="compact-goal-remaining">
          Még szükséges: <strong>{remainingAmount.toLocaleString('hu-HU')} Ft</strong>
        </div>
      )}

      {progress >= 100 && (
        <div className="compact-goal-completed">
          <CheckCircle size={16} />
          Cél teljesítve!
        </div>
      )}
    </div>
  );
};

// Célok Csoportosító Kártya (Változatlan)
const GoalsGroupCard = ({ title, goals, type, showAll, onToggleShowAll, maxDisplay = 2 }) => {
  const navigate = useNavigate();
  
  if (!goals || goals.length === 0) return null;

  const displayedGoals = showAll ? goals : goals.slice(0, maxDisplay);
  const hasMore = goals.length > maxDisplay;

  return (
    <div className="dashboard-card goals-group-card">
      <div className="goals-group-header">
        <div className="goals-group-title-section">
          <h3 className="goals-group-title">{title}</h3>
          <span className="goals-count-badge">{goals.length}</span>
        </div>
        
        <div className="goals-group-actions">
          {hasMore && (
            <button 
              className="toggle-goals-btn"
              onClick={onToggleShowAll}
            >
              <Eye size={16} />
              {showAll ? 'Kevesebb' : `+${goals.length - maxDisplay} további`}
            </button>
          )}
          <button 
            className="view-all-goals-btn"
            onClick={() => navigate('/finances')}
          >
            <ArrowRight size={16} />
            Mind
          </button>
        </div>
      </div>
      
      <div className="compact-goals-grid">
        {displayedGoals.map(goal => (
          <CompactGoalCard 
            key={goal.id} 
            goal={goal} 
            type={type}
          />
        ))}
      </div>
    </div>
  );
};

// Javított Pénzügyi Összefoglaló Kártya
const EnhancedFinancialCard = ({ financialSummary, onNewTransaction, personalAccount }) => {
  if (!financialSummary) return null;

  const totalBalance = financialSummary.total_balance || 0;
  const personalBalance = financialSummary.personal_balance || 0;
  const monthlyIncome = financialSummary.monthly_income || 0;
  const monthlyExpense = financialSummary.monthly_expense || 0;
  const monthlySavings = financialSummary.monthly_savings || 0;
  
  const savingsRate = monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100) : 0;
  const isParentView = financialSummary.view_type === 'parent';

  return (
    <div className="dashboard-card enhanced-financial-card">
      <div className="enhanced-financial-header">
        <div className="financial-title-section">
          <h3 className="enhanced-financial-title">Pénzügyi Áttekintés</h3>
          <div className="financial-period-badge">
            <Calendar size={14} />
            Aktuális hónap
          </div>
        </div>
        <TrendingUp className="enhanced-financial-icon" />
      </div>

      <div className="enhanced-balance-section">
        <div className="primary-balance">
          <span className="balance-label">
            {isParentView ? 'Családi egyenleg' : 'Egyenleg'}
          </span>
          <span className="balance-amount-large">
            {totalBalance.toLocaleString('hu-HU')} Ft
          </span>
        </div>
        
        {isParentView && personalBalance !== null && (
          <div className="secondary-balance">
            <span className="personal-balance-label">Saját egyenleg</span>
            <span className="personal-balance-amount">
              {personalBalance.toLocaleString('hu-HU')} Ft
            </span>
          </div>
        )}
      </div>

      {personalAccount && (
        <div className="financial-quick-actions">
          <button 
            className="quick-action-btn positive"
            onClick={() => onNewTransaction('bevétel', personalAccount.id, personalAccount.name)}
          >
            <Plus size={16}/> Bevétel
          </button>
          <button 
            className="quick-action-btn negative"
            onClick={() => onNewTransaction('kiadás', personalAccount.id, personalAccount.name)}
          >
            <Minus size={16}/> Kiadás
          </button>
        </div>
      )}

      <div className="enhanced-stats-grid">
        <div className="enhanced-stat-card positive"><div className="stat-icon">📈</div><div className="stat-info"><span className="stat-label">Bevétel</span><span className="stat-value">+{monthlyIncome.toLocaleString('hu-HU')} Ft</span></div></div>
        <div className="enhanced-stat-card negative"><div className="stat-icon">📉</div><div className="stat-info"><span className="stat-label">Kiadás</span><span className="stat-value">-{monthlyExpense.toLocaleString('hu-HU')} Ft</span></div></div>
        <div className={`enhanced-stat-card savings ${monthlySavings >= 0 ? 'positive' : 'negative'}`}><div className="stat-icon">{monthlySavings >= 0 ? '💰' : '⚠️'}</div><div className="stat-info"><span className="stat-label">Megtakarítás</span><span className="stat-value">{monthlySavings >= 0 ? '+' : ''}{monthlySavings.toLocaleString('hu-HU')} Ft</span></div></div>
        <div className="enhanced-stat-card rate"><div className="stat-icon">📊</div><div className="stat-info"><span className="stat-label">Megtakarítási ráta</span><span className="stat-value">{savingsRate.toFixed(1)}%</span></div></div>
      </div>
    </div>
  );
};

// Kategória költés kártya (Változatlan)
const CategorySpendingCard = ({ data, onClick }) => {
  if (!data || !data.length) {
    return (
      <div className="dashboard-card analytics-card" onClick={onClick}>
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">Kategóriás költések</h3>
          <PieChartIcon className="dashboard-card-icon" />
        </div>
        <div className="analytics-empty">
          <div className="analytics-empty-icon">📊</div>
          <p>Nincs adat az aktuális hónapra</p>
        </div>
      </div>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="dashboard-card analytics-card compact-analytics" onClick={onClick}>
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Kategóriás költések</h3>
        <PieChartIcon className="dashboard-card-icon" />
      </div>
      
      <div className="compact-chart-section">
        <div className="compact-chart-container">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data.slice(0, 5)}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                dataKey="amount"
                nameKey="name"
              >
                {data.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Költés']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="compact-legend">
          {data.slice(0, 3).map((item, index) => (
            <div key={index} className="compact-legend-item">
              <div className="legend-color" style={{ backgroundColor: item.color }} />
              <span className="legend-name">{item.name}</span>
              <span className="legend-amount">{((item.amount / totalAmount) * 100).toFixed(0)}%</span>
            </div>
          ))}
          {data.length > 3 && (
            <div className="legend-more">+{data.length - 3} további</div>
          )}
        </div>
      </div>

      <div className="analytics-click-hint">
        <ArrowRight size={14} />
        Részletek
      </div>
    </div>
  );
};

// Havi megtakarítás trend kártya (Változatlan)
const SavingsTrendCard = ({ data, onClick }) => {
  if (!data || !data.length) {
    return (
      <div className="dashboard-card analytics-card" onClick={onClick}>
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">Megtakarítás trend</h3>
          <BarChart3 className="dashboard-card-icon" />
        </div>
        <div className="analytics-empty">
          <div className="analytics-empty-icon">📈</div>
          <p>Nincs adat az aktuális évre</p>
        </div>
      </div>
    );
  }

  const latestSavings = data.length > 0 ? data[data.length - 1]?.savings || 0 : 0;
  const previousSavings = data.length > 1 ? data[data.length - 2]?.savings || 0 : 0;
  const trend = latestSavings >= previousSavings ? 'up' : 'down';

  return (
    <div className="dashboard-card analytics-card compact-analytics" onClick={onClick}>
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Megtakarítás trend</h3>
        <BarChart3 className="dashboard-card-icon" />
      </div>

      <div className="compact-trend-summary">
        <div className="trend-current">
          <span className="trend-label">Ez a hónap</span>
          <span className={`trend-value ${trend === 'up' ? 'positive' : 'negative'}`}>
            {latestSavings >= 0 ? '+' : ''}{latestSavings.toLocaleString('hu-HU')} Ft
          </span>
        </div>
        <div className={`trend-indicator ${trend}`}>
          {trend === 'up' ? '↗' : '↘'} 
          <span className="trend-change">
            {Math.abs(latestSavings - previousSavings).toLocaleString('hu-HU')} Ft
          </span>
        </div>
      </div>

      <div className="compact-chart-container">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.slice(-6)}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis hide />
            <Tooltip formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Megtakarítás']} />
            <Line 
              type="monotone" 
              dataKey="savings" 
              stroke="#4299e1" 
              strokeWidth={2}
              dot={{ fill: '#4299e1', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-click-hint">
        <ArrowRight size={14} />
        Részletek
      </div>
    </div>
  );
};

// Fő Dashboard komponens
const DashboardPage = () => {
  const { user, token, apiUrl, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    categorySpending: null,
    savingsTrend: null
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [showAllFamilyGoals, setShowAllFamilyGoals] = useState(false);
  const [showAllPersonalGoals, setShowAllPersonalGoals] = useState(false);
  
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: '', accountId: null, accountName: '' });
  const [categories, setCategories] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Nincs bejelentkezett felhasználó');
      }

      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [
        dashboardResponse, 
        accountsResponse,
        categorySpendingResponse, 
        savingsResponse, 
        upcomingEventsResponse, 
        notificationsResponse,
        categoriesResponse
      ] = await Promise.all([
        fetch(`${apiUrl}/api/dashboard`, { headers }),
        fetch(`${apiUrl}/api/accounts`, { headers }),
        fetch(`${apiUrl}/api/analytics/category-spending`, { headers }),
        fetch(`${apiUrl}/api/analytics/savings-trend`, { headers }),
        fetch(`${apiUrl}/api/upcoming-events`, { headers }),
        fetch(`${apiUrl}/api/notifications`, { headers }),
        fetch(`${apiUrl}/api/categories/tree`, { headers })
      ]);

      if (!dashboardResponse.ok) {
        if (dashboardResponse.status === 401) {
          logout();
          throw new Error('Lejárt munkamenet, kérlek jelentkezz be újra!');
        }
        throw new Error(`API hiba: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
      }

      setDashboardData(await dashboardResponse.json());
      setAccounts(accountsResponse.ok ? await accountsResponse.json() : []);
      setCategories(categoriesResponse.ok ? await categoriesResponse.json() : []);
      setAnalyticsData({
        categorySpending: categorySpendingResponse.ok ? await categorySpendingResponse.json() : [],
        savingsTrend: savingsResponse.ok ? await savingsResponse.json() : []
      });
      setUpcomingEvents(upcomingEventsResponse.ok ? await upcomingEventsResponse.json() : []);
      setNotifications(notificationsResponse.ok ? await notificationsResponse.json() : []);

    } catch (err) {
      console.error('Hiba a dashboard adatok lekérésekor:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiUrl && token) {
      fetchData();
    }
  }, [apiUrl, token]);

  const handleOpenTransactionModal = (type, accountId, accountName) => {
    setModalConfig({ type, accountId, accountName });
    setTransactionModalOpen(true);
  };
  
  const handleSaveTransaction = async (transactionData) => {
    try {
      const response = await fetch(`${apiUrl}/api/accounts/${modalConfig.accountId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(transactionData),
      });
      if (response.ok) {
        setTransactionModalOpen(false);
        fetchData(); 
      } else {
        alert('Hiba a mentés során!');
      }
    } catch (error) {
      console.error("Hiba a tranzakció mentésekor:", error);
    }
  };

  if (!token) return <div className="loading-container"><div className="error-content"><AlertCircle className="error-icon" /><h2 className="error-title">Bejelentkezés szükséges</h2><p className="error-message">A dashboard eléréséhez be kell jelentkezned.</p><button onClick={() => window.location.href = '/login'} className="error-login-btn">Bejelentkezés</button></div></div>;
  if (loading) return <div className="loading-container"><div className="loading-content"><div className="loading-spinner"></div><p className="loading-message">Dashboard betöltése...</p></div></div>;
  if (error) return <div className="error-container"><div className="error-content"><AlertCircle className="error-icon" /><h2 className="error-title">Hiba történt</h2><p className="error-message">{error}</p><button onClick={fetchData} className="error-retry-btn" disabled={loading}><RefreshCw className={loading ? 'loading-spinner' : ''} />Újrapróbálás</button></div></div>;
  
  const forecast = dashboardData?.next_month_forecast;
  const familyGoals = dashboardData?.goals?.family_goals || [];
  const personalGoals = dashboardData?.goals?.personal_goals || [];

  // === JAVÍTÁS ITT ===
  const personalAccount = accounts.find(acc => 
    acc.type === 'személyes' && acc.owner_user_id === user?.id
  );

  return (
    <div className="enhanced-dashboard">
      <NotificationBar notifications={notifications} />
      
      <div className="dashboard-section-title">Pénzügyi Áttekintés</div>
      <div className="dashboard-grid">
        <EnhancedFinancialCard 
          financialSummary={dashboardData?.financial_summary}
          onNewTransaction={handleOpenTransactionModal}
          personalAccount={personalAccount}
        />
        
        {forecast?.personal && (
          <ForecastCard 
            forecastData={forecast.personal} 
            title="Személyes Előrejelzés" 
          />
        )}
        
        {forecast?.view_type === 'parent' && forecast.family && (
          <ForecastCard 
            forecastData={forecast.family} 
            title="Családi Előrejelzés" 
          />
        )}
      </div>

      {(familyGoals.length > 0 || personalGoals.length > 0) && (
        <>
          <div className="dashboard-section-title">Célkasszák</div>
          <div className="dashboard-grid">
            <GoalsGroupCard 
              title="Családi Célok"
              goals={familyGoals}
              type="family"
              showAll={showAllFamilyGoals}
              onToggleShowAll={() => setShowAllFamilyGoals(!showAllFamilyGoals)}
              maxDisplay={2}
            />
            
            <GoalsGroupCard 
              title="Személyes Célok"
              goals={personalGoals}
              type="personal"
              showAll={showAllPersonalGoals}
              onToggleShowAll={() => setShowAllPersonalGoals(!showAllPersonalGoals)}
              maxDisplay={2}
            />
          </div>
        </>
      )}

      <div className="dashboard-section-title">Statisztikák</div>
      <div className="dashboard-grid">
        <CategorySpendingCard 
          data={analyticsData.categorySpending}
          onClick={() => navigate('/analytics?tab=categories')}
        />

        <SavingsTrendCard 
          data={analyticsData.savingsTrend}
          onClick={() => navigate('/analytics?tab=savings')}
        />
        
        <UpcomingEventsCard events={upcomingEvents} />
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
        transactionType={modalConfig.type}
        accountName={modalConfig.accountName}
        categories={categories}
        onSaveRecurring={() => {}} 
      />
    </div>
  );
};

export default DashboardPage;