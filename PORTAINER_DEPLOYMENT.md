# Portainer ile Deployment Rehberi

Bu rehber, Team Management System projesini Portainer kullanarak deploy etme sürecini açıklar.

## Ön Gereksinimler

1. **Docker ve Docker Compose yüklü olmalı**
2. **Portainer kurulu ve çalışır durumda olmalı**
3. **Gerekli environment değişkenleri hazır olmalı**

## 1. Environment Dosyası Hazırlama

`.env.local` dosyanızın aşağıdaki değişkenleri içerdiğinden emin olun:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Configuration (Nodemailer)
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
EMAIL_FROM=your_from_email

# Application Settings
NODE_ENV=production
PORT=3001

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username_without_at
```

## 2. Portainer Stack Oluşturma

### Yöntem 1: Pre-built Image ile (ÖNERİLEN)

Önce local'de image'ı build edin:
```bash
./build-and-deploy.sh
```

Sonra Portainer'da:
1. Portainer web arayüzüne giriş yapın
2. **Stacks** menüsüne gidin
3. **Add stack** butonuna tıklayın
4. Stack adını girin: `team-management-system`
5. `portainer-prebuilt.yml` dosyasının içeriğini yapıştırın

### Yöntem 2: Git Repository ile

Eğer projeniz Git repository'de ise:
1. **Stacks** > **Add stack**
2. **Repository** sekmesini seçin
3. Git repository URL'ini girin
4. Branch: `main` (veya kullandığınız branch)
5. Compose path: `portainer-git.yml`
6. Environment variables'ları tanımlayın
7. **Deploy the stack**

### Yöntem 3: Docker Compose ile Stack (Manuel)

1. Portainer web arayüzüne giriş yapın
2. **Stacks** menüsüne gidin
3. **Add stack** butonuna tıklayın
4. Stack adını girin: `team-management-system`
5. Aşağıdaki docker-compose içeriğini yapıştırın:

```yaml
version: '3.8'

services:
  team-management-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: team-management-system
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      # Supabase
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      # Email
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_PORT=${EMAIL_PORT}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
      - EMAIL_FROM=${EMAIL_FROM}
      # Telegram
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}
      - TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
      - NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=${NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}
    restart: unless-stopped
    networks:
      - team-management-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  team-management-network:
    driver: bridge
```

6. **Environment variables** bölümünde gerekli değişkenleri tanımlayın
7. **Deploy the stack** butonuna tıklayın

### Yöntem 2: Git Repository ile

1. **Stacks** > **Add stack**
2. **Repository** sekmesini seçin
3. Git repository URL'ini girin
4. Branch: `main` (veya kullandığınız branch)
5. Compose path: `docker-compose.yml`
6. Environment variables'ları tanımlayın
7. **Deploy the stack**

## 3. Environment Variables Tanımlama

Portainer'da environment variables tanımlarken:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
NODE_ENV=production
PORT=3001
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
TELEGRAM_BOT_USERNAME=your-bot-username
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your-bot-username
```

## 4. Deployment Sonrası Kontroller

### Health Check
```bash
curl http://localhost:3001/api/health
```

Beklenen yanıt:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-09T...",
  "uptime": 123.45,
  "environment": "production",
  "version": "0.1.0"
}
```

### Container Logları
Portainer'da **Containers** > **team-management-system** > **Logs**

### Container Stats
CPU, Memory, Network kullanımını **Stats** sekmesinden takip edin

## 5. Telegram Bot Kurulumu

1. Telegram'da **@BotFather** üzerinden bir bot oluşturun. Token'ı `TELEGRAM_BOT_TOKEN` olarak, bot kullanıcı adını (başında `@` olmadan) hem `TELEGRAM_BOT_USERNAME` hem de `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` değişkenlerine kaydedin.
2. Bot isteğinin yalnızca sizden gelmesi için rastgele bir değer belirleyin ve `TELEGRAM_WEBHOOK_SECRET` değişkenine girin.
3. Stack'i redeploy ettikten sonra webhook'u aşağıdaki gibi ayarlayın (alan adınızı ve secret değerini güncelleyin):

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-domain.com/api/telegram/webhook?secret=<TELEGRAM_WEBHOOK_SECRET>"}'
```

4. `getWebhookInfo` çağrısı ile webhook'un doğru kurulduğunu doğrulayabilirsiniz:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

5. Admin panelinde kullanıcı düzenleme moduna girip "Telegram" bölümündeki **Bağlantı Oluştur** butonuyla derin link üretin ve ilgili kullanıcıya gönderin. Kullanıcı linke tıklayıp botta `/start` komutunu çalıştırdığında bağlantı otomatik olarak tamamlanır.
6. Bağlantı sonrası kartta "Bağlı" durumu görünecek; gerekirse yeni bağlantı oluşturup eskisini geçersiz kılabilirsiniz.

## 5. Güncelleme Süreci

1. **Stacks** > **team-management-system**
2. **Editor** sekmesi
3. Gerekli değişiklikleri yapın
4. **Update the stack**

Veya Git repository kullanıyorsanız:
1. **Git pull and redeploy** butonunu kullanın

## 6. Backup ve Monitoring

### Volume Backup
Eğer persistent data kullanıyorsanız:
```yaml
volumes:
  - team-management-data:/app/data
```

### Log Monitoring
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 7. Troubleshooting

### Container Başlamıyor
- Environment variables kontrolü
- Port çakışması kontrolü (3001 portu kullanımda mı?)
- Docker logs kontrolü

### Build Hatası
- Dockerfile syntax kontrolü
- Dependencies kontrolü
- .dockerignore dosyası kontrolü

### Health Check Başarısız
- `/api/health` endpoint'i erişilebilir mi?
- Container içinde curl/wget yüklü mü?

## 8. Production Optimizasyonları

### Resource Limits
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Restart Policy
```yaml
restart: unless-stopped
```

### Network Security
```yaml
networks:
  team-management-network:
    driver: bridge
    internal: true  # Sadece internal erişim
```

Bu rehberi takip ederek Team Management System'inizi Portainer ile başarıyla deploy edebilirsiniz.
