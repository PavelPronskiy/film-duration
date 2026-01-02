import { performance } from "node:perf_hooks";
import { YTDlpClient } from "./ytdlp-client.js";
import { minify } from "html-minifier-terser";
import fs from "node:fs";
import path from "node:path";

export class Backend {
	constructor(allowed_sites) {
		this.url;
		// this.youtubedl = youtubedl;
		this.end;
		this.runtimeMs;
		this.status = "error";
		this.message = "";
		this.proxyEnabledWithDomain = false;
		this.allowed_sites = allowed_sites;
		this.video = {
			duration: "00:00:00",
			id: "",
			title: "",
			thumbnail: "",
		};
	}

	// async getVideoDuration() {
	// 	try {
	// 		const options = {
	// 			dumpSingleJson: true, // возвращает JSON с метаданными
	// 			noCheckCertificates: true, // игнорировать сертификаты
	// 			// youtubeSkipDashManifest: true,
	// 			noWarnings: true,
	// 			quiet: true,
	// 			"socket-timeout": process.env.YTDLP_TIMEOUT,
	// 		};

	// 		if (this.proxyEnabledWithDomain) {
	// 			options.proxy = process.env.YTDLP_PROXY;
	// 		}

	// 		if (this.getYTDLPBinPath()) {
	// 			options.execPath = this.getYTDLPBinPath();
	// 		}

	// 		const metadataJson = await youtubedl(this.url, options, {
	// 			// timeout: process.env.YTDLP_TIMEOUT, // таймаут процесса
	// 			killSignal: "SIGKILL", // сигнал при превышении таймаута
	// 			env: {
	// 				...process.env,
	// 			},
	// 		});

	// 		this.duration = metadataJson?.duration;
	// 		return {
	// 			status: true,
	// 			message: "",
	// 		};
	// 	} catch (err) {
	// 		const errorMessage = `Ошибка при получении длительности видео: ${err.message}`;
	// 		// console.error(errorMessage);
	// 		return {
	// 			status: false,
	// 			message: errorMessage,
	// 		};
	// 	}
	// }
	async getVideoDuration() {
		try {
			const options = {};

			if (this.proxyEnabledWithDomain) {
				options.proxy = process.env.YTDLP_PROXY;
			}

			// if (this.getYTDLPBinPath()) {
			// 	options.execPath = this.getYTDLPBinPath();
			// }

			const client = new YTDlpClient(options);

			const info = await client.getVideoInfo(this.url);
			this.video = info;
			return {
				status: true,
				message: "",
			};
		} catch (err) {
			const errorMessage = `Ошибка при получении длительности видео: ${err.message}`;
			// console.error(errorMessage);
			return {
				status: false,
				message: errorMessage,
			};
		}
	}

	isAllowedUrl(url) {
		try {
			const parsed = new URL(url);
			const host = parsed.hostname.toLowerCase();

			const matched = this.allowed_sites.find(({ domain }) => {
				return host === domain || host.endsWith(`.${domain}`);
			});

			if (!matched) {
				return false;
			}

			this.proxyEnabledWithDomain = Boolean(matched.proxy);

			return true;
		} catch {
			return false;
		}
	}

	formatDuration(durationSec) {
		if (!durationSec || durationSec <= 0) return "00:00:00";
		const hours = Math.floor(durationSec / 3600);
		const minutes = Math.floor((durationSec % 3600) / 60);
		const seconds = durationSec % 60;

		const hh = String(hours).padStart(2, "0");
		const mm = String(minutes).padStart(2, "0");
		const ss = String(seconds).padStart(2, "0");

		return `${hh}:${mm}:${ss}`;
	}

	formatRuntime(ms) {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		const seconds = ms / 1000;
		if (seconds < 60) return `${Math.round(seconds)}s`;
		const minutes = seconds / 60;
		if (minutes < 60) return `${Math.round(minutes)}m`;
		const hours = minutes / 60;
		return `${Math.round(hours)}h`;
	}

	resultMessage(status = this.status, message = this.message) {
		this.end = performance.now();
		this.runtimeMs = Math.round(this.end - this.start);

		return {
			url: this.url,
			status: status,
			message: message,
			runtime: this.formatRuntime(this.runtimeMs),
			duration: this.formatDuration(this.video.duration),
			title: this.video.title,
			thumbnail: this.video.thumbnail,
		};
	}

	async processUrl(url) {
		this.url = url;
		this.start = performance.now();

		if (!url) {
			return this.resultMessage("error", "URL не передан");
		}

		const isValid = /^https?:\/\//i.test(url);

		if (!isValid) {
			return this.resultMessage("error", "Некорректный URL");
		}

		if (!this.isAllowedUrl(url)) {
			return this.resultMessage("error", "Домен не поддерживается");
		}

		const resultVideoDurationObject = await this.getVideoDuration();
		if (resultVideoDurationObject.status) {
			return this.resultMessage("success", "");
		} else {
			return this.resultMessage("error", resultVideoDurationObject.message);
		}
	}

	async processUrlXpath(url) {
		this.url = url;
		this.start = performance.now();

		const isValid = /^https?:\/\//i.test(url);

		if (!isValid) {
			return this.resultMessage("error", "Некорректный URL");
		}

		if (!this.isAllowedUrl(url)) {
			return this.resultMessage("error", "Домен не поддерживается");
		}

		const templatePath = path.resolve("src/tpl/parse.html");
		let html = fs.readFileSync(templatePath, "utf-8");
		const resultVideoDurationObject = await this.getVideoDuration();
		console.log(resultVideoDurationObject);
		if (resultVideoDurationObject.status) {
			// return this.resultMessage("success", "");
			html = html.replace(
				"__TIME_DURATION__",
				this.formatDuration(this.video.duration),
			);
			return html;
			// } else {
			// 	html = html.replace(
			// 		"__TIME_DURATION__",
			// 		JSON.stringify(resultVideoDurationObject.message),
			// 	);
		}
	}
}
