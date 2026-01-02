document.addEventListener("DOMContentLoaded", () => {
	const versionElement = document.getElementById("version");
	versionElement.textContent = `${PACKAGE_NAME_VERSION.name}, v${PACKAGE_NAME_VERSION.version}`;
});
