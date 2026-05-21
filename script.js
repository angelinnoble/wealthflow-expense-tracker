// ── CONSTANTS ──
const INCOME_CATS  = ['Salary', 'Freelance', 'Business', 'Investment', 'Pocket Money', 'Gift', 'Bonus', 'Other'];
const EXPENSE_CATS = ['Food', 'Shopping', 'Travel', 'Bills', 'Healthcare', 'Entertainment', 'Education', 'Rent', 'Fuel', 'Other'];
const CHART_COLORS = ['#c9a84c', '#f0d080', '#4fd18b', '#f06a6a', '#5b9cf6', '#b06af0', '#f06ab5', '#6af0e0', '#f0a46a', '#a4f06a'];
const EMOJI = {
  Salary: '💼', Freelance: '🖥️', Business: '🏢', Investment: '📊', 'Pocket Money': '👛', Gift: '🎁', Bonus: '🌟',
  Food: '🍽️', Shopping: '🛍️', Travel: '✈️', Bills: '📋', Healthcare: '💊', Entertainment: '🎬', Education: '📚', Rent: '🏠', Fuel: '⛽', Other: '💡'
};
const SUGG_MAP = {
  Food:          { icon: '🍽️', tip: 'Consider meal prepping at home to cut restaurant spending significantly.' },
  Shopping:      { icon: '🛍️', tip: 'Delay non-essential purchases by 48 hours — impulse buys drop by 70%.' },
  Travel:        { icon: '✈️', tip: 'Use public transport or carpool to reduce fuel and cab costs.' },
  Bills:         { icon: '📋', tip: 'Review subscriptions — cancel any you haven\'t used in 30 days.' },
  Healthcare:    { icon: '💊', tip: 'Schedule preventive check-ups to avoid costly emergency visits.' },
  Entertainment: { icon: '🎬', tip: 'Rotate streaming services monthly instead of keeping all active.' },
  Education:     { icon: '📚', tip: 'Look for free or discounted courses on platforms like Coursera.' },
  Rent:          { icon: '🏠', tip: 'Explore shared accommodation options to split fixed housing costs.' },
  Fuel:          { icon: '⛽', tip: 'Combine errands into single trips and check fuel prices near you.' },
  Other:         { icon: '💡', tip: 'Track miscellaneous spend carefully — it often hides surprise drains.' }
};

// ── GLOBAL APPLICATION STATE ──
let currentTab = 'income';
let txFilter   = 'all';
let transactions = JSON.parse(localStorage.getItem('wf_txs') || '[]');
let monthlyBudget = parseFloat(localStorage.getItem('wf_budget') || '0');
let barChart, donutChart, trendChart, compareChart, catChart, weekChart;

// ── INITIALIZATION INSTANCE ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('dateDisplay').textContent =
    new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('txDate').valueAsDate = new Date();
  switchTab('income');
  initCharts();
  render();
});

// ── VIEW TABS ALTERNATION ──
function switchTab(tab) {
  currentTab = tab;
  ['tabIncome', 'tabExpense'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById(tab === 'income' ? 'tabIncome' : 'tabExpense').classList.add('active');
  
  const cats = tab === 'income' ? INCOME_CATS : EXPENSE_CATS;
  document.getElementById('txCategory').innerHTML =
    '<option value="">Select category…</option>' + cats.map(c => `<option>${c}</option>`).join('');
  
  const btn = document.getElementById('addBtn');
  btn.textContent = tab === 'income' ? '+ Add Income' : '- Add Expense';
  btn.className   = 'btn-add ' + (tab === 'income' ? 'income-btn' : 'expense-btn');
}

// ── DATA ACQUISITION & MANAGEMENT ──
function addTransaction() {
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const cat    = document.getElementById('txCategory').value;
  const date   = document.getElementById('txDate').value;

  if (!desc) { showToast('⚠️ Please enter a description'); return; }
  if (!amount || amount <= 0) { showToast('⚠️ Enter a valid amount'); return; }
  if (!cat) { showToast('⚠️ Choose a category'); return; }

  transactions.unshift({
    id: Date.now(),
    type: currentTab,
    desc,
    amount,
    cat,
    date: date || new Date().toISOString().split('T')[0]
  });

  save(); 
  render();
  
  showToast(currentTab === 'income' ? `✅ ₹${fmt(amount)} income added` : `✅ ₹${fmt(amount)} expense added`);
  document.getElementById('txDesc').value = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txCategory').value = '';
}

function deleteTx(id) {
  transactions = transactions.filter(t => t.id !== id);
  save(); 
  render(); 
  showToast('🗑️ Transaction removed');
}

function clearAll() {
  if (!confirm('Clear ALL transactions?')) return;
  transactions = []; 
  save(); 
  render(); 
  showToast('🗑️ All data wiped');
}

function setFilter(f, btn) {
  txFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); // Fixed broken cutoff segment from original input
  renderTxList();
}

