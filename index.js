import express from "express";
import { minify } from "html-minifier-terser";

import fs from "node:fs";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { Backend } from "./src/backend/index.js";
import AllowedSites from "./src/server/allowedSites.js";

import youtubedl from "youtube-dl-exec";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
);

const allowed_sites = new AllowedSites();

dotenv.config();
const app = express();
const PORT = process.env.SERVER_PORT;

const isDev = process.env.NODE_ENV !== "production";
const BackendLogic = new Backend(youtubedl, allowed_sites);

let vite;
let manifest = {};
const manifestFile = "dist/.vite/manifest.json";

function renderAssets(entry) {
	const entryData = manifest[entry];
	if (!entryData) return "";

	let tags = "";
	// CSS
	if (entryData.css) {
		for (const cssFile of entryData.css) {
			tags += `<link rel="stylesheet" href="/static/${cssFile}">\n`;
		}
	}

	// ES5 legacy JS без type="module"
	if (entryData.legacy) {
		tags += `<script src="/static/${entryData.legacy}"></script>\n`;
	} else if (entryData.file) {
		// fallback, если legacy нет
		tags += `<script type="module" src="/static/${entryData.file}"></script>\n`;
	}

	return tags;
}

async function start() {
	if (isDev) {
		vite = await createViteServer({
			server: { middlewareMode: true },
			appType: "custom",
		});
		app.use(vite.middlewares);
	} else {
		const manifestPath = path.resolve(manifestFile);
		if (fs.existsSync(manifestPath)) {
			manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
		}
		app.use("/static", express.static(path.join(__dirname, "dist")));
	}

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	// Главная страница
	app.get("/", async (req, res, next) => {
		try {
			const templatePath = path.resolve("src/tpl/index.html");
			let html = fs.readFileSync(templatePath, "utf-8");

			if (isDev) {
				html = html.replace(
					"</head>",
					`<script type="module" src="/src/index.js"></script></head>`,
				);
				// Dev HMR transform
				if (isDev) html = await vite.transformIndexHtml("/", html);
			} else {
				// вставка JS/CSS из manifest
				const assets = renderAssets("src/index.js");
				html = html.replace("</head>", `${assets}</head>`);
			}

			const supportedDomainsScript = `<script>var SUPPORTED_DOMAINS_JSON = ${JSON.stringify(
				allowed_sites,
			)};</script>`;
			const packageNameVersionScript = `<script>var PACKAGE_NAME_VERSION = ${JSON.stringify(
				packageJson,
			)};</script>`;
			html = html.replace(
				"</body>",
				`${supportedDomainsScript + packageNameVersionScript}</body>`,
			);

			res.status(200).send(
				await minify(html, {
					collapseWhitespace: true,
					removeComments: true,
					removeEmptyAttributes: true,
					minifyJS: true,
					minifyCSS: true,
				}),
			);
		} catch (e) {
			next(e);
		}
	});

	// API
	app.post("/api/check", async (req, res) => {
		res.json(await BackendLogic.processUrl(req.body.url));
	});

	app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

start();
