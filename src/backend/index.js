import { performance } from "perf_hooks";

export class Backend {
	constructor(youtubedl, ALLOWED_DOMAINS) {
		this.url;
		this.youtubedl = youtubedl;
		this.end;
		this.runtimeMs;
		this.duration = "00:00:00";
		this.status = "error";
		this.message = "";
		this.proxyEnabledWithDomain = false;
		this.ALLOWED_DOMAINS = ALLOWED_DOMAINS;
	}

	async getVideoDuration() {
		try {
			const options = {
				dumpSingleJson: true, // возвращает JSON с метаданными
				noCheckCertificates: true, // игнорировать сертификаты
				// youtubeSkipDashManifest: true,
				noWarnings: true,
				quiet: true,
				"socket-timeout": process.env.YTDLP_TIMEOUT,
			};

			if (this.proxyEnabledWithDomain) {
				options.proxy = process.env.YTDLP_PROXY;
			}

			const metadataJson = await this.youtubedl(this.url, options, {
				// timeout: process.env.YTDLP_TIMEOUT, // таймаут процесса
				killSignal: "SIGKILL", // сигнал при превышении таймаута
				env: {
					...process.env,
					PYTHONWARNINGS: "ignore",
					pythonArgs: ["-W", "ignore"],
				},
			});

			this.duration = metadataJson?.duration;
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

			const matched = this.ALLOWED_DOMAINS.find(({ domain }) => {
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
			duration: this.formatDuration(this.duration),
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
}
