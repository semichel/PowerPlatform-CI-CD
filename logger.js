// Logger - saves game events to localStorage with a visible log panel
const Logger = {
    MAX_ENTRIES: 500,
    storageKey: 'narDa_logs',

    init() {
        this.createPanel();
        this.log('SYSTEM', 'Sidan laddades');
        this.logBrowserInfo();
        window.addEventListener('error', (e) => {
            this.log('ERROR', `${e.message} (${e.filename}:${e.lineno})`);
        });
        window.addEventListener('unhandledrejection', (e) => {
            this.log('ERROR', `Unhandled promise: ${e.reason}`);
        });
    },

    log(type, message) {
        const entry = {
            time: new Date().toISOString(),
            type,
            message
        };

        const logs = this.getLogs();
        logs.push(entry);

        // Keep only last MAX_ENTRIES
        if (logs.length > this.MAX_ENTRIES) {
            logs.splice(0, logs.length - this.MAX_ENTRIES);
        }

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(logs));
        } catch (e) {
            // localStorage full - clear old entries
            logs.splice(0, Math.floor(logs.length / 2));
            localStorage.setItem(this.storageKey, JSON.stringify(logs));
        }

        this.appendToPanel(entry);
    },

    getLogs() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey)) || [];
        } catch {
            return [];
        }
    },

    clearLogs() {
        localStorage.removeItem(this.storageKey);
        const content = document.getElementById('log-content');
        if (content) content.innerHTML = '';
        this.log('SYSTEM', 'Loggar rensade');
    },

    logBrowserInfo() {
        const ua = navigator.userAgent;
        const screen = `${window.innerWidth}x${window.innerHeight}`;
        this.log('SYSTEM', `Enhet: ${screen}, ${ua.substring(0, 80)}`);
    },

    exportLogs() {
        const logs = this.getLogs();
        const text = logs.map(l =>
            `[${l.time}] [${l.type}] ${l.message}`
        ).join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `narDa_loggar_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.log('SYSTEM', 'Loggar exporterade');
    },

    createPanel() {
        // Toggle button
        const toggle = document.createElement('button');
        toggle.id = 'log-toggle';
        toggle.innerHTML = '\u{1F4CB}';
        toggle.title = 'Visa loggar';
        toggle.onclick = () => this.togglePanel();
        document.body.appendChild(toggle);

        // Panel
        const panel = document.createElement('div');
        panel.id = 'log-panel';
        panel.classList.add('log-hidden');
        panel.innerHTML = `
            <div id="log-header">
                <span>Loggar</span>
                <div id="log-actions">
                    <button onclick="Logger.exportLogs()" title="Exportera">Exportera</button>
                    <button onclick="Logger.clearLogs()" title="Rensa">Rensa</button>
                    <button onclick="Logger.togglePanel()" title="Stäng">X</button>
                </div>
            </div>
            <div id="log-content"></div>
        `;
        document.body.appendChild(panel);

        // Load existing logs into panel
        const logs = this.getLogs();
        logs.forEach(entry => this.appendToPanel(entry));
    },

    appendToPanel(entry) {
        const content = document.getElementById('log-content');
        if (!content) return;

        const div = document.createElement('div');
        div.className = `log-entry log-${entry.type.toLowerCase()}`;
        const time = entry.time.substring(11, 19);
        div.innerHTML = `<span class="log-time">${time}</span> <span class="log-type">[${entry.type}]</span> ${entry.message}`;
        content.appendChild(div);
        content.scrollTop = content.scrollHeight;
    },

    togglePanel() {
        const panel = document.getElementById('log-panel');
        panel.classList.toggle('log-hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => Logger.init());
