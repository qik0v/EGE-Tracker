document.addEventListener('DOMContentLoaded', () => {
  const timeStudiedEl = document.getElementById('timeStudied');
  const streakDaysEl = document.getElementById('streakDays');
  const lastSessionEl = document.getElementById('lastSession');
  const startBtn = document.getElementById('startBtn');
  const btnText = document.getElementById('btnText');
  const btnIcon = document.getElementById('btnIcon'); 
  
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const saveSitesBtn = document.getElementById('saveSitesBtn');
  
  const manualTimeInput = document.getElementById('manualTime');
  const manualStreakInput = document.getElementById('manualStreak');
  const autoSitesInput = document.getElementById('autoSites');
  const closeTabsToggle = document.getElementById('closeTabsToggle');
  const useAutoTimerToggle = document.getElementById('useAutoTimerToggle');

  function updateTimerUI() {
    chrome.storage.local.get(['totalSeconds', 'streakDays', 'lastStudyDate', 'isCurrentlyRunning'], (data) => {
      timeStudiedEl.textContent = ((data.totalSeconds || 0) / 3600).toFixed(1);
      streakDaysEl.textContent = data.streakDays || 0;
      
      let today = new Date().toLocaleDateString('ru-RU');
      lastSessionEl.textContent = (data.lastStudyDate === today) ? "Сегодня" : (data.lastStudyDate || "Никогда");

      if (data.isCurrentlyRunning) {
        startBtn.classList.add('active');
        btnText.textContent = "ОСТАНОВИТЬ";
        btnIcon.src = "../../assets/icons/cross.png";  
      } else {
        startBtn.classList.remove('active');
        btnText.textContent = "НАЧАТЬ ОБУЧЕНИЕ";
        btnIcon.src = "../../assets/icons/play.png";   
      }
    });
  }

  function loadSettingsInputs() {
    chrome.storage.local.get(['autoSites', 'closeTabsOnStop', 'useAutoTimer'], (data) => {
      autoSitesInput.value = (data.autoSites || []).join(', ');
      closeTabsToggle.checked = data.closeTabsOnStop !== false;
      useAutoTimerToggle.checked = data.useAutoTimer !== false;
    });
  }

  updateTimerUI();
  loadSettingsInputs();
  setInterval(updateTimerUI, 1000); 

  startBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isCurrentlyRunning', 'autoSites', 'closeTabsOnStop', 'ignoredTabIds'], (data) => {
      
      if (data.isCurrentlyRunning) {
        chrome.tabs.query({}, (tabs) => {
          let studyTabs = tabs.filter(t => t.url && data.autoSites.some(s => t.url.toLowerCase().includes(s.toLowerCase())));
          
          if (data.closeTabsOnStop) {
            let tabIdsToClose = studyTabs.map(t => t.id);
            if (tabIdsToClose.length > 0) chrome.tabs.remove(tabIdsToClose);
          } else {
            let newIgnored = [...(data.ignoredTabIds || []), ...studyTabs.map(t => t.id)];
            chrome.storage.local.set({ ignoredTabIds: newIgnored });
          }
        });
        chrome.storage.local.set({ isStudying: false, isCurrentlyRunning: false });
      } else {
        chrome.storage.local.set({ isStudying: true, isCurrentlyRunning: true, ignoredTabIds: [] });
      }
      setTimeout(updateTimerUI, 100);
    });
  });

  settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

  saveSitesBtn.addEventListener('click', () => {
    let updateData = {};

    let hours = parseFloat(manualTimeInput.value);
    let streak = parseInt(manualStreakInput.value);
    
    if (!isNaN(hours)) updateData.totalSeconds = hours * 3600;
    if (!isNaN(streak)) updateData.streakDays = streak;

    let sites = autoSitesInput.value.split(',').map(s => s.trim()).filter(s => s);
    updateData.autoSites = sites;
    updateData.closeTabsOnStop = closeTabsToggle.checked;
    updateData.useAutoTimer = useAutoTimerToggle.checked;

    chrome.storage.local.set(updateData, () => {
      manualTimeInput.value = '';
      manualStreakInput.value = '';
      updateTimerUI(); 
      
      let originalText = saveSitesBtn.textContent;
      saveSitesBtn.textContent = "Сохранено!";
      setTimeout(() => {
        saveSitesBtn.textContent = originalText;
      }, 1500);
    });
  });
});