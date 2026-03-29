HOST=$(shell grep '^HOST=' .env | cut -d '=' -f 2)

install:
	@echo "Installing server..."
	-ssh root@$(HOST) "mkdir -p /opt/badge"
	scp ./.env root@$(HOST):/opt/badge/.env
	scp ./docker-compose.yml root@$(HOST):/opt/badge/docker-compose.yml

deploy:
	@echo "Deploying server..."
	ssh root@$(HOST) "docker pull ghcr.io/mikhail-angelov/badge-maker:latest"
	-ssh root@$(HOST) "cd /opt/badge && docker compose down"
	ssh root@$(HOST) "cd /opt/badge && docker compose up -d"