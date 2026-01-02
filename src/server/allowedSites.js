import fs from "node:fs";
import path from "node:path";

export default class AllowedSites {
	constructor() {
		// biome-ignore lint/correctness/noConstructorReturn: <explanation>
		return AllowedSites.load();
	}

	static load() {
		const rootDir = process.cwd();
		const globalPath = path.resolve(rootDir, "sites.json");
		const localPath = path.resolve(rootDir, ".sites.json");

		let globalSites;

		try {
			globalSites = JSON.parse(fs.readFileSync(globalPath, "utf8"));
		} catch {
			throw new Error(`Failed to load required ${globalPath}`);
		}

		if (!Array.isArray(globalSites)) {
			throw new Error("sites.json must contain an array");
		}

		let localSites = [];
		try {
			const raw = fs.readFileSync(localPath, "utf8");
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				localSites = parsed;
			}
		} catch {
			// полностью игнорируем
		}

		return Object.values(Object.assign({}, globalSites, localSites));
	}
}
