// Habit Tracker Logic

const habitListElement = document.getElementById('habit-list');
const addHabitBtn = document.getElementById('add-habit-btn');
const modalOverlay = document.getElementById('modal-overlay');
const saveHabitBtn = document.getElementById('save-habit-btn');
const habitInput = document.getElementById('habit-input');
const currentDateElement = document.getElementById('current-date');

let habits = [];
let editingHabitId = null;

// IndexedDB Manager
const DB_NAME = 'HabitsDB';
const STORE_NAME = 'habits_store';

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

const saveToDB = async (data) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    // Clear and refill (for simplicity in this minimalist setup)
    store.clear();
    data.forEach(item => store.add(item));
    return tx.complete;
};

const loadFromDB = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
    });
};

const calculateCurrentStreak = (history) => {
    if (!history || Object.keys(history).length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Sort dates descending
    const dates = Object.keys(history)
        .filter(d => history[d] > 0)
        .sort((a, b) => new Date(b) - new Date(a));
    
    if (dates.length === 0) return 0;

    const lastEntry = new Date(dates[0]);
    lastEntry.setHours(0,0,0,0);
    
    const diffDays = Math.floor((today - lastEntry) / (1000 * 60 * 60 * 24));
    
    // Streak is broken if last entry is older than yesterday
    if (diffDays > 1) return 0;

    let checkDate = lastEntry;
    for (let i = 0; i < dates.length; i++) {
        const entryDate = new Date(dates[i]);
        entryDate.setHours(0,0,0,0);
        
        const dayDiff = Math.floor((checkDate - entryDate) / (1000 * 60 * 60 * 24));
        
        if (dayDiff <= 1) {
            if (dayDiff === 1) streak++;
            else if (i === 0) streak = 1; 
            checkDate = entryDate;
        } else {
            break;
        }
    }
    return streak;
};

const bibleVerses = [
    { text: "Ne t'ai-je pas donné cet ordre: Fortifie-toi et prends courage? Ne t'effraie point et ne t'épouvante point, car l'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.", ref: "Josué 1:9" },
    { text: "Je puis tout par celui qui me fortifie, Christ.", ref: "Philippiens 4:13" },
    { text: "Ne promène pas des regards inquiets, car je suis ton Dieu; Je te fortifie, je viens à ton secours.", ref: "Ésaïe 41:10" },
    { text: "Car ce n'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d'amour et de sagesse.", ref: "2 Timothée 1:7" },
    { text: "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ta sagesse.", ref: "Proverbes 3:5" },
    { text: "L'Éternel est mon berger: je ne manquerai de rien.", ref: "Psaume 23:1" },
    { text: "Si Dieu est pour nous, qui sera contre nous?", ref: "Romains 8:31" },
    { text: "Mais ceux qui se confient en l'Éternel renouvellent leur force. Ils prennent le vol comme les aigles.", ref: "Ésaïe 40:31" }
];

const moodEmojis = ["😫", "😕", "😐", "🙂", "🤩"];
const moodLabels = ["Épuisé", "Bof", "Neutre", "Bien", "Inarrêtable"];

const iconMap = {
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`,
    fitness: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18h12M12 18V6M6 6h12"></path></svg>`,
    food: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2"></path><path d="M10 22V10"></path><path d="M2 10h16"></path><path d="M14 22V10"></path></svg>`,
    cutlery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2v15"></path><path d="M22 2v15a4 4 0 0 1-8 0V2"></path><path d="M2 2v20"></path><path d="M2 4h5"></path><path d="M5 2v20"></path></svg>`,
    sleep: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    zen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>`,
    water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`
};

// Initialize Date
const updateDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const today = new Date();
    currentDateElement.textContent = today.toLocaleDateString('fr-FR', options);
};

// Get last 7 days
const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            fullDate: d.toISOString().split('T')[0],
            shortName: d.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0).toUpperCase()
        });
    }
    return days;
};

