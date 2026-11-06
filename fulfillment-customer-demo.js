(() => {
	"use strict";
	const $ = selector => document.querySelector(selector);
	const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
	const storageKey = "kxt-customer-service-demo-v1";
	const stages = ["服务创建", "资料提交", "资料审核", "税局办理", "服务交付"];
	const stageTimes = ["2026-10-19 14:32:18", "2026-10-19 16:20:36", "2026-10-22 09:41:52", "2026-10-23 15:08:11"];
	const baseEvents = [
		{ time: "2026-10-23 15:08:11", title: "注册申请已递交", text: "您的注册申请已递交至德国税局，正在办理中。有新的办理结果将在此更新。" },
		{ time: "2026-10-22 09:41:52", title: "服务资料审核通过", text: "您提交的注册资料已通过审核，申请材料已准备完成。" },
		{ time: "2026-10-19 16:20:36", title: "已收到注册资料", text: "您的注册资料已提交，正在进行资料审核。" },
		{ time: "2026-10-19 14:32:18", title: "服务已创建", text: "德国 VAT 注册服务已创建。" }
	];
	function initialServices() {
		const base = { company: "YUANHANG TRADING LIMITED", name: "德国 VAT 注册", country: "德国", specification: "首次注册", createdAt: stageTimes[0], request: "" };
		return [
			{ ...base, id: "processing", number: "SV20261019000123", order: "DD2026101900123456", state: "processing", current: 3, times: [...stageTimes], reminders: [], events: [...baseEvents] },
			{ ...base, id: "supplement", number: "SV20261019000124", order: "DD2026101900123457", company: "YUANHANG TECHNOLOGY LIMITED", state: "supplement", current: 3, times: [...stageTimes], reminders: [], request: "请补充近三个月的经营地址证明，文件中的公司名称及地址需与本次注册信息一致。", events: [{ time: "2026-11-04 10:20:00", title: "需补充经营地址证明", text: "办理过程中需要补充资料。请提供近三个月的经营地址证明，资料补齐后将继续为您办理。" }, ...baseEvents] },
			{ ...base, id: "completed", number: "SV20261019000125", order: "DD2026101900123458", state: "completed", current: -1, taxNumber: "112/345/67890", effectiveDate: "2026-12-01", completedAt: "2026-10-29 11:45:00", times: [...stageTimes.slice(0, 3), "2026-10-29 10:20:00", "2026-10-29 11:45:00"], reminders: [], events: [{ time: "2026-10-29 11:45:00", title: "服务已完成，交付结果可查看", text: "本次注册服务已完成，您可查看德国税号及交付结果。", result: true }, { time: "2026-10-29 10:20:00", title: "已取得注册结果", text: "已收到税局出具的正式注册结果，正在为您整理交付文件。" }, ...baseEvents] },
			{ ...base, id: "preparation", number: "SV20261105000126", order: "DD2026110500123459", state: "preparation", current: 1, createdAt: "2026-11-05 09:30:00", times: ["2026-11-05 09:30:00"], reminders: [], request: "请提交本次注册所需的公司注册文件及经营地址证明。", events: [] }
		];
	}
	// 客户版只存储对客服务数据，不读取内部运营版状态。
	let services = initialServices(), storageAvailable = true;
	try {
		const saved = JSON.parse(localStorage.getItem(storageKey));
		if (saved?.schema === 1 && Array.isArray(saved.services) && saved.services.length === 4 && saved.services.every(s => typeof s.id === "string" && Array.isArray(s.events) && Array.isArray(s.times))) {
			services = saved.services;
			services.forEach(service => { service.reminders ||= []; });
		}
	} catch { storageAvailable = false; }
	let selectedId = services[0].id, selectedTab = "all", query = "", searchField = "number", country = "", selectedFiles = [], secondaryKind = "", returnFocus = null, toastTimer;
	const selected = () => services.find(service => service.id === selectedId);
	const status = service => ({
		processing: ["办理中", ""], supplement: ["待补充资料", "amber"], reviewing: ["补充资料审核中", ""],
		completed: ["服务已完成", "green"], preparation: ["待提交资料", "amber"], submitted: ["资料审核中", ""]
	})[service.state] || ["办理中", ""];
	const tag = service => `<span class="status-tag ${status(service)[1]}">${esc(status(service)[0])}</span>`;
	const needsFiles = service => ["supplement", "preparation"].includes(service.state);
	const formatTime = () => {
		const date = new Date();
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${date.toTimeString().slice(0, 8)}`;
	};
	function toast(message) {
		clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").hidden = false;
		toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 2500);
	}
	function persist() {
		try { localStorage.setItem(storageKey, JSON.stringify({ schema: 1, services })); storageAvailable = true; }
		catch { storageAvailable = false; }
	}
	function tabMatch(service, tab) {
		return tab === "all" || (tab === "action" ? needsFiles(service) : tab === "completed" ? service.state === "completed" : !needsFiles(service) && service.state !== "completed");
	}
	function renderList() {
		$("#listTabs").innerHTML = [["all", "全部"], ["action", "待提交资料"], ["processing", "办理中"], ["completed", "已完成"]].map(([key, label]) => `<button type="button" data-action="filter-tab" data-tab="${key}" class="${selectedTab === key ? "active" : ""}" aria-pressed="${selectedTab === key}">${label}（${services.filter(s => tabMatch(s, key)).length}）</button>`).join("");
		const filtered = services.filter(s => tabMatch(s, selectedTab) && (!country || s.country === country) && (!query || String(s[searchField]).toLowerCase().includes(query.toLowerCase())));
		$("#resultCount").textContent = `共 ${filtered.length} 条服务`;
		$("#totalCount").textContent = `共 ${filtered.length} 条`;
		$("#serviceRows").innerHTML = filtered.map((s, index) => `<tr data-service="${s.id}"><td>${index + 1}</td><td class="number">${esc(s.number)}</td><td>${esc(s.order)}</td><td>${esc(s.company)}</td><td>${esc(s.name)}</td><td>${esc(s.specification)}</td><td>${tag(s)}</td><td><div class="row-actions"><button class="link-btn" data-action="progress" data-id="${s.id}">查看进度</button>${needsFiles(s) ? `<button class="link-btn" data-action="upload-from-list" data-id="${s.id}">${s.state === "preparation" ? "提交资料" : "补充资料"}</button>` : s.state === "completed" ? `<button class="link-btn" data-action="result-from-list" data-id="${s.id}">交付结果</button>` : ""}</div></td></tr>`).join("") || '<tr><td colspan="8"><div class="empty-state">暂无符合条件的服务</div></td></tr>';
	}
	function stageView(service) {
		return `<ol class="customer-stages" aria-label="服务阶段">${stages.map((name, index) => {
			const done = service.current < 0 || index < service.current, current = index === service.current;
			return `<li class="customer-stage ${done ? "done" : current ? `current ${needsFiles(service) ? "attention" : ""}` : ""}" ${current ? 'aria-current="step"' : ""}><span class="stage-symbol">${done ? icon("check") : current ? icon("clock") : index + 1}</span><span class="stage-name">${name}</span><time class="stage-time">${service.times[index] ? `${current ? "进入 " : ""}${esc(service.times[index])}` : current ? needsFiles(service) ? "等待您提交" : "正在办理" : "待开始"}</time></li>`;
		}).join("")}</ol>`;
	}
	function noticeView(service) {
		let title, text;
		if (needsFiles(service)) { title = service.state === "preparation" ? "请提交注册资料" : "请补充经营地址证明"; text = service.request; }
		else if (["reviewing", "submitted"].includes(service.state)) { title = "已收到您提交的资料"; text = "资料正在审核中，审核结果将在进度明细中更新。"; }
		else if (service.state === "completed") { title = "本次服务已完成"; text = "注册结果已交付，您可在下方查看德国税号及交付文件。"; }
		else { title = "您的注册申请正在税局办理中"; text = "目前无需您操作，收到新的办理结果后将在此更新。"; }
		const remindable = ["processing", "supplement", "reviewing", "submitted"].includes(service.state), blocked = remindable && reminderBlocked(service);
		const reminderAction = remindable ? `<div class="action-controls"><button class="btn" data-action="remind" ${blocked ? "disabled" : ""}>${icon("bell")}${blocked ? "已催办" : "催办"}</button>${blocked ? `<small class="reminder-help">24 小时内已催办 · ${esc(blocked.slice(5, 16))}</small>` : ""}</div>` : service.state === "completed" ? '<button class="btn" data-action="result">查看交付结果</button>' : "";
		return `<div class="action-notice ${needsFiles(service) ? "amber" : ""}">${icon(needsFiles(service) ? "alert" : service.state === "completed" ? "check" : "clock")}<div><strong>${esc(title)}</strong><p>${esc(text)}</p></div>${needsFiles(service) ? `<button class="btn primary" data-action="upload">${icon("upload")}${service.state === "preparation" ? "提交资料" : "补充资料"}</button>` : reminderAction}</div>`;
	}
	function informationView(service) {
		const fields = [["国家 / 地区", service.country], ["基础服务编号", service.number], ["订单号", service.order], ["公司名称", service.company], ["服务类型", service.name], ["商品规格", service.specification], ["创建时间", service.createdAt]];
		if (service.state === "completed") fields.push(["德国税号", service.taxNumber], ["税号生效日期", service.effectiveDate]);
		return `<dl class="service-fields">${fields.map(([label, value]) => `<dt>${label}</dt><dd>${esc(value || "--")}</dd>`).join("")}</dl>${service.state === "completed" ? `<h3 class="delivery-title">交付文件</h3><div class="delivery-file">${icon("file-text")}<span>德国 VAT 注册交付单</span><button class="link-btn" data-action="result">查看</button><button class="icon-btn" data-action="download" aria-label="下载交付单" title="下载交付单">${icon("download")}</button></div>` : ""}`;
	}
	function timelineView(service) {
		const events = service.events.slice().sort((a, b) => b.time.localeCompare(a.time));
		return events.length ? `<ol class="public-timeline">${events.map(event => `<li class="timeline-event"><time>${esc(event.time.slice(0, 10))}<br>${esc(event.time.slice(11))}</time><div class="event-content"><h3>${esc(event.title)}</h3><p>${esc(event.text)}</p>${event.files?.length ? `<div class="event-files">${event.files.map(name => `<span>${esc(name)}</span>`).join("")}</div>` : ""}${event.result ? '<button class="link-btn" data-action="result">查看交付结果</button>' : ""}</div></li>`).join("")}</ol>` : '<div class="empty-state" id="timelineEmpty">暂无公开进展</div>';
	}
	function renderProgress() {
		const service = selected();
		if (!service) return;
		$("#progressDialog").innerHTML = `<header class="dialog-head"><h2 id="progressTitle">查看服务进度</h2>${tag(service)}<button class="icon-btn" data-action="close-progress" aria-label="关闭服务进度" title="关闭">${icon("x")}</button></header>
			<section class="progress-overview"><div class="service-heading"><h3>${esc(service.name)}</h3><span class="company-name">${esc(service.company)}</span></div>${stageView(service)}</section>
			${noticeView(service)}
			<div class="progress-content"><section class="service-information"><h3 class="section-title">服务信息</h3><div class="info-content">${informationView(service)}</div></section><section class="timeline-section"><h3 class="section-title">进度明细<small>最新进展在前</small></h3><div class="timeline-scroll" id="publicTimeline">${timelineView(service)}</div></section></div>
			<footer class="dialog-footer"><span class="footnote">基础服务编号：${esc(service.number)}</span><button class="btn" data-action="close-progress">关闭</button></footer>`;
	}
	function openProgress(id, focus = true) {
		selectedId = id; returnFocus = document.activeElement;
		renderProgress(); $("#progressLayer").hidden = false; document.body.classList.add("dialog-open");
		if (focus) $("#progressDialog .icon-btn").focus();
	}
	function closeProgress() {
		closeSecondary(false); $("#progressLayer").hidden = true; document.body.classList.remove("dialog-open");
		if (returnFocus?.isConnected) returnFocus.focus();
	}
	function openSecondary(title, content, actions) {
		$("#secondaryDialog").innerHTML = `<header class="dialog-head"><h2 id="secondaryTitle">${title}</h2><button class="icon-btn" data-action="close-secondary" aria-label="关闭弹窗" title="关闭">${icon("x")}</button></header><div class="secondary-body">${content}</div><footer class="dialog-footer">${actions}</footer>`;
		$("#secondaryLayer").hidden = false; $("#secondaryDialog .icon-btn").focus();
	}
	function closeSecondary(focus = true) {
		$("#secondaryLayer").hidden = true; secondaryKind = ""; selectedFiles = [];
		if (focus && !$("#progressLayer").hidden) $("#progressDialog .icon-btn").focus();
	}
	function openUpload() {
		const service = selected();
		if (!needsFiles(service)) return;
		secondaryKind = "upload"; selectedFiles = [];
		openSecondary(service.state === "preparation" ? "提交注册资料" : "补充资料", `<p class="request-context">${esc(service.number)}<br>${esc(service.company)}</p><p class="request-description">${esc(service.request)}</p>
			<div class="form-field"><label class="required">资料附件</label><div class="upload-control"><input type="file" id="fileInput" accept=".pdf,.png,.jpg,.jpeg" multiple><button class="btn" data-action="choose-files">${icon("upload")}选择文件</button><span class="field-help">PDF、PNG、JPG；单个不超过 20 MB，最多 5 个</span></div><ul class="upload-list" id="uploadList"></ul><div class="form-error" id="fileError" role="alert"></div></div>
			<div class="form-field"><label for="supplementNote">补充说明</label><textarea id="supplementNote" maxlength="500" placeholder="可补充说明本次提交的资料"></textarea></div>`,
			'<button class="btn" data-action="close-secondary">取消</button><button class="btn primary" data-action="submit-files">确认提交</button>');
	}
	function renderFiles() {
		$("#uploadList").innerHTML = selectedFiles.map((file, index) => `<li>${icon("file-text")}<span>${esc(file.name)} <small class="field-help">（${(file.size / 1024).toFixed(1)} KB）</small></span><button class="icon-btn" data-action="remove-file" data-index="${index}" aria-label="移除 ${esc(file.name)}" title="移除文件">${icon("x")}</button></li>`).join("");
	}
	function submitFiles() {
		const service = selected();
		if (!needsFiles(service)) return;
		if (!selectedFiles.length) { $("#fileError").textContent = "请至少选择 1 个资料附件"; return; }
		const button = $('[data-action="submit-files"]'); button.disabled = true;
		const firstSubmission = service.state === "preparation", time = formatTime(), note = $("#supplementNote").value.trim();
		service.events.unshift({ time, title: firstSubmission ? "注册资料已提交" : "补充资料已提交", text: `已收到您的${firstSubmission ? "注册" : "补充"}资料，正在审核中。${note ? `\n补充说明：${note}` : ""}`, files: selectedFiles.map(file => file.name) });
		service.state = firstSubmission ? "submitted" : "reviewing";
		if (firstSubmission) { service.times[1] = time; service.current = 2; }
		persist(); closeSecondary(false); renderList(); renderProgress(); $("#progressDialog .icon-btn").focus();
		toast(storageAvailable ? "资料已提交，等待审核" : "已记录本次提交；浏览器存储不可用，刷新后将恢复初始样例");
	}
	function deliveryMarkup(service) {
		return `<div class="delivery-preview"><span class="sample-label">演示样例</span><h3>德国 VAT 注册交付单</h3><dl>${[["公司名称", service.company], ["基础服务编号", service.number], ["订单号", service.order], ["德国税号", service.taxNumber], ["税号生效日期", service.effectiveDate], ["交付时间", service.completedAt]].map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`).join("")}</dl></div>`;
	}
	function openResult() {
		if (selected()?.state !== "completed") return;
		secondaryKind = "result";
		openSecondary("交付结果", deliveryMarkup(selected()), `<button class="btn" data-action="close-secondary">关闭</button><button class="btn primary" data-action="download">${icon("download")}下载交付单</button>`);
	}
	function canRemind(service) {
		return service && ["processing", "supplement", "reviewing", "submitted"].includes(service.state);
	}
	function reminderBlocked(service) {
		const last = service.reminders.at(-1);
		if (!last) return "";
		return Date.now() - new Date(last.replace(" ", "T")).getTime() < 24 * 60 * 60 * 1000 ? last : "";
	}
	function openReminder() {
		const service = selected();
		if (!canRemind(service) || reminderBlocked(service)) return;
		secondaryKind = "reminder";
		const stage = service.current >= 0 ? stages[service.current] : "服务交付";
		openSecondary("发起催办", `<p class="request-context">${esc(service.number)}<br>${esc(service.company)}<br>当前阶段：${esc(stage)}</p>
			<div class="request-description">已收到催办后，服务团队会尽快跟进并更新服务进度。同一服务 24 小时内仅可催办一次。</div>
			<div class="form-field"><label for="reminderNote">催办说明（选填）</label><textarea id="reminderNote" maxlength="200" placeholder="可说明希望重点跟进的问题"></textarea><p class="field-help">最多 200 字</p></div>`,
			'<button class="btn" data-action="close-secondary">取消</button><button class="btn primary" data-action="submit-reminder">确认催办</button>');
	}
	function submitReminder() {
		const service = selected();
		if (!canRemind(service)) return;
		if (reminderBlocked(service)) { $("#reminderError").textContent = "该服务 24 小时内已催办，请稍后再试"; return; }
		const note = $("#reminderNote").value.trim(), time = formatTime();
		service.reminders.push(time);
		service.events.unshift({ time, title: "您已发起催办", text: `已收到您的催办请求，服务团队会尽快跟进。${note ? `\n催办说明：${note}` : ""}` });
		persist(); closeSecondary(false); renderList(); renderProgress(); $("#progressDialog .icon-btn").focus();
		toast(storageAvailable ? "催办已提交" : "已记录本次催办；浏览器存储不可用，刷新后将恢复初始样例");
	}
	function download() {
		const service = selected();
		if (service?.state !== "completed") return;
		const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>德国VAT注册交付单（演示）</title><style>body{font:14px/1.8 sans-serif;max-width:760px;margin:50px auto;color:#334}dl{display:grid;grid-template-columns:130px 1fr;gap:14px}dd{margin:0}h3{text-align:center}dt{color:#889}.sample-label{color:#c88}</style>${deliveryMarkup(service)}<p>此文件为产品演示样例，不是税局签发文件。</p></html>`;
		const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" })), link = document.createElement("a");
		link.href = url; link.download = `德国VAT注册交付单-${service.number}-演示.html`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	document.addEventListener("click", e => {
		const el = e.target.closest("[data-action]");
		if (!el || el.disabled) return;
		const action = el.dataset.action;
		if (action === "progress") openProgress(el.dataset.id);
		else if (action === "close-progress") closeProgress();
		else if (action === "close-secondary") closeSecondary();
		else if (action === "upload") openUpload();
		else if (action === "remind") openReminder();
		else if (action === "submit-reminder") submitReminder();
		else if (action === "choose-files") $("#fileInput").click();
		else if (action === "remove-file") { selectedFiles.splice(Number(el.dataset.index), 1); $("#fileError").textContent = ""; renderFiles(); }
		else if (action === "submit-files") submitFiles();
		else if (action === "result") openResult();
		else if (action === "download") download();
		else if (action === "upload-from-list" || action === "result-from-list") { openProgress(el.dataset.id, false); action === "upload-from-list" ? openUpload() : openResult(); }
		else if (action === "filter-tab") { selectedTab = el.dataset.tab; renderList(); }
		else if (action === "list") { closeProgress(); selectedTab = "all"; renderList(); }
		else if (action === "reset-search") { $("#searchForm").reset(); query = ""; country = ""; searchField = "number"; selectedTab = "all"; renderList(); }
	});
	$("#searchForm").addEventListener("submit", e => { e.preventDefault(); query = $("#searchQuery").value.trim(); searchField = $("#searchField").value; country = $("#countryFilter").value; renderList(); });
	$("#serviceNav").addEventListener("click", () => { const expanded = $("#serviceNav").getAttribute("aria-expanded") === "true"; $("#serviceNav").setAttribute("aria-expanded", String(!expanded)); $("#serviceNavGroup").hidden = expanded; });
	document.addEventListener("change", e => {
		if (e.target.id !== "fileInput") return;
		const candidates = [...selectedFiles], problems = [];
		for (const file of e.target.files) {
			if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { problems.push("仅支持 PDF、PNG、JPG 文件"); continue; }
			if (!file.size) { problems.push("不能提交空文件"); continue; }
			if (file.size > 20 * 1024 * 1024) { problems.push("单个文件不能超过 20 MB"); continue; }
			if (candidates.some(item => item.name === file.name && item.size === file.size)) { problems.push("请勿重复选择同一文件"); continue; }
			if (candidates.length >= 5) { problems.push("最多选择 5 个资料附件"); continue; }
			candidates.push(file);
		}
		selectedFiles = candidates; $("#fileError").textContent = [...new Set(problems)].join("；"); e.target.value = ""; renderFiles();
	});
	document.addEventListener("keydown", e => {
		if (e.key === "Escape") { if (!$("#secondaryLayer").hidden) closeSecondary(); else if (!$("#progressLayer").hidden) closeProgress(); }
		if (e.key !== "Tab") return;
		const root = !$("#secondaryLayer").hidden ? $("#secondaryDialog") : !$("#progressLayer").hidden ? $("#progressDialog") : null;
		if (!root) return;
		const items = [...root.querySelectorAll('button:not(:disabled), input:not([type="file"]), textarea, select')].filter(item => item.getClientRects().length), first = items[0], last = items.at(-1);
		if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
		else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
	});
	renderList(); openProgress(services[0].id);
})();
