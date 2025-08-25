import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Filter,
  ArrowLeft
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import '../components/Analytics.css';

const AnalyticsPage = () => {
  const { token, apiUrl } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'categories');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  });

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  const [categoryData, setCategoryData] = useState([]);
  const [savingsData, setSavingsData] = useState([]);
  const [subcategoryData, setSubcategoryData] = useState([]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchCategories = useCallback(async () => {
    if (!token || !apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/api/categories/tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setAvailableCategories(await response.json());
      }
    } catch (err) {
      console.error('Kategóriák lekérési hiba:', err);
    }
  }, [apiUrl, token]);

  const fetchData = useCallback(async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      if (activeTab === 'categories') {
        if (selectedCategories.length) {
          params.append('categories', selectedCategories.join(','));
        }
        endpoint = `/api/analytics/category-detailed?${params}`;
      } else {
        endpoint = `/api/analytics/savings-detailed?${params}`;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Hiba az adatok lekérésekor');
      }

      const data = await response.json();
      if (activeTab === 'categories') {
        setCategoryData(data.categories || []);
        setSubcategoryData(data.subcategories || []);
      } else {
        setSavingsData(data || []);
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, token, activeTab, dateRange, selectedCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const CategoryAnalytics = () => {
    const totalSpending = categoryData.reduce((sum, item) => sum + item.amount, 0);

    return (
      <div className="analytics-content">
        <div className="analytics-overview">
          <div className="analytics-summary-card">
            <h3>Összes költés</h3>
            <span className="analytics-total-amount">
              {totalSpending.toLocaleString('hu-HU')} Ft
            </span>
          </div>
          <div className="analytics-summary-card">
            <h3>Kategóriák száma</h3>
            <span className="analytics-total-count">{categoryData.length}</span>
          </div>
        </div>

        <div className="analytics-charts-grid">
          {/* Kördiagram */}
          <div className="analytics-chart-card">
            <h4>Kategóriás megoszlás</h4>
            <div className="analytics-chart-large">
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={140}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Költés']}
                    contentStyle={{
                      backgroundColor: '#2d3748',
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Oszlopdiagram */}
          <div className="analytics-chart-card">
            <h4>Kategóriák összehasonlítása</h4>
            <div className="analytics-chart-large">
              <ResponsiveContainer width="100%" height={400}>
                <RechartsBarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12, fill: '#a0aec0' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#a0aec0' }} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Költés']}
                    contentStyle={{
                      backgroundColor: '#2d3748',
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                  />
                  <Bar dataKey="amount">
                    {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Részletes lista */}
        <div className="analytics-table-card">
          <h4>Részletes kategória lista</h4>
          <div className="analytics-table">
            <div className="analytics-table-header">
              <div>Kategória</div>
              <div>Összeg</div>
              <div>Arány</div>
              <div>Tranzakciók</div>
            </div>
            {categoryData.map((item, index) => (
              <div key={index} className="analytics-table-row">
                <div className="analytics-table-category">
                  <div
                    className="analytics-table-color"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  {item.name}
                </div>
                <div className="analytics-table-amount">
                  {item.amount.toLocaleString('hu-HU')} Ft
                </div>
                <div className="analytics-table-percentage">
                  {totalSpending > 0 ? ((item.amount / totalSpending) * 100).toFixed(1) : 0}%
                </div>
                <div className="analytics-table-count">
                  {item.transactionCount || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

    const SavingsAnalytics = () => {
    const totalSavings = savingsData.reduce((sum, item) => sum + (item.savings || 0), 0);
    const averageSavings = savingsData.length ? totalSavings / savingsData.length : 0;
    const bestMonth = savingsData.reduce((best, current) =>
      (current.savings || 0) > (best.savings || 0) ? current : best, savingsData[0] || {});

    return (
      <div className="analytics-content">
        <div className="analytics-overview">
          <div className="analytics-summary-card">
            <h3>Összes megtakarítás</h3>
            <span className={`analytics-total-amount ${totalSavings >= 0 ? 'positive' : 'negative'}`}>
              {totalSavings >= 0 ? '+' : ''}{totalSavings.toLocaleString('hu-HU')} Ft
            </span>
          </div>
          <div className="analytics-summary-card">
            <h3>Havi átlag</h3>
            <span className={`analytics-total-amount ${averageSavings >= 0 ? 'positive' : 'negative'}`}>
              {averageSavings >= 0 ? '+' : ''}{averageSavings.toLocaleString('hu-HU')} Ft
            </span>
          </div>
          <div className="analytics-summary-card">
            <h3>Legjobb hónap</h3>
            <span className="analytics-best-month">{bestMonth.month}</span>
            <span className="analytics-best-amount">
              {bestMonth.savings?.toLocaleString('hu-HU')} Ft
            </span>
          </div>
        </div>

        <div className="analytics-charts-grid">
          <div className="analytics-chart-card full-width">
            <h4>Havi megtakarítás alakulása</h4>
            <div className="analytics-chart-large">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={savingsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#a0aec0' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#a0aec0' }} />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString('hu-HU')} Ft`, 'Megtakarítás']}
                    contentStyle={{
                      backgroundColor: '#2d3748',
                      border: '1px solid #4a5568',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    name="Megtakarítás"
                    stroke="#4299e1"
                    strokeWidth={3}
                    dot={{ fill: '#4299e1', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Bevétel"
                    stroke="#48bb78"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Kiadás"
                    stroke="#f56565"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="analytics-table-card">
          <h4>Havi részletezés</h4>
          <div className="analytics-table">
            <div className="analytics-table-header">
              <div>Hónap</div>
              <div>Bevétel</div>
              <div>Kiadás</div>
              <div>Megtakarítás</div>
              <div>Változás</div>
            </div>
            {savingsData.map((item, index) => {
              const prevSavings = index > 0 ? (savingsData[index - 1].savings || 0) : 0;
              const change = (item.savings || 0) - prevSavings;

              return (
                <div key={index} className="analytics-table-row">
                  <div>{item.month}</div>
                  <div className="positive">
                    +{item.income?.toLocaleString('hu-HU') || '0'} Ft
                  </div>
                  <div className="negative">
                    -{item.expenses?.toLocaleString('hu-HU') || '0'} Ft
                  </div>
                  <div className={item.savings >= 0 ? 'positive' : 'negative'}>
                    {item.savings >= 0 ? '+' : ''}{item.savings?.toLocaleString('hu-HU') || '0'} Ft
                  </div>
                  <div className={change >= 0 ? 'positive' : 'negative'}>
                    {index === 0 ? '-' : `${change >= 0 ? '+' : ''}${change.toLocaleString('hu-HU')} Ft`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-page">
      <div className="analytics-tabs">
        <button
          className={`analytics-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => handleTabChange('categories')}
        >
          <PieChartIcon />
          Kategória Analízis
        </button>
        <button
          className={`analytics-tab ${activeTab === 'savings' ? 'active' : ''}`}
          onClick={() => handleTabChange('savings')}
        >
          <BarChart3 />
          Megtakarítás Trend
        </button>
      </div>

      <div className="analytics-filters">
        <div className="analytics-filter-group">
          <label>
            <Calendar />
            Időszak
          </label>
          <div className="analytics-date-range">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="analytics-date-input"
            />
            <span>-</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="analytics-date-input"
            />
          </div>
        </div>

        {activeTab === 'categories' && (
          <div className="analytics-filter-group">
            <label>
              <Filter />
              Kategóriák
            </label>
            <select
              multiple
              value={selectedCategories}
              onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, option => option.value))}
              className="analytics-category-select"
            >
              {availableCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <p>Adatok betöltése...</p>
        </div>
      )}

      {error && (
        <div className="analytics-error">
          <p>{error}</p>
          <button onClick={fetchData}>Újrapróbálás</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'categories' ? <CategoryAnalytics /> : <SavingsAnalytics />}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;