// Render Habits
const renderHabits = () => {
    habitListElement.innerHTML = '';
    const last7Days = getLast7Days();
    const today = new Date().toISOString().split('T')[0];

    habits.forEach(habit => {
        const habitCard = document.createElement('div');
        habitCard.className = 'habit-card';

        const historyValues = Object.values(habit.history);
        const completedCount = historyValues.filter(v => v > 0).length;
        const totalValue = historyValues.reduce((a, b) => a + b, 0);

        const currentStreak = calculateCurrentStreak(habit.history);
        const streakHtml = currentStreak > 0 ? `
            <div class="streak-mini-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                <span>${currentStreak}</span>
            </div>
        ` : '';

        let goalProgress = "";
        if (habit.goal) {
            let currentVal = 0;
            if (habit.frequency === 'daily') currentVal = habit.history[today] || 0;
            else if (habit.frequency === 'weekly') {
                const l7 = last7Days.map(d => d.fullDate);
                currentVal = l7.reduce((acc, d) => acc + (habit.history[d] || 0), 0);
            } else if (habit.frequency === 'monthly') {
                const thisMonth = new Date().toISOString().slice(0, 7);
                currentVal = Object.keys(habit.history).filter(d => d.startsWith(thisMonth)).reduce((acc, d) => acc + habit.history[d], 0);
            }
            goalProgress = `<span class="goal-badge">${currentVal}/${habit.goal}${habit.unit || ''}</span>`;
        }

        habitCard.innerHTML = `
            <div class="habit-info">
                <div class="habit-icon-badge">${iconMap[habit.icon] || ''}</div>
                <div style="flex: 1;">
                    <span class="habit-name">${habit.name} ${goalProgress}</span>
                    <div class="habit-stats">${completedCount} jours • Total: ${totalValue}${habit.unit || ''}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem;">
                    ${streakHtml}
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-edit" onclick="openEditModal('${habit.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-delete" onclick="deleteHabit('${habit.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="day-bubbles">
                ${last7Days.map(day => {
                    const value = habit.history[day.fullDate] || 0;
                    return `
                        <div class="day-bubble ${value > 0 ? 'completed' : ''}" 
                             onclick="toggleHabit('${habit.id}', '${day.fullDate}')"
                             oncontextmenu="manualInput(event, '${habit.id}', '${day.fullDate}')">
                            <span class="bubble-text">${habit.unit && value > 0 ? value : day.shortName}</span>
                            <span class="day-label">${day.shortName}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        habitListElement.appendChild(habitCard);
    });
};

// Actions
window.toggleHabit = (habitId, date) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const step = parseFloat(habit.step) || 1;

    if (!habit.history[date]) {
        habit.history[date] = step;
    } else {
        if (habit.unit) {
            habit.history[date] += step;
        } else {
            habit.history[date] = 0;
        }
    }

    saveAndRender();
};

window.manualInput = (event, habitId, date) => {
    event.preventDefault();
    const habit = habits.find(h => h.id === habitId);
    if (!habit || !habit.unit) return;

    const current = habit.history[date] || 0;
    const val = prompt(`Valeur pour ${habit.name} (${habit.unit}) :`, current);
    
    if (val !== null) {
        habit.history[date] = parseFloat(val) || 0;
        saveAndRender();
    }
};

window.deleteHabit = (habitId) => {
    if (confirm('Supprimer cette habitude ?')) {
        habits = habits.filter(h => h.id !== habitId);
        saveAndRender();
    }
};

window.openEditModal = (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    editingHabitId = habitId;
    document.querySelector('.modal h2').textContent = "Modifier l'habitude";
    habitInput.value = habit.name;
    document.getElementById('habit-unit').value = habit.unit || '';
    document.getElementById('habit-step').value = habit.step || '1';
    document.getElementById('habit-goal').value = habit.goal || '';
    document.getElementById('habit-frequency').value = habit.frequency || 'daily';
    
    // Select icon
    document.querySelectorAll('.icon-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.icon === habit.icon);
    });

    openModal();
};

const saveHabit = () => {
    const name = habitInput.value.trim();
    const unit = document.getElementById('habit-unit').value.trim();
    const step = document.getElementById('habit-step').value.trim();
    const goal = document.getElementById('habit-goal').value.trim();
    const freq = document.getElementById('habit-frequency').value;
    const selectedIcon = document.querySelector('.icon-option.selected')?.dataset.icon || 'book';
    
    if (!name) return;

    if (editingHabitId) {
        const habit = habits.find(h => h.id === editingHabitId);
        if (habit) {
            habit.name = name;
            habit.unit = unit || null;
            habit.step = step || 1;
            habit.goal = goal || null;
            habit.frequency = freq;
            habit.icon = selectedIcon;
        }
    } else {
        const newHabit = {
            id: Date.now().toString(),
            name: name,
            unit: unit || null,
            step: step || 1,
            goal: goal || null,
            frequency: freq || 'daily',
            icon: selectedIcon,
            history: {}
        };
        habits.push(newHabit);
    }

    resetModal();
    closeModal();
    saveAndRender();
};

