# AWS 서버 배포 가이드

## 사전 조건
- AWS EC2 (또는 다른 VPS) — Ubuntu 22.04 LTS 권장
- Node.js 18+ 설치됨
- PM2 설치됨 (`npm install -g pm2`)
- Nginx 설치됨

---

## 1단계: 코드 배포

```bash
# 서버에서 레포 클론 (또는 pull)
cd /var/www
git clone <your-repo-url> invest
cd invest

# 의존성 설치
npm install --production=false

# Prisma 클라이언트 생성
npx prisma generate

# DB 초기화 (SQLite 파일 생성)
mkdir -p data
npx prisma db push
```

---

## 2단계: 환경 변수 설정

```bash
# .env.production.example을 복사하고 값 수정
cp .env.production.example .env.production
nano .env.production
```

`.env.production` 내용:
```
DATABASE_URL="file:./data/prod.db"
JWT_SECRET="여기에_최소_32자_이상의_랜덤_문자열"
NEXT_PUBLIC_BASE_URL="https://invest.nemento.men"
```

JWT_SECRET 생성 방법:
```bash
openssl rand -hex 32
```

---

## 3단계: 빌드 & 실행

```bash
# Next.js 빌드
NODE_ENV=production npm run build

# PM2로 실행
pm2 start ecosystem.config.js

# 부팅 시 자동 시작
pm2 save
pm2 startup
```

---

## 4단계: Nginx 설정

`/etc/nginx/sites-available/invest.nemento.men`:

```nginx
server {
    listen 80;
    server_name invest.nemento.men;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name invest.nemento.men;

    ssl_certificate /etc/letsencrypt/live/invest.nemento.men/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/invest.nemento.men/privkey.pem;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;  # 지표 계산이 오래 걸릴 수 있음
    }
}
```

```bash
# 심링크 생성 및 Nginx 재시작
sudo ln -s /etc/nginx/sites-available/invest.nemento.men /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL 인증서 발급 (이미 nemento.men 도메인이 있으면 서브도메인 추가)
sudo certbot --nginx -d invest.nemento.men
```

---

## 5단계: DNS 설정

Route 53 또는 도메인 레지스트라에서:
```
invest.nemento.men  A  <서버 IP>
```

---

## 업데이트 배포

```bash
cd /var/www/invest
git pull
npm install
npx prisma generate
npm run build
pm2 restart invest
```

---

## 로그 확인

```bash
pm2 logs invest          # 실시간 로그
pm2 logs invest --lines 100  # 최근 100줄
cat logs/err.log         # 에러 로그
```

---

## 포트 정보

- Next.js 앱: `3001` (ecosystem.config.js에서 설정됨)
- Nginx: `80` (HTTP) → `443` (HTTPS) → proxy → `3001`

---

## 주의 사항

1. **Yahoo Finance API**: 무료이지만 너무 많은 요청을 동시에 보내면 일시적으로 막힐 수 있습니다. 포트폴리오 지표 계산 시 캐싱을 추후 추가하면 좋습니다.
2. **SQLite**: 단일 서버에서는 충분하지만, 동시 쓰기가 많아지면 PostgreSQL 마이그레이션을 고려하세요.
3. **백업**: DB 파일(`data/prod.db`)을 주기적으로 백업하세요.
   ```bash
   # crontab -e 에 추가
   0 2 * * * cp /var/www/invest/data/prod.db /var/backups/invest-$(date +%Y%m%d).db
   ```
