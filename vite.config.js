import { defineConfig } from "vite";
// import { path, resolve } from "path";
import path from "path";
import legacy from "@vitejs/plugin-legacy";
import autoprefixer from "autoprefixer";
import postcssFlexbugsFixes from "postcss-flexbugs-fixes";
import postcssPresetEnv from "postcss-preset-env";

export default defineConfig(({ mode }) => {
	const isDev = mode !== "production";
	const root = path.resolve(__dirname);

	return {
		root: root, // корень исходников
		base: isDev ? "/" : "/dist/", // prod пути
		publicDir: false,
		resolve: {
			alias: {
				"/@/": path.resolve(root, "src") + "/",
			},
		},
		css: {
			devSourcemap: true,
			preprocessorOptions: {
				// scss: {
				// 	includePaths: [resolve(__dirname, "src/scss")],
				// },
				scss: {
					sassOptions: {
						quietDeps: true,
					},
				},
			},
		},
		build: {
			outDir: path.resolve(__dirname, "dist"),
			emptyOutDir: true,
			manifest: true, // 🔥 обязательно
			assetsDir: "",
			cssCodeSplit: true,
			rollupOptions: {
				input: {
					web: path.resolve(__dirname, "src/index.js"),
				},
				output: {
					manualChunks: undefined,
				},
			},
			target: "es2015",
			sourcemap: true,
			brotliSize: false,
			minify: "terser",
			terserOptions: {
				safari10: true,
				parse: {
					ecma: 2015,
				},
			},
		},
		server: {
			middlewareMode: true, // для Express
		},
		plugins: [
			legacy({
				corejs: false,
			}),
		],
	};
});