const resetModal = () => {
    editingHabitId = null;
    document.querySelector('.modal h2').textContent = "Nouvelle habitude";
    habitInput.value = '';
    document.getElementById('habit-unit').value = '';
    document.getElementById('habit-step').value = '1';
    document.getElementById('habit-goal').value = '';
    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.icon-option[data-icon="book"]').classList.add('selected');
};

const saveAndRender = async () => {
    localStorage.setItem('habits', JSON.stringify(habits));
    await saveToDB(habits); // Robust backup in IndexedDB
    renderHabits();
};

// UI Handlers
const openModal = () => {
    modalOverlay.style.display = 'flex';
    setTimeout(() => {
        document.getElementById('modal').classList.add('active');
        habitInput.focus();
    }, 10);
};

const closeModal = () => {
    document.getElementById('modal').classList.remove('active');
    setTimeout(() => {
        modalOverlay.style.display = 'none';
    }, 300);
};

// Backup Logic
const exportHabits = () => {
    const dataStr = JSON.stringify(habits, null, 4);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `habitudes_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
};

const importHabits = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedHabits = JSON.parse(e.target.result);
            if (Array.isArray(importedHabits)) {
                habits = importedHabits;
                saveAndRender();
                alert('Données restaurées avec succès !');
            }
        } catch (err) {
            alert('Erreur lors de la lecture du fichier.');
        }
    };
    reader.readAsText(file);
};

// Events
addHabitBtn.addEventListener('click', openModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
saveHabitBtn.addEventListener('click', saveHabit);
habitInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveHabit();
});

document.getElementById('icon-picker').addEventListener('click', (e) => {
    const option = e.target.closest('.icon-option');
    if (option) {
        document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
    }
});

const habitView = document.getElementById('habit-list');
const statsView = document.getElementById('stats-view');

document.getElementById('nav-habits').addEventListener('click', (e) => {
    e.preventDefault();
    setActiveNav('nav-habits');
    habitView.style.display = 'flex';
    statsView.style.display = 'none';
    addHabitBtn.style.display = 'flex';
});

document.getElementById('nav-tracking').addEventListener('click', (e) => {
    e.preventDefault();
    setActiveNav('nav-tracking');
    habitView.style.display = 'none';
    statsView.style.display = 'block';
    addHabitBtn.style.display = 'none';
    renderStats();
});

const calculateStreak = (history) => {
    if (!history) return 0;
    const dates = Object.keys(history).filter(d => history[d] > 0).sort().reverse();
    if (dates.length === 0) return 0;
    
    let currentStreak = 0;
    let today = new Date();
    today.setHours(0,0,0,0);
    
    let checkDate = new Date(today);

    // If not completed today, check yesterday
    if (dates[0] !== checkDate.toISOString().split('T')[0]) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (history[dateStr] > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return currentStreak;
};

const generateChart = (last7Days) => {
    const dailyData = last7Days.map(day => {
        return habits.reduce((acc, habit) => acc + (habit.history[day] || 0), 0);
    });

    const maxVal = Math.max(...dailyData, 1);
    const height = 100;
    const width = 100;
    const padding = 10;
    
    const points = dailyData.map((val, i) => {
        const x = (i / (dailyData.length - 1)) * width;
        const y = height - ((val / maxVal) * (height - padding * 2) + padding);
        return `${x},${y}`;
    }).join(' ');

    const circles = dailyData.map((val, i) => {
        const x = (i / (dailyData.length - 1)) * width;
        const y = height - ((val / maxVal) * (height - padding * 2) + padding);
        return `<circle class="chart-point" cx="${x}" cy="${y}" r="2" />`;
    }).join('');

    return `
        <div class="chart-container">
            <div style="font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; opacity: 0.5; text-transform: uppercase;">Activité Globale (7j)</div>
            <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
                <polyline class="chart-line" points="${points}" />
                ${circles}
            </svg>
            <div class="chart-labels">
                ${last7Days.map(day => {
                    const d = new Date(day);
                    return `<span class="chart-label">${d.toLocaleDateString('fr-FR', { weekday: 'short' }).charAt(0)}</span>`;
                }).join('')}
            </div>
        </div>
    `;
};

const renderStats = () => {
    const statsContent = document.getElementById('global-stats-content');
    const totalHabits = habits.length;
    if (totalHabits === 0) {
        statsContent.innerHTML = '<p style="text-align:center; padding: 2rem; opacity: 0.5;">Aucune donnée à analyser.</p>';
        return;
    }

    const last7DaysData = getLast7Days();
    const last7DaysStrings = last7DaysData.map(d => d.fullDate);
    let totalWeeklyCompletions = 0;
    
    const habitStatsHTML = habits.map(habit => {
        const weeklyCompletions = last7DaysStrings.filter(d => habit.history[d] > 0).length;
        const weeklyRate = Math.round((weeklyCompletions / 7) * 100);
        const streak = calculateStreak(habit.history);
        totalWeeklyCompletions += weeklyCompletions;

        return `
            <div class="habit-stat-item">
                <div class="habit-stat-header">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <div class="habit-icon-badge" style="width: 32px; height: 32px; border-radius: 10px;">
                            <div style="transform: scale(0.7); display: flex;">${iconMap[habit.icon] || ''}</div>
                        </div>
                        <span style="font-weight: 600;">${habit.name}</span>
                    </div>
                    <span class="streak-badge">🔥 ${streak}j</span>
                </div>
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${weeklyRate}%"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--fg-muted); margin-top: 0.5rem;">
                    ${weeklyRate}% cette semaine
                </div>
            </div>
        `;
    }).join('');

    const globalWeeklyRate = Math.round((totalWeeklyCompletions / (totalHabits * 7)) * 100);

    const challengesHTML = habits.filter(h => h.goal).map(habit => {
        const today = new Date().toISOString().split('T')[0];
        let currentVal = 0;
        let label = "";
        if (habit.frequency === 'daily') {
            currentVal = habit.history[today] || 0;
            label = "Aujourd'hui";
        } else if (habit.frequency === 'weekly') {
            const last7Days = getLast7Days().map(d => d.fullDate);
            currentVal = last7Days.reduce((acc, d) => acc + (habit.history[d] || 0), 0);
            label = "Cette semaine";
        } else if (habit.frequency === 'monthly') {
            const thisMonth = new Date().toISOString().slice(0, 7);
            currentVal = Object.keys(habit.history)
                .filter(d => d.startsWith(thisMonth))
                .reduce((acc, d) => acc + habit.history[d], 0);
            label = "Ce mois";
        }
        const percent = Math.min(Math.round((currentVal / habit.goal) * 100), 100);
        return `
            <div class="habit-stat-item">
                <div class="habit-stat-header">
                    <span style="font-weight: 600;">Challenge: ${habit.name}</span>
                    <span style="font-size: 0.8rem; opacity: 0.6;">${label}</span>
                </div>
                <div class="progress-container" style="height: 12px;">
                    <div class="progress-bar" style="width: ${percent}%; background: ${percent >= 100 ? '#00c853' : 'var(--fg)'}"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-top: 0.5rem;">
                    <span>${currentVal} / ${habit.goal} ${habit.unit || ''}</span>
                    <span>${percent}%</span>
                </div>
            </div>
        `;
    }).join('');

    statsContent.innerHTML = `
        ${generateChart(last7DaysStrings)}

        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-value">${globalWeeklyRate}%</div>
                <div class="stat-label">Succès Hebdo</div>
            </div>
            <div class="stat-box">
                <div class="stat-value">${habits.length}</div>
                <div class="stat-label">Habitudes</div>
            </div>
        </div>
        
        <h3 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; margin: 2rem 0 1rem;">Défis Actuels</h3>
        ${challengesHTML || '<p style="text-align:center; padding: 1rem; opacity: 0.5; font-size: 0.9rem;">Aucun objectif défini.</p>'}

        <h3 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; margin: 2rem 0 1rem;">Détails par habitude</h3>
        ${habitStatsHTML}

        <div style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.05);">
            <button class="btn-secondary" style="width: 100%;" onclick="document.getElementById('import-input').click()">Importer une sauvegarde</button>
        </div>
    `;
};

document.getElementById('nav-export').addEventListener('click', (e) => {
    e.preventDefault();
    exportHabits();
});

const setActiveNav = (id) => {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.getElementById(id);
    activeItem.classList.add('active');

    // Move indicator
    const indicator = document.getElementById('nav-indicator');
    const items = Array.from(document.querySelectorAll('.nav-item'));
    const index = items.indexOf(activeItem);
    const itemWidth = (document.querySelector('.bottom-nav').offsetWidth - 20) / items.length;
    
    indicator.style.transform = `translateY(-50%) translateX(${index * itemWidth}px)`;
};

document.getElementById('import-input').addEventListener('change', importHabits);

// Sleep Tracker Logic
const checkSleepPrompt = () => {
    const sleepPrompt = document.getElementById('sleep-prompt');
    const bedtime = localStorage.getItem('bedtime');
    const now = new Date();
    const hour = now.getHours();

    // Ensure "Sommeil" habit exists
    if (!habits.find(h => h.name.toLowerCase() === 'sommeil')) {
        const sleepHabit = {
            id: 'sleep-habit-id',
            name: 'Sommeil',
            unit: 'h',
            step: 1,
            goal: 8,
            frequency: 'daily',
            icon: 'sleep',
            history: {}
        };
        habits.push(sleepHabit);
        saveAndRender();
    }

    if (!bedtime) {
        // Evening mode: Propose bedtime
        if (hour >= 21 || hour <= 4) {
            sleepPrompt.style.display = 'flex';
            sleepPrompt.innerHTML = `
                <p>Prêt pour une bonne nuit ? 🌙</p>
                <div class="sleep-actions">
                    <button class="btn-sleep" onclick="handleSleepAction('bedtime')">Je vais au lit maintenant</button>
                </div>
            `;
        } else {
            sleepPrompt.style.display = 'none';
        }
    } else {
        // Morning mode: Propose wake up
        sleepPrompt.style.display = 'flex';
        sleepPrompt.innerHTML = `
            <p>Bonjour ! Bien dormi ? ☀️</p>
            <div class="sleep-actions">
                <button class="btn-sleep" onclick="handleSleepAction('wakeup-now')">À l'instant</button>
                <button class="btn-sleep" onclick="handleSleepAction('wakeup-select')">Choisir l'heure</button>
            </div>
        `;
    }
};

window.handleSleepAction = (type) => {
    const now = new Date();
    if (type === 'bedtime') {
        localStorage.setItem('bedtime', now.getTime());
        checkSleepPrompt();
    } else if (type.startsWith('wakeup')) {
        const bedtime = localStorage.getItem('bedtime');
        let wakeTime = now.getTime();

        if (type === 'wakeup-select') {
            const val = prompt("À quelle heure vous êtes-vous réveillé ? (ex: 07:30)");
            if (!val) return;
            const [h, m] = val.split(':');
            const d = new Date();
            d.setHours(parseInt(h) || 0, parseInt(m) || 0, 0);
            wakeTime = d.getTime();
        }

        const durationHours = Math.round(((wakeTime - bedtime) / 3600000) * 10) / 10;
        
        if (durationHours > 0) {
            const sleepHabit = habits.find(h => h.name.toLowerCase() === 'sommeil');
            const today = new Date().toISOString().split('T')[0];
            sleepHabit.history[today] = durationHours;
            saveAndRender();
            alert(`Bien noté ! ${durationHours}h de sommeil enregistrées.`);
        }

        localStorage.removeItem('bedtime');
        checkSleepPrompt();
    }
};

// Morning Ritual Logic
const fetchWeather = async () => {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=45.76&longitude=4.83&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin');
        const data = await response.json();
        
        const temp = Math.round(data.current_weather.temperature);
        const min = Math.round(data.daily.temperature_2m_min[0]);
        const max = Math.round(data.daily.temperature_2m_max[0]);

        document.querySelector('.weather-temp').textContent = `${temp}°`;
        document.querySelector('.weather-details').textContent = `Lyon • Min: ${min}° | Max: ${max}°`;
    } catch (err) {
        document.querySelector('.weather-details').textContent = "Météo indisponible";
    }
};

const checkDailyRitual = () => {
    const now = new Date();
    const hour = now.getHours();
    
    let mode = null;
    const urlParams = new URLSearchParams(window.location.search);
    const testParam = urlParams.get('test');

    // Morning window: 5h to 10h
    if (testParam === 'morning' || (hour >= 5 && hour < 10 && !testParam)) {
        mode = 'morning';
    } else if (testParam === 'evening' || (hour >= 19 && !testParam)) {
        mode = 'evening';
    }

    if (mode) {
        const todayStr = now.toISOString().split('T')[0];
        const lastRitual = localStorage.getItem(`last_ritual_${mode}_${todayStr}`);

        // Check for Recaps first on ritual days
        const dayOfWeek = now.getDay();
        const dayOfMonth = now.getDate();
        
        let recapType = null;
        if (dayOfMonth === 1 && !localStorage.getItem(`recap_monthly_${todayStr}`)) {
            recapType = 'monthly';
        } else if (dayOfWeek === 0 && !localStorage.getItem(`recap_weekly_${todayStr}`)) {
            recapType = 'weekly';
        }

        if (recapType || testParam === 'recap') {
            showRecap(recapType || 'weekly');
        } else if (!lastRitual || testParam) {
            showRegularRitual(mode);
        }
    }
};

window.updateMoodUI = (val) => {
    const slider = document.getElementById('mood-slider');
    if (slider) {
        const percent = (val / 4) * 100;
        slider.style.setProperty('--progress', `${percent}%`);
    }
    
    const roundedVal = Math.round(val);
    const emojiEl = document.getElementById('mood-emoji');
    const labelEl = document.getElementById('mood-label');
    
    if (emojiEl && emojiEl.textContent !== moodEmojis[roundedVal]) {
        emojiEl.style.transform = 'scale(0.5) rotate(-10deg)';
        setTimeout(() => {
            emojiEl.textContent = moodEmojis[roundedVal];
            emojiEl.style.transform = `scale(1.2) rotate(${(roundedVal - 2) * 5}deg)`;
            setTimeout(() => {
                emojiEl.style.transform = `scale(1) rotate(${(roundedVal - 2) * 5}deg)`;
            }, 150);
        }, 50);
    }
    if (labelEl) labelEl.textContent = moodLabels[roundedVal];
};

const showRegularRitual = async (mode) => {
    const ritualOverlay = document.getElementById('morning-ritual');
    const container = document.getElementById('ritual-slides');
    const dayOfWeek = new Date().getDay();
    const verse = bibleVerses[dayOfWeek % bibleVerses.length];
    
    const moodHtml = `
        <div class="mood-tracker" style="margin: 1.5rem 0; padding: 1rem; background: rgba(var(--fg-rgb), 0.02); border-radius: 16px; border: 1px solid rgba(var(--fg-rgb), 0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem;">
                <span style="font-size: 0.6rem; letter-spacing: 0.15em; opacity: 0.4; font-weight: 700;">MOOD</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span id="mood-label" style="font-size: 0.75rem; font-weight: 700; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em;">Neutre</span>
                    <span id="mood-emoji" style="font-size: 1.5rem; transition: transform 0.3s ease;">😐</span>
                </div>
            </div>
            <input type="range" id="mood-slider" min="0" max="4" step="0.01" value="2" 
                style="width: 100%; height: 4px; -webkit-appearance: none; background: rgba(var(--fg-rgb), 0.08); border-radius: 2px; outline: none;"
                oninput="updateMoodUI(this.value)">
        </div>
    `;

    let content = "";
    if (mode === 'morning') {
        content = `
            <div class="ritual-slide active">
                <p class="ritual-greeting" style="margin-bottom: 0.5rem;">Bonjour Aaron,</p>
                <h2 class="ritual-message" style="font-size: 1.4rem; line-height: 1.3;">Par la grâce de Dieu, tu t'es réveillé.</h2>
                
                <div class="bible-verse" style="margin: 1.5rem 0; padding: 1rem; border-left: 1px solid var(--fg); text-align: left;">
                    <p style="font-style: italic; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.5rem; opacity: 0.8;">"${verse.text}"</p>
                    <p style="font-weight: 700; font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.3;">— ${verse.ref}</p>
                </div>

                ${moodHtml}

                <div id="weather-widget" class="weather-widget" style="margin-bottom: 1.5rem; opacity: 0.6;">
                    <div class="weather-temp" style="font-size: 1.1rem; font-weight: 600;"></div>
                    <div class="weather-details" style="font-size: 0.65rem; letter-spacing: 0.05em;"></div>
                </div>

                <div class="ritual-actions">
                    <a href="spotify:" class="btn-vip btn-spotify-vip">
                        <svg viewBox="0 0 24 24" fill="#1DB954" width="18" height="18"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.508 17.302c-.216.354-.672.464-1.026.248-2.846-1.74-6.428-2.13-10.648-1.168-.404.093-.81-.16-.902-.562-.092-.403.16-.81.562-.902 4.62-1.056 8.584-.614 11.766 1.332.354.216.464.672.248 1.052zm1.467-3.258c-.27.439-.843.582-1.282.312-3.259-2.002-8.225-2.584-12.078-1.413-.493.15-.1.85-.343.85-.493-.15-.85-.1.85-.343 4.408-1.338 9.888-.684 13.611 1.604.439.27.582.843.312 1.282zm.127-3.413c-3.907-2.321-10.347-2.535-14.114-1.391-.6.182-1.242-.163-1.424-.763-.182-.6.163-1.242.763-1.424 4.318-1.311 11.442-1.057 15.946 1.619.539.32.716 1.018.396 1.557-.319.539-1.018.717-1.557.396z"/></svg>
                        <span>OUVRIR SPOTIFY</span>
                    </a>
                    <button class="btn-vip" onclick="dismissRitual()">TRACKER MES HABITUDES</button>
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="ritual-slide active">
                <p class="ritual-greeting" style="margin-bottom: 0.5rem;">Bonsoir Aaron,</p>
                <h2 class="ritual-message" style="font-size: 1.4rem; line-height: 1.3;">La journée touche à sa fin. Fais le point sur tes habitudes.</h2>
                ${moodHtml}
                <div class="ritual-actions" style="margin-top:1.5rem">
                    <button class="btn-vip" onclick="dismissRitual()">TRACKER MES HABITUDES</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = content;
    ritualOverlay.style.display = 'flex';
    setTimeout(() => ritualOverlay.style.opacity = '1', 50);
    if (mode === 'morning') fetchWeather();
};

