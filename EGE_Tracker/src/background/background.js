let timerInterval = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    totalSeconds: 0,
    isStudying: false,
    useAutoTimer: true,
    autoSites: ['sdamgia.ru', 'fipi.ru', 'umsch.com'],
    closeTabsOnStop: true,
    ignoredTabIds: [],
    lastStudyDate: new Date().toLocaleDateString('ru-RU'),
    streakDays: 0,
    isCurrentlyRunning: false
  });
  startTimerLoop();
});

chrome.runtime.onStartup.addListener(() => startTimerLoop());

function checkActiveState() {
  chrome.storage.local.get(['isStudying', 'autoSites', 'ignoredTabIds', 'useAutoTimer'], (data) => {
    let isStudyingManually = data.isStudying || false;
    let autoSites = data.autoSites || [];
    let ignoredTabIds = data.ignoredTabIds || [];
    let useAutoTimer = data.useAutoTimer !== false;

    chrome.tabs.query({}, (tabs) => {
      let activeStudyTabs = tabs.filter(tab => {
        if (!useAutoTimer || !tab.url) return false;
        let isSiteMatch = autoSites.some(site => tab.url.toLowerCase().includes(site.toLowerCase().trim()));
        let isNotIgnored = !ignoredTabIds.includes(tab.id);
        return isSiteMatch && isNotIgnored;
      });

      let isRunning = isStudyingManually || activeStudyTabs.length > 0;
      chrome.storage.local.set({ isCurrentlyRunning: isRunning });
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => checkActiveState());
chrome.tabs.onActivated.addListener(() => checkActiveState());
chrome.tabs.onRemoved.addListener(() => checkActiveState());

function startTimerLoop() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    chrome.storage.local.get(['isCurrentlyRunning', 'totalSeconds', 'lastStudyDate', 'streakDays'], (data) => {
      
      let today = new Date();
      let todayStr = today.toLocaleDateString('ru-RU');
      let currentStreak = data.streakDays || 0;
      let lastDate = data.lastStudyDate;

      // 1. АВТОМАТИЧЕСКАЯ ПРОВЕРКА НА ПРОПУСК (РАБОТАЕТ ВСЕГДА)
      if (lastDate && lastDate !== todayStr) {
        let parts = lastDate.split('.');
        let lDateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        let todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        let diffDays = Math.floor((todayDateOnly - lDateObj) / (1000 * 60 * 60 * 24));

        if ((diffDays > 1 || diffDays < 0) && currentStreak !== 0) {
          currentStreak = 0;
          chrome.storage.local.set({ streakDays: 0 });
        }
      }

      // 2. ЛОГИКА, КОГДА ТАЙМЕР ЗАПУЩЕН
      if (data.isCurrentlyRunning) {
        let totalSeconds = (data.totalSeconds || 0) + 1;
        chrome.storage.local.set({ totalSeconds: totalSeconds });
        
        if (lastDate !== todayStr) {
          let parts = lastDate ? lastDate.split('.') : null;
          
          if (parts) {
            let lDateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            let todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            let diffDays = Math.floor((todayDateOnly - lDateObj) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
          } else {
            currentStreak = 1; 
          }
          
          chrome.storage.local.set({ 
            lastStudyDate: todayStr,
            streakDays: currentStreak
          });
        }
      }
    });
    
    checkActiveState();
  }, 1000);
}

startTimerLoop();