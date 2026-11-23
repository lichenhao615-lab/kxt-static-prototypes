(() => {
	"use strict";
	const nodes = ["提交资料", "审核", "制单", "递交资料", "注册", "下号"];
	const statuses = {
		"提交资料": ["待提交", "已提交"], "审核": ["待审核", "已通过", "已驳回"],
		"制单": ["待制单", "制单中", "制单完成"], "递交资料": ["待递交", "已递交"],
		"注册": ["注册中", "注册成功"], "下号": ["待下号", "已下号"]
	};
	const records = window.fulfillmentDemoRecords;
	const $ = selector => document.querySelector(selector);
	const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const defaults = () => ({ kind: "全部", category: "全部", country: "", accountant: "", owner: "", query: "", node: "全部", status: "全部" });
	let filters = defaults();
	let currentResult = [];
	let expandedNumber = "";
	const saved = sessionStorage.getItem("fulfillment-unified-filters");
	if (saved) { try { filters = { ...filters, ...JSON.parse(saved) }; } catch {} }
	filters.category = "全部";
	const detailUrl = item => `fulfillment-detail-tobe.html?service=${encodeURIComponent(item.number)}`;
	function familyView(item) {
		const parent = records.find(record => record.number === (item.parentNumber || item.number));
		const children = records.filter(record => record.parentNumber === parent.number);
		return `<tr class="family-row"><td colspan="10"><div class="family-panel">
			<div class="family-heading"><strong>关联服务</strong><span>模拟关联关系</span><button type="button" class="family-close" data-family="${esc(item.number)}" aria-label="收起关联服务">收起 ↑</button></div>
			<div class="family-base"><span class="family-label">基础服务单</span><a class="link-btn number" href="${detailUrl(parent)}">${esc(parent.number)}</a><span>${esc(parent.product)}</span><span class="status green">${esc(parent.status)}</span></div>
			<div class="family-children">${children.map(child => `<div class="family-child"><div class="family-child-heading"><span class="service-kind kind-${["基础服务", "增值服务", "追加服务", "续费服务"].indexOf(child.kind)}">${esc(child.kind)}</span><span class="status">${esc(child.status)}</span></div><a class="link-btn number" href="${detailUrl(child)}">${esc(child.number)}</a><div>${esc(child.product)}</div><div class="cell-secondary">${esc(child.node)}<span class="cell-divider">/</span>处理人：${esc(child.owner)}</div></div>`).join("")}</div>
		</div></td></tr>`;
	}
	function syncControls() {
		$("#country").value = filters.country;
		$("#accountant").value = filters.accountant;
		$("#owner").value = filters.owner;
		$("#query").value = filters.query;
		document.querySelectorAll("[data-kind]").forEach(el => {
			el.classList.toggle("selected", el.dataset.kind === filters.kind);
			el.setAttribute("aria-selected", String(el.dataset.kind === filters.kind));
		});
		document.querySelectorAll("[data-category]").forEach(el => el.classList.toggle("selected", el.dataset.category === filters.category));
	}
	const baseRecords = () => records.filter(item =>
		(filters.kind === "全部" || item.kind === filters.kind) &&
		(filters.category === "全部" || item.category === filters.category) &&
		(!filters.country || item.country === filters.country) &&
		(!filters.accountant || item.accountant === filters.accountant) &&
		(!filters.owner || item.owner === filters.owner) &&
		(!filters.query || `${item.number} ${item.order} ${item.company}`.toLowerCase().includes(filters.query.toLowerCase()))
	);
	function render() {
		syncControls();
		const base = baseRecords();
		$("#flowSummary").textContent = `当前范围 ${base.length} 条服务`;
		$("#nodeRow").innerHTML = ["全部", ...nodes].map((node, index) => {
			const count = base.filter(item => node === "全部" || item.node === node).length;
			return `<button type="button" data-node="${esc(node)}" aria-pressed="${filters.node === node}" class="${filters.node === node ? "selected" : ""}"><span class="node-filter-name">${index ? `<span class="step-index">${index}</span>` : ""}${node === "全部" ? "全部节点" : esc(node)}</span><span class="count">${count}<small>条</small></span></button>`;
		}).join("");
		const nodeRecords = base.filter(item => filters.node === "全部" || item.node === filters.node);
		const available = filters.node === "全部" ? [...new Set(nodeRecords.map(item => item.status))] : statuses[filters.node] || [];
		if (filters.status !== "全部" && !available.includes(filters.status)) filters.status = "全部";
		$("#statusRow").innerHTML = `<span class="filter-label">节点状态：</span>` + ["全部", ...available].map(status => `<button type="button" data-status="${esc(status)}" class="${filters.status === status ? "selected" : ""}">${esc(status)}<span class="count">${nodeRecords.filter(item => status === "全部" || item.status === status).length}</span></button>`).join("");
		const result = nodeRecords.filter(item => filters.status === "全部" || item.status === filters.status);
		currentResult = result;
		$("#resultSummary").textContent = `共 ${result.length} 条`;
		$("#pageInfo").textContent = result.length ? `1 / 1 页 · ${result.length} 条` : "0 条";
		$("#rangeInfo").textContent = result.length ? `显示 1–${result.length} 条，共 ${result.length} 条` : "共 0 条";
		$("#rows").innerHTML = result.map((item, index) => {
			const current = nodes.indexOf(item.node);
			const completed = item.status === "已下号";
			const relationSummary = ["增值服务", "追加服务", "续费服务"].map(kind => `${kind.slice(0, 2)} ${records.filter(child => child.parentNumber === item.number && child.kind === kind).length}`).join(" · ");
			const operations = item.node === "下号" ? ["查看税号", "查看信件"] : item.node === "制单" ? ["预览资料包", "查看资料"] : ["查看资料"];
			if (item.node === "提交资料" && ["已提交", "已完成"].includes(item.status)) operations.push("编辑资料");
			if (item.node === "递交资料" && item.status === "已递交") operations.push("查看分单");
			return `<tr><td class="expand-cell"><button type="button" class="family-toggle" data-family="${esc(item.number)}" aria-expanded="${expandedNumber === item.number}" aria-label="${expandedNumber === item.number ? "收起" : "展开"}${esc(item.number)}的关联服务" title="${item.parentNumber ? "基础单及关联服务" : relationSummary}"><svg class="icon ${expandedNumber === item.number ? "rotated" : ""}" aria-hidden="true"><use href="#chevron"/></svg></button></td><td class="row-index">${index + 1}</td><td><a class="link-btn number" href="fulfillment-detail-tobe.html?service=${encodeURIComponent(item.number)}">${esc(item.number)}</a><div class="cell-secondary order-number">${esc(item.order)}</div></td>
				<td><span class="service-kind kind-${["基础服务", "增值服务", "追加服务", "续费服务"].indexOf(item.kind)}">${esc(item.kind)}</span></td>
				<td><div class="cell-primary">${esc(item.company)}</div><div class="cell-secondary">${esc(item.customer)}</div></td>
				<td><div class="cell-primary">${esc(item.product)}</div><div class="cell-secondary">${esc(item.category)}<span class="cell-divider">/</span>${esc(item.country)}</div></td>
				<td><div class="progress-caption"><span>${esc(item.node)}</span><span class="status ${completed ? "green" : item.status.startsWith("待") ? "amber" : "teal"}">${esc(item.status)}</span></div><div class="mini-progress" aria-label="当前节点：${esc(item.node)}">${nodes.map((name, i) => `<span title="${esc(name)}" class="${i < current || completed ? "done" : i === current ? "active" : ""}"></span>`).join("")}</div></td>
				<td><span class="${item.owner === "未记录" ? "muted" : "person-name"}">${esc(item.owner)}</span></td><td class="${item.accountant === "名称未查到" || item.accountant === "待分配" ? "muted" : ""}">${esc(item.accountant)}</td>
				<td class="operation-column"><div class="row-operations"><a class="link-btn" href="${detailUrl(item)}">查看详情</a>${operations.map(label => `<button type="button" class="link-btn" data-operation="${esc(label)}" data-service="${esc(item.number)}">${esc(label)}</button>`).join("")}</div></td></tr>${expandedNumber === item.number ? familyView(item) : ""}`;
		}).join("") || `<tr><td class="empty" colspan="10"><svg class="icon empty-icon" aria-hidden="true"><use href="#search"/></svg><div>暂无符合条件的服务</div></td></tr>`;
		sessionStorage.setItem("fulfillment-unified-filters", JSON.stringify(filters));
	}
	document.addEventListener("click", event => {
		if (event.target.closest("[data-close-operation]")) $("#operationDialog").close();
		const operation = event.target.closest("[data-operation]");
		if (operation) {
			$("#operationTitle").textContent = operation.dataset.operation;
			const messages = { "查看税号": "税号信息未获取。", "查看信件": "信件信息未获取。", "预览资料包": "资料包未获取。", "编辑资料": "资料内容未获取，暂无法编辑。", "查看分单": "分单信息未获取。" };
			$("#operationBody").textContent = `${operation.dataset.service}：${messages[operation.dataset.operation] || "资料内容未获取。"}`;
			$("#operationDialog").showModal();
		}
		const family = event.target.closest("[data-family]");
		if (family) { expandedNumber = expandedNumber === family.dataset.family ? "" : family.dataset.family; render(); }
		const kind = event.target.closest("[data-kind]"), category = event.target.closest("[data-category]"), node = event.target.closest("[data-node]"), status = event.target.closest("[data-status]");
		if (kind || category) { if (kind) filters.kind = kind.dataset.kind; if (category) filters.category = category.dataset.category; filters.node = "全部"; filters.status = "全部"; render(); }
		if (node) { filters.node = node.dataset.node; filters.status = "全部"; render(); }
		if (status) { filters.status = status.dataset.status; render(); }
		if (event.target.closest("#exportButton")) {
			const columns = ["服务编号", "服务分类", "订单号", "公司名称", "客户名称", "商品名称", "当前节点", "节点状态", "当前处理人", "关联会计师"];
			const csvCell = value => `"${String(value).replace(/"/g, '""')}"`;
			const csv = [columns, ...currentResult.map(item => [item.number, item.kind, item.order, item.company, item.customer, item.product, item.node, item.status, item.owner, item.accountant])].map(row => row.map(csvCell).join(",")).join("\r\n");
			const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
			const link = document.createElement("a");
			link.href = url; link.download = "服务管理.csv"; link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	});
	$("#searchForm").addEventListener("submit", event => {
		event.preventDefault();
		Object.assign(filters, { country: $("#country").value, accountant: $("#accountant").value, owner: $("#owner").value, query: $("#query").value.trim(), node: "全部", status: "全部" });
		render();
	});
	$("#searchForm").addEventListener("reset", event => { event.preventDefault(); filters = defaults(); render(); });
	render();
})();
