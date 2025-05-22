#!/bin/bash

# Остановка текущего процесса
pm2 stop bookshelf

# Переход в директорию проекта
cd /var/www/bookshelf

# Получение последних изменений
git pull origin main

# Установка зависимостей
npm install

# Сборка клиентской части
cd client
npm install
npm run build
cd ..

# Запуск приложения
pm2 start ecosystem.config.js

# Перезапуск Nginx
sudo systemctl restart nginx 