let currentRecapSlides = [];
let currentSlideIndex = 0;

window.showRecap = (type) => {
    const ritualOverlay = document.getElementById('morning-ritual');
    if (!ritualOverlay) return;
    
    const stats = calculateRecapStats(type);
    currentRecapSlides = [
        {
            title: `Bilan de ${type === 'weekly' ? 'ta semaine' : 'ton mois'}`,
            content: `Prêt pour une rétrospective, Aaron ?<br>Voyons comment tu as progressé.`,
            action: "C'est parti"
        },
        {
            label: "Volume d'activité",
            number: stats.total,
            content: `Habit${stats.total > 1 ? 's' : ''} complétée${stats.total > 1 ? 's' : ''}.<br>Ton assiduité est la clé de ta transformation.`,
            action: "Continuer"
        },
        {
            label: "Plus longue série",
            number: `${stats.maxStreak}j`,
            content: `C'est ton record de discipline sur cette période.<br>La régularité bat l'intensité.`,
            action: "Impressionnant"
        },
        {
            label: "Jour le plus fort",
            number: stats.bestDay,
            content: `C'est le jour où tu es le plus inarrêtable.<br>À l'inverse, le ${stats.worstDay} est plus difficile.`,
            action: "Analyse"
        },
        {
            label: "Conseil Coaching",
            content: stats.advice,
            action: "Finalement"
        },
        {
            title: "Cap sur la suite",
            content: `
                <div class="bible-verse" style="margin-top: 1rem; padding: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">
                    <p style="font-style: italic; font-size: 1rem; margin-bottom: 0.5rem;">"${bibleVerses[Math.floor(Math.random() * bibleVerses.length)].text}"</p>
                    <p style="font-weight: 700; font-size: 0.75rem; opacity: 0.5;">— Bible S21</p>
                </div>
            `,
            action: "Terminer le bilan"
        }
    ];

    currentSlideIndex = 0;
    renderRecapSlide();
    
    ritualOverlay.style.display = 'flex';
    setTimeout(() => {
        ritualOverlay.style.opacity = '1';
    }, 10);
};

