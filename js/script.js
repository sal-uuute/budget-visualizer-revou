// TC-2: Data Storage using Local Storage
const STORAGE_KEY   = 'userExpenses';
const CATEGORY_KEY  = 'userCategories';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun', 'Personal Care', 'Others'];
const CHART_COLORS = [
    '#6366f1','#10b981','#f59e0b','#ec4899','#94a3b8',
    '#3b82f6','#ef4444','#14b8a6','#f97316','#8b5cf6'
];

let expenses   = JSON.parse(localStorage.getItem(STORAGE_KEY))  || [];
let categories = JSON.parse(localStorage.getItem(CATEGORY_KEY)) || [...DEFAULT_CATEGORIES];
let myChart;

// ── Helpers ──────────────────────────────────────────────────────────────────

const saveExpenses   = () => localStorage.setItem(STORAGE_KEY,  JSON.stringify(expenses));
const saveCategories = () => localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));

const formatRp = (n) =>
    'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0 });

const todayISO = () => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // yyyy-mm-dd
};

// Format ISO date (yyyy-mm-dd) → dd/mm/yyyy for display
const formatDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};

const dateKey = (exp) => exp.date || '';

// ── Total Balance ─────────────────────────────────────────────────────────────

const renderBalance = () => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('totalBalance').textContent = formatRp(total);
};

// ── Category select ───────────────────────────────────────────────────────────

const populateCategorySelect = () => {
    const sel = document.getElementById('itemCategory');
    const current = sel.value;
    sel.innerHTML = '';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
    });
    if (current && categories.includes(current)) sel.value = current;
};

document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const name = prompt('Enter new category name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
        alert('Category already exists.');
        return;
    }
    categories.push(trimmed);
    saveCategories();
    populateCategorySelect();
    document.getElementById('itemCategory').value = trimmed;
});

// ── Monthly summary dropdowns ─────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const populateSummaryFilters = () => {
    const mSel = document.getElementById('summaryMonth');
    const ySel = document.getElementById('summaryYear');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    // Months
    mSel.innerHTML = '';
    MONTH_NAMES.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = i + 1;
        opt.textContent = name;
        if (i + 1 === currentMonth) opt.selected = true;
        mSel.appendChild(opt);
    });

    // Years: current year ± 5
    ySel.innerHTML = '';
    for (let y = currentYear - 5; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        ySel.appendChild(opt);
    }
};

const renderMonthlySummary = () => {
    const month = parseInt(document.getElementById('summaryMonth').value, 10);
    const year  = parseInt(document.getElementById('summaryYear').value,  10);
    const container = document.getElementById('monthlySummary');

    const filtered = expenses.filter(e => {
        if (!e.date) return false;
        const [y, m] = e.date.split('-');
        return parseInt(m, 10) === month && parseInt(y, 10) === year;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state" style="grid-column:1/-1">No transactions for this month.</p>';
        return;
    }

    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const count = filtered.length;

    // Per-category totals
    const catTotals = {};
    filtered.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    container.innerHTML = `
        <div class="summary-item">
            <div class="s-label">Total Spent</div>
            <div class="s-value">${formatRp(total)}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Transactions</div>
            <div class="s-value">${count}</div>
        </div>
        <div class="summary-item">
            <div class="s-label">Average</div>
            <div class="s-value">${formatRp(Math.round(total / count))}</div>
        </div>
        <div class="summary-item cat-item">
            <div class="s-label">Top Category</div>
            <div class="s-value">${topCat ? topCat[0] : '—'}</div>
        </div>
    `;
};

document.getElementById('summaryMonth').addEventListener('change', renderMonthlySummary);
document.getElementById('summaryYear').addEventListener('change',  renderMonthlySummary);

// ── Transaction list ──────────────────────────────────────────────────────────

const getSortedExpenses = () => {
    const sort = document.getElementById('sortSelect').value;
    const copy = [...expenses];

    switch (sort) {
        case 'date-desc':
            return copy.sort((a, b) => dateKey(b).localeCompare(dateKey(a)));
        case 'date-asc':
            return copy.sort((a, b) => dateKey(a).localeCompare(dateKey(b)));
        case 'amount-desc':
            return copy.sort((a, b) => b.amount - a.amount);
        case 'amount-asc':
            return copy.sort((a, b) => a.amount - b.amount);
        case 'category':
            return copy.sort((a, b) => a.category.localeCompare(b.category));
        default:
            return copy;
    }
};

const renderTransactionList = () => {
    const list = document.getElementById('transactionList');
    const sorted = getSortedExpenses();

    if (sorted.length === 0) {
        list.innerHTML = '<li class="empty-state">No transactions yet. Add one above!</li>';
        return;
    }

    list.innerHTML = sorted.map((exp) => {
        // Find original index for deletion
        const origIdx = expenses.indexOf(exp);
        return `
        <li class="transaction-item">
            <div class="t-info">
                <div class="t-name">${escapeHtml(exp.name)}</div>
                <div class="t-meta">${formatDate(exp.date)} · ${escapeHtml(exp.category)}</div>
            </div>
            <div class="t-amount">${formatRp(exp.amount)}</div>
            <button class="t-delete" data-idx="${origIdx}" title="Delete">×</button>
        </li>`;
    }).join('');

    list.querySelectorAll('.t-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx, 10);
            expenses.splice(i, 1);
            saveExpenses();
            renderAll();
        });
    });
};

