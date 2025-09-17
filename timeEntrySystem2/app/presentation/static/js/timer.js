// Timer-specific functionality for the Time Entry Management System
class Timer {
    constructor(timeTracker) {
        this.timeTracker = timeTracker;
        this.interval = null;
        this.startTime = null;
        this.isRunning = false;
        
        this.setupKeyboardShortcuts();
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to start timer
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.handleStartStop();
            }
            
            // Ctrl+T to stop timer
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                this.handleStartStop();
            }
            
            // Escape to clear timer description
            if (e.key === 'Escape' && document.activeElement.id === 'timer-description') {
                document.getElementById('timer-description').value = '';
            }
        });
    }
    
    handleStartStop() {
        if (this.timeTracker.runningTimer) {
            this.timeTracker.stopTimer();
        } else {
            this.timeTracker.startTimer();
        }
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Auto-fill description based on project selection
    setupAutoFill() {
        const projectSelect = document.getElementById('timer-project');
        const descriptionField = document.getElementById('timer-description');
        
        if (projectSelect && descriptionField) {
            projectSelect.addEventListener('change', () => {
                const selectedProjectId = projectSelect.value;
                if (selectedProjectId && !descriptionField.value) {
                    // Get recent entries for this project to suggest descriptions
                    this.suggestDescription(selectedProjectId);
                }
            });
        }
    }
    
    async suggestDescription(projectId) {
        try {
            const response = await fetch(`${this.timeTracker.apiBase}/time-entries?project_id=${projectId}&user_id=${this.timeTracker.userId}`);
            const data = await response.json();
            
            if (response.ok && data.entries.length > 0) {
                // Get the most recent description for this project
                const recentEntries = data.entries.filter(entry => entry.description);
                if (recentEntries.length > 0) {
                    const lastDescription = recentEntries[0].description;
                    
                    // Show suggestion tooltip or auto-fill
                    this.showDescriptionSuggestion(lastDescription);
                }
            }
        } catch (error) {
            console.error('Error getting description suggestions:', error);
        }
    }
    
    showDescriptionSuggestion(suggestion) {
        const descriptionField = document.getElementById('timer-description');
        if (descriptionField && !descriptionField.value) {
            descriptionField.placeholder = `e.g., ${suggestion}`;
            
            // Add click handler to use suggestion
            const useButton = document.createElement('button');
            useButton.className = 'btn btn-sm btn-outline-secondary mt-1';
            useButton.textContent = 'Use: ' + suggestion;
            useButton.onclick = () => {
                descriptionField.value = suggestion;
                useButton.remove();
            };
            
            descriptionField.parentNode.appendChild(useButton);
            
            // Remove suggestion after 10 seconds
            setTimeout(() => {
                if (useButton.parentNode) {
                    useButton.remove();
                }
            }, 10000);
        }
    }
    
    // Pomodoro timer functionality
    startPomodoro(duration = 25) {
        const minutes = duration * 60;
        let timeLeft = minutes;
        
        const pomodoroDisplay = document.createElement('div');
        pomodoroDisplay.className = 'pomodoro-timer position-fixed';
        pomodoroDisplay.style.cssText = 'top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999; background: rgba(220, 53, 69, 0.9); color: white; padding: 10px 20px; border-radius: 25px; font-weight: bold;';
        
        const interval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            pomodoroDisplay.textContent = `Pomodoro: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(interval);
                this.showPomodoroComplete();
                pomodoroDisplay.remove();
            }
            
            timeLeft--;
        }, 1000);
        
        document.body.appendChild(pomodoroDisplay);
        
        // Add cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '×';
        cancelBtn.className = 'btn btn-sm btn-light ms-2';
        cancelBtn.onclick = () => {
            clearInterval(interval);
            pomodoroDisplay.remove();
        };
        pomodoroDisplay.appendChild(cancelBtn);
    }
    
    showPomodoroComplete() {
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Complete!', {
                body: 'Time for a break!',
                icon: '/static/icon-192x192.png'
            });
        }
        
        // Play sound
        this.playNotificationSound();
        
        // Show modal
        const modal = new bootstrap.Modal(document.createElement('div'));
        modal._element.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">Pomodoro Complete!</h5>
                    </div>
                    <div class="modal-body text-center">
                        <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                        <p>Great work! Time for a break.</p>
                        <button class="btn btn-success" onclick="this.closest('.modal').remove()">
                            Continue Working
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal._element);
        modal.show();
    }
    
    playNotificationSound() {
        // Create audio context for notification sound
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    }
    
    // Request notification permission
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    // Timer preset functions
    setTimerPreset(minutes) {
        const now = new Date();
        const startTime = new Date(now.getTime() - (minutes * 60 * 1000));
        
        document.getElementById('entry-start-time').value = startTime.toISOString().slice(0, 16);
        document.getElementById('entry-end-time').value = now.toISOString().slice(0, 16);
    }
    
    // Auto-save timer state to localStorage
    saveTimerState() {
        if (this.timeTracker.runningTimer) {
            localStorage.setItem('runningTimer', JSON.stringify({
                ...this.timeTracker.runningTimer,
                savedAt: new Date().toISOString()
            }));
        } else {
            localStorage.removeItem('runningTimer');
        }
    }
    
    // Restore timer state from localStorage
    restoreTimerState() {
        const saved = localStorage.getItem('runningTimer');
        if (saved) {
            try {
                const timerData = JSON.parse(saved);
                const savedAt = new Date(timerData.savedAt);
                const now = new Date();
                
                // Only restore if saved less than 1 hour ago
                if (now - savedAt < 60 * 60 * 1000) {
                    this.timeTracker.runningTimer = timerData;
                    this.timeTracker.updateTimerUI(true);
                } else {
                    localStorage.removeItem('runningTimer');
                }
            } catch (error) {
                console.error('Error restoring timer state:', error);
                localStorage.removeItem('runningTimer');
            }
        }
    }
}

// Add timer preset buttons to manual entry modal
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('addEntryModal');
    if (modal) {
        const presetContainer = document.createElement('div');
        presetContainer.className = 'mb-3';
        presetContainer.innerHTML = `
            <label class="form-label">Quick Presets</label>
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="timer.setTimerPreset(15)">15m</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="timer.setTimerPreset(30)">30m</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="timer.setTimerPreset(60)">1h</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" onclick="timer.setTimerPreset(120)">2h</button>
            </div>
        `;
        
        const endTimeInput = document.getElementById('entry-end-time');
        if (endTimeInput) {
            endTimeInput.parentNode.parentNode.parentNode.insertBefore(presetContainer, endTimeInput.parentNode.parentNode);
        }
    }
});

// Initialize timer when app loads
document.addEventListener('DOMContentLoaded', function() {
    if (window.timeTracker) {
        window.timer = new Timer(window.timeTracker);
        window.timer.requestNotificationPermission();
        window.timer.restoreTimerState();
        
        // Save timer state when page unloads
        window.addEventListener('beforeunload', () => {
            window.timer.saveTimerState();
        });
    }
});