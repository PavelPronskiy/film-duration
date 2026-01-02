import { spawn } from "child_process";
import nexsspOs from "@nexssp/os";
import fs from "node:fs";
import path from "node:path";

export class YTDlpClient {
	/**
	 * @param {Object} options
	 * @param {string} options.execPath - путь до бинарника yt-dlp
	 * @param {string} [options.proxy] - прокси, например "socks5h://127.0.0.1:1080"
	 * @param {number} [options.timeout] - таймаут в миллисекундах
	 */
	constructor({ proxy } = {}) {
		// this.execPath = execPath;
		this.execPath = this.getYTDLPBinPath();
		// if (!execPath) throw new Error("Укажите путь до бинарника yt-dlp");
		this.proxy = proxy || null;
		this.timeout = process.env.YTDLP_TIMEOUT || 0; // 0 = без таймаута
	}

	getYTDLPBinPath() {
		const rootDir = process.cwd();
		const osInfo = nexsspOs(); // создаём экземпляр
		const distribId = osInfo.get("ID");

		// native yt-dlp
		if (fs.existsSync(path.resolve(rootDir, ".bin", distribId, "yt-dlp"))) {
			return path.resolve(rootDir, ".bin", distribId, "yt-dlp");
		}

		return false;
	}

	/**
	 * Получение информации о видео
	 * @param {string} url
	 * @returns {Promise<{id:string, title:string, duration:number, thumbnail:string}>}
	 */
	async getVideoInfo(url) {
		if (!url) throw new Error("URL видео обязателен");

		const args = ["-J", url];
		if (this.proxy) {
			args.unshift("--proxy", this.proxy);
		}

		return new Promise((resolve, reject) => {
			const child = spawn(this.execPath, args, {
				stdio: ["ignore", "pipe", "pipe"],
			});

			let stdout = "";
			let stderr = "";
			let timeoutId;

			// Таймаут
			if (this.timeout > 0) {
				timeoutId = setTimeout(() => {
					child.kill("SIGKILL"); // принудительно убиваем процесс
					reject(new Error(`yt-dlp превысил таймаут ${this.timeout}ms`));
				}, this.timeout);
			}

			child.stdout.on("data", (data) => (stdout += data));
			child.stderr.on("data", (data) => (stderr += data));

			child.on("close", (code) => {
				if (timeoutId) clearTimeout(timeoutId);

				if (code !== 0) {
					return reject(
						new Error(`yt-dlp завершился с кодом ${code}: ${stderr.trim()}`),
					);
				}

				try {
					const info = JSON.parse(stdout);

					// Выбираем thumbnail ≤ 400px
					let thumb = info.thumbnail;
					if (info.thumbnails && Array.isArray(info.thumbnails)) {
						const small = info.thumbnails
							.filter((t) => t.width && t.width <= 400)
							.sort((a, b) => b.width - a.width)[0];
						if (small) thumb = small.url;
					}

					resolve({
						id: info.id,
						title: info.title,
						duration: info.duration,
						thumbnail: thumb,
					});
				} catch (err) {
					reject(new Error(`Ошибка парсинга JSON: ${err.message}`));
				}
			});

			child.on("error", (err) => {
				if (timeoutId) clearTimeout(timeoutId);
				reject(err);
			});
		});
	}
}
