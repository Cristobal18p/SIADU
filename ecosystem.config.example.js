module.exports = {
    apps: [{
        name: "SIADU",
        script: './server/bin/www',
        instances: 1,
        exec_mode: 'cluster',
        watch: false,
        ext: "js,pug,json",
        ignore_watch: ['node_modules', 'sessions', 'public/uploads', '.env', 'logs'],
        max_memory_restart: "1G",
        env_development: {
            PORT: 7001,
            "DATABASE_URL": "",
            "JWT_SECRET": "",
            "SUPABASE_URL": "",
            "SUPABASE_SERVICE_KEY": "",
            "PUPPETEER_EXECUTABLE_PATH": "", // Ruta de tu computurador a Chrome o Chromium
            "EXPIRESIN": "2h"
        },
        combine_logs: false,
        merge_logs: true,
        log_date_format: 'YYYY-MM-DD HH:mm Z',
        error_file: './logs/SIADU-err.log',
        out_file: './logs/SIADU-out.log',
        pid_file: './logs/SIADU-pm_id.pid',
        min_uptime: '60s',
        max_restarts: 10,
        listen_timeout: 8000,
        kill_timeout: 1600,
        shutdown_with_message: true,
        watch_delay: 5000,
        restart_delay: 5000,
        autorestart: true,
        vizion: true,
        force: false
    }]
}
