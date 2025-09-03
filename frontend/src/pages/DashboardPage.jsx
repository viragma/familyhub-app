import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Calendar, User, Users, CheckCircle, 
  Plus, Minus, RefreshCw, AlertCircle, PieChart as PieChartIcon, 
  BarChart3, Eye, ArrowRight, DollarSign
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../components/Dashboard.css';
import UpcomingEventsCard from '../components/UpcomingEventsCard';
import NotificationBar from '../components/NotificationBar';
import TransactionModal from '../components/TransactionModal';

// === EGYSZERŰ ELŐREJELZÉS KÁRTYA ===
const SimpleForecastCard = ({ forecastData, title }) => {
  if (!forecastData) return null;

  const expectedIncome = forecastData.expected_income || 0;
  const expectedExpense = forecastData.expected_expense || 0;
  const expectedBalance = expectedIncome - expectedExpense;

  return (
    <div className="dashboard-card forecast-card">
      <div className="card-header">
        <div className="header-content">
          <h3>{title}</h3>
          <div className="period-badge">
            <Calendar size={14} />
            Következő hónap
          </div>
        </div>
        <TrendingUp className="header-icon" />
      </div>

      <div className="forecast-summary">
        <div className="forecast-balance">
          <span className="forecast-label">Várható egyenleg változás</span>
          <span className={`forecast-amount ${expectedBalance >= 0 ? 'positive' : 'negative'}`}>
            {expectedBalance >= 0 ? '+' : ''}{expectedBalance.toLocaleString('hu-HU')} Ft
          </span>
        </div>
      </div>

      <div className="forecast-details">
        <div className="forecast-item income">
          <div className="forecast-icon">💰</div>
          <div className="forecast-content">
            <span className="forecast-item-label">Várható bevétel</span>
            <span className="forecast-item-value">+{expectedIncome.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
        
        <div className="forecast-item expense">
          <div className="forecast-icon">💸</div>
          <div className="forecast-content">
            <span className="forecast-item-label">Várható kiadás</span>
            <span className="forecast-item-value">-{expectedExpense.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
      </div>

      {forecastData.note && (
        <div className="forecast-note">
          <AlertCircle size={14} />
          {forecastData.note}
        </div>
      )}
    </div>
  );
};

// === KOMPAKT CÉL KÁRTYA KOMPONENS ===
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
    <div className="goal-card" onClick={handleCardClick}>
      <div className="goal-header">
        <div className="goal-icon">
          {isFamily ? <Users size={20} /> : <Target size={20} />}
        </div>
        <div className="goal-info">
          <h4 className="goal-name">{goal.name}</h4>
          {goal.owner_user && (
            <span className="goal-owner">
              <User size={12} />
              {goal.owner_user.display_name}
            </span>
          )}
        </div>
        <div className="goal-amount">
          <div className="current-amount">
            {balance.toLocaleString('hu-HU')} Ft
          </div>
          <div className="target-amount">
            / {goalAmount.toLocaleString('hu-HU')} Ft
          </div>
        </div>
      </div>
      
      <div className="goal-progress">
        <div className="progress-bar">
          <div 
            className={`progress-fill ${isFamily ? 'family' : 'personal'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-info">
          <span className="progress-percentage">{progress.toFixed(0)}%</span>
          {goal.goal_date && (
            <span className="goal-date">
              <Calendar size={12} />
              {new Date(goal.goal_date).toLocaleDateString('hu-HU', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          )}
        </div>
      </div>

      {progress >= 100 ? (
        <div className="goal-completed">
          <CheckCircle size={16} />
          Cél teljesítve!
        </div>
      ) : (
        <div className="goal-remaining">
          Még szükséges: <strong>{remainingAmount.toLocaleString('hu-HU')} Ft</strong>
        </div>
      )}
    </div>
  );
};

// === CÉLOK CSOPORTOSÍTÓ KOMPONENS ===
const GoalsSection = ({ title, goals, type, icon }) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  
  if (!goals || goals.length === 0) return null;

  const maxDisplay = 3;
  const displayedGoals = showAll ? goals : goals.slice(0, maxDisplay);
  const hasMore = goals.length > maxDisplay;

  return (
    <div className="dashboard-card goals-section">
      <div className="section-header">
        <div className="section-title">
          {icon}
          <h3>{title}</h3>
          <span className="count-badge">{goals.length}</span>
        </div>
        
        <div className="section-actions">
          {hasMore && (
            <button 
              className="toggle-btn"
              onClick={() => setShowAll(!showAll)}
            >
              <Eye size={16} />
              {showAll ? 'Kevesebb' : `+${goals.length - maxDisplay}`}
            </button>
          )}
          <button 
            className="view-all-btn"
            onClick={() => navigate('/finances')}
          >
            <ArrowRight size={16} />
            Összes
          </button>
        </div>
      </div>
      
      <div className="goals-grid">
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

// === PÉNZÜGYI ÁTTEKINTŐ KÁRTYA ===
const FinancialOverviewCard = ({ financialSummary, onNewTransaction, personalAccount }) => {
  if (!financialSummary) return null;

  const totalBalance = financialSummary.total_balance || 0;
  const personalBalance = financialSummary.personal_balance || 0;
  const monthlyIncome = financialSummary.monthly_income || 0;
  const monthlyExpense = financialSummary.monthly_expense || 0;
  const monthlySavings = financialSummary.monthly_savings || 0;
  
  const savingsRate = monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100) : 0;
  const isParentView = financialSummary.view_type === 'parent';

  return (
    <div className="dashboard-card financial-overview">
      <div className="card-header">
        <div className="header-content">
          <h3>Pénzügyi Áttekintés</h3>
          <div className="period-badge">
            <Calendar size={14} />
            Aktuális hónap
          </div>
        </div>
        <DollarSign className="header-icon" />
      </div>

      <div className="balance-section">
        <div className="main-balance">
          <span className="balance-label">
            {isParentView ? 'Családi egyenleg' : 'Egyenleg'}
          </span>
          <span className="balance-amount">
            {totalBalance.toLocaleString('hu-HU')} Ft
          </span>
        </div>
        
        {isParentView && personalBalance !== null && (
          <div className="personal-balance">
            <span className="personal-label">Saját egyenleg</span>
            <span className="personal-amount">
              {personalBalance.toLocaleString('hu-HU')} Ft
            </span>
          </div>
        )}
      </div>

      {/* GYORS MŰVELETEK - FONTOS! */}
      {personalAccount && (
        <div className="quick-actions">
          <button 
            className="quick-btn income"
            onClick={() => onNewTransaction('bevétel', personalAccount.id, personalAccount.name)}
          >
            <Plus size={18} />
            Bevétel
          </button>
          <button 
            className="quick-btn expense"
            onClick={() => onNewTransaction('kiadás', personalAccount.id, personalAccount.name)}
          >
            <Minus size={18} />
            Kiadás
          </button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-item income">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <span className="stat-label">Bevétel</span>
            <span className="stat-value">+{monthlyIncome.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
        
        <div className="stat-item expense">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <span className="stat-label">Kiadás</span>
            <span className="stat-value">-{monthlyExpense.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
        
        <div className={`stat-item savings ${monthlySavings >= 0 ? 'positive' : 'negative'}`}>
          <div className="stat-icon">{monthlySavings >= 0 ? '💰' : '⚠️'}</div>
          <div className="stat-content">
            <span className="stat-label">Megtakarítás</span>
            <span className="stat-value">
              {monthlySavings >= 0 ? '+' : ''}
              {monthlySavings.toLocaleString('hu-HU')} Ft
            </span>
          </div>
        </div>
        
        <div className="stat-item rate">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Megtakarítási ráta</span>
            <span className="stat-value">{savingsRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// === KATEGÓRIA KÖLTÉS KÁRTYA ===
const CategorySpendingCard = ({ data, onClick }) => {
  if (!data || !data.length) {
    return (
      <div className="dashboard-card analytics-card" onClick={onClick}>
        <div className="card-header">
          <h3>Kategóriás költések</h3>
          <PieChartIcon size={24} />
        </div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>Nincs adat az aktuális hónapra</p>
        </div>
      </div>
    );
  }

  // Alapértelmezett színek ha nincsenek
  const colors = ['#4299e1', '#48bb78', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  // Adatok előkészítése színekkel
  const processedData = data.slice(0, 5).map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length]
  }));

  const totalAmount = data.reduce((sum, item) => sum + Math.abs(item.amount || 0), 0);

  return (
    <div className="dashboard-card analytics-card" onClick={onClick}>
      <div className="card-header">
        <h3>Kategóriás költések</h3>
        <PieChartIcon size={24} />
      </div>
      
      <div className="chart-section">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                dataKey="amount"
                nameKey="name"
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${Math.abs(value).toLocaleString('hu-HU')} Ft`, 'Költés']} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="legend">
          {processedData.slice(0, 3).map((item, index) => (
            <div key={index} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: item.color }} />
              <span className="legend-name">{item.name || 'Ismeretlen'}</span>
              <span className="legend-percentage">
                {totalAmount > 0 ? ((Math.abs(item.amount) / totalAmount) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
          {data.length > 3 && (
            <div className="legend-more">+{data.length - 3} további</div>
          )}
        </div>
      </div>

      <div className="card-footer">
        <ArrowRight size={14} />
        Részletek
      </div>
    </div>
  );
};

// === MEGTAKARÍTÁS TREND KÁRTYA ===
const SavingsTrendCard = ({ data, onClick }) => {
  if (!data || !data.length) {
    return (
      <div className="dashboard-card analytics-card" onClick={onClick}>
        <div className="card-header">
          <h3>Megtakarítás trend</h3>
          <BarChart3 size={24} />
        </div>
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <p>Nincs adat az aktuális évre</p>
        </div>
      </div>
    );
  }

  const latestSavings = data.length > 0 ? data[data.length - 1]?.savings || 0 : 0;
  const previousSavings = data.length > 1 ? data[data.length - 2]?.savings || 0 : 0;
  const trend = latestSavings >= previousSavings ? 'up' : 'down';
  const trendDiff = Math.abs(latestSavings - previousSavings);

  return (
    <div className="dashboard-card analytics-card" onClick={onClick}>
      <div className="card-header">
        <h3>Megtakarítás trend</h3>
        <BarChart3 size={24} />
      </div>

      <div className="trend-summary">
        <div className="trend-current">
          <span className="trend-label">Ez a hónap</span>
          <span className={`trend-value ${latestSavings >= 0 ? 'positive' : 'negative'}`}>
            {latestSavings >= 0 ? '+' : ''}{latestSavings.toLocaleString('hu-HU')} Ft
          </span>
        </div>
        
        <div className={`trend-indicator ${trend}`}>
          <div className="trend-arrow">
            {trend === 'up' ? '↗️' : '↘️'}
          </div>
          <div className="trend-change">
            {trendDiff.toLocaleString('hu-HU')} Ft
          </div>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data.slice(-6)}>
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11 }} 
            />
            <YAxis hide />
            <Tooltip 
              formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Megtakarítás']} 
            />
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

      <div className="card-footer">
        <ArrowRight size={14} />
        Részletek
      </div>
    </div>
  );
};