const calculateRecapStats = (type) => {
    const total = habits.reduce((acc, h) => acc + Object.keys(h.history).length, 0);
    
    // Day performance
    const dayCounts = [0,0,0,0,0,0,0]; // Sun-Sat
    habits.forEach(h => {
        Object.keys(h.history).forEach(date => {
            const d = new Date(date).getDay();
            dayCounts[d]++;
        });
    });

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const worstDayIdx = dayCounts.indexOf(Math.min(...dayCounts));

    // Simple Max Streak
    let maxStreak = 0;
    habits.forEach(h => {
        const history = Object.keys(h.history).sort();
        maxStreak = Math.max(maxStreak, history.length); 
    });

    let advice = "";
    if (total > 20) advice = "Tu as un excellent rythme. Pour le mois prochain, essaie d'augmenter tes objectifs de 10%.";
    else advice = "La clé est de ne jamais manquer deux jours de suite. Concentre-toi sur tes 2 habitudes piliers.";

    return {
        total,
        bestDay: dayNames[bestDayIdx],
        worstDay: dayNames[worstDayIdx].toLowerCase(),
        maxStreak,
        advice
    };
};

const renderRecapSlide = () => {
    const container = document.getElementById('ritual-slides');
    if (!container) return;

    const slide = currentRecapSlides[currentSlideIndex];
    if (!slide) return;

    const dots = currentRecapSlides.map((_, i) => 
        `<div class="slide-dot ${i === currentSlideIndex ? 'active' : ''}"></div>`
    ).join('');

    container.innerHTML = `
        <div class="ritual-slide active">
            <div class="recap-card">
                ${slide.label ? `<p class="recap-label">${slide.label}</p>` : ''}
                ${slide.title ? `<h2 class="ritual-message" style="margin-bottom: 1rem;">${slide.title}</h2>` : ''}
                ${slide.number ? `<div class="recap-number">${slide.number}</div>` : ''}
                <p class="ritual-message" style="font-size: 1.15rem; opacity: 0.8; line-height: 1.5;">${slide.content}</p>
            </div>
            <div class="ritual-actions" style="margin-top: 2rem;">
                <button class="btn-primary" onclick="nextRecapSlide()">${slide.action}</button>
            </div>
            <div class="slide-dots">${dots}</div>
        </div>
    `;
};

