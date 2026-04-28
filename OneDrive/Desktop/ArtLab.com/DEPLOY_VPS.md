# ArtLab VPS deployment (Docker + Nginx + SSL)

## 1) Server prerequisites

- Ubuntu 22.04+ VPS
- Docker + Docker Compose plugin
- Open ports: `22`, `80`, `443`
- Domain pointed to VPS IP (`A` record)

Install Docker on VPS:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## 2) Clone project and prepare env files

```bash
git clone https://github.com/EgorVoronin06/ArtLab-studio-Site-.git
cd ArtLab-studio-Site-/OneDrive/Desktop/ArtLab.com
```

Create env files:

```bash
cp deploy/vps/.env.compose.example deploy/vps/.env.compose
cp deploy/vps/.env.backend.example deploy/vps/.env.backend
```

Edit:

- `deploy/vps/.env.compose` -> set Postgres password
- `deploy/vps/.env.backend` -> set secrets and `FRONTEND_URL` to your domain

## 3) Configure Nginx domain

Open `deploy/vps/nginx/conf.d/default.conf` and replace:

- `example.com` -> your real domain

## 4) First HTTP startup

```bash
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml up -d --build
```

## 5) Issue SSL certificate

Run on VPS (replace domain and email):

```bash
docker run --rm \
  -v "$(pwd)/deploy/vps/certbot/www:/var/www/certbot" \
  -v "$(pwd)/deploy/vps/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d example.com -d www.example.com \
  --email you@example.com --agree-tos --no-eff-email
```

Restart nginx:

```bash
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml restart nginx
```

## 6) Deploy updates

```bash
git pull
bash deploy/vps/deploy.sh
```

## 7) Useful checks

```bash
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml ps
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml logs -f backend
docker compose --env-file deploy/vps/.env.compose -f docker-compose.vps.yml logs -f nginx
```
