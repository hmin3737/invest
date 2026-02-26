module.exports = {
  apps: [
    {
      name: "invest",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
    },
  ],
};
