(() => {
	"use strict";
	const STORAGE_KEY = "kxt-fulfillment-upgrade-v2";
	const $ = (selector, root = document) => root.querySelector(selector);
	const clone = value => JSON.parse(JSON.stringify(value));
	const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
	const chip = (text, tone = "") => `<span class="chip ${tone}">${esc(text)}</span>`;
	const button = (text, action, style = "", attrs = "", symbol = "") => `<button type="button" class="btn ${style}" data-action="${action}" ${attrs}>${symbol ? icon(symbol) : ""}${text}</button>`;
	const uid = () => `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${d.toTimeString().slice(0, 8)}`;
	};
	const dueDate = days => {
		const d = new Date();
		d.setDate(d.getDate() + Number(days));
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 18:00`;
	};
	const outputs = {
		materialPackage: { label: "客户资料包", type: "file", sample: "客户注册资料包.pdf" },
		auditNote: { label: "审核结论", type: "textarea" },
		packageFile: { label: "完成资料包", type: "file", sample: "德国VAT注册申请包.pdf" },
		submitReceipt: { label: "递交凭证", type: "file", sample: "递交成功回执.pdf" },
		receiptNo: { label: "受理编号", type: "text", placeholder: "请输入税局或服务商确认的受理编号" },
		receiptFile: { label: "受理确认文件", type: "file", sample: "税局受理确认函.pdf" },
		taxNumber: { label: "德国税号", type: "text", placeholder: "请输入正式税号" },
		euVat: { label: "欧盟 VAT 号", type: "text", placeholder: "例如 DE123456789" },
		certificate: { label: "VAT 证书", type: "file", sample: "德国VAT注册证书.pdf" },
		effectiveDate: { label: "税号生效日期", type: "date" },
		deliveryNote: { label: "交付说明", type: "textarea" },
		customerConfirmed: { label: "已确认交付对象和交付内容", type: "checkbox" }
	};
	const roles = ["客户经理", "资料审核员", "制作专员", "递交专员", "履约专员", "交付专员"];
	const baseNodes = [
		{ id: "n1", name: "资料提交", phase: "资料准备", role: "客户经理", type: "人工任务", sla: 3, action: "提交资料", required: ["materialPackage"], returnTo: "" },
		{ id: "n2", name: "资料审核", phase: "资料准备", role: "资料审核员", type: "人工任务", sla: 1, action: "审核通过", required: ["auditNote"], returnTo: "n1" },
		{ id: "n3", name: "资料制作", phase: "资料准备", role: "制作专员", type: "人工任务", sla: 2, action: "确认资料包可用", required: ["packageFile"], returnTo: "n1" },
		{ id: "n4", name: "资料递交", phase: "外部办理", role: "递交专员", type: "人工任务", sla: 1, action: "确认递交成功", required: ["submitReceipt"], returnTo: "n3" },
		{ id: "n5", name: "税局受理", phase: "外部办理", role: "履约专员", type: "外部等待", sla: 12, action: "确认受理", required: ["receiptNo", "receiptFile"], returnTo: "n1" },
		{ id: "n6", name: "结果齐备", phase: "结果验收", role: "履约专员", type: "人工任务", sla: 3, action: "确认结果齐备", required: ["taxNumber", "certificate", "effectiveDate"], returnTo: "n5" },
		{ id: "n7", name: "服务交付", phase: "服务交付", role: "交付专员", type: "人工任务", sla: 1, action: "确认交付", required: ["deliveryNote", "customerConfirmed"], returnTo: "n6" }
	];
	const people = ["周敏", "陈洁", "王洋", "赵磊", "李晨浩", "李晨浩", "刘欣"];
	const dates = ["2026-10-19 16:20:36", "2026-10-20 10:12:08", "2026-10-22 09:41:52", "2026-10-23 15:08:11", "2026-10-29 10:20:00", "2026-10-29 11:12:00", "2026-10-29 11:45:00"];
	const sampleValues = [
		{ materialPackage: "客户注册资料包.pdf" }, { auditNote: "公司名称、注册地址及法人证件核验通过。" },
		{ packageFile: "德国VAT注册申请包.pdf" }, { submitReceipt: "递交成功回执.pdf" },
		{ receiptNo: "DE-FA-2026-1029", receiptFile: "税局受理确认函.pdf" },
		{ taxNumber: "112/345/67890", certificate: "德国VAT注册证书.pdf", effectiveDate: "2026-12-01" },
		{ deliveryNote: "已向客户交付税号、证书及首次申报指引。", customerConfirmed: true }
	];
	const contextScenarios = [["cycle", "周期服务"], ["unlinked", "无关联单据"], ["multiple", "多服务单关联"], ["restricted", "权限受限"], ["loadError", "资料加载失败"]];
	function seedContext(instance, kind) {
		const periodic = kind === "cycle", unlinked = kind === "unlinked";
		const service = {
			name: periodic ? "德国 VAT 注册及年度维护" : "德国 VAT 注册 · 首次注册", country: "德国",
			category: "国际税务 → VAT", productType: "基础服务 → 注册",
			specs: [{ label: "注册类型", value: "首次注册" }, { label: "服务方式", value: "自营" }],
			periodic, start: "2026-10-19", end: "2027-10-18", periodStatus: "服务中"
		};
		return {
			service,
			customer: { name: "深圳远航贸易有限公司", id: "KH202610190088", account: "yuanhang_trade", company: "深圳远航企业管理有限公司", accountType: "主账号", level: "B", source: "线上", channel: "否", registeredAt: "2025-03-18 10:26:43" },
			team: { owner: "李晨浩", accountant: "张静", support: "", manager: "周敏", provider: "德国自营团队" },
			company: { name: "YUANHANG TRADING LIMITED", location: "中国 / 深圳", legalPerson: "陈海", store: "" },
			permissions: { customer: kind !== "restricted", amount: kind !== "restricted", order: kind !== "restricted", service: kind !== "restricted" },
			loadStates: { customer: kind === "loadError" ? "error" : "ready", relations: kind === "loadError" ? "error" : "ready" },
			orders: unlinked || !instance.orderNo ? [] : [{ number: instance.orderNo, product: "德国 VAT 注册 · 首次注册 × 1", amount: "1,280.00", currency: "CNY", invoiced: "是", source: "CRM", type: "普通订单", status: "已完成", paidAt: "2026-10-19 14:30:06" }],
			serviceOrders: unlinked ? [] : [
				{ number: `FW${instance.code.slice(2)}`, name: service.name, status: "已生效", createdAt: instance.createdAt },
				...(kind === "multiple" ? [{ number: `FW${instance.code.slice(2)}-02`, name: "德国 VAT 注册 · 补充资料服务", status: "已生效", createdAt: "2026-10-23 16:10:00" }] : [])
			]
		};
	}
	function newRun(node, index, completed = false) {
		return { id: uid(), nodeId: node.id, round: 1, valid: true, status: completed ? "completed" : "active", actor: completed ? people[index] : "李晨浩", startedAt: index ? dates[index - 1] : "2026-10-19 14:32:18", endedAt: completed ? dates[index] : "", dueAt: "2026-11-04 18:00", values: completed ? clone(sampleValues[index]) : {} };
	}
	function seedInstance(kind) {
		const nodes = clone(baseNodes), finished = kind === "completed";
		const instance = {
			code: `SV20261019${({ active: "000123", empty: "000124", completed: "000125", returned: "000126", cycle: "000127", unlinked: "000128", multiple: "000129", restricted: "000130", loadError: "000131" })[kind] || "000123"}`,
			orderNo: kind === "unlinked" ? "" : "DD2026101900123456", createdAt: "2026-10-19 14:32:18", templateVersion: "V2.3", nodes, currentIndex: finished ? -1 : 4,
			runs: nodes.slice(0, finished ? 7 : 5).map((n, i) => newRun(n, i, finished || i < 4)),
			tickets: [], events: [], draft: {}, returnCount: 0
		};
		instance.context = seedContext(instance, kind);
		if (!finished && kind !== "empty" && kind !== "returned") {
			instance.tickets.push({ id: uid(), number: "WO202610270001", title: "税局要求补充经营地址证明", type: "资料补充", owner: "周敏", creator: "李晨浩", nodeId: "n5", runId: instance.runs[4].id, blocking: true, status: "处理中", createdAt: "2026-10-27 09:20:00", description: "税局要求提供近三个月经营地址证明，请客户经理收集后反馈。", resolution: "" });
		}
		if (kind === "returned") applyReturn(instance, 0, "税局反馈经营地址与申请表不一致，请补充最新证明并重新审核。", false);
		return instance;
	}
	function initialState() {
		return { schema: 2, scenario: "active", instances: Object.fromEntries(["active", "returned", "empty", "completed", ...contextScenarios.map(([kind]) => kind)].map(k => [k, seedInstance(k)])), published: { version: "V2.3", nodes: clone(baseNodes) }, draftTemplate: clone(baseNodes), versions: [{ version: "V2.3", time: "2026-10-18 16:00:00", note: "德国 VAT 注册标准流程，新增结果齐备与交付验收。", nodes: clone(baseNodes) }] };
	}
	let store;
	try { store = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* 存储不可用时仍可使用本次会话。 */ }
	if (!store || store.schema !== 2) store = initialState();
	// 只补充新增的展示资料，保留原有任务、草稿、工单及流程版本。
	for (const [kind] of contextScenarios) if (!store.instances[kind]) store.instances[kind] = seedInstance(kind);
	for (const [kind, instance] of Object.entries(store.instances)) if (!instance.context) instance.context = seedContext(instance, kind);
	let view = "detail", selectedNode = store.draftTemplate[4]?.id || store.draftTemplate[0].id, filterOpen = false, templateDirty = false, drawerDirty = false, toastTimer;
	let drawerContext = null;
	const current = () => store.instances[store.scenario];
	function activeNode(instance) { return instance.nodes[instance.currentIndex]; }
	function activeRun(instance) { return instance.runs.find(r => r.nodeId === activeNode(instance)?.id && r.status === "active" && r.valid); }
	const latestRun = (instance, nodeId) => instance.runs.filter(r => r.nodeId === nodeId).at(-1);
	const blockers = instance => instance.tickets.filter(t => t.runId === activeRun(instance)?.id && t.blocking && t.status !== "已完成");
	function persist() {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { toast("浏览器存储不可用，当前更改仅保留在本次会话"); }
	}
	function toast(text) {
		clearTimeout(toastTimer); $("#toast").textContent = text; $("#toast").hidden = false;
		toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3200);
	}
	function effectiveValues(instance) { return Object.assign({}, ...instance.runs.filter(r => r.valid && r.status === "completed").map(r => r.values)); }
	function event(instance, title, description) { instance.events.unshift({ title, description, actor: "李晨浩", time: now() }); }
	function nextProgressOrder(instance) { return instance.progressSequence = (instance.progressSequence || 0) + 1; }
	function overall(instance) {
		if (instance.currentIndex < 0) return ["已完成", "green"];
		if (blockers(instance).length) return ["等待协同", "amber"];
		if (activeNode(instance).type === "外部等待") return ["等待外部", "amber"];
		return [instance.returnCount && activeRun(instance).round > 1 ? "退回重办" : "进行中", "teal"];
	}
	function progressRecords(instance) {
		const records = [];
		if (instance.createdAt) records.push({ key: "created", kind: "created", title: "履约单已创建", description: `已绑定流程 ${instance.templateVersion}，按该版本开始办理。`, actor: "", time: instance.createdAt, rank: 0 });
		instance.runs.forEach((run, index) => {
			const node = instance.nodes.find(n => n.id === run.nodeId);
			if (!node) return;
			if (run.endedAt) {
				const returned = run.status === "returned", final = node.id === instance.nodes.at(-1).id;
				const result = Object.entries(run.values).map(([key, value]) => `${outputs[key]?.label || key}：${value === true ? "已确认" : value}`).join("；");
				records.push({ key: run.id, kind: "run", nodeId: node.id, runId: run.id, round: run.round, invalid: !run.valid,
					title: returned ? `${node.name}已退回重办` : final ? "服务已交付" : `${node.name}已完成`,
					description: returned ? run.reason : `${node.action}。${result || "本轮办理结果已确认。"}`,
					actor: run.actor, time: run.endedAt, order: run.endedOrder || 0, rank: returned ? 5 : 2, index });
			} else if (run.valid && run.status === "active") {
				records.push({ key: run.id, kind: "run", nodeId: node.id, runId: run.id, round: run.round,
					title: `进入${node.name}${run.round > 1 ? "，重新办理" : ""}`,
					description: node.type === "外部等待" ? "已进入外部办理环节，等待正式结果；收到后提交依据并确认。" : "本轮任务已生成，等待提交办理结果。",
					actor: run.actor, actorLabel: "责任人", time: run.startedAt, order: run.enteredOrder || 0, rank: 4, index });
			}
		});
		instance.tickets.forEach((ticket, index) => {
			const run = instance.runs.find(r => r.id === ticket.runId), node = instance.nodes.find(n => n.id === ticket.nodeId);
			const shared = { kind: "ticket", ticketId: ticket.id, round: run?.round, nodeName: node?.name || "历史节点", index };
			records.push({ ...shared, key: `${ticket.id}-created`, title: `发起协同：${ticket.title}`, description: `${ticket.description}${ticket.blocking ? " 该工单阻塞所关联轮次的节点推进。" : ""}`, actor: ticket.creator, time: ticket.createdAt, order: ticket.createdOrder || 0, rank: 6 });
			if (ticket.status === "已完成" && ticket.resolvedAt) records.push({ ...shared, key: `${ticket.id}-resolved`, title: `协同已完成：${ticket.title}`, description: `${ticket.resolution} 节点仍需提交办理结果后完成。`, actor: ticket.resolvedBy || "历史未记录", time: ticket.resolvedAt, order: ticket.resolvedOrder || 0, rank: 7 });
		});
		return records.filter(record => record.time).sort((a, b) => b.time.localeCompare(a.time) || (b.order || 0) - (a.order || 0) || b.rank - a.rank || (b.index || 0) - (a.index || 0));
	}
	function latestProgressView(instance) {
		const latest = progressRecords(instance)[0];
		return `<div class="latest-progress" id="latestProgress"><span class="latest-label">最新进展</span><p class="latest-copy" title="${esc(latest ? `${latest.title}；${latest.description}` : "")}">${latest ? `<b>${esc(latest.title)}</b><span>${esc(latest.description)}</span>` : "暂无业务进展"}</p>${latest ? `<time>${esc(latest.time)}</time>` : ""}<button class="link-btn" data-action="progress">进度明细${icon("chevron")}</button></div>`;
	}
	const field = (label, value) => `<div class="field"><dt>${label}</dt><dd>${value}</dd></div>`;
	function render() {
		$("#detailTab").classList.toggle("selected", view === "detail");
		$("#configTab").classList.toggle("selected", view === "config");
		document.querySelectorAll("button.side-item").forEach(el => el.classList.toggle("selected", el.dataset.action === `view-${view}`));
		$("#app").classList.toggle("detail-layout", view === "detail");
		$("#app").innerHTML = view === "detail" ? detailView() : configView();
		const milestones = $(".process-milestones"), currentMarker = $("#processTrack .current");
		if (milestones && currentMarker && milestones.scrollWidth > milestones.clientWidth) {
			milestones.scrollLeft = currentMarker.offsetLeft - milestones.offsetLeft - milestones.clientWidth / 2 + currentMarker.clientWidth / 2;
		}
	}
	function detailView() {
		const instance = current(), context = instance.context, status = overall(instance);
		const options = [["active", "税局处理中"], ["returned", "退回重办"], ["empty", "无关联工单"], ["completed", "已完成交付"], ...contextScenarios, ...(store.instances.fresh ? [["fresh", "新版本履约单"]] : [])];
		return `<header class="page-header">
			<div class="title-wrap"><div class="title-line"><h1>履约单详情</h1>${chip(status[0], status[1])}</div><div class="breadcrumb">履约管理 / 基础服务 / <span class="service-name">${esc(context.service.name)}</span></div></div>
			<label class="caption" for="scenario">评审样例</label><select id="scenario" class="scenario-select">${options.map(([v, l]) => `<option value="${v}" ${v === store.scenario ? "selected" : ""}>${l}</option>`).join("")}</select>
			<button class="icon-btn" data-action="reset" title="重置全部评审样例" aria-label="重置全部评审样例">${icon("rotate")}</button>
			<div class="header-actions">${context.serviceOrders.length && context.permissions.service ? button("查看服务单", "view-service", "", "", "file") : ""}${button("处理记录", "history", "", "", "history")}${button("流程配置", "view-config", "", "", "settings")}</div>
		</header>
		<section class="section" id="basicSection"><div class="section-head"><h2 class="section-title">基础信息</h2><div class="spacer"></div>${chip("德国 VAT 注册", "teal")}</div>
			<dl class="info-grid">
				${field("订单号", instance.orderNo ? `${context.permissions.order && context.orders.some(order => order.number === instance.orderNo) ? `<button class="link-btn number" id="orderNo" data-action="view-order" data-id="${esc(instance.orderNo)}">${esc(instance.orderNo)}</button>` : `<span class="number" id="orderNo">${esc(instance.orderNo)}</span>`}<button class="icon-btn" data-action="copy" data-value="${esc(instance.orderNo)}" title="复制订单号" aria-label="复制订单号">${icon("copy")}</button>` : '<span id="orderNo">--</span>')}
				${field("履约单号", `<span class="number" id="serviceCode">${instance.code}</span><button class="icon-btn" data-action="copy" data-value="${instance.code}" title="复制履约单号" aria-label="复制履约单号">${icon("copy")}</button>`)}
				${field("客户名称", context.permissions.customer ? esc(context.customer.name) : '<span class="muted">无权限查看</span>')}${field("履约负责人", esc(context.team.owner || "待分配"))}
				${field("国家 / 产品", "德国 / VAT 注册")}${field("关联会计师", esc(context.team.accountant || "待分配"))}
				${field("创建时间", esc(instance.createdAt || "2026-10-19 14:32:18"))}
			</dl>
		</section>
		<section class="section" id="processSection"><div class="section-head"><h2 class="section-title">流程节点与状态</h2>${instance.returnCount ? chip(`返工 ${instance.returnCount} 次`, "red") : ""}<div class="spacer"></div>
			<button class="link-btn" data-action="snapshot">绑定流程 ${instance.templateVersion}</button><span class="muted">｜</span><div class="legend"><span class="done">已完成</span><span class="active">当前处理</span><span>未开始</span><span class="returned">退回重办</span></div>
		</div><div class="process-overview"><div class="process-milestones" style="--process-width:${instance.nodes.length > 7 ? instance.nodes.length * 190 : 0}px">${processView(instance)}</div></div>${latestProgressView(instance)}${currentTaskView(instance)}</section>
		<section class="section" id="ticketSection"><div class="section-head"><h2 class="section-title">关联工单</h2>${chip(`${instance.tickets.length} 条`)}<div class="spacer"></div><label class="toggle-label"><input type="checkbox" id="openOnly" ${filterOpen ? "checked" : ""}>仅看未完成</label>${button("创建工单", "create-ticket", "small", instance.currentIndex < 0 ? "disabled title='履约已完成'" : "", "plus")}</div>${ticketTable(instance)}</section>
		<section class="section" id="businessSection"><div class="section-head"><h2 class="section-title">履约单详情</h2><div class="spacer"></div><span class="caption">资料版本 V3 · 最近更新 2026-10-23</span></div><div class="detail-content" id="detailContent">${businessView(instance)}${peopleView(instance)}${relationsView(instance)}${outcomesView(instance)}${filesView(instance)}</div></section>
		<footer class="page-foot"><span>履约升级 V2.2 · 内部运营 Demo</span><span>1920 × 1080</span></footer>`;
	}
	function processView(instance) {
		const groups = [];
		instance.nodes.forEach(n => { if (groups.at(-1)?.name === n.phase) groups.at(-1).count++; else groups.push({ name: n.phase, count: 1 }); });
		return `<div class="phase-strip" style="grid-template-columns:repeat(${instance.nodes.length},minmax(0,1fr))">${groups.map(g => `<div class="phase-label" style="grid-column:span ${g.count}">${esc(g.name)}</div>`).join("")}</div>
			<ol class="process-track" id="processTrack" style="grid-template-columns:repeat(${instance.nodes.length},minmax(0,1fr))">${instance.nodes.map((n, index) => {
				const run = latestRun(instance, n.id), complete = run?.status === "completed" && run.valid, isCurrent = instance.currentIndex === index;
				const css = complete ? "completed" : isCurrent ? `current ${blockers(instance).length ? "blocked" : ""}` : "pending";
				const label = complete ? "已完成" : isCurrent ? (run.round > 1 ? `第 ${run.round} 轮` : n.type === "外部等待" ? "等待外部" : "处理中") : run ? "待重办" : "未开始";
				return `<li class="node ${css}" data-node-id="${n.id}"><button class="node-button" data-action="node" data-id="${n.id}" aria-label="查看节点 ${esc(n.name)}">
					<span class="node-marker">${complete ? icon("check") : isCurrent ? icon("clock") : index + 1}</span>
					<span class="node-title"><span class="node-name">${esc(n.name)}</span>${chip(label, complete ? "teal" : isCurrent ? "amber" : "")}</span>
					<div class="node-meta">${complete ? `完成人：${esc(run.actor)}` : isCurrent ? `处理人：${esc(run.actor)}` : run ? "历史完成记录已保留" : `责任角色：${esc(n.role)}`}</div>
					<div class="node-meta time">${complete ? `完成 ${esc(run.endedAt)}` : isCurrent ? `进入 ${esc(run.startedAt.slice(0, 16))}` : run ? "本轮待重新办理" : "前序完成后进入"}</div>
				</button></li>`;
			}).join("")}</ol>`;
	}
	function currentTaskView(instance) {
		if (instance.currentIndex < 0) {
			const last = latestRun(instance, instance.nodes.at(-1).id);
			return `<div class="current-task"><span class="node-marker">${icon("check")}</span><div class="task-main"><div class="task-heading"><h3>服务已交付</h3>${chip("全部交付物已齐备", "green")}</div><div class="task-meta">完成人：${esc(last.actor)}<span>完成时间：${esc(last.endedAt)}</span></div></div>${button("查看交付成果", "show-outcomes")}</div>`;
		}
		const n = activeNode(instance), r = activeRun(instance), blocked = blockers(instance), saved = instance.draft[r.id] || {};
		return `<div class="current-task ${blocked.length ? "warning" : ""}"><div class="task-main"><div class="task-heading"><h3>当前任务：${esc(n.name)}</h3>${chip(n.type, "teal")}${r.round > 1 ? chip(`第 ${r.round} 轮办理`, "red") : ""}</div><div class="task-meta"><span>责任人：${esc(r.actor)}</span><span>应完成：${esc(r.dueAt)}</span><span>尚缺 ${n.required.filter(key => !saved[key]).length} 项必需交付物</span></div></div>
			${blocked.length ? `<button class="link-btn task-blocker" data-action="ticket" data-id="${blocked[0].id}">${icon("alert")}${blocked.length} 个阻塞工单待处理</button>` : `<span class="caption">${n.type === "外部等待" ? "等待正式回执，收到后确认受理" : "资料校验通过后推进下一节点"}</span>`}
			${n.returnTo ? button("退回重办", "return", "", "", "rotate") : ""}${button("办理当前任务", "task", "primary", "", "chevron")}</div>`;
	}
	function ticketTable(instance) {
		const list = instance.tickets.filter(t => !filterOpen || t.status !== "已完成");
		if (!list.length) return `<div class="empty-state" id="ticketEmpty">${icon("file")}<span>${instance.tickets.length ? "暂无符合条件的工单" : "暂无工单"}</span>${instance.tickets.length ? '<button class="link-btn" data-action="clear-filter">清空筛选</button>' : ""}</div>`;
		return `<div class="table-wrap"><table class="data-table"><colgroup><col style="width:175px"><col style="width:330px"><col style="width:95px"><col style="width:130px"><col style="width:110px"><col style="width:100px"><col style="width:100px"><col style="width:175px"><col style="width:90px"></colgroup><thead><tr><th>工单号</th><th>工单主题</th><th>关联节点</th><th>推进影响</th><th>状态</th><th>创建人</th><th>处理人</th><th>创建时间</th><th>操作</th></tr></thead><tbody>${list.map(t => {
			const n = instance.nodes.find(n => n.id === t.nodeId), blocksNow = t.runId === activeRun(instance)?.id && t.blocking && t.status !== "已完成";
			return `<tr><td><button class="link-btn" data-action="ticket" data-id="${t.id}">${esc(t.number)}</button></td><td>${esc(t.title)}</td><td>${esc(n?.name || "历史节点")}</td><td>${chip(blocksNow ? "阻塞推进" : t.blocking ? t.status === "已完成" ? "阻塞已解除" : "历史轮次" : "不阻塞", blocksNow ? "amber" : "")}</td><td>${chip(t.status, t.status === "已完成" ? "green" : "teal")}</td><td>${esc(t.creator)}</td><td>${esc(t.owner)}</td><td>${esc(t.createdAt.slice(0, 16))}</td><td><button class="link-btn" data-action="ticket" data-id="${t.id}">查看</button></td></tr>`;
		}).join("")}</tbody></table></div>`;
	}
	function businessView(instance) {
		const values = effectiveValues(instance);
		const { service, company } = instance.context;
		return `<h3 class="detail-group-title">服务信息</h3><dl class="info-grid grouped-grid">
			${field("服务名称", esc(service.name))}${field("国家", esc(service.country))}${field("服务类目", esc(service.category))}${field("商品类型", esc(service.productType))}
			${service.specs.map(spec => field(spec.label, esc(spec.value))).join("")}
			${service.periodic ? `${field("服务区间", `${esc(service.start)} ~ ${esc(service.end)}`)}${field("到期时间", esc(service.end))}${field("服务期状态", chip(service.periodStatus, "teal"))}` : ""}
		</dl><h3 class="detail-group-title">履约资料 <span class="caption">本单资料版本 V3 · 最近更新 2026-10-23 14:50:18</span></h3>
		<dl class="info-grid grouped-grid">${field("公司名称", esc(company.name))}${field("公司注册地", esc(company.location))}${field("法人", esc(company.legalPerson || "--"))}${field("店铺名称", esc(company.store || "--"))}
			${field("服务类型", "首次注册")}${field("递交方式", "API 递交")}${field("资料审核", values.auditNote ? "已通过" : "待审核")}${field("期望生效日期", "2026-12-01")}
			${field("德国税号", esc(values.taxNumber || "--"))}${field("欧盟 VAT 号", esc(values.euVat || "--"))}${field("VAT 证书", values.certificate ? `<button class="link-btn" data-action="preview" data-name="${esc(values.certificate)}">查看证书</button>` : '<span class="muted">待取得</span>')}${field("客户备注", "需在首次申报前完成注册")}
		</dl><div class="attachment-strip">${["materialPackage", "packageFile", "submitReceipt"].map(key => values[key] ? `<button class="link-btn" data-action="preview" data-name="${esc(values[key])}">${icon("file")}${esc(outputs[key].label)}</button>` : `<span>${esc(outputs[key].label)}：本轮未完成</span>`).join("")}</div>`;
	}
	function outcomesView(instance) {
		const values = effectiveValues(instance);
		return `<h3 class="detail-group-title" id="outcomesSection">交付成果</h3><div class="outcome-grid"><div><p class="caption">德国税号</p><p class="value">${esc(values.taxNumber || "待取得")}</p></div><div><p class="caption">VAT 证书</p><p class="value">${values.certificate ? `<button class="link-btn" data-action="preview" data-name="${esc(values.certificate)}">${esc(values.certificate)}</button>` : "待取得"}</p></div><div><p class="caption">税号生效日期</p><p class="value">${esc(values.effectiveDate || "--")}</p></div></div><div class="attachment-strip">${values.deliveryNote ? esc(values.deliveryNote) : "尚未完成服务交付"}</div>`;
	}
	function filesView(instance) {
		const files = Object.entries(effectiveValues(instance)).filter(([key]) => outputs[key]?.type === "file");
		return `<h3 class="detail-group-title" id="filesSection">往来附件</h3><div class="relation-table-wrap"><table class="data-table"><thead><tr><th>附件名称</th><th>业务用途</th><th>所属流程版本</th><th>操作</th></tr></thead><tbody>${files.map(([key, name]) => `<tr><td>${esc(name)}</td><td>${esc(outputs[key].label)}</td><td>${instance.templateVersion}</td><td><button class="link-btn" data-action="preview" data-name="${esc(name)}">预览</button></td></tr>`).join("") || '<tr><td colspan="4">暂无有效附件</td></tr>'}</tbody></table></div>`;
	}
	function regionError(region) {
		return `<div class="region-error" role="alert">${icon("alert")}<span>${region === "customer" ? "客户信息" : "关联单据"}加载失败</span>${button("重试", "retry-region", "small", `data-region="${region}"`, "rotate")}</div>`;
	}
	function peopleView(instance) {
		const { customer, team, permissions, loadStates } = instance.context;
		const customerContent = !permissions.customer ? '<div class="access-empty">无权限查看客户信息</div>' : loadStates.customer === "error" ? regionError("customer") : `<dl class="info-grid grouped-grid">
			${field("客户名称", esc(customer.name))}${field("客户 ID", esc(customer.id))}${field("客户账号", esc(customer.account))}${field("客户级别", esc(customer.level || "--"))}
			${field("主体公司名称", esc(customer.company))}${field("账号类型", esc(customer.accountType))}${field("数据来源", esc(customer.source))}${field("是否渠道用户", esc(customer.channel))}
			${field("注册时间", esc(customer.registeredAt))}
		</dl>`;
		return `<h3 class="detail-group-title">客户信息 <span class="caption">客户档案</span></h3>${customerContent}
			<h3 class="detail-group-title">服务团队 <span class="caption">当前分配</span></h3><dl class="info-grid grouped-grid">
			${field("履约负责人", esc(team.owner || "待分配"))}${field("当前工序负责人", esc(instance.currentIndex < 0 ? "--（无当前任务）" : activeRun(instance)?.actor || "待分配"))}${field("关联会计师", esc(team.accountant || "待分配"))}${field("客服专员", esc(team.support || "待分配"))}${field("客户经理", esc(team.manager || "待分配"))}${field("服务商", esc(team.provider || "待分配"))}
			</dl>`;
	}
	function orderLink(order, allowed) {
		return `<span class="document-number">${allowed ? `<button class="link-btn" data-action="view-order" data-id="${esc(order.number)}">${esc(order.number)}</button>` : `<span>${esc(order.number)}</span>`}<button class="icon-btn" data-action="copy" data-value="${esc(order.number)}" title="复制订单号" aria-label="复制订单号">${icon("copy")}</button></span>`;
	}
	function relationsView(instance) {
		const { orders, serviceOrders, permissions, loadStates } = instance.context;
		if (loadStates.relations === "error") return `<h3 class="detail-group-title">关联订单与单据关系</h3>${regionError("relations")}`;
		return `<h3 class="detail-group-title">关联订单 ${chip(`${orders.length} 条`)}</h3>
			${orders.length ? `<div class="relation-table-wrap"><table class="data-table order-table"><thead><tr><th style="width:230px">订单号</th><th>商品名称</th>${permissions.amount ? '<th style="width:135px">实付金额</th>' : ""}<th style="width:90px">是否开票</th><th style="width:100px">订单来源</th><th style="width:100px">订单类型</th><th style="width:100px">订单状态</th><th style="width:110px">操作</th></tr></thead><tbody>${orders.map(order => `<tr><td>${orderLink(order, permissions.order)}</td><td>${esc(order.product)}</td>${permissions.amount ? `<td>${esc(order.currency)} ${esc(order.amount)}</td>` : ""}<td>${esc(order.invoiced)}</td><td>${esc(order.source)}</td><td>${esc(order.type)}</td><td>${chip(order.status, "green")}</td><td>${permissions.order ? `<button class="link-btn" data-action="view-order" data-id="${esc(order.number)}">查看</button>` : '<span class="muted">无查看权限</span>'}</td></tr>`).join("")}</tbody></table></div>` : '<div class="access-empty">暂无关联订单</div>'}
			<h3 class="detail-group-title">关联关系</h3><div class="relation-table-wrap"><table class="data-table"><thead><tr><th style="width:160px">单据类型</th><th>单据编号</th><th>关联关系</th><th style="width:120px">操作</th></tr></thead><tbody>
			<tr><td>履约单</td><td>${esc(instance.code)}</td><td>当前履约单</td><td><span class="muted">当前单据</span></td></tr>
			${serviceOrders.map(item => `<tr><td>服务单</td><td>${esc(item.number)}</td><td>来源服务单</td><td>${permissions.service ? `<button class="link-btn" data-action="view-service" data-id="${esc(item.number)}">查看</button>` : '<span class="muted">无查看权限</span>'}</td></tr>`).join("")}
			${orders.map(item => `<tr><td>订单</td><td>${esc(item.number)}</td><td>来源订单</td><td>${permissions.order ? `<button class="link-btn" data-action="view-order" data-id="${esc(item.number)}">查看</button>` : '<span class="muted">无查看权限</span>'}</td></tr>`).join("")}
			</tbody></table></div>${serviceOrders.length ? "" : '<p class="relation-empty">暂无关联服务单</p>'}`;
	}
	function relatedDocument(kind, id) {
		const instance = current(), context = instance.context, service = kind === "service";
		if (!context.permissions[kind]) { toast("无权限查看该单据"); return; }
		if (context.loadStates.relations === "error") {
			openDrawer("关联单据", regionError("relations"), button("返回履约详情", "close-drawer", "", "", "arrow-left"));
			drawerContext = { kind: "related", documentKind: kind, documentId: id }; return;
		}
		const list = service ? context.serviceOrders : context.orders;
		if (service && !id && list.length > 1) {
			openDrawer("选择关联服务单", `<p class="caption related-origin">履约单：${esc(instance.code)}</p>${list.map(item => `<article class="related-option"><div><h3>${esc(item.name)}</h3><p class="caption">${esc(item.number)} · ${esc(item.status)}</p></div>${button("查看", "view-service", "small", `data-id="${esc(item.number)}"`, "chevron")}</article>`).join("")}`, button("返回履约详情", "close-drawer", "", "", "arrow-left"));
			drawerContext = { kind: "related" }; return;
		}
		const item = list.find(entry => entry.number === id) || (!id && list.length === 1 ? list[0] : null);
		if (!item) { toast(service ? "暂无关联服务单" : "暂无关联订单"); return; }
		const pair = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
		const details = service ? `${pair("服务名称", esc(item.name))}${pair("国家", esc(context.service.country))}${pair("服务单状态", esc(item.status))}${pair("创建时间", esc(item.createdAt))}${pair("服务类目", esc(context.service.category))}${pair("商品类型", esc(context.service.productType))}${context.service.periodic ? `${pair("服务区间", `${esc(context.service.start)} ~ ${esc(context.service.end)}`)}${pair("服务期状态", chip(context.service.periodStatus, "teal"))}` : ""}` :
			`${pair("商品名称", esc(item.product))}${pair("订单状态", chip(item.status, "green"))}${context.permissions.amount ? pair("实付金额", `${esc(item.currency)} ${esc(item.amount)}`) : ""}${pair("是否开票", esc(item.invoiced))}${pair("订单来源", esc(item.source))}${pair("订单类型", esc(item.type))}${pair("支付时间", esc(item.paidAt))}`;
		openDrawer(service ? "服务单详情" : "订单详情", `<div class="drawer-subtitle"><span class="number">${esc(item.number)}</span><button class="icon-btn" data-action="copy" data-value="${esc(item.number)}" title="复制单号" aria-label="复制单号">${icon("copy")}</button></div><dl class="read-grid">${details}</dl><h3 class="form-section-title">来源履约单</h3><p class="number">${esc(instance.code)}</p>`, `${service && list.length > 1 ? button("全部关联服务单", "view-service") : ""}${button("返回履约详情", "close-drawer", "", "", "arrow-left")}`);
		drawerContext = { kind: "related" };
	}
	function openDrawer(title, body, footer = "") {
		$("#overlay").hidden = false; $("#drawer").hidden = false;
		$("#drawer").innerHTML = `<header class="drawer-head"><h2 id="drawerTitle">${title}</h2><button class="icon-btn" data-action="close-drawer" title="关闭" aria-label="关闭抽屉">${icon("x")}</button></header><div class="drawer-body">${body}</div>${footer ? `<footer class="drawer-footer">${footer}</footer>` : ""}`;
		drawerDirty = false; $("#drawer .icon-btn")?.focus();
	}
	function closeDrawer(force = false) {
		if (drawerDirty && !force) { openModal("放弃未保存的内容？", "<p>关闭后，本次尚未保存的输入将被丢弃。</p>", `${button("继续编辑", "close-modal")}${button("放弃更改", "discard-drawer", "danger")}`); return; }
		$("#drawer").hidden = true; $("#overlay").hidden = true; drawerContext = null; drawerDirty = false;
	}
	function openModal(title, body, footer) {
		$("#modalLayer").hidden = false;
		$("#modal").innerHTML = `<header class="modal-head"><h2 id="modalTitle">${title}</h2><button class="icon-btn" data-action="close-modal" title="关闭" aria-label="关闭弹窗">${icon("x")}</button></header><div class="modal-body">${body}</div><footer class="modal-footer">${footer}</footer>`;
		$("#modal input:not([readonly]), #modal textarea, #modal select, #modal button")?.focus();
	}
	function closeModal() { $("#modalLayer").hidden = true; }
	function outputField(key, value) {
		const spec = outputs[key];
		let control;
		if (spec.type === "file") control = `<div class="file-control"><input type="file" id="upload-${key}" data-upload="${key}" accept=".pdf,.png,.jpg,.jpeg,.zip"><span class="file-name" data-file-name="${key}">${esc(value || "尚未选择文件")}</span>${button("选择文件", "upload", "small", `data-key="${key}"`)}<button type="button" class="link-btn" data-action="sample-file" data-key="${key}">样例文件</button></div><input type="hidden" data-output="${key}" value="${esc(value || "")}">`;
		else if (spec.type === "textarea") control = `<textarea data-output="${key}" maxlength="500" placeholder="请输入${esc(spec.label)}">${esc(value || "")}</textarea>`;
		else if (spec.type === "checkbox") control = `<label class="toggle-label"><input type="checkbox" data-output="${key}" ${value ? "checked" : ""}>确认无误</label>`;
		else control = `<input type="${spec.type}" data-output="${key}" value="${esc(value || "")}" maxlength="80" placeholder="${esc(spec.placeholder || "")}">`;
		return `<div class="form-field"><label class="required">${spec.label}</label>${control}<div class="error" data-error="${key}"></div></div>`;
	}
	function taskDrawer() {
		const instance = current(), node = activeNode(instance), run = activeRun(instance);
		if (!node) return;
		drawerContext = { kind: "task", runId: run.id };
		const blocked = blockers(instance);
		openDrawer(`办理任务 · ${esc(node.name)}`, `<div class="drawer-subtitle">${chip(run.round > 1 ? `第 ${run.round} 轮` : node.type, run.round > 1 ? "red" : "teal")}<span class="caption">${instance.code} · ${instance.templateVersion}</span><span class="spacer"></span><button class="link-btn" data-action="node-history" data-id="${node.id}">本节点记录</button></div>
			<dl class="read-grid"><div><dt>处理人 / 责任角色</dt><dd>${esc(run.actor)} / ${esc(node.role)}</dd></div><div><dt>应完成时间</dt><dd>${esc(run.dueAt)}</dd></div></dl>
			${blocked.length ? `<div class="notice">${icon("alert")}<div>本任务有 ${blocked.length} 个未完成的阻塞工单。<br><button class="link-btn" data-action="ticket" data-id="${blocked[0].id}">查看 ${esc(blocked[0].number)}</button></div></div>` : '<div class="notice info">必需交付物校验通过后才能完成节点。保存草稿不会推进流程。</div>'}
			<div id="taskError" class="error-box" hidden></div><h3 class="form-section-title">本次办理结果</h3><form id="taskForm" novalidate>${node.required.map(key => outputField(key, instance.draft[run.id]?.[key])).join("")}</form>`,
			`${button("取消", "close-drawer")}${button("保存草稿", "save-task")}${button(esc(node.action), "complete-task", "primary")}`);
	}
	function readTaskValues() { return Object.fromEntries([...document.querySelectorAll("[data-output]")].map(el => [el.dataset.output, el.type === "checkbox" ? el.checked : el.value.trim()])); }
	function saveTask(complete) {
		const instance = current(), run = activeRun(instance), node = activeNode(instance);
		if (!run || drawerContext?.runId !== run.id) return;
		const values = readTaskValues();
		document.querySelectorAll("[data-error]").forEach(el => { el.textContent = ""; }); $("#taskError").hidden = true;
		if (!complete) { instance.draft[run.id] = values; event(instance, `保存${node.name}草稿`, `第 ${run.round} 轮，流程未推进`); persist(); drawerDirty = false; render(); toast("草稿已保存，流程未推进"); return; }
		let invalid = false;
		for (const key of node.required) {
			let error = !values[key] ? `请${outputs[key].type === "file" ? "上传" : outputs[key].type === "checkbox" ? "勾选" : "填写"}${outputs[key].label}` : "";
			if (key === "euVat" && values[key] && !/^DE\d{9}$/.test(values[key])) error = "欧盟 VAT 号格式应为 DE 加 9 位数字";
			if (error) { $(`[data-error="${key}"]`).textContent = error; invalid = true; }
		}
		if (blockers(instance).length) { $("#taskError").textContent = "请先处理当前轮次的阻塞工单，再完成此任务。"; $("#taskError").hidden = false; invalid = true; }
		if (invalid) return;
		run.status = "completed"; run.endedAt = now(); run.endedOrder = nextProgressOrder(instance); run.values = values; delete instance.draft[run.id];
		const before = node.name;
		if (instance.currentIndex === instance.nodes.length - 1) instance.currentIndex = -1;
		else {
			instance.currentIndex++;
			const next = activeNode(instance), past = instance.runs.filter(r => r.nodeId === next.id);
			instance.runs.push({ id: uid(), nodeId: next.id, round: past.length + 1, valid: true, status: "active", actor: "李晨浩", startedAt: now(), enteredOrder: nextProgressOrder(instance), endedAt: "", dueAt: dueDate(next.sla), values: {} });
		}
		event(instance, `完成${before}`, `${node.action}；${instance.currentIndex < 0 ? "全部节点完成，服务已交付" : `进入${activeNode(instance).name}`}`);
		persist(); closeDrawer(true); render(); toast(instance.currentIndex < 0 ? "交付已确认，履约完成" : `${before}已完成，已进入${activeNode(instance).name}`);
	}
	function nodeDrawer(id, historyOnly = false) {
		const instance = current(), node = instance.nodes.find(n => n.id === id);
		if (activeNode(instance)?.id === id && !historyOnly) { taskDrawer(); return; }
		const runs = instance.runs.filter(r => r.nodeId === id).slice().reverse(); drawerContext = { kind: "node" };
		openDrawer(`节点记录 · ${esc(node.name)}`, `<div class="drawer-subtitle">${chip(node.type, "teal")}<span class="caption">责任角色：${esc(node.role)} · ${instance.templateVersion}</span></div>
			${runs.length ? runs.map(r => `<article class="record"><h3>第 ${r.round} 轮 ${chip(r.valid ? r.status === "completed" ? "有效完成" : "处理中" : r.status === "returned" ? "已退回" : "历史完成已失效", r.valid ? "teal" : "red")}</h3><p>${esc(r.actor)} · ${r.status === "completed" ? "完成时间" : "结束时间"} ${esc(r.endedAt || "--")}</p><p class="caption">进入时间：${esc(r.startedAt)}</p>${r.reason ? `<p class="record-detail">${esc(r.reason)}</p>` : ""}<div class="record-detail">${Object.entries(r.values).map(([k, v]) => `${esc(outputs[k]?.label || k)}：${esc(v === true ? "已确认" : v)}`).join("<br>") || "尚未提交办理结果"}</div></article>`).join("") : '<div class="empty-state">本节点尚未开始</div>'}`, `${button("关闭", "close-drawer")}${historyOnly ? button("返回当前任务", "task") : ""}`);
	}
	function historyDrawer() {
		const instance = current(), records = [...instance.events, ...instance.runs.filter(r => r.endedAt).map(r => ({ title: `${instance.nodes.find(n => n.id === r.nodeId)?.name} · 第 ${r.round} 轮${r.status === "returned" ? "退回" : "完成"}`, description: r.reason || (r.valid ? "有效节点执行记录" : "记录保留，本轮结果已失效"), actor: r.actor, time: r.endedAt }))].sort((a, b) => b.time.localeCompare(a.time));
		drawerContext = { kind: "history" };
		openDrawer("处理记录", `<nav class="record-tabs" aria-label="记录类型"><button data-action="progress">业务进展</button><button class="active" data-action="history" aria-current="page">操作记录</button></nav><div class="drawer-subtitle"><span class="caption">${instance.code} · 全部轮次 · ${records.length} 条</span></div>${records.map(r => `<article class="record"><h3>${esc(r.title)}</h3><p class="caption">${esc(r.actor)} · ${esc(r.time)}</p><p class="record-detail">${esc(r.description)}</p></article>`).join("") || '<div class="empty-state">暂无处理记录</div>'}`, button("关闭", "close-drawer"));
	}
	function progressDrawer() {
		const instance = current(), records = progressRecords(instance), status = overall(instance);
		drawerContext = { kind: "progress" };
		openDrawer("进度明细", `<nav class="record-tabs" aria-label="记录类型"><button class="active" data-action="progress" aria-current="page">业务进展</button><button data-action="history">操作记录</button></nav><div class="drawer-subtitle">${chip(status[0], status[1])}<span class="caption">${instance.code} · 全部轮次 · ${records.length} 条</span></div><ol class="business-timeline" id="businessTimeline">${records.map((record, index) => `<li class="progress-record ${index === 0 ? "latest" : ""} ${record.invalid ? "invalid" : ""}" data-time="${esc(record.time)}" data-kind="${record.kind}">
			<time>${esc(record.time)}</time><div class="progress-record-content"><div class="progress-record-title"><h3>${esc(record.title)}</h3>${index === 0 ? chip("最新", "teal") : ""}${record.invalid ? chip("历史结果已失效", "red") : ""}</div>
			<p>${esc(record.description)}</p><div class="progress-record-meta">${record.actor ? `<span>${record.actorLabel || "操作人"}：${esc(record.actor)}</span>` : "<span>来源：履约实例</span>"}${record.round ? `<span>${esc(record.nodeName || instance.nodes.find(n => n.id === record.nodeId)?.name)} · 第 ${record.round} 轮</span>` : ""}${record.kind === "run" ? `<button class="link-btn" data-action="progress-node" data-id="${record.nodeId}">查看节点记录</button>` : record.kind === "ticket" ? `<button class="link-btn" data-action="ticket" data-id="${record.ticketId}">查看工单</button>` : ""}</div></div></li>`).join("") || '<li class="empty-state">暂无业务进展</li>'}</ol>`, button("关闭", "close-drawer"));
	}
	function createTicket() {
		const instance = current(), node = activeNode(instance);
		if (!node) return;
		openModal("创建工单", `<div class="notice info">关联 ${esc(node.name)} · 第 ${activeRun(instance).round} 轮办理</div><form id="ticketForm" novalidate>
			<div class="form-field"><label class="required" for="ticketTitle">工单主题</label><input id="ticketTitle" maxlength="80" placeholder="请输入需要协同处理的问题"><div class="error" id="ticketTitleError"></div></div>
			<div class="editor-grid"><div class="form-field"><label for="ticketType">工单类型</label><select id="ticketType"><option>资料补充</option><option>业务异常</option><option>内部协同</option></select></div><div class="form-field"><label for="ticketOwner">处理人</label><select id="ticketOwner"><option>周敏</option><option>陈洁</option><option>李晨浩</option></select></div></div>
			<div class="form-field"><label class="required" for="ticketDescription">问题描述</label><textarea id="ticketDescription" maxlength="500" placeholder="说明待处理事项和预期结果"></textarea><div class="error" id="ticketDescriptionError"></div></div><label class="toggle-label"><input type="checkbox" id="ticketBlocking">阻塞当前节点推进</label></form>`, `${button("取消", "close-modal")}${button("创建工单", "submit-ticket", "primary")}`);
	}
	function submitTicket() {
		const title = $("#ticketTitle").value.trim(), description = $("#ticketDescription").value.trim();
		$("#ticketTitleError").textContent = title ? "" : "请输入工单主题"; $("#ticketDescriptionError").textContent = description ? "" : "请输入问题描述";
		if (!title || !description) return;
		const instance = current(), ticket = { id: uid(), number: `WO${now().slice(0, 10).replace(/-/g, "")}${String(instance.tickets.length + 2).padStart(4, "0")}`, title, description, type: $("#ticketType").value, owner: $("#ticketOwner").value, creator: "李晨浩", nodeId: activeNode(instance).id, runId: activeRun(instance).id, blocking: $("#ticketBlocking").checked, status: "待处理", createdAt: now(), createdOrder: nextProgressOrder(instance), resolution: "" };
		instance.tickets.unshift(ticket); event(instance, "创建关联工单", `${ticket.number} · ${title}${ticket.blocking ? " · 阻塞当前节点" : ""}`);
		filterOpen = false; persist(); closeModal(); render(); toast("工单已创建");
	}
	function ticketDrawer(id) {
		// 切换至工单前保存任务草稿，避免办理输入丢失。
		if (drawerContext?.kind === "task" && drawerDirty) { current().draft[drawerContext.runId] = readTaskValues(); persist(); }
		const instance = current(), ticket = instance.tickets.find(t => t.id === id); drawerContext = { kind: "ticket", ticketId: id };
		openDrawer("工单详情", `<div class="drawer-subtitle"><span class="number">${esc(ticket.number)}</span>${chip(ticket.status, ticket.status === "已完成" ? "green" : "teal")}${ticket.blocking ? chip("阻塞型工单", "amber") : ""}</div><h2>${esc(ticket.title)}</h2>
			<dl class="read-grid" style="margin-top:22px"><div><dt>关联节点</dt><dd>${esc(instance.nodes.find(n => n.id === ticket.nodeId)?.name)} · ${ticket.runId === activeRun(instance)?.id ? "当前轮次" : "历史轮次"}</dd></div><div><dt>处理人 / 类型</dt><dd>${esc(ticket.owner)} / ${esc(ticket.type)}</dd></div><div><dt>创建人</dt><dd>${esc(ticket.creator)}</dd></div><div><dt>创建时间</dt><dd>${esc(ticket.createdAt)}</dd></div></dl>
			<h3 class="form-section-title">问题描述</h3><p class="record-detail">${esc(ticket.description)}</p><h3 class="form-section-title">处理结果</h3>
			${ticket.status === "已完成" ? `<p class="record-detail">${esc(ticket.resolution)}</p><p class="caption">完成人：李晨浩 · ${esc(ticket.resolvedAt)}</p>` : '<div class="form-field"><label class="required" for="ticketResolution">结果说明</label><textarea id="ticketResolution" maxlength="500" placeholder="请填写处理结论"></textarea><div class="error" id="resolutionError"></div></div>'}
			<div class="notice info" style="margin-top:22px">工单完成后解除该工单的阻塞，节点仍需提交有效办理结果后完成。</div>`, `${button("关闭", "close-drawer")}${instance.currentIndex >= 0 ? button("返回当前任务", "task") : ""}${ticket.status !== "已完成" ? button("完成工单", "resolve-ticket", "primary") : ""}`);
	}
	function resolveTicket() {
		const resolution = $("#ticketResolution").value.trim();
		if (!resolution) { $("#resolutionError").textContent = "请填写处理结果"; return; }
		const ticket = current().tickets.find(t => t.id === drawerContext.ticketId);
		ticket.status = "已完成"; ticket.resolution = resolution; ticket.resolvedAt = now(); ticket.resolvedBy = "李晨浩"; ticket.resolvedOrder = nextProgressOrder(current()); event(current(), "完成关联工单", `${ticket.number} · 节点状态未自动改变`);
		persist(); render(); ticketDrawer(ticket.id); toast("工单已完成，请继续办理节点任务");
	}
	function applyReturn(instance, targetIndex, reason, addEvent = true) {
		const from = instance.currentIndex, target = instance.nodes[targetIndex], oldRun = activeRun(instance);
		for (const run of instance.runs) {
			const index = instance.nodes.findIndex(n => n.id === run.nodeId);
			if (run.valid && index >= targetIndex && index <= from) {
				run.valid = false; run.reason = reason;
				if (run.status === "active") { run.status = "returned"; run.endedAt = addEvent ? now() : "2026-10-28 16:40:00"; run.endedOrder = nextProgressOrder(instance); }
			}
		}
		delete instance.draft[oldRun.id]; instance.currentIndex = targetIndex;
		const previous = instance.runs.filter(r => r.nodeId === target.id);
		instance.runs.push({ id: uid(), nodeId: target.id, round: previous.length + 1, valid: true, status: "active", actor: "李晨浩", startedAt: addEvent ? now() : "2026-10-28 16:40:00", enteredOrder: nextProgressOrder(instance), endedAt: "", dueAt: addEvent ? dueDate(target.sla) : "2026-10-31 18:00", values: {} });
		instance.returnCount++;
		if (addEvent) event(instance, "退回重办", `退回至${target.name}：${reason}；后续执行结果失效，历史记录保留。`);
	}
	function returnModal() {
		const instance = current(), node = activeNode(instance), targetIndex = instance.nodes.findIndex(n => n.id === node.returnTo);
		if (targetIndex < 0 || targetIndex >= instance.currentIndex) return;
		openModal("退回重办", `<div class="notice">${icon("alert")}<div>退回后，从目标节点至当前节点的本轮结果失效，原完成人、完成时间和附件继续保留在历史记录中。</div></div><div class="form-field"><label>退回节点</label><input id="returnTarget" value="${esc(instance.nodes[targetIndex].name)}" readonly><p class="field-help">按绑定流程 ${instance.templateVersion} 的退回规则执行</p></div><div class="form-field"><label class="required" for="returnReason">退回原因</label><textarea id="returnReason" maxlength="500" placeholder="说明问题及重新办理的要求"></textarea><div class="error" id="returnError"></div></div><p class="caption">影响节点：${instance.nodes.slice(targetIndex, instance.currentIndex + 1).map(n => esc(n.name)).join("、")}</p>`, `${button("取消", "close-modal")}${button("确认退回", "confirm-return", "danger", `data-target="${targetIndex}"`)}`);
	}
	function configView() {
		const nodes = store.draftTemplate, node = nodes.find(n => n.id === selectedNode) || nodes[0], index = nodes.indexOf(node); selectedNode = node.id;
		return `<header class="page-header"><button class="icon-btn" data-action="view-detail" title="返回履约详情" aria-label="返回履约详情">${icon("arrow-left")}</button><div class="title-wrap"><div class="title-line"><h1>流程配置</h1>${chip("草稿", "amber")}<span class="caption" id="dirtyLabel">${templateDirty ? "存在未保存更改" : "草稿已保存"}</span></div><div class="breadcrumb">履约管理 / 流程配置 / 德国 VAT 注册</div></div>${button("发布记录", "versions", "", "", "history")}${button("新建履约样例", "fresh-instance", "", "", "plus")}</header>
			<section class="config-summary"><div class="info"><span class="caption">流程模板</span><p class="strong">德国 VAT 注册标准流程</p></div><div class="info"><span class="caption">适用范围</span><p>德国 / VAT 注册 / 自营</p></div><div class="info"><span class="caption">当前生效版本</span><p>${chip(store.published.version, "teal")} · ${store.published.nodes.length} 个节点</p></div><div class="spacer"></div><span class="caption">发布新版本仅影响新建履约单，存量单继续执行绑定版本</span></section>
			<div id="configErrors" class="error-box" hidden></div><div class="config-main"><aside class="node-list"><div class="node-list-head"><h2>流程节点 <span class="caption">${nodes.length} / 12</span></h2>${button("新增节点", "add-node", "small", nodes.length >= 12 ? "disabled" : "", "plus")}</div>${nodes.map((n, i) => `<button class="config-node ${node.id === n.id ? "active" : ""}" data-action="select-node" data-id="${n.id}"><span class="node-index">${i + 1}</span><span class="config-node-text"><b>${esc(n.name || "未命名节点")}</b><small>${esc(n.role || "未分配角色")} · ${esc(n.type)}</small></span>${icon("chevron")}</button>`).join("")}</aside>
			<section class="config-editor"><div class="editor-heading"><h2>节点设置 · <span id="editorName">${esc(node.name || "未命名节点")}</span></h2><span class="caption">${esc(node.id)}</span><button class="icon-btn" data-action="move-node" data-direction="-1" title="上移节点" aria-label="上移节点" ${index === 0 ? "disabled" : ""}>${icon("arrow-up")}</button><button class="icon-btn" data-action="move-node" data-direction="1" title="下移节点" aria-label="下移节点" ${index === nodes.length - 1 ? "disabled" : ""}>${icon("arrow-down")}</button><button class="icon-btn" data-action="delete-node" title="删除节点" aria-label="删除节点" ${nodes.length <= 2 ? "disabled" : ""}>${icon("trash")}</button></div>
			<div class="editor-grid"><div class="form-field"><label class="required" for="cfgName">节点名称</label><input id="cfgName" data-config="name" value="${esc(node.name)}" maxlength="16"></div>
			<div class="form-field"><label for="cfgPhase">所属阶段</label><select id="cfgPhase" data-config="phase">${["资料准备", "外部办理", "结果验收", "服务交付"].map(p => `<option ${p === node.phase ? "selected" : ""}>${p}</option>`).join("")}</select></div>
			<div class="form-field"><label for="cfgType">节点类型</label><select id="cfgType" data-config="type">${["人工任务", "外部等待"].map(t => `<option ${t === node.type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
			<div class="form-field"><label class="required" for="cfgRole">责任角色</label><select id="cfgRole" data-config="role"><option value="">请选择</option>${roles.map(r => `<option ${r === node.role ? "selected" : ""}>${r}</option>`).join("")}</select></div>
			<div class="form-field"><label class="required" for="cfgSla">办理时限（自然日）</label><input type="number" id="cfgSla" data-config="sla" min="1" max="120" value="${esc(node.sla)}"><p class="field-help">从本轮进入时间起算，外部等待也计时</p></div>
			<div class="form-field"><label class="required" for="cfgAction">完成动作名称</label><input id="cfgAction" data-config="action" maxlength="16" value="${esc(node.action)}"></div>
			<div class="form-field wide"><label class="required">必需交付物</label><div class="check-grid">${Object.entries(outputs).map(([key, spec]) => `<label><input type="checkbox" data-requirement="${key}" ${node.required.includes(key) ? "checked" : ""}>${spec.label}</label>`).join("")}</div><p class="field-help">全部必需交付物有效，且当前轮次没有未完成的阻塞工单，才允许完成节点。</p></div>
			<div class="form-field"><label>完成后进入</label><input value="${index === nodes.length - 1 ? "结束流程 / 确认交付" : esc(nodes[index + 1].name)}" readonly></div>
			<div class="form-field"><label for="cfgReturn">允许退回至</label><select id="cfgReturn" data-config="returnTo"><option value="">不允许退回</option>${nodes.slice(0, index).map(n => `<option value="${n.id}" ${n.id === node.returnTo ? "selected" : ""}>${esc(n.name)}</option>`).join("")}${node.returnTo && !nodes.slice(0, index).some(n => n.id === node.returnTo) ? `<option value="${esc(node.returnTo)}" selected>原退回目标无效，请重新选择</option>` : ""}</select></div></div>
			<div class="notice info">该页面编辑下一版本草稿。节点顺序、责任角色、完成条件和退回规则在发布时形成不可变快照。</div></section></div>
			<footer class="config-footer"><span class="caption">版本生效范围：新建履约单 · 不自动迁移存量实例</span>${button("检查配置", "check-config")}${button("保存草稿", "save-config")}${button("发布新版本", "publish", "primary")}</footer>`;
	}
	function validateTemplate() {
		const nodes = store.draftTemplate, errors = [], names = new Set();
		if (nodes.length < 2 || nodes.length > 12) errors.push("流程节点数量必须为 2 至 12 个");
		nodes.forEach((n, i) => {
			const prefix = `第 ${i + 1} 个节点`;
			if (!n.name.trim()) errors.push(`${prefix}：请填写节点名称`); else if (names.has(n.name.trim())) errors.push(`${prefix}：节点名称不能重复`);
			names.add(n.name.trim());
			if (!n.role) errors.push(`${prefix}：请选择责任角色`);
			if (!Number.isInteger(Number(n.sla)) || n.sla < 1 || n.sla > 120) errors.push(`${prefix}：办理时限须为 1 至 120 的整数`);
			if (!n.action.trim()) errors.push(`${prefix}：请填写完成动作名称`);
			if (!n.required.length) errors.push(`${prefix}：至少选择 1 项必需交付物`);
			if (n.returnTo && !nodes.slice(0, i).some(p => p.id === n.returnTo)) errors.push(`${prefix}：退回目标必须位于当前节点之前`);
		});
		if (!["deliveryNote", "customerConfirmed"].every(key => nodes.at(-1)?.required.includes(key))) errors.push("结束节点必须包含交付说明及交付确认");
		return errors;
	}
	function checkConfig(showSuccess = true) {
		const errors = validateTemplate(), box = $("#configErrors"); box.hidden = !errors.length;
		box.innerHTML = errors.length ? `<b>配置检查未通过</b><ul class="validation-list">${errors.map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : "";
		if (!errors.length && showSuccess) toast("配置检查通过");
		return !errors.length;
	}
	function nextVersion() { const [major, minor] = store.published.version.slice(1).split(".").map(Number); return `V${major}.${minor + 1}`; }
	function publishModal() {
		if (!checkConfig(false)) return;
		openModal("发布流程新版本", `<dl class="read-grid"><div><dt>本次发布</dt><dd>${nextVersion()} · ${store.draftTemplate.length} 个节点</dd></div><div><dt>当前生效</dt><dd>${store.published.version}</dd></div></dl><div class="notice info">发布后，新建履约单绑定 ${nextVersion()}。已有履约单继续使用各自版本，历史记录和当前任务不会被重写。</div><div class="form-field"><label class="required" for="publishNote">发布说明</label><textarea id="publishNote" maxlength="300" placeholder="说明本次节点、职责或完成条件的调整"></textarea><div class="error" id="publishError"></div></div>`, `${button("取消", "close-modal")}${button("确认发布", "confirm-publish", "primary")}`);
	}
	function snapshotDrawer() {
		const instance = current(); drawerContext = { kind: "snapshot" };
		openDrawer(`绑定流程 · ${instance.templateVersion}`, `<div class="notice info">该快照在本单创建时绑定。模板后续发布不会改变本单的节点、完成条件或历史记录。</div>${instance.nodes.map((n, i) => `<article class="snapshot-node"><span class="node-index">${i + 1}</span><div><h3>${esc(n.name)} ${chip(n.type)}</h3><p>${esc(n.role)} · ${n.sla} 自然日 · ${esc(n.action)}</p><p>必需：${n.required.map(k => outputs[k].label).join("、")}</p><p>退回：${esc(instance.nodes.find(p => p.id === n.returnTo)?.name || "不允许退回")}</p></div></article>`).join("")}`, `${button("关闭", "close-drawer")}${button("编辑流程模板", "drawer-config", "primary")}`);
	}
	function versionsDrawer() {
		drawerContext = { kind: "versions" };
		openDrawer("发布记录", store.versions.slice().reverse().map(v => `<article class="version-item"><h3>${v.version}${v.version === store.published.version ? chip("当前生效", "teal") : chip("历史版本")}</h3><p>${esc(v.note)}</p><p class="caption">发布人：李晨浩 · ${esc(v.time)} · ${v.nodes.length} 个节点</p></article>`).join(""), button("关闭", "close-drawer"));
	}
	function createFresh() {
		const nodes = clone(store.published.nodes), first = nodes[0];
		store.instances.fresh = { code: `SV${now().slice(0, 10).replace(/-/g, "")}00999`, orderNo: "DD20261029000999", createdAt: now(), templateVersion: store.published.version, nodes, currentIndex: 0, runs: [{ id: uid(), nodeId: first.id, round: 1, valid: true, status: "active", actor: "李晨浩", startedAt: now(), endedAt: "", dueAt: dueDate(first.sla), values: {} }], tickets: [], events: [], draft: {}, returnCount: 0 };
		store.instances.fresh.context = seedContext(store.instances.fresh, "fresh");
		store.scenario = "fresh"; persist(); view = "detail"; filterOpen = false; closeModal(); render(); window.scrollTo(0, 0); toast(`新履约样例已绑定 ${store.published.version}`);
	}
	function preview(name) {
		openModal("附件预览", `<div class="preview-document"><h3>${esc(name)}</h3><p>履约单：${current().code}</p><p>所属业务：德国 VAT 注册</p><p>此文件为产品评审样例。正式附件通过文件权限校验后读取原件。</p></div>`, button("关闭", "close-modal"));
	}
	function changeView(target) {
		if (view === "config" && target !== view && templateDirty) { openModal("保存流程草稿？", "<p>流程配置存在未保存更改。保存草稿后可继续编辑，不会立即生效。</p>", `${button("继续编辑", "close-modal")}${button("放弃更改", "discard-config")}${button("保存并返回", "save-config-return", "primary")}`); return; }
		view = target; render(); window.scrollTo(0, 0);
	}
	document.addEventListener("click", async e => {
		const el = e.target.closest("[data-action]");
		if (!el || el.disabled) return;
		const action = el.dataset.action;
		if (action === "view-detail") changeView("detail");
		else if (action === "view-config") changeView("config");
		else if (action === "show-outcomes") $("#outcomesSection").scrollIntoView({ block: "start" });
		else if (action === "view-service") relatedDocument("service", el.dataset.id);
		else if (action === "view-order") relatedDocument("order", el.dataset.id);
		else if (action === "retry-region") {
			const related = drawerContext?.kind === "related" ? drawerContext : null;
			current().context.loadStates[el.dataset.region] = "ready"; persist(); render();
			if (related) relatedDocument(related.documentKind, related.documentId);
			toast("资料已重新加载");
		}
		else if (action === "copy") { try { await navigator.clipboard.writeText(el.dataset.value); toast("复制成功"); } catch { openModal("复制失败，请选择完整编号", `<input value="${esc(el.dataset.value)}" readonly style="width:100%">`, button("关闭", "close-modal")); } }
		else if (action === "node") nodeDrawer(el.dataset.id);
		else if (action === "node-history") {
			if (drawerDirty) { current().draft[drawerContext.runId] = readTaskValues(); persist(); toast("任务输入已保存为草稿"); }
			nodeDrawer(el.dataset.id, true);
		}
		else if (action === "task") taskDrawer();
		else if (action === "history") historyDrawer();
		else if (action === "progress") progressDrawer();
		else if (action === "progress-node") nodeDrawer(el.dataset.id, true);
		else if (action === "snapshot") snapshotDrawer();
		else if (action === "close-drawer") closeDrawer();
		else if (action === "discard-drawer") { closeModal(); closeDrawer(true); }
		else if (action === "close-modal") closeModal();
		else if (action === "sample-file") {
			const key = el.dataset.key;
			$(`[data-output="${key}"]`).value = outputs[key].sample;
			$(`[data-file-name="${key}"]`).textContent = outputs[key].sample;
			$(`[data-error="${key}"]`).textContent = "";
			drawerDirty = true;
		}
		else if (action === "upload") $(`#upload-${el.dataset.key}`).click();
		else if (action === "save-task") saveTask(false);
		else if (action === "complete-task") saveTask(true);
		else if (action === "create-ticket") createTicket();
		else if (action === "submit-ticket") submitTicket();
		else if (action === "ticket") ticketDrawer(el.dataset.id);
		else if (action === "resolve-ticket") resolveTicket();
		else if (action === "clear-filter") { filterOpen = false; render(); }
		else if (action === "return") returnModal();
		else if (action === "confirm-return") {
			const reason = $("#returnReason").value.trim();
			if (!reason) { $("#returnError").textContent = "请填写退回原因"; return; }
			applyReturn(current(), Number(el.dataset.target), reason); persist(); closeModal(); closeDrawer(true); render(); toast("已退回重办，原执行记录完整保留");
		}
		else if (action === "select-node") { selectedNode = el.dataset.id; render(); }
		else if (action === "add-node") { const n = { id: `n-${Date.now()}`, name: "新增节点", phase: "服务交付", role: "", type: "人工任务", sla: 1, action: "确认完成", required: [], returnTo: "" }; store.draftTemplate.push(n); selectedNode = n.id; templateDirty = true; render(); }
		else if (action === "move-node") { const list = store.draftTemplate, index = list.findIndex(n => n.id === selectedNode), next = index + Number(el.dataset.direction); [list[index], list[next]] = [list[next], list[index]]; templateDirty = true; render(); }
		else if (action === "delete-node") openModal("删除流程节点？", "<p>删除仅影响当前草稿。引用该节点的退回规则需要重新检查。</p>", `${button("取消", "close-modal")}${button("确认删除", "confirm-delete-node", "danger")}`);
		else if (action === "confirm-delete-node") { store.draftTemplate = store.draftTemplate.filter(n => n.id !== selectedNode); selectedNode = store.draftTemplate[0].id; templateDirty = true; closeModal(); render(); }
		else if (action === "check-config") checkConfig();
		else if (action === "save-config") { persist(); templateDirty = false; render(); toast("流程草稿已保存，尚未生效"); }
		else if (action === "publish") publishModal();
		else if (action === "confirm-publish") {
			const note = $("#publishNote").value.trim();
			if (!note) { $("#publishError").textContent = "请填写发布说明"; return; }
			const version = nextVersion(), nodes = clone(store.draftTemplate); nodes.forEach(n => { n.name = n.name.trim(); n.action = n.action.trim(); });
			store.published = { version, nodes }; store.versions.push({ version, nodes: clone(nodes), note, time: now() }); templateDirty = false; persist(); closeModal(); render(); toast(`${version} 已发布，仅用于新建履约单`);
		}
		else if (action === "versions") versionsDrawer();
		else if (action === "fresh-instance") {
			if (templateDirty) { toast("请先保存流程草稿，再创建基于已发布版本的样例"); return; }
			openModal("新建履约样例", `<p>将使用当前生效流程 <b>${store.published.version}</b> 创建独立评审样例。</p><p class="field-help">已有的“新版本履约单”样例将被替换。</p>`, `${button("取消", "close-modal")}${button("创建样例", "confirm-fresh", "primary")}`);
		}
		else if (action === "confirm-fresh") createFresh();
		else if (action === "drawer-config") { closeDrawer(true); changeView("config"); }
		else if (action === "save-config-return") { templateDirty = false; persist(); closeModal(); view = "detail"; render(); }
		else if (action === "discard-config") { let saved; try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* 回退至生效版本。 */ } store.draftTemplate = clone(saved?.draftTemplate || store.published.nodes); templateDirty = false; closeModal(); view = "detail"; render(); }
		else if (action === "preview") preview(el.dataset.name);
		else if (action === "reset") openModal("重置全部评审样例？", "<p>本地任务草稿、工单、流程草稿及发布记录将恢复为初始演示数据。</p>", `${button("取消", "close-modal")}${button("确认重置", "confirm-reset", "danger")}`);
		else if (action === "confirm-reset") { store = initialState(); view = "detail"; selectedNode = "n5"; filterOpen = false; templateDirty = false; persist(); closeModal(); closeDrawer(true); render(); window.scrollTo(0, 0); toast("已恢复初始样例"); }
	});
	document.addEventListener("input", e => {
		if (e.target.closest("#drawer")) drawerDirty = true;
		if (e.target.dataset.output && e.target.value.trim()) $(`[data-error="${e.target.dataset.output}"]`).textContent = "";
		const inlineErrors = { publishNote: "publishError", returnReason: "returnError", ticketTitle: "ticketTitleError", ticketDescription: "ticketDescriptionError", ticketResolution: "resolutionError" };
		if (inlineErrors[e.target.id] && e.target.value.trim()) $(`#${inlineErrors[e.target.id]}`).textContent = "";
		if (e.target.dataset.config) {
			const node = store.draftTemplate.find(n => n.id === selectedNode), key = e.target.dataset.config;
			node[key] = key === "sla" ? Number(e.target.value) : e.target.value; templateDirty = true; $("#dirtyLabel").textContent = "存在未保存更改";
			if (key === "name") { $("#editorName").textContent = e.target.value || "未命名节点"; $(".config-node.active b").textContent = e.target.value || "未命名节点"; }
		}
	});
	document.addEventListener("change", e => {
		const el = e.target;
		if (el.id === "scenario") { store.scenario = el.value; filterOpen = false; persist(); render(); window.scrollTo(0, 0); }
		if (el.id === "openOnly") { filterOpen = el.checked; render(); }
		if (el.dataset.requirement) { const node = store.draftTemplate.find(n => n.id === selectedNode), key = el.dataset.requirement; node.required = el.checked ? [...new Set([...node.required, key])] : node.required.filter(k => k !== key); templateDirty = true; $("#dirtyLabel").textContent = "存在未保存更改"; }
		if (el.dataset.upload) {
			const file = el.files[0], key = el.dataset.upload;
			if (file) {
				if (!/\.(pdf|png|jpe?g|zip)$/i.test(file.name)) { toast("仅支持 PDF、PNG、JPG 或 ZIP 文件"); el.value = ""; return; }
				if (file.size > 20 * 1024 * 1024) { toast("文件大小不能超过 20 MB"); el.value = ""; return; }
				$(`[data-output="${key}"]`).value = file.name; $(`[data-file-name="${key}"]`).textContent = file.name; drawerDirty = true;
			}
		}
	});
	document.addEventListener("keydown", e => {
		if (e.key === "Escape") { if (!$("#modalLayer").hidden) closeModal(); else if (!$("#drawer").hidden) closeDrawer(); }
		if (e.key === "Tab" && (!$("#modalLayer").hidden || !$("#drawer").hidden)) {
			const root = !$("#modalLayer").hidden ? $("#modal") : $("#drawer"), items = [...root.querySelectorAll('button:not(:disabled), input:not([type="hidden"]):not([type="file"]), select, textarea')].filter(el => el.getClientRects().length), first = items[0], last = items.at(-1);
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
		}
	});
	window.addEventListener("beforeunload", e => { if (templateDirty || drawerDirty) { e.preventDefault(); e.returnValue = ""; } });
	document.addEventListener("submit", e => e.preventDefault());
	persist(); render();
})();
