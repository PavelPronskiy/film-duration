document.addEventListener("DOMContentLoaded", () => {
	const versionElement = document.getElementById("version");
	console.log(versionElement);
	// console.log(PACKAGE_NAME_VERSION);
	versionElement.textContent = `${PACKAGE_NAME_VERSION.name}, v${PACKAGE_NAME_VERSION.version}`;
});
