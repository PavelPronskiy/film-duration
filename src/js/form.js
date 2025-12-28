// import copyTextToClipboard from "@uiw/copy-to-clipboard";

import copy from "copy-text-to-clipboard";

document.addEventListener("DOMContentLoaded", () => {
	const formElement = document.getElementById("urlForm");
	const resultDebugElement = document.getElementById("result-debug");
	const resultMessageElement = document.getElementById("result-message");
	const resultDurationElement = document.getElementById("result-duration");
	const resultDurationCopiedElement = document.getElementById(
		"result-duration-copied",
	);
	const resultDurationErrorElement = document.getElementById(
		"result-message-error",
	);
	const inputUrlElement = document.getElementById("input-url");
	const switchDebugElement = document.getElementById("switch-debug");
	const buttonSubmitElement = document.getElementById("button-submit");
	const supportedDomainsListWrapElement = document.getElementById(
		"supported-domains-list",
	);

	const supportedDomainsListElement = document.createElement("ul");

	// Создаем три li и добавляем их в supportedDomainsListElement
	window.SUPPORTED_DOMAINS_JSON.forEach((item) => {
		const li = document.createElement("li");
		// const proxy = item.proxy ? "вкл" : "выкл";
		// li.textContent = `Домен: ${item.domain} Прокси: ${proxy}`;
		li.textContent = `${item.domain}`;
		supportedDomainsListElement.appendChild(li);
	});

	// console.log(supportedDomainsListWrapElement);
	supportedDomainsListWrapElement.appendChild(supportedDomainsListElement);

	const buttonSubmitText = buttonSubmitElement.textContent;

	if (!formElement) return;

	const switchDebug = {
		set(str) {
			localStorage.setItem("switch-debug", str);
		},
		get() {
			return localStorage.getItem("switch-debug");
		},
	};

	if (switchDebug.get() === "on") {
		switchDebugElement.checked = true;
	} else {
		switchDebugElement.checked = false;
	}

	switchDebugElement.addEventListener("change", (event) => {
		if (switchDebugElement.checked) {
			switchDebug.set("on");
			resultDebugElement.style.display = "block";
		} else {
			switchDebug.set("off");
			resultDebugElement.style.display = "none";
		}
	});

	const actionProcessing = {
		active() {
			inputUrlElement.setAttribute("disabled", true);
			buttonSubmitElement.setAttribute("disabled", true);
			buttonSubmitElement.setAttribute("aria-busy", true);
			resultDurationElement.textContent = "";
			buttonSubmitElement.textContent = "Подождите";
			resultDebugElement.textContent = "";
			resultMessageElement.style.display = "none";
			resultDurationCopiedElement.style.visibility = "hidden";
			resultDurationElement.style.visibility = "hidden";
			resultDurationErrorElement.style.display = "none";
			resultDurationErrorElement.textContent = "";
		},
		inactive() {
			inputUrlElement.removeAttribute("disabled");
			buttonSubmitElement.removeAttribute("disabled");
			buttonSubmitElement.removeAttribute("aria-busy");
			buttonSubmitElement.textContent = buttonSubmitText;
		},
		showResults() {
			resultDurationElement.style.visibility = "visible";
			resultMessageElement.style.display = "flex";
			resultDurationErrorElement.style.display = "none";
			resultDurationErrorElement.textContent = "";
		},
	};

	formElement.addEventListener("submit", async (e) => {
		e.preventDefault();
		const payload = {
			url: formElement.querySelector("[name=url]").value,
		};

		try {
			actionProcessing.active();
			const res = await fetch("/api/check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const result = await res.json();

			console.log(result);
			if (switchDebug.get() === "on") {
				resultDebugElement.textContent = JSON.stringify(result, null, 2);
			}
			actionProcessing.inactive();

			if (result.status === "error") {
				// console.log(resultDurationErrorElement);
				resultDurationErrorElement.style.display = "inline-block";
				// resultDurationErrorElement.setAttribute("aria-invalid", true);
				resultDurationErrorElement.textContent = result.message;
				return;
			}

			if (result.status === "success") {
				actionProcessing.showResults();
			}

			resultDurationElement.textContent = result.duration;

			resultDurationElement.addEventListener("click", () => {
				const resultDurationElement =
					document.getElementById("result-duration");

				const success = copy(resultDurationElement.textContent);

				if (!success) return;

				// перезапуск blink (важно!)
				resultDurationElement.classList.remove("blink");
				void resultDurationElement.offsetWidth; // forced reflow — иначе анимация не перезапустится
				resultDurationElement.classList.add("blink");

				if (success) console.log("Скопировано!");
				resultDurationCopiedElement.style.visibility = "visible";

				setTimeout(() => {
					resultDurationCopiedElement.style.visibility = "hidden";
				}, 3000);
			});
		} catch {
			actionProcessing.inactive();
			if (switchDebug.get() === "on") {
				resultDebugElement.textContent = "Ошибка";
			}
		}
	});
});
