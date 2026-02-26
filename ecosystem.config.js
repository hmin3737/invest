const path = require("path");
const fs = require("fs");

// .env.production 파일에서 환경변수 로드
const envFile = path.join(__dirname, ".env.production");
const env = { NODE_ENV: "production", PORT: 3001, HOSTNAME: "0.0.0.0" };

if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        env[key] = value;
      }
    });
}

module.exports = {
  apps: [
    {
      name: "invest",
      script: ".next/standalone/server.js",
      cwd: "./",
      env,
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
