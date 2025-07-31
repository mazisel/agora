module.exports = {
  apps: [{
    name: 'team-management-system',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/team-management-system',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/team-management-system-error.log',
    out_file: '/var/log/pm2/team-management-system-out.log',
    log_file: '/var/log/pm2/team-management-system.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
}