window.nextRecapSlide = () => {
    currentSlideIndex++;
    if (currentSlideIndex < currentRecapSlides.length) {
        renderRecapSlide();
    } else {
        // Final action: check if it's a weekly recap for auto-export
        const overlay = document.getElementById('morning-ritual');
        const title = overlay.querySelector('h2')?.textContent || "";
        if (title.toLowerCase().includes('semaine') || title.toLowerCase().includes('weekly')) {
            console.log("📦 Auto-exporting weekly backup...");
            exportHabits();
        }
        dismissRitual();
    }
};

window.testRecap = (type) => {
    showRecap(type);
};

window.dismissRitual = () => {
    const ritualOverlay = document.getElementById('morning-ritual');
    const greetingEl = document.querySelector('.ritual-greeting');
    const greetingText = greetingEl ? greetingEl.textContent : "";
    
    const mode = greetingText.includes('Bonjour') ? 'morning' : 'evening';
    const today = new Date().toISOString().split('T')[0];

    const moodValue = document.getElementById('mood-slider')?.value;
    if (moodValue !== undefined) {
        const moodHistory = JSON.parse(localStorage.getItem('mood_history')) || {};
        moodHistory[`${today}_${mode}`] = {
            value: moodValue,
            emoji: moodEmojis[moodValue],
            label: moodLabels[moodValue],
            time: new Date().getTime()
        };
        localStorage.setItem('mood_history', JSON.stringify(moodHistory));
    }

    ritualOverlay.style.opacity = '0';
    setTimeout(() => {
        ritualOverlay.style.display = 'none';
        localStorage.setItem(`last_ritual_${mode}_${today}`, 'true');
    }, 500);
};