document.getElementById('sortSelect').addEventListener('change', renderTransactionList);

// ── Chart ─────────────────────────────────────────────────────────────────────

const renderChart = () => {
    const ctx       = document.getElementById('myChart').getContext('2d');
    const emptyMsg  = document.getElementById('chartEmpty');
    const canvas    = document.getElementById('myChart');

    // Build per-category totals from ALL expenses
    const catTotals = {};
    expenses.forEach(e => {
        catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    const labels = Object.keys(catTotals);
    const data   = Object.values(catTotals);

    if (myChart) myChart.destroy();

    if (labels.length === 0) {
        canvas.style.display = 'none';
        emptyMsg.classList.remove('hidden');
        return;
    }

    canvas.style.display = '';
    emptyMsg.classList.add('hidden');

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: 'Poppins', size: 12 }, padding: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${formatRp(ctx.parsed)}`
                    }
                }
            }
        }
    });
};

// ── Add transaction ───────────────────────────────────────────────────────────

const escapeHtml = (str) =>
    String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

document.getElementById('addBtn').addEventListener('click', () => {
    const name     = document.getElementById('itemName').value.trim();
    const amount   = parseFloat(document.getElementById('itemAmount').value);
    const category = document.getElementById('itemCategory').value;
    const date     = document.getElementById('itemDate').value; // yyyy-mm-dd
    const errorEl  = document.getElementById('errorMsg');

    errorEl.textContent = '';

    if (!name) {
        errorEl.textContent = 'Please enter a description.'; return;
    }
    if (!amount || amount <= 0) {
        errorEl.textContent = 'Please enter a valid amount.'; return;
    }
    if (!date) {
        errorEl.textContent = 'Please select a date.'; return;
    }

    expenses.push({ name, amount, category, date });
    saveExpenses();
    renderAll();

    // Clear form
    document.getElementById('itemName').value   = '';
    document.getElementById('itemAmount').value = '';
    document.getElementById('itemDate').value   = todayISO();
});

// ── Render all ────────────────────────────────────────────────────────────────

const renderAll = () => {
    renderBalance();
    renderTransactionList();
    renderMonthlySummary();
    renderChart();
};

// ── Init ──────────────────────────────────────────────────────────────────────

window.onload = () => {
    populateCategorySelect();
    populateSummaryFilters();

    // Pre-fill today's date
    document.getElementById('itemDate').value = todayISO();

    renderAll();
};
