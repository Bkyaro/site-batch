document.addEventListener("DOMContentLoaded", function () {
	const saveAsInput = document.getElementById("save-as");
	const saveButton = document.getElementById("save");
	const recoverList = document.getElementById("recover-list");

	let saveAsName = "";

	saveAsInput.addEventListener("keyup", function (event) {
		saveAsName = event.target.value;
		if (saveAsName) {
			saveButton.classList.add("save-enable");
		} else {
			saveButton.classList.remove("save-enable");
		}
	});

	saveButton.addEventListener("click", async function () {
		if (saveAsName) {
			await chrome.runtime.sendMessage({
				action: "saveWindows",
				name: saveAsName,
			});
			loadSavedNames();
		}
	});

	recoverList.addEventListener("click", function (event) {
		const target = event.target;
		const parentLi = target.closest("li");
		const name = parentLi.querySelector("div").textContent;

		if (target.id === "restore") {
			chrome.runtime.sendMessage({
				action: "restoreWindows",
				name: name,
			});
		} else if (target.id === "delete") {
			chrome.runtime.sendMessage({ action: "deleteWindows", name: name });
			parentLi.remove();
		}
	});

	function loadSavedNames() {
		chrome.storage.local.get(null, function (items) {
			const savedNames = Object.keys(items);
			recoverList.innerHTML = "";
			savedNames.forEach((name) => {
				const li = document.createElement("li");
				li.innerHTML = `
                  <div>${name}</div>
                  <div class="icon-wrapper">
                      <img id="restore" ></img>
                      <img id="delete" ></img>
                  </div>
              `;
				recoverList.appendChild(li);
			});
		});
	}

	// 监听来自background的消息
	chrome.runtime.onMessage.addListener((message) => {
		if (message.action === "saveCompleted") {
			loadSavedNames();
		}
	});

	loadSavedNames();
});