window.generateTestData = () => {
    const today = new Date();
    const testHabits = [
        { id: '1', name: 'Lecture', icon: 'book', goal: 30, unit: 'm', frequency: 'daily', history: {} },
        { id: '2', name: 'Sport', icon: 'fitness', goal: 45, unit: 'm', frequency: 'daily', history: {} },
        { id: '3', name: 'Méditation', icon: 'zen', goal: 10, unit: 'm', frequency: 'daily', history: {} },
        { id: '4', name: 'Hydratation', icon: 'water', goal: 2, unit: 'L', frequency: 'daily', history: {} },
        { id: '5', name: 'Code', icon: 'code', goal: 2, unit: 'h', frequency: 'daily', history: {} },
        { id: 'sleep-habit-id', name: 'Sommeil', icon: 'sleep', goal: 8, unit: 'h', frequency: 'daily', history: {} }
    ];

    testHabits.forEach(habit => {
        // Generate history for the last 14 days
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            // Randomly fill history but keep streaks active for the last few days
            if (i < 8 || Math.random() > 0.3) {
                habit.history[dateStr] = habit.goal || 1;
            }
        }
    });

    habits = testHabits;
    saveAndRender();
    console.log("✅ Données de test générées avec succès !");
};

// Init
const startApp = async () => {
    updateDate();
    
    // Load from IndexedDB or fallback to LocalStorage
    const dbData = await loadFromDB();
    if (dbData && dbData.length > 0) {
        habits = dbData;
    } else {
        habits = JSON.parse(localStorage.getItem('habits')) || [];
        if (habits.length > 0) await saveToDB(habits); // Migrate
    }
    
    renderHabits();
    checkSleepPrompt();
    checkDailyRitual();

    // iOS PWA Navigation Fix
    if (window.navigator.standalone) {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.getAttribute('href') && !link.getAttribute('href').startsWith('http') && !link.getAttribute('href').startsWith('spotify')) {
                e.preventDefault();
                window.location.href = link.getAttribute('href');
            }
        }, false);
    }

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('🚀 Service Worker Ready'))
                .catch(err => console.log('❌ SW Registration Failed', err));
        });
    }
};

startApp();
