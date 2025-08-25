import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, User, Users, CheckCircle, Clock, RefreshCw, AlertCircle, PieChart, BarChart3 } from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import FamilyMemberCard from '../components/FamilyMemberCard';
import { useNavigate } from 'react-router-dom'; // Navigation
import '../components/Dashboard.css';

// Színpaletta kategóriákhoz
const CATEGORY_COLORS = [
  '#4299e1', // Kék
  '#48bb78', // Zöld  
  '#ed8936', // Narancs
  '#9f7aea', // Lila
  '#f56565', // Piros
  '#38b2ac', // Teal
  '#ecc94b', // Sárga
  '#ed64a6', // Pink
];

// Kategória költés kártya
const CategorySpendingCard = ({ data, onClick }) => {
  if (!data || !data.length) {
    return (
      <div className="dashboard-card analytics-card" onClick={onClick}>
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">Kategóriás költések</h3>
          <PieChart className="dashboard-card-icon" />
        </div>
        <div className="analytics-empty">
          <div className="analytics-empty-icon">📊</div>
          <p>Nincs adat az aktuális hónapra</p>
        </div>
      </div>
    );
  }

  // Színek hozzárendelése
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
  }));

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="dashboard-card analytics-card" onClick={onClick}>
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Kategóriás költések</h3>
        <PieChart className="dashboard-card-icon" />
      </div>
      
      {/* Kördiagram */}
      <div className="analytics-chart-container">
        <ResponsiveContainer width="100%" height={200}>
          <RechartsPieChart>
            <RechartsPieChart
              data={dataWithColors}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="amount"
            >
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </RechartsPieChart>
            <Tooltip 
              formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Költés']}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Kategória lista */}
      <div className="analytics-legend">
        {dataWithColors.slice(0, 4).map((item, index) => (
          <div key={index} className="analytics-legend-item">
            <div 
              className="analytics-legend-color" 
              style={{ backgroundColor: item.color }}
            ></div>
            <div className="analytics-legend-info">
              <span className="analytics-legend-name">{item.name}</span>
              <span className="analytics-legend-amount">
                {item.amount.toLocaleString('hu-HU')} Ft
              </span>
              <span className="analytics-legend-percent">
                {((item.amount / totalAmount) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
        {data.length > 4 && (
          <div className="analytics-legend-more">
            +{data.length - 4} további kategória
          </div>
        )}
      </div>

      <div className="analytics-click-hint">
        Kattints a részletes nézetért
      </div>
    </div>
  );
};

// Havi megtakarítás trend kártya
const SavingsTrendCard = ({ data, onClick }) => {
  if (!data || !data.length) {
    return (
      <div className="dashboard-card analytics-card" onClick={onClick}>
        <div className="dashboard-card-header">
          <h3 className="dashboard-card-title">Havi megtakarítás trend</h3>
          <BarChart3 className="dashboard-card-icon" />
        </div>
        <div className="analytics-empty">
          <div className="analytics-empty-icon">📈</div>
          <p>Nincs adat az aktuális évre</p>
        </div>
      </div>
    );
  }

  const latestSavings = data[data.length - 1]?.savings || 0;
  const previousSavings = data[data.length - 2]?.savings || 0;
  const trend = latestSavings >= previousSavings ? 'up' : 'down';

  return (
    <div className="dashboard-card analytics-card" onClick={onClick}>
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">Havi megtakarítás trend</h3>
        <BarChart3 className="dashboard-card-icon" />
      </div>

      {/* Trend mutató */}
      <div className="analytics-trend-summary">
        <div className="analytics-trend-current">
          <span className="analytics-trend-label">Aktuális hónap</span>
          <span className={`analytics-trend-value ${trend === 'up' ? 'positive' : 'negative'}`}>
            {latestSavings >= 0 ? '+' : ''}{latestSavings.toLocaleString('hu-HU')} Ft
          </span>
        </div>
        <div className={`analytics-trend-indicator ${trend}`}>
          {trend === 'up' ? '↗' : '↘'} 
          {Math.abs(latestSavings - previousSavings).toLocaleString('hu-HU')} Ft
        </div>
      </div>

      {/* Vonal diagram */}
      <div className="analytics-chart-container">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#a0aec0' }}
            />
            <YAxis hide />
            <Tooltip 
              formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Megtakarítás']}
              labelStyle={{ color: '#e2e8f0' }}
              contentStyle={{ 
                backgroundColor: '#2d3748', 
                border: '1px solid #4a5568',
                borderRadius: '6px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="savings" 
              stroke="#4299e1" 
              strokeWidth={3}
              dot={{ fill: '#4299e1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#4299e1', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-click-hint">
        Kattints a részletes nézetért
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { token, apiUrl, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    categorySpending: null,
    savingsTrend: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [members, setMembers] = useState([]);
  // Analitika adatok lekérése
  const fetchAnalyticsData = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Kategória költések lekérése
      const categoryResponse = await fetch(
        `${apiUrl}/api/analytics/category-spending?month=${currentMonth}&year=${currentYear}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Megtakarítás trend lekérése
      const savingsResponse = await fetch(
        `${apiUrl}/api/analytics/savings-trend?year=${currentYear}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const categoryData = categoryResponse.ok ? await categoryResponse.json() : [];
      const savingsData = savingsResponse.ok ? await savingsResponse.json() : [];

      setAnalyticsData({
        categorySpending: categoryData,
        savingsTrend: savingsData
      });

    } catch (err) {
      console.error('Analitika adatok lekérési hiba:', err);
      // Nem blokkoljuk a dashboard-ot analitika hibák miatt
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Nincs bejelentkezett felhasználó');
      }

      // Dashboard adatok
      const response = await fetch(`${apiUrl}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          throw new Error('Lejárt munkamenet, kérlek jelentkezz be újra!');
        }
        throw new Error(`API hiba: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setDashboardData(data);

      // Analitika adatok párhuzamosan
      await fetchAnalyticsData();

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

  // Navigáció az analitika oldalra
  const handleCategoryAnalyticsClick = () => {
    navigate('/analytics?tab=categories');
  };

  const handleSavingsAnalyticsClick = () => {
    navigate('/analytics?tab=savings');
  };

  // ... (loading, error, és token ellenőrzések ugyanazok maradnak)

  if (!token) {
    return (
      <div className="loading-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Bejelentkezés szükséges</h2>
          <p className="error-message">A dashboard eléréséhez be kell jelentkezned.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="error-login-btn"
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
          <p className="loading-message">Dashboard betöltése...</p>
          <p className="dashboard-api-info">API: {apiUrl}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Hiba történt</h2>
          <p className="error-message">{error}</p>
          <div className="error-debug">
            <p>API URL: {apiUrl}</p>
            <p>Token: {token ? '✅ Van' : '❌ Nincs'}</p>
          </div>
          <button 
            onClick={fetchData}
            className="error-retry-btn"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'loading-spinner' : ''} />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      
      
      {/* Grid layout */}
      <div className="dashboard-grid">
        
        {/* Pénzügyi összefoglaló */}
        {dashboardData?.financial_summary && (
          <div className="dashboard-card financial-card-wide">
            {/* ... (ugyanaz mint korábban) */}
            <div className="dashboard-card-header">
              <h3 className="dashboard-card-title">
                {dashboardData.financial_summary.balance_title || "Pénzügyi összefoglaló"}
              </h3>
              <TrendingUp className="dashboard-card-icon" />
            </div>
            
            <div className="financial-balance-row">
              <span className="financial-balance-label">Jelenlegi egyenleg</span>
              <span className="financial-balance-amount">
                {dashboardData.financial_summary.total_balance?.toLocaleString('hu-HU') || '0'} Ft
              </span>
            </div>
            
            <div className="financial-stats-grid">
              <div className="financial-stat-item">
                <span className="financial-stat-label">Havi bevétel</span>
                <p className="financial-stat-value financial-income">
                  +{dashboardData.financial_summary.monthly_income?.toLocaleString('hu-HU') || '0'} Ft
                </p>
              </div>
              <div className="financial-stat-item">
                <span className="financial-stat-label">Havi kiadás</span>
                <p className="financial-stat-value financial-expense">
                  -{dashboardData.financial_summary.monthly_expense?.toLocaleString('hu-HU') || '0'} Ft
                </p>
              </div>
            </div>
            
            <div>
              <span className="financial-stat-label">Havi megtakarítás</span>
              <p className={`financial-savings ${
                (dashboardData.financial_summary.monthly_savings || 0) >= 0 
                  ? 'financial-savings-positive' 
                  : 'financial-savings-negative'
              }`}>
                {(dashboardData.financial_summary.monthly_savings || 0) >= 0 ? '+' : ''}
                {dashboardData.financial_summary.monthly_savings?.toLocaleString('hu-HU') || '0'} Ft
              </p>
            </div>
          </div>
        )}

        {/* ÚJ: Kategória költés statisztika */}
        <CategorySpendingCard 
          data={analyticsData.categorySpending}
          onClick={handleCategoryAnalyticsClick}
        />

        {/* ÚJ: Megtakarítás trend */}
        <SavingsTrendCard 
          data={analyticsData.savingsTrend}
          onClick={handleSavingsAnalyticsClick}
        />
        
        {/* Családi célok */}
        {dashboardData?.goals?.family_goals?.map(goal => {
          const balance = goal.balance || 0;
          const goalAmount = goal.goal_amount || 0;
          const progress = goalAmount > 0 ? Math.min((balance / goalAmount) * 100, 100) : 0;
          const remainingAmount = Math.max(goalAmount - balance, 0);
          
          return (
            <div key={`family-${goal.id}`} className="dashboard-card">
              <div className="goal-header">
                <div className="goal-info">
                  <div className="goal-icon-container goal-icon-family">
                    <Users className="goal-icon goal-icon-family-color" />
                  </div>
                  <div className="goal-details">
                    <h4>{goal.name}</h4>
                    <div className="goal-meta">
                      <span className="goal-badge">Családi cél</span>
                      {goal.owner_user && (
                        <div className="goal-owner">
                          <User className="goal-owner-icon" />
                          <span>{goal.owner_user.display_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="goal-amount">
                  <span className="goal-amount-main">
                    {balance.toLocaleString('hu-HU')} Ft
                  </span>
                  <p className="goal-amount-total">
                    / {goalAmount.toLocaleString('hu-HU')} Ft
                  </p>
                </div>
              </div>
              
              <div className="goal-progress">
                <div className="goal-progress-header">
                  <span>Haladás</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="goal-progress-bar">
                  <div 
                    className="goal-progress-fill goal-progress-fill-family"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="goal-footer">
                <div>
                  <span className="goal-remaining">Hiányzik még</span>
                  <span className="goal-remaining-amount">
                    {remainingAmount.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                
                {goal.goal_date && (
                  <div className="goal-date">
                    <Calendar className="goal-date-icon" />
                    <span>Cél dátum</span>
                    <span className="goal-date-value">
                      {new Date(goal.goal_date).toLocaleDateString('hu-HU')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Személyes célok és Feladatok ugyanazok maradnak... */}
        {/* ... */}
        
      </div>
    </div>
  );
};

export default DashboardPage;