// === FŐ DASHBOARD KOMPONENS ===
const DashboardPage = () => {
  const { user, token, apiUrl, logout } = useAuth();
  const navigate = useNavigate();
  
  // State-ek
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
  
  // Tranzakció modal
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ 
    type: '', 
    accountId: null, 
    accountName: '' 
  });
  const [categories, setCategories] = useState([]);

  // Adatok lekérése
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
        throw new Error(`API hiba: ${dashboardResponse.status}`);
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
      console.error('Dashboard hiba:', err);
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

  // Tranzakció modal kezelése
  const handleOpenTransactionModal = (type, accountId, accountName) => {
    setModalConfig({ type, accountId, accountName });
    setTransactionModalOpen(true);
  };
  
  const handleSaveTransaction = async (transactionData) => {
    try {
      const response = await fetch(`${apiUrl}/api/accounts/${modalConfig.accountId}/transactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(transactionData),
      });
      
      if (response.ok) {
        setTransactionModalOpen(false);
        fetchData(); // Frissítjük az adatokat
      } else {
        alert('Hiba a mentés során!');
      }
    } catch (error) {
      console.error("Tranzakció mentési hiba:", error);
      alert('Hiba történt a mentés során!');
    }
  };

  // Loading és error kezelés
  if (!token) {
    return (
      <div className="loading-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2>Bejelentkezés szükséges</h2>
          <p>A dashboard eléréséhez be kell jelentkezned.</p>
          <button 
            onClick={() => navigate('/login')} 
            className="btn btn-primary"
          >
            Bejelentkezés
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Dashboard betöltése...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2>Hiba történt</h2>
          <p>{error}</p>
          <button 
            onClick={fetchData} 
            className="btn btn-primary"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'loading-spinner' : ''} />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  // Dashboard adatok
  const forecast = dashboardData?.next_month_forecast;
  const familyGoals = dashboardData?.goals?.family_goals || [];
  const personalGoals = dashboardData?.goals?.personal_goals || [];
  
  // Személyes számla megkeresése
  const personalAccount = accounts.find(acc => 
    acc.type === 'személyes' && acc.owner_user_id === user?.id
  );

  return (
    <div className="dashboard-container">
      <NotificationBar notifications={notifications} />
      
      {/* PÉNZÜGYI ÁTTEKINTÉS SZEKCIÓ */}
      <section className="dashboard-section">
        <h2 className="section-title">Pénzügyi Áttekintés</h2>
        
        <div className="dashboard-grid">
          <FinancialOverviewCard 
            financialSummary={dashboardData?.financial_summary}
            onNewTransaction={handleOpenTransactionModal}
            personalAccount={personalAccount}
          />
          
          {forecast?.personal && (
            <SimpleForecastCard 
              forecastData={forecast.personal} 
              title="Személyes Előrejelzés" 
            />
          )}
          
          {forecast?.view_type === 'parent' && forecast.family && (
            <SimpleForecastCard 
              forecastData={forecast.family} 
              title="Családi Előrejelzés" 
            />
          )}
        </div>
      </section>

      {/* CÉLKASSZÁK SZEKCIÓ */}
      {(familyGoals.length > 0 || personalGoals.length > 0) && (
        <section className="dashboard-section">
          <h2 className="section-title">Célkasszák</h2>
          
          <div className="dashboard-grid">
            {familyGoals.length > 0 && (
              <GoalsSection 
                title="Családi Célok"
                goals={familyGoals}
                type="family"
                icon={<Users size={20} />}
              />
            )}
            
            {personalGoals.length > 0 && (
              <GoalsSection 
                title="Személyes Célok"
                goals={personalGoals}
                type="personal"
                icon={<Target size={20} />}
              />
            )}
          </div>
        </section>
      )}

      {/* STATISZTIKÁK SZEKCIÓ */}
      <section className="dashboard-section">
        <h2 className="section-title">Statisztikák</h2>
        
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
      </section>

      {/* TRANZAKCIÓ MODAL */}
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