(() => {
	"use strict";
	const nodes = ["资料提交", "资料审核", "资料制作", "资料递交", "税局受理", "结果齐备", "服务交付"];
	const statuses = {
		"资料提交": ["待提交", "已提交"],
		"资料审核": ["待审核", "资料被驳回", "审核通过"],
		"资料制作": ["待制作", "制作中"],
		"资料递交": ["待递交", "已递交"],
		"税局受理": ["等待外部", "等待协同", "退回重办"],
		"结果齐备": ["待确认", "结果缺失"],
		"服务交付": ["待交付", "已完成"]
	};
	const records = [
		["SV20261019000123", "DD2026101900123456", "YUANHANG TRADING LIMITED", "德国 VAT 注册", "税局受理", "等待协同", "李晨浩", "张静"],
		["SV20261019000124", "DD2026101900123457", "YUANHANG TECHNOLOGY LIMITED", "德国 VAT 注册", "资料提交", "待提交", "周敏", "张静"],
		["SV20261019000125", "DD2026101900123458", "YUANHANG TRADING LIMITED", "德国 VAT 注册", "服务交付", "已完成", "--", "张静"],
		["SV20261019000126", "DD2026101900123459", "NORDIC HOME GMBH", "德国 VAT 转代理", "资料审核", "资料被驳回", "陈洁", "待分配"],
		["SV20261019000127", "DD2026101900123460", "BLUE RIVER SAS", "法国 VAT 注册", "资料制作", "制作中", "王洋", "张静"],
		["SV20261019000128", "DD2026101900123461", "ALPINE GOODS GMBH", "德国 VAT 申报", "税局受理", "等待外部", "李晨浩", "张静"],
		["SV20261019000129", "DD2026101900123462", "YUANHANG TRADING LIMITED", "德国包装法注册", "结果齐备", "待确认", "赵磊", "待分配"],
		["SV20261019000130", "DD2026101900123463", "NORDIC HOME GMBH", "德国 VAT 注册", "资料递交", "待递交", "待分配", "张静"]
	].map(([number, order, company, product, node, status, owner, accountant]) => ({ number, order, company, product, node, status, owner, accountant, category: product.includes("包装") ? "EPR" : "VAT", subcategory: product.includes("申报") ? "申报" : product.includes("转代理") ? "转代理" : "注册", country: product.startsWith("法国") ? "法国" : "德国", serviceType: product.includes("申报") ? "申报服务" : "注册服务" }));
	const $ = selector => document.querySelector(selector);
	const esc = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	let filters = { category: "VAT", subcategory: "全部", country: "", serviceType: "", accountant: "", owner: "", query: "", node: "全部", status: "全部" };
	const tone = status => status === "已完成" ? "green" : /驳回|缺失|退回/.test(status) ? "red" : /等待|待/.test(status) ? "amber" : status === "--" ? "gray" : "";
	const baseRecords = () => records.filter(item => item.category === filters.category && (filters.subcategory === "全部" || item.subcategory === filters.subcategory) && (!filters.country || item.country === filters.country) && (!filters.serviceType || item.serviceType === filters.serviceType) && (!filters.accountant || item.accountant === filters.accountant) && (!filters.owner || item.owner === filters.owner) && (!filters.query || `${item.number} ${item.company}`.toLowerCase().includes(filters.query.toLowerCase())));
	function render() {
		const base = baseRecords();
		const nodeCounts = new Map([["全部", base.length], ...nodes.map(node => [node, base.filter(item => item.node === node).length])]);
		$("#nodeRow").innerHTML = [...nodeCounts].map(([node, count]) => `<button type="button" data-node="${esc(node)}" class="${filters.node === node ? "selected" : ""}" ${count || node === "全部" ? "" : "disabled"}>${esc(node)}<span class="count">${count}</span></button>`).join("");
		const nodeRecords = base.filter(item => filters.node === "全部" || item.node === filters.node);
		const available = filters.node === "全部" ? [...new Set(nodeRecords.map(item => item.status))] : statuses[filters.node];
		if (filters.status !== "全部" && !available.includes(filters.status)) filters.status = "全部";
		$("#statusRow").innerHTML = `<span>节点状态</span>` + ["全部", ...available].map(status => `<button type="button" data-status="${esc(status)}" class="${filters.status === status ? "selected" : ""}">${esc(status)}<span class="count">${nodeRecords.filter(item => status === "全部" || item.status === status).length}</span></button>`).join("");
		const result = nodeRecords.filter(item => filters.status === "全部" || item.status === filters.status);
		$("#resultSummary").textContent = `共 ${result.length} 条`;
		$("#pageInfo").textContent = result.length ? `1 / 1 页 · ${result.length} 条` : "0 条";
		$("#rows").innerHTML = result.map((item, index) => `<tr><td>${index + 1}</td><td class="number">${esc(item.number)}</td><td>${esc(item.order)}</td><td>${esc(item.company)}</td><td>${esc(item.product)}</td><td>${item.status === "已完成" ? "--" : esc(item.node)}</td><td><span class="status ${tone(item.status)}">${esc(item.status)}</span></td><td>${esc(item.owner)}</td><td class="actions"><a class="link-btn" href="fulfillment-detail-demo.html">履约详情</a>${item.status === "已完成" ? "" : `<button class="link-btn" data-action="handle" data-id="${esc(item.number)}">办理</button>`}</td></tr>`).join("") || `<tr><td class="empty" colspan="9">暂无符合条件的服务</td></tr>`;
	}
	function toast(text) { const el = $("#toast"); el.textContent = text; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 2200); }
	document.addEventListener("click", event => {
		const node = event.target.closest("[data-node]"), status = event.target.closest("[data-status]"), category = event.target.closest("[data-category]"), subcategory = event.target.closest("[data-subcategory]");
		if (node && !node.disabled) { filters.node = node.dataset.node; filters.status = "全部"; render(); }
		if (status) { filters.status = status.dataset.status; render(); }
		if (category) { filters.category = category.dataset.category; filters.node = "全部"; filters.status = "全部"; document.querySelectorAll("[data-category]").forEach(el => el.classList.toggle("selected", el === category)); render(); }
		if (subcategory) { filters.subcategory = subcategory.dataset.subcategory; filters.node = "全部"; filters.status = "全部"; document.querySelectorAll("[data-subcategory]").forEach(el => el.classList.toggle("selected", el === subcategory)); render(); }
		if (event.target.dataset.action === "handle") toast(`${event.target.dataset.id}：进入当前节点办理`);
		if (event.target.id === "exportButton") toast(`已导出当前筛选结果（${$("#rows").children.length} 条，演示）`);
	});
	$("#searchForm").addEventListener("submit", event => { event.preventDefault(); filters = { ...filters, country: $("#country").value, serviceType: $("#serviceType").value, accountant: $("#accountant").value, owner: $("#owner").value, query: $("#query").value.trim(), node: "全部", status: "全部" }; render(); });
	$("#searchForm").addEventListener("reset", () => setTimeout(() => { filters = { category: filters.category, subcategory: filters.subcategory, country: "", serviceType: "", accountant: "", owner: "", query: "", node: "全部", status: "全部" }; render(); }));
	render();
})();
