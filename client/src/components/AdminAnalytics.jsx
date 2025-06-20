import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import './AdminAnalytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const VARIABLES = [
  { key: 'users', label: 'Users Signed Up', color: '#217a3a' },
  { key: 'donations', label: 'Donations Made', color: '#4a7c59' },
  { key: 'ngos', label: 'NGOs Signed Up', color: '#2c5530' },
  { key: 'transactions', label: 'Blockchain Transactions', color: '#b7cbb2' },
];

const TIME_FILTERS = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '1m', label: 'Last Month' },
  { key: '3m', label: 'Last 3 Months' },
  { key: '6m', label: 'Last 6 Months' },
  { key: '1y', label: 'Last Year' },
  { key: 'custom', label: 'Custom Range' },
];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState('7d');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedVariables, setSelectedVariables] = useState({
    userSignups: true,
    donations: true,
    ngoSignups: false,
    blockchainTransactions: false
  });
  const [analyticsData, setAnalyticsData] = useState({
    summary: {
      userSignups: 0,
      donations: 0,
      ngoSignups: 0,
      blockchainTransactions: 0
    },
    timeSeries: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial fetch on component mount
    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    // Only auto-fetch for non-custom time filters
    if (timeFilter !== 'custom') {
      fetchAnalyticsData();
    }
  }, [timeFilter]);

  const fetchAnalyticsData = async () => {
    try {
      // Only show loading on initial load, not on timeframe changes
      if (analyticsData.timeSeries.length === 0) {
      setLoading(true);
      }
      setError(null);
      
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found. Please log in again.');
      }
      
      const user = JSON.parse(userData);
      const token = user.token;
      
      // Build query parameters
      let queryParams = `timeFilter=${timeFilter}`;
      if (timeFilter === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        queryParams += `&startDate=${customDateRange.startDate}&endDate=${customDateRange.endDate}`;
      }
      
      console.log('Fetching analytics data with params:', queryParams);
      
      const response = await fetch(`http://localhost:5001/api/admin/analytics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalyticsData(result.data);
        console.log('Analytics data updated:', result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVariableChange = (variable) => {
    setSelectedVariables(prev => ({
      ...prev,
      [variable]: !prev[variable]
    }));
  };

  const processTimeSeriesData = () => {
    // Group time series data by date and aggregate
    const dateMap = {};
    
    analyticsData.timeSeries.forEach(item => {
      const date = item.date.split('T')[0]; // Get date part only
      if (!dateMap[date]) {
        dateMap[date] = {
          userSignups: 0,
          donations: 0,
          ngoSignups: 0,
          blockchainTransactions: 0
        };
      }
      dateMap[date].userSignups += parseInt(item.user_signups) || 0;
      dateMap[date].donations += parseInt(item.donations) || 0;
      dateMap[date].ngoSignups += parseInt(item.ngo_signups) || 0;
      dateMap[date].blockchainTransactions += parseInt(item.blockchain_transactions) || 0;
    });

    // Convert to array and sort by date
    let sortedData = Object.entries(dateMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Fill in missing dates to create a continuous timeline
    if (sortedData.length > 0) {
      const startDate = new Date(sortedData[0].date);
      const endDate = new Date(sortedData[sortedData.length - 1].date);
      
      // Extend the range based on the time filter to show more context
      let extendDays = 0;
      switch(timeFilter) {
        case '7d': extendDays = 2; break;
        case '1m': extendDays = 5; break;
        case '3m': extendDays = 10; break;
        case '6m': extendDays = 15; break;
        case '1y': extendDays = 30; break;
        default: extendDays = 5;
      }
      
      startDate.setDate(startDate.getDate() - extendDays);
      endDate.setDate(endDate.getDate() + extendDays);
      
      const filledData = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingData = sortedData.find(item => item.date === dateStr);
        
        if (existingData) {
          filledData.push(existingData);
        } else {
          filledData.push({
            date: dateStr,
            userSignups: 0,
            donations: 0,
            ngoSignups: 0,
            blockchainTransactions: 0
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      sortedData = filledData;
    }
    
    console.log('Processed time series data:', sortedData);
    console.log('Date range:', sortedData.length > 0 ? `${sortedData[0].date} to ${sortedData[sortedData.length - 1].date}` : 'No data');

    return sortedData;
  };

  const formatChartDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (timeFilter === '7d' || diffDays <= 7) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeFilter === '1m' || timeFilter === '3m' || diffDays <= 90) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  const chartData = {
    labels: processTimeSeriesData().map(item => formatChartDate(item.date)),
    datasets: [
      selectedVariables.userSignups && {
        label: 'Donors Signups',
        data: processTimeSeriesData().map(item => item.userSignups),
        borderColor: '#00b4d8',
        backgroundColor: 'rgba(0, 180, 216, 0.1)',
        tension: 0.4
      },
      selectedVariables.donations && {
        label: 'Donations',
        data: processTimeSeriesData().map(item => item.donations),
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4
      },
      selectedVariables.ngoSignups && {
        label: 'NGO Signups',
        data: processTimeSeriesData().map(item => item.ngoSignups),
        borderColor: '#90e0ef',
        backgroundColor: 'rgba(144, 224, 239, 0.1)',
        tension: 0.4
      },
      selectedVariables.blockchainTransactions && {
        label: 'Blockchain Transactions',
        data: processTimeSeriesData().map(item => item.blockchainTransactions),
        borderColor: '#a8dadc',
        backgroundColor: 'rgba(168, 218, 220, 0.1)',
        tension: 0.4
      }
    ].filter(Boolean)
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'white'
        }
      },
      title: {
        display: true,
        text: `Analytics Overview - ${TIME_FILTERS.find(f => f.key === timeFilter)?.label || 'Last Month'}`,
        color: 'white',
        font: {
          size: 16
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'white'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: 'white'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const exportToExcel = () => {
    const exportData = processTimeSeriesData().map(item => ({
      Date: item.date,
      'User Signups': item.userSignups,
      'Donations': item.donations,
      'NGO Signups': item.ngoSignups,
      'Blockchain Transactions': item.blockchainTransactions
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics Data');
    XLSX.writeFile(wb, `analytics_${timeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="admin-analytics-page">
        <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
          Loading analytics data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-analytics-page">
        <div style={{ textAlign: 'center', padding: '40px', color: '#ff6b6b' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-page">
      <div className="analytics-header">
        <button className="back-to-dashboard-btn" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
      <h2>Admin Analytics Dashboard</h2>
      </div>
      
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">User Signups</div>
          <div className="summary-value">{analyticsData.summary.userSignups}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Donations</div>
          <div className="summary-value">{analyticsData.summary.donations}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">NGO Signups</div>
          <div className="summary-value">{analyticsData.summary.ngoSignups}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Blockchain Transactions</div>
          <div className="summary-value">{analyticsData.summary.blockchainTransactions}</div>
        </div>
      </div>

      <div className="analytics-controls">
        <div className="time-filters">
          {TIME_FILTERS.map(filter => (
          <button 
              key={filter.key}
              className={timeFilter === filter.key ? 'active' : ''} 
              onClick={() => setTimeFilter(filter.key)}
          >
              {filter.label}
          </button>
          ))}
        </div>

        {timeFilter === 'custom' && (
          <div className="custom-date-range">
            <label>
              Start Date:
              <input 
                type="date" 
                value={customDateRange.startDate}
                onChange={(e) => setCustomDateRange(prev => ({
                  ...prev,
                  startDate: e.target.value
                }))}
              />
            </label>
            <label>
              End Date:
              <input 
                type="date" 
                value={customDateRange.endDate}
                onChange={(e) => setCustomDateRange(prev => ({
                  ...prev,
                  endDate: e.target.value
                }))}
              />
            </label>
            <button 
              className="apply-date-btn"
              onClick={fetchAnalyticsData}
              disabled={!customDateRange.startDate || !customDateRange.endDate}
            >
              Apply Date Range
            </button>
          </div>
        )}



        <div className="var-select">
          <label>
            <input 
              type="checkbox" 
              checked={selectedVariables.userSignups}
              onChange={() => handleVariableChange('userSignups')}
            />
            User Signups
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={selectedVariables.donations}
              onChange={() => handleVariableChange('donations')}
            />
            Donations
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={selectedVariables.ngoSignups}
              onChange={() => handleVariableChange('ngoSignups')}
            />
            NGO Signups
          </label>
          <label>
            <input 
              type="checkbox" 
              checked={selectedVariables.blockchainTransactions}
              onChange={() => handleVariableChange('blockchainTransactions')}
            />
            Blockchain Transactions
          </label>
        </div>

        <button className="export-btn" onClick={exportToExcel}>
          Export to Excel
        </button>
      </div>

      <div className="analytics-chart">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default AdminAnalytics; 