function save() {
  localStorage.setItem('wf_txs', JSON.stringify(transactions));
}

// ── BUDGET POPUP SYSTEM ──
function openBudgetModal() {
  document.getElementById('budgetInput').value = monthlyBudget > 0 ? monthlyBudget : '';
  document.getElementById('budgetModal').classList.add('show');
}

function closeBudgetModal() {
  document.getElementById('budgetModal').classList.remove('show');
}

function saveBudget() {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (isNaN(val) || val <= 0) { showToast('⚠️ Please enter a valid budget amount'); return; }
  monthlyBudget = val;
  localStorage.setItem('wf_budget', monthlyBudget.toString());
  closeBudgetModal();
  render();
  showToast(`💼 Monthly budget set to ₹${fmt(monthlyBudget)}`);
}

// ── RENDERING CORE UTILITIES ──
function fmt(num) {
  return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function render() {
  let inc = 0, exp = 0, incCount = 0, expCount = 0;
  transactions.forEach(t => {
    if (t.type === 'income') { inc += t.amount; incCount++; }
    else { exp += t.amount; expCount++; }
  });

  const bal = inc - exp;
  document.getElementById('balanceAmt').textContent = (bal < 0 ? '-' : '') + '₹' + fmt(Math.abs(bal));
  document.getElementById('incomeAmt').textContent = '₹' + fmt(inc);
  document.getElementById('expenseAmt').textContent = '₹' + fmt(exp);
  
  document.getElementById('incomeTxCount').textContent = `${incCount} transaction${incCount !== 1 ? 's' : ''}`;
  document.getElementById('expenseTxCount').textContent = `${expCount} transaction${expCount !== 1 ? 's' : ''}`;
  document.getElementById('balanceNote').textContent = transactions.length ? 'Real-time Net Liquidity' : 'Add your first transaction';

  // Calculations for Ring Indicators
  const ring1Pct = monthlyBudget > 0 ? Math.min((exp / monthlyBudget) * 100, 100) : 0;
  updateRing('ring1', 'ring1pct', ring1Pct, `${ring1Pct.toFixed(0)}%`);
  document.getElementById('ring1sub').textContent = monthlyBudget > 0 ? `Limit: ₹${fmt(monthlyBudget)}` : 'Set a budget to track';

  const ring2Pct = inc > 0 ? Math.min((parseFloat(inc - exp) / inc) * 100, 100) : 0;
  updateRing('ring2', 'ring2pct', Math.max(ring2Pct, 0), `${Math.max(ring2Pct, 0).toFixed(0)}%`);
  document.getElementById('ring2sub').textContent = inc > 0 ? `Net Saved: ₹${fmt(Math.max(bal, 0))}` : 'Awaiting recurring income';

  const dayPct = (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100;
  updateRing('ring3', 'ring3pct', dayPct, `${dayPct.toFixed(0)}%`);
  document.getElementById('ring3sub').textContent = `${new Date().toLocaleString('en-IN', { month: 'short' })} cycle duration elapsed`;

  // Budget Tracker Interface UI Controls
  if (monthlyBudget > 0) {
    document.getElementById('budgetDisplay').textContent = `₹${fmt(monthlyBudget)} ✏️`;
    const bBarPct = Math.min((exp / monthlyBudget) * 100, 100);
    const fill = document.getElementById('budgetBarFill');
    fill.style.width = `${bBarPct}%`;
    fill.style.background = bBarPct > 90 ? 'var(--red)' : bBarPct > 70 ? 'var(--orange)' : 'var(--green)';
    document.getElementById('budgetBarLabel').textContent = `Spent ₹${fmt(exp)} of ₹${fmt(monthlyBudget)} (${bBarPct.toFixed(1)}%)`;
  } else {
    document.getElementById('budgetDisplay').textContent = 'Set Budget ✏️';
    document.getElementById('budgetBarFill').style.width = '0%';
    document.getElementById('budgetBarLabel').textContent = 'No active threshold budget set';
  }

  // System Health Scoring Engines
  let score = '—';
  let scoreLabel = 'Processing Financial Inputs';
  let scoreColor = 'var(--muted)';
  
  if (transactions.length > 0) {
    let calcScore = 100;
    if (inc > 0) {
      const ratio = exp / inc;
      if (ratio > 1) calcScore -= 50;
      else calcScore -= (ratio * 40);
    } else if (exp > 0) {
      calcScore -= 60;
    }
    if (monthlyBudget > 0 && exp > monthlyBudget) calcScore -= 20;
    
    calcScore = Math.max(Math.min(Math.round(calcScore), 100), 10);
    score = calcScore.toString();
    
    if (calcScore >= 80) { scoreLabel = 'Excellent Health'; scoreColor = 'var(--green)'; }
    else if (calcScore >= 50) { scoreLabel = 'Moderate Exposure'; scoreColor = 'var(--orange)'; }
    else { scoreLabel = 'High Critical Risk'; scoreColor = 'var(--red)'; }
  }
  
  document.getElementById('healthScore').textContent = score;
  document.getElementById('healthScore').style.color = scoreColor;
  document.getElementById('healthLabel').textContent = scoreLabel;
  
  const scoreCircumference = 138.2;
  const scoreOffset = score === '—' ? scoreCircumference : scoreCircumference - (parseFloat(score) / 100) * scoreCircumference;
  const scoreRing = document.getElementById('scoreRingFill');
  scoreRing.style.strokeDashoffset = scoreOffset;
  scoreRing.style.stroke = scoreColor;

  // Render Sub-Modules & Canvas Graphs
  renderTxList();
  renderSmartInsights(exp);
  updateCharts(inc, exp);
}

function updateRing(id, pctId, pct, text) {
  const circle = document.getElementById(id);
  const totalLength = 201.1; 
  circle.style.strokeDashoffset = totalLength - (pct / 100) * totalLength;
  document.getElementById(pctId).textContent = text;
}

function renderTxList() {
  const container = document.getElementById('txList');
  const filtered = transactions.filter(t => txFilter === 'all' || t.type === txFilter);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><div class="ei">🔍</div><p>No transactions match selected filter options.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(t => `
    <div class="tx-item">
      <div class="tx-icon-wrap ${t.type === 'income' ? 'inc' : 'exp'}">${EMOJI[t.cat] || '💰'}</div>
      <div class="tx-info">
        <div class="tx-desc">${t.desc}</div>
        <div class="tx-meta">
          <span class="tx-cat">${t.cat}</span>
          <span>${new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
      <div class="tx-amount ${t.type === 'income' ? 'inc' : 'exp'}">${t.type === 'income' ? '+' : '-'}₹${fmt(t.amount)}</div>
      <button class="btn-del" onclick="deleteTx(${t.id})">🗑️</button>
    </div>
  `).join('');
}

function renderSmartInsights(totalExp) {
  const alertBanner = document.getElementById('budgetAlert');
  const suggPanel  = document.getElementById('suggPanel');
  const suggList   = document.getElementById('suggList');
  const suggestionsBox = document.getElementById('alertSuggestions');

  if (monthlyBudget > 0 && totalExp > monthlyBudget) {
    alertBanner.classList.add('show');
    document.getElementById('alertSub').textContent = `Your expenses have crossed the limit by ₹${fmt(totalExp - monthlyBudget)}!`;
  } else {
    alertBanner.classList.remove('show');
  }

  const expItems = transactions.filter(t => t.type === 'expense');
  if (!expItems.length) {
    suggPanel.classList.remove('show');
    return;
  }

  suggPanel.classList.add('show');
  const totalsByCat = {};
  expItems.forEach(t => totalsByCat[t.cat] = (totalsByCat[t.cat] || 0) + t.amount);
  
  const sortedCats = Object.keys(totalsByCat).sort((a, b) => totalsByCat[b] - totalsByCat[a]);
  const primaryThreats = sortedCats.slice(0, 2);

  suggList.innerHTML = primaryThreats.map(c => {
    const config = SUGG_MAP[c] || { icon: '💡', tip: 'Track adjustments visually to maximize yield output.' };
    return `
      <div class="sugg-item">
        <div class="sugg-item-icon">${config.icon}</div>
        <div class="sugg-item-text">
          <strong>Heavy Concentration in ${c} (₹${fmt(totalsByCat[c])})</strong>
          <span>${config.tip}</span>
        </div>
      </div>
    `;
  }).join('');

  suggestionsBox.innerHTML = primaryThreats.map(c => `<span class="suggestion-chip">💡 Optimize ${c} spending</span>`).join('');
}

// ── FLOATING TOAST POPUPS ──
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── ANALYTICS CHARTING INSTANCE ──
function switchChartTab(mode, btn) {
  document.querySelectorAll('.ct').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  ['chartOverview', 'chartMonthly', 'chartWeekly'].forEach(id => document.getElementById(id).style.display = 'none');
  if (mode === 'overview') document.getElementById('chartOverview').style.display = 'block';
  if (mode === 'monthly') document.getElementById('chartMonthly').style.display = 'block';
  if (mode === 'weekly') document.getElementById('chartWeekly').style.display = 'block';
}

function initCharts() {
  const ctxBar = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(ctxBar, {
    type: 'bar',
    data: { labels: ['Income', 'Expense'], datasets: [{ data: [0, 0], backgroundColor: ['#4fd18b', '#f06a6a'], borderWidth: 0, borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888aa' } }, x: { ticks: { color: '#8888aa' } } } }
  });

  const ctxDonut = document.getElementById('donutChart').getContext('2d');
  donutChart = new Chart(ctxDonut, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: CHART_COLORS, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#8888aa', font: { size: 10 } } } }, cutout: '70%' }
  });

  // Mock initializations for structural secondary panels
  const configLine = (id, label) => new Chart(document.getElementById(id).getContext('2d'), {
    type: 'line',
    data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label, data: [12000, 19000, 15000, 22000, 18000, 24000], borderColor: 'var(--gold)', tension: 0.4, fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { ticks: { color: '#8888aa' } } } }
  });

  trendChart = configLine('trendChart', 'Spending Trend');
  
  compareChart = new Chart(document.getElementById('compareChart').getContext('2d'), {
    type: 'bar',
    data: { labels: ['Last Month', 'This Month'], datasets: [{ data: [15000, 18000], backgroundColor: ['#21213a', 'var(--gold)'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  catChart = new Chart(document.getElementById('catChart').getContext('2d'), {
    type: 'polarArea',
    data: { labels: ['Food', 'Bills', 'Rent'], datasets: [{ data: [3000, 5000, 10000], backgroundColor: CHART_COLORS }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  weekChart = new Chart(document.getElementById('weekChart').getContext('2d'), {
    type: 'line',
    data: { labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'], datasets: [{ data: [3000, 4500, 6000, 4500], borderColor: 'var(--blue)', backgroundColor: 'rgba(91,156,246,0.1)', fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function updateCharts(inc, exp) {
  if (!barChart || !donutChart) return;

  barChart.data.datasets[0].data = [inc, exp];
  barChart.update();

  const expItems = transactions.filter(t => t.type === 'expense');
  const totalsByCat = {};
  expItems.forEach(t => totalsByCat[t.cat] = (totalsByCat[t.cat] || 0) + t.amount);

  donutChart.data.labels = Object.keys(totalsByCat);
  donutChart.data.datasets[0].data = Object.values(totalsByCat);
  donutChart.update();
}

// ── DATA REPORT EXPORTING ENGINE ──
function exportPDF() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) { showToast('⚠️ PDF compilation core engine loading error'); return; }
  
  const doc = new jsPDF();
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('WealthFlow Pro — Financial Statement', 14, 22);
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 28);
  doc.line(14, 32, 196, 32);

  let inc = 0, exp = 0;
  transactions.forEach(t => t.type === 'income' ? inc += t.amount : exp += t.amount);

  doc.setFontSize(12);
  doc.text(`Total Generated Gross Income: INR ${fmt(inc)}`, 14, 42);
  doc.text(`Total Liquid Debited Expenses: INR ${fmt(exp)}`, 14, 49);
  doc.text(`Net Available Balance Yield: INR ${fmt(inc - exp)}`, 14, 56);
  doc.line(14, 62, 196, 62);

  doc.setFont('Helvetica', 'bold');
  doc.text('Chronological Records Ledger', 14, 72);
  doc.setFont('Helvetica', 'normal');

  let y = 82;
  doc.setFontSize(10);
  
  if (transactions.length === 0) {
    doc.text('No transaction logging records found.', 14, y);
  } else {
    transactions.slice(0, 25).forEach((t, i) => {
      if (y > 275) { doc.addPage(); y = 20; }
      const txt = `${i + 1}. [${t.date}] ${t.desc} (${t.cat}) — ${t.type === 'income' ? '+' : '-'}INR ${fmt(t.amount)}`;
      doc.text(txt, 14, y);
      y += 8;
    });
  }

  doc.save(`WealthFlow-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('📄 PDF Generated and Downloaded successfully!');
}