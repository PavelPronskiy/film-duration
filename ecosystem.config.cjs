// ecosystem.config.cjs
module.exports = {
	apps: [
		{
			name: "film-duration", // Название процесса в PM2
			script: "./index.js", // Основной файл ES6/ESM проекта
			instances: 1, // Запуск на всех ядрах CPU
			exec_mode: "cluster", // Режим кластера
			autorestart: true,
			restart_delay: 1000,
			max_restarts: 0,
			watch: false, // Авто-перезапуск при изменении файлов
			env_dev: {
				NODE_ENV: "development",
				PORT: 3000,
			},
			env: {
				NODE_ENV: "production",
				PORT: 3000,
			},
		},
	],
};
