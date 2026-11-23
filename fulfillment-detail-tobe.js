(() => {
	"use strict";

	const $ = selector => document.querySelector(selector);
	const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
	const chip = (text, tone = "") => `<span class="chip ${tone}">${esc(text)}</span>`;
	const requestedCode = new URLSearchParams(location.search).get("service");
	const selected = requestedCode && window.fulfillmentDemoRecords.find(item => item.number === requestedCode);
	const code = selected ? selected.number : "SV20261105194835087461";
	const fields = {
		"基础服务编号": code,
		"订单号": "DD2611047966020201",
		"商品名称": "德国VAT转代理+申报",
		"客户名称": "跨客",
		"国家": "德国",
		"业务状态": "已下号",
		"当前处理人": "未记录",
		"关联会计师": "名称未查到",
		"服务类型": "SaaS服务",
		"商品规格": "中国公司及其他 / 不进行ZM申报 / SaaS服务",
		"商品类目": "VAT",
		"商品类型": "转代理+申报",
		"服务区间": "2026-01-01 至 2026-12-31",
		"服务期状态": "服务期内",
		"数据来源": "线上",
		"客户编号": "B19406",
		"客户ID": "12196388",
		"注册账号": "已脱敏",
		"客户级别": "S",
		"服务管家": "郑雪",
		"客户经理": "曹斯",
		"业务组别": "长沙办事处",
		"主体公司": "湖南数客星球信息技术有限公司（跨客）",
		"公司名称": "长沙畔德商贸有限公司",
		"英文公司名称": "changshapandeshangmaoyouxiangongsi",
		"税号/注册号": "主表未关联",
		"提交资料时间": "2026-11-06 10:41:31",
		"资料审核通过时间": "2026-11-06 11:06:07",
		"资料审核驳回时间": "未记录",
		"服务完成时间": "2026-11-07 17:31:09"
	};
	const nodeStates = {
		submit: { status: "已提交", operator: "客户（账号已脱敏）", time: "2026-11-06 10:41:31", record: "上传资料 · 提交", actions: ["查看资料", "编辑资料", "撤回资料"] },
		review: { status: "已通过", operator: "范玉婷", time: "2026-11-06 11:06:06", record: "审核资料 · 提交（流转至待提交）", actions: ["查看资料"] },
		prepare: { status: "制单完成", actions: ["预览资料包", "查看资料"] },
		deliver: { status: "已递交", actions: ["查看递交结果", "查看分单", "查看资料"] },
		register: { status: "注册成功", actions: ["查看注册结果", "查看资料"] },
		number: { status: "已下号", actions: ["查看税号", "查看信件", "查看资料"] }
	};
	const operationLogs = [
		{ time: "2026-11-07 17:31:09", operation: "添加进度", action: "提交", operator: "翁冰莹" },
		{ time: "2026-11-07 17:15:57", operation: "关联会计师", action: "提交", operator: "翁冰莹" },
		{ time: "2026-11-06 11:06:06", operation: "审核资料", action: "提交", operator: "范玉婷" },
		{ time: "2026-11-06 10:41:31", operation: "上传资料", action: "提交", operator: "客户（账号已脱敏）" }
	];
	const ticket = { number: "DEMO-TICKET-001", initiator: "张敏", handler: "李明", createdAt: "2026-11-09 10:30:00" };
	const basic = ["基础服务编号", "订单号", "商品名称", "客户名称", "国家", "业务状态", "当前处理人", "关联会计师"];
	const groups = [
		{ title: "服务与订单", fields: ["服务类型", "商品规格", "商品类目", "商品类型", "服务区间", "服务期状态", "数据来源", "订单来源"] },
		{ title: "客户与服务团队", fields: ["客户编号", "客户ID", "注册账号", "客户级别", "服务管家", "客户经理", "业务组别"] },
		{ title: "公司与税务", fields: ["主体公司", "公司名称", "英文公司名称", "公司注册国家", "期望税号生效日期", "税号/注册号"] },
		{ title: "关键时间", fields: ["提交资料时间", "资料审核通过时间", "资料审核驳回时间", "服务完成时间"] }
	];
	const nodes = [
		{ id: "submit", name: "提交资料" },
		{ id: "review", name: "审核" },
		{ id: "prepare", name: "制单" },
		{ id: "deliver", name: "递交资料" },
		{ id: "register", name: "注册" },
		{ id: "number", name: "下号" }
	];
	if (selected && !selected.production) {
		Object.keys(fields).forEach(key => delete fields[key]);
		Object.assign(fields, {
			"服务编号": selected.number, "订单号": selected.order, "商品名称": selected.product,
			"客户名称": selected.customer, "国家": selected.country, "业务状态": selected.status,
			"当前处理人": selected.owner, "关联会计师": selected.accountant,
			"商品类目": selected.category, "公司名称": selected.company
		});
		Object.keys(nodeStates).forEach(key => delete nodeStates[key]);
		const index = nodes.findIndex(node => node.name === selected.node);
		const completeStatuses = ["已提交", "已通过", "制单完成", "已递交", "注册成功", "已下号"];
		const nodeActions = [["查看资料"], ["查看资料"], ["预览资料包", "查看资料"], ["查看递交结果", "查看资料"], ["查看注册结果", "查看资料"], ["查看税号", "查看信件", "查看资料"]];
		nodes.forEach((node, i) => {
			if (i <= index) {
				const status = i === index ? selected.status : completeStatuses[i];
				const actions = [...nodeActions[i]];
				if (node.id === "submit" && ["已提交", "已完成"].includes(status)) actions.push("编辑资料");
				if (node.id === "deliver" && status === "已递交") actions.splice(1, 0, "查看分单");
				nodeStates[node.id] = { status, current: i === index, actions };
			}
		});
		operationLogs.length = 0;
		basic[0] = "服务编号";
	}
	const value = label => fields[label] ? esc(fields[label]) : '<span class="unknown">未获取</span>';
	const field = label => `<div class="field"><dt>${esc(label)}</dt><dd>${label === "基础服务编号" || label === "服务编号" ? `<span class="number">${value(label)}</span><button class="icon-btn" data-action="copy" title="复制${esc(label)}" aria-label="复制${esc(label)}">${icon("copy")}</button>` : value(label)}</dd></div>`;
	const actionButton = (label, action, attrs = "", kind = "") => `<button type="button" class="btn small ${kind}" data-action="${action}" ${attrs}>${esc(label)}</button>`;

	function processView() {
		return `<ol class="node-track" id="processTrack">${nodes.map((node, index) => {
			const record = nodeStates[node.id];
			return `<li class="node ${record ? record.current ? "current" : "completed" : "pending"}" data-node-id="${node.id}">
				<span class="node-marker">${record && !record.current ? icon("check") : index + 1}</span>
				<div class="node-title"><span class="node-name">${esc(node.name)}</span>${record ? chip(record.status, "teal") : ""}</div>
				<div class="node-meta">${record && !record.current ? `完成人：${esc(record.operator || "未获取")}` : record ? `处理人：${esc(selected.owner)}` : ""}</div>
				<div class="node-meta time">${record && !record.current ? `完成时间：${esc(record.time || "未获取")}` : ""}</div>
				<div class="node-actions">${record ? record.actions.map(label => `<button type="button" class="link-btn" data-action="operation" data-label="${esc(label)}">${esc(label)}</button>`).join("") : ""}</div>
			</li>`;
		}).join("")}</ol>`;
	}
	function logView() {
		return `<div class="log-table-wrap"><table class="log-table"><thead><tr><th scope="col">操作时间</th><th scope="col">操作事项</th><th scope="col">动作</th><th scope="col">操作人</th></tr></thead><tbody>${operationLogs.map(log => `<tr><td>${esc(log.time)}</td><td>${esc(log.operation)}</td><td>${esc(log.action)}</td><td>${esc(log.operator)}</td></tr>`).join("") || '<tr><td colspan="4">暂无操作日志</td></tr>'}</tbody></table></div>`;
	}
	function ticketView() {
		if (selected && !selected.production) return '<div class="ticket-empty">暂无关联工单</div>';
		return `<div class="ticket-table-wrap"><table class="ticket-table"><thead><tr><th>工单号</th><th>问题分类</th><th>工单状态</th><th>发起人</th><th>处理人</th><th>发起时间</th></tr></thead>
			<tbody><tr><td><button type="button" class="link-btn" data-action="open-ticket">${esc(ticket.number)}</button></td><td>申报问题 / 费用明细咨询</td><td>${chip("待处理", "amber")}</td><td>${esc(ticket.initiator)}</td><td>${esc(ticket.handler)}</td><td>${esc(ticket.createdAt)}</td></tr></tbody></table></div>`;
	}
	function relatedView() {
		const parentNumber = selected?.parentNumber || code;
		const family = window.fulfillmentDemoRecords.filter(item => item.number === parentNumber || item.parentNumber === parentNumber);
		return `<section class="section" id="relatedSection"><div class="section-head"><h2 class="section-title">关联服务单</h2><span class="log-summary">模拟关联关系</span></div><div class="log-table-wrap"><table class="log-table"><thead><tr><th>服务分类</th><th>服务编号</th><th>商品名称</th><th>节点 / 状态</th></tr></thead><tbody>${family.map(item => `<tr><td>${esc(item.kind)}</td><td>${item.number === code ? `${esc(item.number)}（本单）` : `<a class="link-btn" href="fulfillment-detail-tobe.html?service=${encodeURIComponent(item.number)}">${esc(item.number)}</a>`}</td><td>${esc(item.product)}</td><td>${esc(item.node)} / ${esc(item.status)}</td></tr>`).join("")}</tbody></table></div></section>`;
	}
	function render() {
		$("#app").classList.add("detail-layout");
		$("#app").innerHTML = `<header class="page-header">
			<div class="title-wrap"><div class="title-line"><a class="detail-back" href="fulfillment-internal-list-demo.html">‹ 返回服务列表</a><h1>履约单详情</h1>${selected && !selected.production ? '<span class="detail-mock">模拟数据</span>' : ""}</div></div>
		</header>
		<section class="section" id="basicSection"><div class="section-head"><h2 class="section-title">基础信息</h2></div><dl class="info-grid tobe-basic">${basic.map(field).join("")}</dl></section>
		<section class="section" id="processSection"><div class="section-head"><h2 class="section-title">流程节点与状态</h2></div>${processView()}</section>
		<section class="section" id="ticketSection"><div class="section-head"><h2 class="section-title">关联工单</h2></div>${ticketView()}</section>
		<section class="section" id="businessSection"><div class="section-head"><h2 class="section-title">履约单详情</h2></div><div id="detailContent">${groups.map(group => `<div class="tobe-group"><h3 class="detail-group-title">${esc(group.title)}</h3><dl class="info-grid tobe-grid">${group.fields.map(field).join("")}</dl></div>`).join("")}</div></section>
		${relatedView()}
		<section class="section" id="logSection"><div class="section-head"><h2 class="section-title">操作日志</h2><span class="log-summary">关键操作 ${operationLogs.length} 条</span></div>${logView()}</section>
		<footer class="page-foot"><span>内部运营 Demo</span><span>1920 × 1080</span></footer>`;
	}
	function toast(text) {
		$("#toast").textContent = text;
		$("#toast").hidden = false;
		clearTimeout(toast.timer);
		toast.timer = setTimeout(() => { $("#toast").hidden = true; }, 3500);
	}
	function openOperation(label) {
		const messages = {
			"查看资料": "资料内容未获取。",
			"编辑资料": "资料内容未获取，暂无法编辑。",
			"撤回资料": "当前为只读演示，不能撤回资料。",
			"预览资料包": "资料包未获取。",
			"查看递交结果": "递交结果未获取。",
			"查看分单": "分单信息未获取。",
			"查看注册结果": "注册结果未获取。",
			"查看税号": "税号信息未获取。",
			"查看信件": "信件信息未获取。"
		};
		const body = messages[label] || "内容未获取。";
		$("#modal").innerHTML = `<header class="modal-head"><h2 id="modalTitle">${esc(label)}</h2><button class="icon-btn" data-action="close-modal" title="关闭" aria-label="关闭">${icon("x")}</button></header>
			<div class="modal-body">${esc(body)}</div>
			<footer class="modal-footer">${actionButton("关闭", "close-modal")}</footer>`;
		$("#modalLayer").hidden = false;
		$("#modal .icon-btn").focus();
	}
	function closeModal() {
		$("#modalLayer").hidden = true;
	}
	const ticketTabs = {
		"问题描述": '<div class="ticket-description"><span>问题描述：</span><p>咨询申报费用的明细及收费标准。</p></div>',
		"处理记录": '<div class="ticket-empty">暂无处理记录</div>',
		"处理结果": '<div class="ticket-empty">暂无处理结果</div>',
		"操作日志": '<div class="ticket-empty">暂无操作日志</div>'
	};
	function openTicket() {
		$("#ticketDrawer").innerHTML = `<header class="ticket-drawer-head"><h2 id="ticketTitle">工单详情</h2><button class="icon-btn" data-action="close-ticket" title="关闭" aria-label="关闭工单详情">${icon("x")}</button></header>
			<div class="ticket-drawer-body">
				<section class="ticket-info"><h3>基础信息</h3><dl class="ticket-info-grid">
					<div><dt>服务单号</dt><dd>${esc(code)}</dd></div><div><dt>工单号</dt><dd>${esc(ticket.number)}</dd></div><div><dt>工单状态</dt><dd>待处理</dd></div><div><dt>问题分类</dt><dd>申报问题 / 费用明细咨询</dd></div>
					<div><dt>发起人</dt><dd>${esc(ticket.initiator)}</dd></div><div><dt>发起时间</dt><dd>${esc(ticket.createdAt)}</dd></div><div><dt>处理人</dt><dd>${esc(ticket.handler)}</dd></div><div><dt>完结人</dt><dd>--</dd></div>
				</dl></section>
				<section class="ticket-info"><h3>客户信息</h3><dl class="ticket-info-grid">
					<div><dt>客户名称</dt><dd>${value("客户名称")}</dd></div><div><dt>公司名称</dt><dd>${value("公司名称")}</dd></div><div><dt>客户ID</dt><dd>${value("客户ID")}</dd></div><div><dt>客户级别</dt><dd>${value("客户级别")}</dd></div>
				</dl></section>
				<section class="ticket-info"><h3>商品信息</h3><dl class="ticket-info-grid product">
					<div><dt>商品</dt><dd>${value("商品名称")}</dd></div><div><dt>规格</dt><dd>${value("商品规格")}</dd></div>
				</dl></section>
				<div class="ticket-tabs" role="tablist" aria-label="工单详情">${Object.keys(ticketTabs).map((name, index) => `<button type="button" role="tab" aria-selected="${index === 0}" class="${index === 0 ? "active" : ""}" data-action="ticket-tab" data-tab="${esc(name)}">${esc(name)}</button>`).join("")}</div>
				<div class="ticket-tab-content" role="tabpanel">${ticketTabs["问题描述"]}</div>
			</div><footer class="ticket-drawer-footer">${actionButton("关闭", "close-ticket")}</footer>`;
		$("#ticketLayer").hidden = false;
		$("#ticketDrawer [data-action='close-ticket']").focus();
	}
	function closeTicket() {
		$("#ticketLayer").hidden = true;
		$("#ticketSection [data-action='open-ticket']")?.focus();
	}
	document.addEventListener("click", async event => {
		const target = event.target.closest("[data-action]");
		if (!target) return;
		if (target.dataset.action === "operation") openOperation(target.dataset.label);
		else if (target.dataset.action === "close-modal") closeModal();
		else if (target.dataset.action === "open-ticket") openTicket();
		else if (target.dataset.action === "close-ticket") closeTicket();
		else if (target.dataset.action === "ticket-tab") {
			$("#ticketDrawer").querySelectorAll('[role="tab"]').forEach(tab => {
				const active = tab === target;
				tab.classList.toggle("active", active);
				tab.setAttribute("aria-selected", String(active));
			});
			$("#ticketDrawer .ticket-tab-content").innerHTML = ticketTabs[target.dataset.tab];
		}
		else if (target.dataset.action === "copy") {
			try { await navigator.clipboard.writeText(code); toast("复制成功"); }
			catch { toast(`基础服务编号：${code}`); }
		}
	});
	document.addEventListener("keydown", event => {
		if (event.key !== "Escape") return;
		if (!$("#modalLayer").hidden) closeModal();
		else if (!$("#ticketLayer").hidden) closeTicket();
	});
	document.querySelectorAll('[data-action="view-config"]').forEach(button => {
		button.disabled = true;
		button.title = "本版仅演示履约详情";
	});
	render();
})();
