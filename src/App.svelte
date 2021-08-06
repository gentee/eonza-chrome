<script>
	//	import { dataset_dev } from "svelte/internal";

	let eonzaHost = "";
	let success = "";
	let tabUrl = "";
	let tabHtml = "";
	let tabTitle = "";
	let lang = "en";
	let langres = {
		en: {
			errext: `Eonza is not available at <b>eonzaHost</b>. Try to <b><a href='eonzaHost'
				style='color:#fff;text-decoration:underline;' target='_blank'>open</a></b> it in the browser.`,
			help: "Help",
			helplink: "https://www.eonza.org/docs/chrome-extension.html",
			nourl: "Specify Eonza URL in Settings",
			run: "Run and open the script in the browser",
			runok: "Script is successfully run",
			runsilently: "Run silently",
			save: "Save",
			settings: "Settings",
		},
		ru: {
			errext: `Eonza не доступна по адресу <b>eonzaHost</b>. Попробуйте <b><a href='eonzaHost'
				style='color:#fff;text-decoration:underline;' target='_blank'>открыть</a></b> её в браузере.`,
			help: "Помощь",
			helplink: "https://www.eonza.org/ru/docs/chrome-extension.html",
			nourl: "Укажите Eonza URL в Настройках",
			run: "Запустить и открыть скрипт в браузере",
			runok: "Скрипт успешно запущен",
			runsilently: "Запустить скрытно",
			save: "Сохранить",
			settings: "Настройки",
		},
	};
	let lng = langres.en;
	let err = "";
	let list = [];

	chrome.runtime.onMessage.addListener(function (request, sender) {
		if (request.action == "getSource") {
			return request.source;
		}
	});

	function getSource() {
		var s = document.documentElement.outerHTML;
		chrome.runtime.sendMessage({ action: "getSource", source: s });
		return s;
	}

	document.addEventListener("DOMContentLoaded", async function () {
		lang = (navigator.language || navigator.userLanguage).substr(0, 2);
		if (lang == "ru") {
			lng = langres[lang];
		}
		let [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		chrome.scripting.executeScript(
			{
				target: { tabId: tab.id },
				function: getSource,
			},
			(e) => {
				if (!chrome.runtime.lastError) {
					/*chrome.runtime.lastError.message;*/
					tabHtml = e[0].result;
				}
			}
		);

		tabUrl = tab.url;
		tabTitle = tab.title;

		chrome.storage.sync.get(
			{
				eonzahost: "",
			},
			function (items) {
				eonzaHost = items.eonzahost;
				if (!!eonzaHost) {
					if (eonzaHost.charAt(eonzaHost.length - 1) == "/") {
						eonzaHost = eonzaHost.substr(0, eonzaHost.length - 1);
					}
					getScripts();
				}
			}
		);
	});

	async function getScripts() {
		try {
			const response = await fetch(`${eonzaHost}/api/browserext`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					// 'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: JSON.stringify({ url: tabUrl }),
			});
			let data = await response.json();
			list = data.list;
		} catch (error) {
			err = lng.errext.replaceAll("eonzaHost", encodeURI(eonzaHost));
		}
	}

	async function runScript(script, open) {
		err = "";
		try {
			const response = await fetch(`${eonzaHost}/api/browserrun`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: script.name,
					open: open,
					url: tabUrl,
					title: tabTitle,
					html: script.settings.html ? tabHtml : "",
				}),
			});
			let data = await response.json();
			if (!!data.error) {
				err = data.error;
			} else {
				success = lng.runok;
				setTimeout(() => (success = ""), 1000);
				if (!eonzaHost.startsWith(`http://localhost`) && open) {
					setTimeout(() => {
						let url = new URL(eonzaHost);
						url.port = data.port;
						window.open(url.toString(), "_blank");
					}, 1500);
				}
			}
		} catch (error) {
			err = error;
		}
	}
	function openOptions() {
		chrome.runtime.openOptionsPage();
	}
</script>

{#if err}
	<div class="ialert ierror">
		{@html err}
	</div>
{/if}
{#if success}
	<div class="ialert isuccess">
		{success}
	</div>
{/if}
{#if !eonzaHost}
	<div class="ialert iinfo">{lng.nourl}</div>
{/if}
<ul>
	{#each list as script}
		<li style="display:flex;justify-content:space-between">
			<div
				on:click={runScript(script, true)}
				class="run rleft"
				title={lng.run}
			>
				{script.title}<br />
				<small><i>{script.name}</i></small>
			</div>
			<div
				class="run"
				on:click={runScript(script, false)}
				title={lng.runsilently}
				style="display:flex;align-items:center;flex: 0 0 32px;"
			>
				<img
					src="images/right.png"
					alt="Options"
					style="width:16px;height: 24px"
				/>
			</div>
		</li>
	{/each}
</ul>

<div class="elist">
	<div class="menu" on:click={openOptions}>
		<img
			src="images/settings.png"
			alt={lng.settings}
			style="height:1.5rem;margin-right: 0.5rem;"
		/>{lng.settings}
	</div>
	<a class="menu" href={lng.helplink} target="_blank">
		<img
			src="images/question-circle.png"
			alt={lng.help}
			style="height:1.5rem;margin-right: 0.5rem;"
		/>{lng.help}
	</a>
</div>

<style>
	.ialert {
		padding: 0.3rem 0.5rem;
		border-radius: 6px;
		color: #fff;
		margin: 4px 0px;
	}
	.ierror {
		background-color: #e53935;
	}
	.iinfo {
		background-color: #3e8ed0;
	}
	.isuccess {
		background-color: #4caf50;
	}
	small {
		color: #999;
	}
	.run {
		cursor: pointer;
		border: 1px solid #aaa;
		padding: 0.3rem 0.5rem;
		line-height: 1rem;
		border-radius: 6px;
		margin: 2px 0px;
		background-color: #f7f7f7;
	}
	.rleft {
		flex-grow: 1;
		padding: 0.3rem 1rem;
		margin-right: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.run:hover {
		background-color: #eee;
	}
	.elist {
		margin-top: 2px;
		display: flex;
		justify-content: space-between;
	}
	.menu {
		cursor: pointer;
		padding: 0.5rem 1rem;
		vertical-align: middle;
		width: 50%;
		border-radius: 6px;
		color: #444;
		text-decoration: none;
	}
	.menu:hover {
		background-color: #eee;
	}
	.menu img {
		vertical-align: middle;
	}
</style>
