(() => {
	"use strict";
	const $ = selector => document.querySelector(selector);
	const $$ = selector => [...document.querySelectorAll(selector)];
	const storageKey = "kxt-certificate-renewal-demo-v1";
	const mockPaidAt = "2026-11-10T14:30:00+08:00";
	const money = value => `¥${(value / 100).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
	const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"></use></svg>`;
	const companies = ["示例智联科技有限公司", "示例远航科技有限公司", "示例光启电子有限公司", "示例万禾科技有限公司", "示例启源科技有限公司", "示例嘉合商贸有限公司", "示例云程科技有限公司", "示例伊然电子商务有限公司", "示例达维科技有限公司", "示例石铭商贸有限公司"];
	const customers = companies.map((name, index) => ({
		id: String(9321 + index * 137), name, type: index === 5 ? "专属服务" : "SAAS", level: index === 5 ? "A" : "D",
		manager: ["林嘉", "许安琪", "黄星丽"][index % 3], contact: ["陈经理", "李经理", "王经理"][index % 3],
		phone: "138****1268", registration: `DE ${String(87654321 + index)}`, end: "2026-12-31",
		products: [
			{ id: "non-pv", type: "小型非光伏设备", brand: "NOVA", source: "增值服务", serviceId: `VS2026${index}1001`, start: "2026-01-01", end: "2026-12-31", renewYear: 2027, renewalFee: 260000, cancellationFee: 100000 },
			{ id: "it-device", type: "小型信息通讯设备", brand: "LUMA", source: "追加服务", serviceId: `AV2026${index}1002`, start: "2026-07-01", end: index === 1 ? "2027-12-31" : "2026-12-31", renewYear: index === 1 ? 2028 : 2027, renewalFee: 180000, cancellationFee: 100000 }
		]
	}));
	let orders = [];
	try {
		const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
		if (Array.isArray(stored)) orders = stored.filter(order => order && customers.some(customer => customer.id === order.customerId) && order.status === "paid" && Array.isArray(order.renewals) && Array.isArray(order.cancellations) && Number.isFinite(order.total));
	} catch (_) { orders = []; }
	const state = { customer: null, selected: new Set(), step: "select", invoice: "no", title: "", taxNumber: "", method: "扫码支付", committing: false };
	const filters = { keyword: "", status: "全部", type: "全部", from: "", to: "" };
	let returnFocus = null;

	document.body.insertAdjacentHTML("afterbegin", window.CERTIFICATE_DEMO_SYMBOLS);
	function hydrateIcons() {
		$$("[data-icon]").forEach(element => element.outerHTML = icon(element.dataset.icon));
	}
	hydrateIcons();
	function latestOrder(customerId) { return orders.find(order => order.customerId === customerId); }
	function customerStatus(customer) {
		const order = latestOrder(customer.id);
		return order ? (order.renewals.length ? "已续费" : "不续费") : "待续费";
	}
	function nextDate(date) {
		const next = new Date(`${date}T00:00:00Z`);
		next.setUTCDate(next.getUTCDate() + 1);
		return next.toISOString().slice(0, 10);
	}
	function selection() {
		const products = state.customer.products;
		const renewals = products.filter(product => state.selected.has(product.id));
		const cancellations = products.filter(product => !state.selected.has(product.id));
		const renewalTotal = renewals.reduce((sum, product) => sum + product.renewalFee, 0);
		const cancellationTotal = cancellations.reduce((sum, product) => sum + product.cancellationFee, 0);
		return { renewals, cancellations, renewalTotal, cancellationTotal, total: renewalTotal + cancellationTotal };
	}
	function contextHtml(payment = false) {
		const customer = state.customer;
		return payment
			? `<div class="customer-context"><div><span>客户信息</span><strong>${escape(customer.name)}</strong></div><div><span>客户昵称</span><strong>${customer.contact}</strong></div><div><span>手机号</span><strong>${customer.phone}</strong></div></div>`
			: `<div class="customer-context"><div><span>公司名称</span><strong>${escape(customer.name)}</strong></div><div><span>税号 / 注册码</span><strong>${customer.registration}</strong></div></div>`;
	}
	function progressHtml(current) {
		const hasCancellation = selection().cancellations.length > 0;
		const steps = [
			{ label: "选择续费商品", small: "核对本次续费范围", done: current !== "select", current: current === "select" },
			{ label: "确认注销费用", small: current === "payment" && !hasCancellation ? "无注销商品，已跳过" : "有注销商品时确认", done: current === "payment" && hasCancellation, current: current === "cancel", skipped: current === "payment" && !hasCancellation },
			{ label: "订单支付", small: "核对金额并支付", current: current === "payment" }
		];
		return `<div class="progress" aria-label="续费流程">${steps.map((step, index) => `<div class="progress-step ${step.done ? "done" : ""} ${step.current ? "current" : ""} ${step.skipped ? "skipped" : ""}" ${step.current ? 'aria-current="step"' : ""}><span class="step-circle">${step.done ? icon("check") : step.skipped ? icon("minus") : index + 1}</span><div class="step-copy"><strong>${step.label}</strong><small>${step.small}</small></div>${index < 2 ? '<span class="step-line"></span>' : ""}</div>`).join("")}</div>`;
	}
	function renderList() {
		const visible = customers.filter(customer => {
			const keyword = filters.keyword.toLowerCase();
			return (!keyword || customer.name.toLowerCase().includes(keyword) || customer.id.includes(keyword))
				&& (filters.status === "全部" || customerStatus(customer) === filters.status)
				&& (filters.type === "全部" || customer.type === filters.type)
				&& (!filters.from || customer.end >= filters.from)
				&& (!filters.to || customer.end <= filters.to);
		});
		$("#customerRows").innerHTML = visible.length ? visible.map(customer => {
			const status = customerStatus(customer);
			const paid = status !== "待续费";
			return `<tr><td>${customers.indexOf(customer) + 1}</td><td>${customer.type}</td><td>${customer.level}</td><td>${customer.manager}</td><td>${customer.id}</td><td>${escape(customer.name)}</td><td>德国</td><td>德国WEEE注册＋申报（2026年度）</td><td>EPR → 电气法</td><td class="amount">${customer.end}</td><td><span class="status-text ${paid ? status === "已续费" ? "complete" : "cancelled" : ""}">${status}</span></td><td class="row-actions"><button class="link-button" data-action="${paid ? "view-order" : "renew"}" data-customer="${customer.id}">${paid ? "查看订单" : "续费"}</button><button class="link-button" disabled>添加备注</button></td></tr>`;
		}).join("") : '<tr><td colspan="12" class="empty-cell">暂无符合条件的续费记录</td></tr>';
		$("#resultCount").textContent = `共 ${visible.length} 条`;
		$("#allCount").textContent = customers.length;
		$("#pendingCount").textContent = customers.filter(customer => customerStatus(customer) === "待续费").length;
		$("#renewedCount").textContent = customers.filter(customer => customerStatus(customer) === "已续费").length;
		$("#cancelledCount").textContent = customers.filter(customer => customerStatus(customer) === "不续费").length;
		$("#paidTotal").textContent = money(orders.reduce((sum, order) => sum + order.renewalTotal, 0));
	}
	function setOverlay(overlay, visible) {
		$(overlay).hidden = !visible;
		document.body.style.overflow = $$(".overlay").some(element => !element.hidden) ? "hidden" : "";
	}
	function focusDialog(selector) { $(selector).querySelector('[role="dialog"]').focus(); }
	function openRenewal(customerId, trigger) {
		state.customer = customers.find(customer => customer.id === customerId);
		state.selected = new Set(state.customer.products.map(product => product.id));
		state.invoice = "no";
		state.title = state.customer.name;
		state.taxNumber = "";
		state.method = "扫码支付";
		state.committing = false;
		returnFocus = trigger;
		showSelection();
	}
	function showSelection() {
		state.step = "select";
		setOverlay("#paymentOverlay", false);
		setOverlay("#flowOverlay", true);
		$("#flowTitle").textContent = "选择续费商品";
		$("#flowProgress").innerHTML = progressHtml("select");
		const products = state.customer.products;
		$("#flowBody").innerHTML = `${contextHtml()}<div class="section-title"><h3>续约产品信息<span class="count">${products.length} 项</span></h3><label class="select-all"><input type="checkbox" id="selectAllProducts">全部续费</label></div>
			<div class="table-wrap"><table class="product-choice"><thead><tr><th></th><th>产品类型</th><th>品牌名称</th><th>服务区间</th><th>续费年度</th><th>续费费用</th></tr></thead><tbody>${products.map(product => `<tr data-product-row="${product.id}"><td><input type="checkbox" data-product="${product.id}" aria-label="续费${product.type}"></td><td><div class="product-name">${product.type}</div><div class="product-meta">${product.source} · ${product.serviceId}</div></td><td>${product.brand}</td><td><div class="period">${product.start} 至 ${product.end}</div></td><td><div>${product.renewYear} 年</div><div class="product-meta">01-01 至 12-31</div></td><td class="price amount">${money(product.renewalFee)}</td></tr>`).join("")}</tbody></table></div>
			<div class="business-note">${icon("info")}<span>未选择续费的商品将按注销处理，注销费用在下一步确认。</span></div><div id="zeroRenewal" class="zero-renewal" hidden>${icon("circle-alert")}本次商品均不续费，下一步确认全部商品的注销费用。</div>`;
		$("#flowFooter").innerHTML = '<div class="selection-summary" id="selectionSummary"></div><div class="footer-actions"><button class="btn" data-action="close-flow">取消</button><button class="btn primary" id="selectionNext" data-action="selection-next"></button></div>';
		updateSelection();
		focusDialog("#flowOverlay");
	}
	function updateSelection() {
		const summary = selection();
		$$("[data-product]").forEach(input => {
			input.checked = state.selected.has(input.dataset.product);
			input.closest("tr").classList.toggle("unselected", !input.checked);
		});
		const selectAll = $("#selectAllProducts");
		selectAll.checked = summary.renewals.length === state.customer.products.length;
		selectAll.indeterminate = summary.renewals.length > 0 && !selectAll.checked;
		$("#selectionSummary").innerHTML = `<span>已选 <b>${summary.renewals.length}</b> 项续费</span><span>续费金额<strong>${money(summary.renewalTotal)}</strong></span>`;
		$("#selectionNext").innerHTML = `${summary.cancellations.length ? "下一步：确认注销费用" : "下一步：支付"}${icon("chevron-right")}`;
		$("#zeroRenewal").hidden = summary.renewals.length > 0;
	}
	function showCancellation() {
		state.step = "cancel";
		const summary = selection();
		if (!summary.cancellations.length) return showPayment();
		setOverlay("#paymentOverlay", false);
		setOverlay("#flowOverlay", true);
		$("#flowTitle").textContent = "确认注销费用";
		$("#flowProgress").innerHTML = progressHtml("cancel");
		$("#flowBody").innerHTML = `${contextHtml()}<div class="warning-notice">${icon("clock")}<div><strong>不续费商品将在各自服务区间结束后生成注销服务单。</strong><br>本次确认不会立即注销，原有服务持续至对应区间结束。</div></div>
			<div class="section-title"><h3>注销产品信息<span class="count">${summary.cancellations.length} 项</span></h3><span class="muted">已选 ${summary.renewals.length} 项续费</span></div>
			<div class="table-wrap"><table class="cancel-table"><thead><tr><th>产品类型</th><th>品牌名称</th><th>当前服务区间</th><th>注销服务单生成时间</th><th>注销费用</th></tr></thead><tbody>${summary.cancellations.map(product => `<tr><td><div class="product-name">${product.type}</div><div class="product-meta">${product.source}</div></td><td>${product.brand}</td><td class="period">${product.start} 至 ${product.end}</td><td><div class="scheduled-date">${nextDate(product.end)} 起</div><div class="product-meta">该商品服务区间结束后</div></td><td class="amount">${money(product.cancellationFee)}</td></tr>`).join("")}</tbody></table></div>
			<div class="fee-summary"><span>注销费用合计</span><strong id="cancellationTotal">${money(summary.cancellationTotal)}</strong></div><div class="fee-breakdown"><span>续费费用<b>${money(summary.renewalTotal)}</b></span><span>本次合计<b>${money(summary.total)}</b></span></div>`;
		$("#flowFooter").innerHTML = `<div class="selection-summary"><span>${summary.cancellations.length} 项不续费商品</span></div><div class="footer-actions"><button class="btn" data-action="back-selection">${icon("arrow-left")}返回修改</button><button class="btn primary" data-action="confirm-cancellation">确认费用，去支付${icon("chevron-right")}</button></div>`;
		focusDialog("#flowOverlay");
	}
	function showPayment() {
		state.step = "payment";
		setOverlay("#flowOverlay", false);
		setOverlay("#paymentOverlay", true);
		$("#paymentProgress").innerHTML = progressHtml("payment");
		const summary = selection();
		const renewalRows = summary.renewals.map(product => `<tr data-order-kind="renewal"><td><div class="product-name">德国WEEE续费<span class="order-type">续费</span></div><div class="product-meta">服务时长：1年</div></td><td>${product.type}：${product.brand}<div class="product-meta">${product.renewYear}-01-01 至 ${product.renewYear}-12-31</div></td><td class="amount">${money(product.renewalFee)}</td><td>1</td><td class="amount subprice">${money(product.renewalFee)}</td></tr>`).join("");
		const cancellationRows = summary.cancellations.map(product => `<tr data-order-kind="cancellation"><td><div class="product-name">德国WEEE注销<span class="order-type cancellation">注销</span></div><div class="product-meta">${nextDate(product.end)} 起生成注销服务单</div></td><td>${product.type}：${product.brand}<div class="product-meta">原服务结束：${product.end}</div></td><td class="amount">${money(product.cancellationFee)}</td><td>1</td><td class="amount subprice">${money(product.cancellationFee)}</td></tr>`).join("");
		$("#paymentBody").innerHTML = `<div class="section-title"><h3>客户信息</h3></div>${contextHtml(true)}<div class="section-title"><h3>商品信息</h3><span class="muted">${state.customer.name}</span></div>
			<div class="table-wrap"><table class="order-table"><thead><tr><th>商品信息</th><th>商品规格 / 服务区间</th><th>商品价格</th><th>数量</th><th>小计</th></tr></thead><tbody>${renewalRows}${cancellationRows}</tbody></table></div>
			<div class="order-total"><span>续费费用<b>${money(summary.renewalTotal)}</b></span>${summary.cancellations.length ? `<span>注销费用<b>${money(summary.cancellationTotal)}</b></span>` : ""}<span>应付合计<strong id="orderTotal">${money(summary.total)}</strong></span></div>
			<div class="form-line"><label class="form-label" for="invoiceRequired">是否需要开具发票</label><div class="invoice-control"><select id="invoiceRequired"><option value="no">否</option><option value="yes">是</option></select><div class="invoice-fields" id="invoiceFields" hidden><label for="invoiceTitle"><span><span class="required">*</span>发票抬头</span><input id="invoiceTitle" maxlength="100" value="${escape(state.title)}" autocomplete="off"></label><label for="taxNumber"><span><span class="required">*</span>纳税人识别号</span><input id="taxNumber" maxlength="30" value="${escape(state.taxNumber)}" placeholder="请输入纳税人识别号" autocomplete="off"></label></div></div></div>
			<div class="form-line"><span class="form-label" id="methodLabel">请选择支付方式</span><div class="payment-methods" role="radiogroup" aria-labelledby="methodLabel">${["扫码支付", "对公账户转账", "空中云汇", "网银付款", "支付宝"].map((method, index) => `<label class="payment-method"><input type="radio" name="paymentMethod" value="${method}" ${method === state.method ? "checked" : ""}>${icon(["monitor", "credit-card", "external-link", "credit-card", "credit-card"][index])}<span>${method}</span></label>`).join("")}</div></div>
			<p class="input-error" id="paymentError" role="alert" hidden></p>`;
		$("#invoiceRequired").value = state.invoice;
		$("#invoiceFields").hidden = state.invoice !== "yes";
		$("#paymentFooter").innerHTML = `<div class="payment-footer-total"><span>应付金额</span><strong>${money(summary.total)}</strong></div><div class="footer-actions"><button class="btn" data-action="close-payment">取消</button><button class="btn" data-action="back-payment">${icon("arrow-left")}返回修改</button><button class="btn primary" id="payOrder" data-action="pay-order">确认支付</button></div>`;
		focusDialog("#paymentOverlay");
	}
	function savePaymentFields() {
		state.invoice = $("#invoiceRequired").value;
		state.title = $("#invoiceTitle").value;
		state.taxNumber = $("#taxNumber").value;
		state.method = $('input[name="paymentMethod"]:checked').value;
	}
	function payOrder() {
		if (state.committing) return;
		savePaymentFields();
		if (state.invoice === "yes" && (!state.title.trim() || !state.taxNumber.trim())) {
			$("#paymentError").textContent = "请补充发票抬头和纳税人识别号";
			$("#paymentError").hidden = false;
			(!state.title.trim() ? $("#invoiceTitle") : $("#taxNumber")).focus();
			return;
		}
		const summary = selection();
		state.committing = true;
		$("#payOrder").disabled = true;
		const order = {
			id: `RN20261110${Date.now().toString().slice(-7)}`, customerId: state.customer.id, customerName: state.customer.name,
			status: "paid", paidAt: mockPaidAt, method: state.method,
			invoice: state.invoice === "yes" ? { title: state.title.trim(), taxNumber: state.taxNumber.trim() } : null,
			renewalTotal: summary.renewalTotal, cancellationTotal: summary.cancellationTotal, total: summary.total,
			renewals: summary.renewals.map(product => ({ id: product.id, type: product.type, brand: product.brand, start: `${product.renewYear}-01-01`, end: `${product.renewYear}-12-31`, fee: product.renewalFee })),
			cancellations: summary.cancellations.map(product => ({
				id: product.id, type: product.type, brand: product.brand, sourceServiceId: product.serviceId,
				serviceStart: product.start, serviceEnd: product.end, fee: product.cancellationFee,
				earliestCreationAt: `${nextDate(product.end)}T00:00:00+08:00`, serviceOrderCreatedAt: null
			}))
		};
		orders.unshift(order);
		try {
			localStorage.setItem(storageKey, JSON.stringify(orders));
		} catch (_) {
			orders.shift();
			state.committing = false;
			$("#payOrder").disabled = false;
			$("#paymentError").textContent = "订单未保存，请检查浏览器存储后重试";
			$("#paymentError").hidden = false;
			return;
		}
		renderList();
		showResult(order);
	}
	function showResult(order) {
		setOverlay("#flowOverlay", false);
		setOverlay("#paymentOverlay", false);
		setOverlay("#resultOverlay", true);
		const renewalHtml = order.renewals.length ? `<section class="result-section"><h3>续费商品 · ${order.renewals.length} 项</h3><div class="table-wrap"><table class="result-table"><thead><tr><th>产品类型</th><th>品牌名称</th><th>续费服务区间</th><th>续费费用</th></tr></thead><tbody>${order.renewals.map(product => `<tr><td>${product.type}</td><td>${product.brand}</td><td><div class="period">${product.start}</div><div class="period">至 ${product.end}</div></td><td class="amount">${money(product.fee)}</td></tr>`).join("")}</tbody></table></div></section>` : "";
		const cancelHtml = order.cancellations.length ? `<section class="result-section"><h3>注销安排 · ${order.cancellations.length} 项</h3><div class="table-wrap"><table class="result-table"><thead><tr><th>产品类型</th><th>品牌名称</th><th>该商品服务结束时间</th><th>注销服务单生成时间</th></tr></thead><tbody>${order.cancellations.map(product => `<tr><td>${product.type}</td><td>${product.brand}</td><td class="period">${product.serviceEnd}</td><td class="scheduled-date">${product.earliestCreationAt.slice(0, 10)} 起</td></tr>`).join("")}</tbody></table></div><div class="result-note">${icon("clock")}<span>当前未生成注销服务单，原服务持续至各自服务区间结束。</span></div></section>` : "";
		$("#resultBody").innerHTML = `<div class="result-banner">${icon("circle-check")}<div><h3>订单支付成功</h3><p>${escape(order.customerName)} · ${order.id}</p></div></div><div class="receipt"><div><span>实付金额</span><strong>${money(order.total)}</strong></div><div><span>支付方式</span><strong>${order.method}</strong></div><div><span>开具发票</span><strong>${order.invoice ? escape(order.invoice.title) : "否"}</strong></div></div>${renewalHtml}${cancelHtml}`;
		focusDialog("#resultOverlay");
	}
	function closeAll() {
		["#flowOverlay", "#paymentOverlay", "#resultOverlay"].forEach(selector => setOverlay(selector, false));
		state.customer = null;
		state.selected.clear();
		state.committing = false;
		if (returnFocus?.isConnected) returnFocus.focus();
		else $(".status-tabs .selected")?.focus();
	}
	function runSearch() {
		const from = $("#dateFrom").value;
		const to = $("#dateTo").value;
		if (from && to && from > to) {
			$("#filterError").textContent = "开始日期不能晚于结束日期";
			$("#filterError").hidden = false;
			return;
		}
		$("#filterError").hidden = true;
		filters.keyword = $("#keyword").value.trim();
		filters.from = from;
		filters.to = to;
		filters.type = $('input[name="serviceType"]:checked').value;
		renderList();
	}

	document.addEventListener("click", event => {
		const trigger = event.target.closest("[data-action]");
		if (!trigger) return;
		switch (trigger.dataset.action) {
			case "renew": openRenewal(trigger.dataset.customer, trigger); break;
			case "selection-next": selection().cancellations.length ? showCancellation() : showPayment(); break;
			case "back-selection": showSelection(); break;
			case "confirm-cancellation": showPayment(); break;
			case "back-payment": savePaymentFields(); selection().cancellations.length ? showCancellation() : showSelection(); break;
			case "pay-order": payOrder(); break;
			case "close-flow": case "close-payment": case "close-result": closeAll(); break;
			case "view-order": returnFocus = trigger; showResult(latestOrder(trigger.dataset.customer)); break;
		}
	});
	document.addEventListener("change", event => {
		const input = event.target;
		if (input.matches("[data-product]")) {
			input.checked ? state.selected.add(input.dataset.product) : state.selected.delete(input.dataset.product);
			updateSelection();
		} else if (input.id === "selectAllProducts") {
			state.selected = new Set(input.checked ? state.customer.products.map(product => product.id) : []);
			updateSelection();
		} else if (input.id === "invoiceRequired") {
			state.invoice = input.value;
			$("#invoiceFields").hidden = input.value !== "yes";
			$("#paymentError").hidden = true;
		} else if (input.name === "paymentMethod") state.method = input.value;
	});
	document.addEventListener("keydown", event => {
		const overlay = $$(".overlay").findLast(element => !element.hidden);
		if (!overlay) return;
		if (event.key === "Escape") { event.preventDefault(); closeAll(); return; }
		if (event.key !== "Tab") return;
		const focusable = [...overlay.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')].filter(element => element.getClientRects().length);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && (document.activeElement === first || document.activeElement.matches('[role="dialog"]'))) { event.preventDefault(); last.focus(); }
		else if (!event.shiftKey && (document.activeElement === last || document.activeElement.matches('[role="dialog"]'))) { event.preventDefault(); first.focus(); }
	});
	$$("[data-status]").forEach(button => button.addEventListener("click", () => {
		filters.status = button.dataset.status;
		$$("[data-status]").forEach(tab => { tab.classList.toggle("selected", tab === button); tab.setAttribute("aria-selected", String(tab === button)); });
		renderList();
	}));
	$("#searchRenewals").addEventListener("click", runSearch);
	$("#keyword").addEventListener("keydown", event => { if (event.key === "Enter") runSearch(); });
	$("#reset").addEventListener("click", () => {
		$("#keyword").value = "";
		$("#dateFrom").value = "";
		$("#dateTo").value = "";
		$('input[name="serviceType"][value="全部"]').checked = true;
		runSearch();
	});
	renderList();
})();
