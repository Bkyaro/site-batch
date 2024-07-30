chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "saveWindows") {
		saveWindows(request.name);
	} else if (request.action === "restoreWindows") {
		restoreWindows(request.name);
	} else if (request.action === "deleteWindows") {
		deleteWindows(request.name);
	}
});

async function saveWindows(name) {
	chrome.windows.getAll({ populate: true }, function (windows) {
		let windowInfo = windows.map((window) => {
			return {
				id: window.id,
				focused: window.focused,
				tabs: window.tabs.map((tab) => {
					return {
						url: tab.url,
						groupId: tab.groupId,
						index: tab.index,
						title: tab.title,
						pinned: tab.pinned,
					};
				}),
			};
		});
		let saveObj = {};
		saveObj[name] = windowInfo;
		chrome.storage.local.set(saveObj, function () {
			console.log("Window information saved under name:", name);
			// 发送消息到前端通知完成保存
			chrome.runtime.sendMessage({ action: "saveCompleted" });
		});
	});
}

async function restoreWindows(name) {
	chrome.storage.local.get([name], async function (result) {
		const savedWindows = result[name];
		if (savedWindows) {
			for (let windowInfo of savedWindows) {
				try {
					let newWindow = await createWindow();
					let groupIdMap = {}; // Map to track old groupId to new groupId
					for (let tabInfo of windowInfo.tabs) {
						let newTab = await createTab(newWindow.id, tabInfo);
						if (tabInfo.groupId !== -1) {
							if (!groupIdMap[tabInfo.groupId]) {
								groupIdMap[tabInfo.groupId] = await createGroup(
									newTab.id
								);
							}
							chrome.tabs.group({
								tabIds: newTab.id,
								groupId: groupIdMap[tabInfo.groupId],
							});
						}
					}
				} catch (error) {
					console.error("Error restoring window:", error);
				}
			}
		} else {
			console.log("No saved windows found under name:", name);
		}
	});
}

function createWindow() {
	return new Promise((resolve, reject) => {
		chrome.windows.create({}, function (newWindow) {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(newWindow);
			}
		});
	});
}

function createTab(windowId, tabInfo) {
	return new Promise((resolve, reject) => {
		chrome.tabs.create(
			{
				windowId: windowId,
				url: tabInfo.url,
				index: tabInfo.index,
				pinned: tabInfo.pinned,
			},
			function (tab) {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve(tab);
				}
			}
		);
	});
}

function createGroup(tabId) {
	return new Promise((resolve, reject) => {
		chrome.tabs.group({ tabIds: tabId }, function (newGroupId) {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(newGroupId);
			}
		});
	});
}

function deleteWindows(name) {
	chrome.storage.local.remove(name, function () {
		console.log("Window information deleted under name:", name);
	});
}

chrome.runtime.onInstalled.addListener(function () {
	console.log("Extension installed.");
});
