(() => {
	"use strict";
	document.body.insertAdjacentHTML("afterbegin", window.CERTIFICATE_DEMO_SYMBOLS);
	const $ = selector => document.querySelector(selector);
	const $$ = selector => [...document.querySelectorAll(selector)];
	const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
	const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"></use></svg>`;
	const money = value => Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const STORAGE_KEY = "kxt-certificate-append-demo-v1";
	const BASE_SERVICES = {
		"SV202611100001": {
			id: "SV202611100001",
			name: "德国 WEEE · 注册＋申报",
			period: "2026-01-01 至 2027-12-31",
			end: "2027-12-31",
			years: [2026, 2027],
			product: { type: "屏幕设备", brands: ["NOVA"], nameZh: "高清显示器", nameEn: "LCD Monitor", weight: "0.8", quantity: "1200", length: "48", width: "28", height: "6", link: "https://example.com/products/monitor", photo: "assets/monitor.jpg", photoName: "monitor.jpg" }
		},
		"SV202611100008": {
			id: "SV202611100008",
			name: "德国包装法 · 注册＋申报",
			period: "2026-01-01 至 2026-12-31",
			end: "2026-12-31",
			years: [2026],
			product: { type: "小型设备", brands: ["LUMA"], nameZh: "包装产品", nameEn: "Packaging Product", weight: "0.5", quantity: "800", length: "30", width: "20", height: "4", link: "https://example.com/products/package", photo: "assets/monitor.jpg", photoName: "package.jpg" }
		}
	};
	const DEFAULT_BASE_ID = "SV202611100001";
	const DEMO_DATE = "2026-11-10";
	const MATCH_ERROR = "可追加商品有误，请联系客服进行处理。";
	const TYPES = ["屏幕设备", "小型设备", "大型设备", "热交换设备", "灯具", "信息和通信设备"];
	const brandOptions = ["NOVA", "LUMA", "VISTA", "KXT"];
	const APPEND_PRODUCTS = [
		{ id: "P-WEEE-2027", name: "德国WEEE注册＋申报（2027年度）", years: [2027], price: 14868, status: "在售" },
		{ id: "P-WEEE-2026-2027", name: "德国WEEE注册＋申报（2026～2027年度）", years: [2026, 2027], price: 17868, status: "在售" }
	];
	const APPEND_YEAR_OPTIONS = [
		{ id: "2026+2027", label: "2026+2027 年", years: [2026, 2027], tag: "跨年度" },
		{ id: "2027", label: "2027 年", years: [2027], tag: "单年度" }
	];
	const MOCK_PRICE = {
		2026: { "屏幕设备": 300, "小型设备": 260, "大型设备": 420, "热交换设备": 450, "灯具": 280, "信息和通信设备": 300 },
		2027: { "屏幕设备": 350, "小型设备": 280, "大型设备": 450, "热交换设备": 480, "信息和通信设备": 350 }
	};
	let nextId = 1;
	let toastTimer;
	let currentOrderId;
	let busy = false;
	let returnFocus;
	const state = { years: [], selectedProductId: "", products: [], activeId: null, validated: false, dirty: false, baseId: DEFAULT_BASE_ID, reused: false, returnView: "dashboard" };
	let orders = readOrders();

	function hydrateIcons(root = document) {
		root.querySelectorAll("i[data-icon]").forEach(element => element.outerHTML = icon(element.dataset.icon));
	}
	function newProduct(values = {}) {
		const product = { id: `product-${nextId++}`, type: "", brands: [], brandCount: 1, addedBrandCount: 0, fromBase: false, ...values };
		product.brands = [...getBrands(product)];
		return product;
	}
	function normalize(value) {
		return String(value).trim().toLocaleLowerCase();
	}
	function pairKey(product) {
		return `${product.type}|${normalize(product.brand)}`;
	}
	function getBrands(product) {
		const values = Array.isArray(product.brands) ? product.brands : product.brand ? [product.brand] : [];
		const unique = new Map();
		values.filter(value => typeof value === "string" && value.trim()).forEach(value => unique.set(normalize(value), value.trim()));
		return [...unique.values()];
	}
	function brandsText(product) {
		if (!product.fromBase) return `${Number(product.brandCount) || 0} 个品牌`;
		const baseBrands = getBrands(product);
		const addedCount = Number(product.addedBrandCount) || 0;
		return addedCount ? `${baseBrands.join("、")}；新增 ${addedCount} 个品牌` : baseBrands.join("、");
	}
	function productErrors(product) {
		const errors = {};
		if (!TYPES.includes(product.type)) errors.type = "请选择类目";
		if (product.fromBase) {
			const baseBrands = product.brands.slice(0, Number(product.baseBrandCount) || 0);
			if (!baseBrands.some(brand => String(brand).trim())) errors.brand = "基础商品品牌缺失";
			else if (!Number.isInteger(Number(product.addedBrandCount)) || Number(product.addedBrandCount) < 0) errors.brand = "请选择新增品牌数量";
		} else if (!Number.isInteger(Number(product.brandCount)) || Number(product.brandCount) < 1) {
			errors.brand = "请选择品牌数量";
		}
		return errors;
	}
	function uniquePairs(products = state.products) {
		const pairs = new Map();
		products.filter(product => product.type).forEach(product => {
			if (product.fromBase) {
				const baseBrand = getBrands(product)[0] || "";
				const pair = { ...product, brand: baseBrand };
				pairs.set(pairKey(pair), pair);
				return;
			}
			const count = Math.max(1, Number(product.brandCount) || 1);
			for (let index = 0; index < count; index++) {
				const pair = { ...product, brand: `品牌${index + 1}` };
				pairs.set(`${product.type}|${product.id}|${index}`, pair);
			}
		});
		return [...pairs.values()];
	}
	function quote() {
		const selectedYears = [...state.years].sort();
		const selectedProduct = APPEND_PRODUCTS.find(product => product.years.length === selectedYears.length && product.years.every(year => selectedYears.includes(year))) || null;
		const pairs = uniquePairs();
		const years = [...(selectedProduct?.years || selectedYears)].sort();
		const issues = [];
		const lines = pairs.map(product => {
			const amount = selectedProduct?.price;
			let issue = "";
			if (!selectedProduct || !Number.isFinite(amount) || (years.includes(2027) && product.type === "灯具")) issue = MATCH_ERROR;
			if (product.type === "屏幕设备" && normalize(product.brand) === "kxt") issue = "该“屏幕设备 / KXT”已购买，请勿重复追加。";
			for (const order of orders) {
				if (!product.fromBase) continue;
				const sameBase = order.baseId === state.baseId;
				const sameProduct = order.productId === selectedProduct?.id;
				const sameYears = order.years.some(year => years.includes(year));
				const sameCategoryBrand = uniquePairs(order.products).some(existing => pairKey(existing) === pairKey(product));
				if (sameBase && sameProduct && sameYears && sameCategoryBrand) {
					issue = order.status === "paid"
						? `所选年份的“${product.type} / ${product.brand.trim()}”已购买，请勿重复追加。`
						: `所选年份的“${product.type} / ${product.brand.trim()}”存在待支付订单，请先处理原单。`;
				}
			}
			if (issue) issues.push({ productId: product.id, message: issue });
			return { product, amount: 0, issue };
		});
		const total = issues.length ? 0 : Math.max(0, Number(selectedProduct?.price) || 0);
		const details = [{ year: years.join("+"), years, lines, subtotal: total }];
		return { selectedProduct, years, pairs, details, total, issues, ready: Boolean(selectedProduct) && pairs.length > 0 && !issues.length };
	}
	function toast(message, error = false) {
		clearTimeout(toastTimer);
		const element = $("#toast");
		element.classList.toggle("error", error);
		element.innerHTML = `${icon(error ? "circle-alert" : "circle-check")}<span>${escape(message)}</span>`;
		element.hidden = false;
		toastTimer = setTimeout(() => element.hidden = true, 3200);
	}
	function setFormError(message) {
		$("#formError").hidden = !message;
		$("#formError").textContent = message;
	}
	function renderRows() {
		$("#productCount").textContent = state.products.length;
		$("#productEmpty").hidden = state.products.length !== 0;
		$(".product-table-wrap").hidden = state.products.length === 0;
		$("#productRows").innerHTML = state.products.map((product, index) => {
			const errorCount = Object.keys(productErrors(product)).length;
			const complete = errorCount === 0;
			return `<tr data-product="${product.id}" class="${product.id === state.activeId ? "active" : ""}" tabindex="0" aria-label="编辑第 ${index + 1} 个产品">
				<td class="muted">${String(index + 1).padStart(2, "0")}</td>
				<td title="${escape(product.type)}">${escape(product.type || "未选择类目")}</td>
				<td title="${escape(getBrands(product).join("、"))}">${escape(brandsText(product) || "未选择")}</td>
				<td>${product.fromBase ? '<span class="base-locked">基础品牌锁定，可新增品牌数量</span>' : `<div class="table-actions"><button class="icon-button" data-action="edit" data-id="${product.id}" title="编辑资料" aria-label="编辑第 ${index + 1} 个产品">${icon("file-text")}</button><button class="icon-button" data-action="copy" data-id="${product.id}" title="复制产品" aria-label="复制第 ${index + 1} 个产品">${icon("copy")}</button><button class="icon-button delete" data-action="remove" data-id="${product.id}" title="删除产品" aria-label="删除第 ${index + 1} 个产品">${icon("trash")}</button></div>`}</td>
			</tr>`;
		}).join("");
		const pairs = uniquePairs();
		const brandTotal = state.products.reduce((sum, product) => sum + (product.fromBase ? getBrands(product).length + (Number(product.addedBrandCount) || 0) : Number(product.brandCount) || 0), 0);
		$("#productSummary").textContent = state.products.length ? `共 ${state.products.length} 个类目 · ${brandTotal} 个品牌` : "";
	}
	function field(product, key, label, options = {}) {
		const error = state.validated ? productErrors(product)[key] : "";
		const control = options.select
			? `<select id="field-${key}" name="${key}" data-field="${key}" required ${options.disabled ? "disabled" : ""}><option value="">请选择类目</option>${TYPES.map(type => `<option ${product.type === type ? "selected" : ""} value="${type}">${type}</option>`).join("")}</select>`
			: `<input id="field-${key}" name="${key}" data-field="${key}" type="${options.type || "text"}" value="${escape(product[key])}" placeholder="${options.placeholder || "请输入"}" ${options.required ? "required" : ""} ${options.type === "number" ? `min="0" max="999999999" step="${key === "quantity" ? "1" : "any"}"` : `maxlength="${key === "link" ? "1500" : "200"}"`} ${options.type === "number" ? 'inputmode="decimal"' : ""}>`;
		const guide = key === "type" ? `<a class="type-guide" href="assets/germany-weee-product-types.pdf" download="德国WEEE产品类型说明.pdf" title="下载产品类型说明（PDF · 德文原文）">${icon("download")}类型说明</a>` : "";
		return `<label class="field ${options.className || ""} ${error ? "invalid" : ""}" data-field-wrap="${key}"><span class="field-label">${options.required ? '<span class="required">*</span>' : ""}${label}${guide}</span>${control}<span class="field-error" data-error-field="${key}" ${error ? "" : "hidden"}>${escape(error || "")}</span></label>`;
	}
	function brandField(product) {
		const error = state.validated ? productErrors(product).brand : "";
		if (!product.fromBase) {
			return `<label class="field ${error ? "invalid" : ""}" data-field-wrap="brand"><span class="field-label"><span class="required">*</span>品牌数量</span><select id="field-brandCount" data-field="brandCount" required>${[1,2,3,4,5,6,7,8,9,10].map(count => `<option value="${count}" ${Number(product.brandCount) === count ? "selected" : ""}>${count} 个品牌</option>`).join("")}</select><span class="field-error" data-error-field="brand" ${error ? "" : "hidden"}>${escape(error || "")}</span></label>`;
		}
		const brands = product.brands.length ? product.brands : [""];
		return `<div class="field brand-field ${error ? "invalid" : ""}" data-field-wrap="brand">
			<div class="field-label"><span class="required">*</span>品牌名称<span class="auto-label">基础品牌只读</span></div>
			<div class="brand-input-list">${brands.map((brand, index) => `<div class="brand-input-row protected-brand">
				<input id="field-brand-${index}" data-brand-input data-index="${index}" type="text" value="${escape(brand)}" maxlength="100" aria-label="基础品牌 ${index + 1}" readonly>
				<span class="brand-lock-tag">基础品牌</span>
			</div>`).join("")}</div>
			<label class="field base-brand-count-field"><span class="field-label">新增品牌数量</span><select id="field-addedBrandCount" data-field="addedBrandCount">${[0,1,2,3,4,5,6,7,8,9,10].map(count => `<option value="${count}" ${Number(product.addedBrandCount) === count ? "selected" : ""}>${count ? `${count} 个品牌` : "不新增"}</option>`).join("")}</select><span class="brand-count-hint">提交追加后，请在服务单上传资料时补充具体品牌信息。</span></label>
			<span class="field-error" data-error-field="brand" ${error ? "" : "hidden"}>${escape(error || "")}</span>
		</div>`;
	}
	function renderBrandOptions() {
		const product = state.products.find(item => item.id === state.activeId);
		if (!product || !$("#brandOptions")) return;
		const query = $("#brandSearch").value.trim();
		const choices = new Map();
		[...brandOptions, ...state.products.flatMap(getBrands), ...orders.flatMap(order => order.products.flatMap(getBrands))].forEach(brand => choices.set(normalize(brand), brand));
		const selected = new Set(getBrands(product).map(normalize));
		$("#brandOptions").innerHTML = [...choices.values()].filter(brand => normalize(brand).includes(normalize(query))).map(brand => `<label class="brand-option"><input type="checkbox" data-brand="${escape(brand)}" value="${escape(brand)}" ${selected.has(normalize(brand)) ? "checked" : ""}><span>${escape(brand)}</span>${selected.has(normalize(brand)) ? icon("check") : ""}</label>`).join("");
		if (query && !choices.has(normalize(query))) $("#brandOptions").insertAdjacentHTML("beforeend", `<button class="brand-create" type="button" data-action="create-brand">${icon("plus")}新增“${escape(query)}”</button>`);
		if (!$("#brandOptions").children.length) $("#brandOptions").innerHTML = '<div class="brand-empty">暂无匹配品牌</div>';
		$("#brandSelectedCount").textContent = `已选 ${selected.size} 个`;
	}
	function updateBrandControl() {
		const product = state.products.find(item => item.id === state.activeId);
		if (!product || !$("#field-brand")) return;
		const brands = getBrands(product);
		$(".brand-values").innerHTML = brands.length
			? `${brands.slice(0, 2).map(brand => `<span class="brand-chip">${escape(brand)}</span>`).join("")}${brands.length > 2 ? `<span class="brand-overflow">+${brands.length - 2}</span>` : ""}`
			: '<span class="brand-placeholder">请选择或新增品牌</span>';
		$("#field-brand").title = brands.length ? brands.join("、") : "请选择品牌，可多选";
		$("#field-brand").setAttribute("aria-label", brands.length ? `品牌名称：${brands.join("、")}，已选 ${brands.length} 个` : "选择品牌名称，可多选");
	}
	function closeBrandMenu(restoreFocus = false) {
		if (!$("#brandMenu")) return;
		$("#brandMenu").hidden = true;
		$("#field-brand").setAttribute("aria-expanded", "false");
		if (restoreFocus) $("#field-brand").focus({ preventScroll: true });
	}
	function openBrandMenu() {
		const menu = $("#brandMenu");
		menu.hidden = false;
		$("#field-brand").setAttribute("aria-expanded", "true");
		$("#brandSearch").value = "";
		renderBrandOptions();
		positionBrandMenu();
		$("#brandSearch").focus({ preventScroll: true });
	}
	function positionBrandMenu() {
		const menu = $("#brandMenu");
		if (!menu || menu.hidden) return;
		const rect = $("#field-brand").getBoundingClientRect();
		const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 30);
		const roomBelow = window.innerHeight - rect.bottom - 80;
		const roomAbove = rect.top - 70;
		const height = Math.min(278, Math.max(roomBelow, roomAbove));
		menu.style.width = `${width}px`;
		menu.style.left = `${Math.min(Math.max(15, rect.left), window.innerWidth - width - 15)}px`;
		menu.style.maxHeight = `${height}px`;
		menu.style.top = `${roomBelow >= Math.min(278, roomAbove) ? rect.bottom + 5 : Math.max(60, rect.top - Math.min(menu.scrollHeight, height) - 5)}px`;
	}
	function brandsChanged() {
		state.dirty = true;
		updateBrandControl();
		renderBrandOptions();
		renderRows();
		renderQuote();
		updateFieldErrors();
		setFormError("");
	}
	function createBrand() {
		const brand = $("#brandSearch").value.trim();
		const product = state.products.find(item => item.id === state.activeId);
		if (!brand || !product) return;
		if (!brandOptions.some(existing => normalize(existing) === normalize(brand))) brandOptions.push(brand);
		if (!getBrands(product).some(existing => normalize(existing) === normalize(brand))) product.brands.push(brand);
		$("#brandSearch").value = "";
		brandsChanged();
		$("#brandSearch").focus();
	}
	function renderEditor() {
		const product = state.products.find(item => item.id === state.activeId);
		if (!product) { $("#productEditor").innerHTML = ""; return; }
		const index = state.products.indexOf(product);
		$("#productEditor").innerHTML = `<div class="editor" data-editor="${product.id}">
			<div class="editor-head">${icon("file-text")}<strong>类目 ${String(index + 1).padStart(2, "0")} · ${product.fromBase ? "基础商品" : "填写"}</strong>${product.fromBase ? `<span class="reuse-label">${icon("check-check")}基础品牌锁定，可新增品牌</span>` : ""}<span class="editor-hint">${product.fromBase ? "" : '<span class="required">*</span> 为必填项'}</span></div>
			<div class="editor-form compact-editor-form">
				${field(product, "type", "类目", { select: true, required: true, disabled: product.fromBase })}
				${brandField(product)}
				${product.fromBase ? "" : '<p class="brand-count-hint">提交追加后，请在服务单上传资料时补充具体品牌信息。</p>'}
			</div>
			<div class="editor-footer">${index > 0 ? `<button class="text-button" data-action="previous">${icon("chevron-left")}上一个</button>` : ""}${index < state.products.length - 1 ? `<button class="text-button" data-action="next">下一个${icon("chevron-right")}</button>` : `<button class="text-button" data-action="add">${icon("plus")}继续添加类目</button>`}</div>
		</div>`;
		updateBrandControl();
	}
	function renderQuote() {
		const result = quote();
		const years = [...state.years].sort();
		const selectedProduct = result.selectedProduct;
		$("#productRows").innerHTML = state.products.map((product, index) => {
			const complete = !Object.keys(productErrors(product)).length;
			return `<tr data-product="${product.id}" class="${product.id === state.activeId ? "active" : ""}" tabindex="0">
				<td class="muted">${String(index + 1).padStart(2, "0")}</td>
				<td>${escape(product.type || "未选择类目")}</td>
				<td>${escape(brandsText(product) || "未选择")}</td>
				<td>${product.fromBase ? '<span class="base-locked">基础品牌锁定，可新增品牌数量</span>' : `<div class="table-actions"><button class="icon-button" data-action="edit" data-id="${product.id}" title="编辑" aria-label="编辑第 ${index + 1} 个类目">${icon("file-text")}</button><button class="icon-button" data-action="copy" data-id="${product.id}" title="复制" aria-label="复制第 ${index + 1} 个类目">${icon("copy")}</button><button class="icon-button delete" data-action="remove" data-id="${product.id}" title="删除" aria-label="删除第 ${index + 1} 个类目">${icon("trash")}</button></div>`}</td>
			</tr>`;
		}).join("");
		$("#formSummary").innerHTML = !years.length
			? `<span>${icon("calendar-days")}选择追加年份后查看价格</span>`
			: selectedProduct
				? `<span><b>${selectedProduct.name}</b><small>${selectedProduct.years.map(year => `${year}-01-01 至 ${year}-12-31`).join(" · ")}</small><strong>${result.issues.length ? "待核对" : `¥${money(selectedProduct.price)}`}</strong></span>`
				: `<span class="summary-warning">${icon("circle-alert")}可追加商品有误，请联系客服进行处理。</span>`;
		$("#quoteTotal").innerHTML = result.ready ? `<small>¥</small>${money(result.total)}` : "—";
		$("#footerSelection").innerHTML = years.length
			? `${icon("calendar-days")}<span>已选 <strong>${state.years.includes(2026) && state.years.includes(2027) ? "2026+2027" : "2027"} 年</strong><span class="footer-count"> · ${state.products.length} 个类目</span></span>`
			: `${icon("calendar-days")}尚未选择追加年份`;
	}
	function updateFieldErrors() {
		if (!state.validated) return;
		const product = state.products.find(item => item.id === state.activeId);
		if (!product) return;
		const errors = productErrors(product);
		$$("[data-error-field]").forEach(element => {
			const message = errors[element.dataset.errorField];
			element.textContent = message || "";
			element.hidden = !message;
		});
		$$("[data-field-wrap]").forEach(element => element.classList.toggle("invalid", Boolean(errors[element.dataset.fieldWrap])));
	}
	function baseService() {
		return BASE_SERVICES[state.baseId] || BASE_SERVICES[DEFAULT_BASE_ID];
	}
	function renderBaseContext() {
		const base = baseService();
		$("#contextBaseId").textContent = base.id;
		$("#contextPeriod").textContent = base.period;
		renderAppendYears();
	}
	function renderAppendYears() {
		$("#appendYearOptions").innerHTML = APPEND_YEAR_OPTIONS.map(option => `<label class="year-option">
			<input type="radio" name="yearOption" value="${option.id}" ${sameYears(state.years, option.years) ? "checked" : ""}>
			<span class="year-copy"><strong>${option.label}</strong><small>${option.years.map(year => `${year}-01-01 至 ${year}-12-31`).join(" · ")}</small></span>
			<span class="year-tag">${option.tag}</span>
		</label>`).join("");
		$("#yearError").hidden = Boolean(state.years.length) || !state.validated;
	}
	function sameYears(left, right) {
		const a = [...left].sort();
		const b = [...right].sort();
		return a.length === b.length && a.every((year, index) => year === b[index]);
	}
	function reusedProduct(base) {
		return newProduct({ type: base.product.type, brands: [...base.product.brands], baseBrandCount: base.product.brands.length, fromBase: true });
	}
	function resetForm(reuse = true) {
		const base = baseService();
		state.years = [];
		state.reused = reuse;
		state.products = [reuse ? reusedProduct(base) : newProduct()];
		state.activeId = state.products[0].id;
		state.validated = false;
		state.dirty = false;
		$("#yearError").hidden = true;
		setFormError("");
		renderBaseContext();
		renderRows();
		renderEditor();
		renderQuote();
		$("#formScroll").scrollTop = 0;
	}
	function showServicePage() {
		state.returnView = "list";
		$("#dashboardPage").hidden = true;
		$("#servicePage").hidden = false;
		$("#dashboardNav").classList.remove("active");
		$("#baseServiceNav").classList.add("active");
		$("#pageBreadcrumbs").innerHTML = `服务管理 <i data-icon="chevron-right"></i><span>基础服务</span>`;
		hydrateIcons($("#pageBreadcrumbs"));
		renderServices();
	}
	function showDashboard() {
		$("#guideOverlay").hidden = true;
		$("#servicePage").hidden = true;
		$("#dashboardPage").hidden = false;
		$("#dashboardNav").classList.add("active");
		$("#baseServiceNav").classList.remove("active");
		$("#pageBreadcrumbs").textContent = "工作台";
	}
	function openGuide() {
		$("#guideOverlay").hidden = false;
		$("#guideCompany").value = "";
		$("#guideCountry").value = "";
		$("#guideCategory").value = "";
		renderGuideServices();
		$("#closeGuide").focus({ preventScroll: true });
	}
	function closeGuide() {
		$("#guideOverlay").hidden = true;
	}
	function renderGuideServices() {
		const company = normalize($("#guideCompany").value);
		const country = $("#guideCountry").value;
		const category = $("#guideCategory").value;
		let visible = 0;
		$$(".guide-service-card").forEach(card => {
			const matchesCompany = normalize(card.dataset.company).includes(company);
			const matchesCountry = !country || card.dataset.country === country;
			const matchesCategory = !category || card.dataset.category === category;
			card.hidden = !(matchesCompany && matchesCountry && matchesCategory);
			if (!card.hidden) visible++;
		});
		$("#guideResultCount").textContent = `共 ${visible} 条`;
		$("#guideNoResult").hidden = visible !== 0;
	}
	function openAppend(baseId = state.baseId, fromView = "list") {
		state.baseId = BASE_SERVICES[baseId] ? baseId : DEFAULT_BASE_ID;
		state.returnView = fromView;
		$("#moreMenu").hidden = true;
		$("#moreActions")?.setAttribute("aria-expanded", "false");
		closeGuide();
		orders = readOrders();
		resetForm(true);
		$("#appendOverlay").hidden = false;
		$("#submitAppend").focus({ preventScroll: true });
	}
	function closeAppend() {
		if (state.dirty) {
			showOverlay("#discardOverlay");
		} else finishClose();
	}
	function finishClose() {
		$("#discardOverlay").hidden = true;
		$("#appendOverlay").hidden = true;
		resetForm(true);
		if (state.returnView === "dashboard") {
			showDashboard();
			$(".append-quick-card").focus({ preventScroll: true });
		} else {
			showServicePage();
			$("#moreActions")?.focus({ preventScroll: true });
		}
	}
	function showOverlay(selector) {
		returnFocus = document.activeElement;
		const overlay = $(selector);
		overlay.hidden = false;
		const focus = overlay.querySelector("button");
		focus?.focus({ preventScroll: true });
	}
	function closeOverlay(selector) {
		$(selector).hidden = true;
		returnFocus?.focus({ preventScroll: true });
	}
	function editProduct(id, scroll = false) {
		state.activeId = id;
		renderRows();
		renderEditor();
		if (scroll) $("#productEditor").scrollIntoView({ block: "nearest", behavior: "auto" });
	}
	function addProduct(values = {}) {
		if (state.products.length >= 20) { toast("单次最多添加 20 个产品，请分批追加。", true); return; }
		const product = newProduct(values);
		state.products.push(product);
		state.dirty = true;
		editProduct(product.id, true);
		renderQuote();
	}
	function showConfirmation() {
		state.validated = true;
		orders = readOrders();
		renderRows();
		updateFieldErrors();
		$("#yearError").hidden = Boolean(state.years.length);
		setFormError("");
		if (!state.years.length) {
			setFormError("请选择追加年份");
			$('input[name="yearOption"]').focus({ preventScroll: true });
			$(".year-section").scrollIntoView({ block: "nearest" });
			return;
		}
		const selectedProduct = quote().selectedProduct;
		if (!selectedProduct) {
			setFormError(MATCH_ERROR);
			return;
		}
		state.selectedProductId = selectedProduct.id;
		if (!state.products.length) { setFormError("请至少添加一个类目"); return; }
		const invalid = state.products.find(product => Object.keys(productErrors(product)).length);
		if (invalid) {
			editProduct(invalid.id);
			setFormError(`产品 ${state.products.indexOf(invalid) + 1} 资料未完善，请检查标记字段。`);
			const key = Object.keys(productErrors(invalid))[0];
			const target = key === "brand" && invalid.fromBase ? $('[data-brand-input]:not([readonly])') : $(`[data-field="${key}"]`);
			target.focus({ preventScroll: true });
			target.scrollIntoView({ block: "nearest" });
			return;
		}
		const identities = new Set();
		for (const product of state.products) {
			const identity = product.fromBase ? pairKey({ ...product, brand: getBrands(product)[0] }) : `${product.type}|count|${Number(product.brandCount)}|${product.id}`;
			if (identities.has(identity)) {
				setFormError("存在重复的类目与品牌，请核对本次追加内容。");
				editProduct(product.id, true);
				return;
			}
			identities.add(identity);
		}
		const result = quote();
		renderQuote();
		if (result.issues.length) {
			setFormError(result.issues[0].message);
			return;
		}
		$("#confirmBody").innerHTML = `<p class="confirm-intro">示例智联科技有限公司 · ${escape(result.selectedProduct.name)}</p>${state.products.map(product => `<div class="confirm-product"><span class="confirm-product-icon">${icon("layers")}</span><div><strong>${escape(product.type)} / ${escape(brandsText(product))}</strong><p>类目和品牌仅用于本次追加</p></div></div>`).join("")}<div class="confirm-years"><div class="confirm-year"><div>${icon("circle-check")}${state.years.includes(2026) && state.years.includes(2027) ? "2026+2027" : "2027"} 年<small>服务区间 ${state.years.map(year => `${year}-01-01 至 ${year}-12-31`).join(" · ")}</small></div><span>¥${money(result.total)}</span></div></div><div class="confirm-total"><span>追加金额</span><strong>¥${money(result.total)}</strong></div><p class="confirm-note">追加服务单记录本次所选年份的服务区间。订单支付生效后生成服务单。</p>`;
		showOverlay("#confirmOverlay");
	}
	function readOrders() {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
			return Array.isArray(saved) ? saved.filter(order => BASE_SERVICES[order.baseId] && Array.isArray(order.years) && Array.isArray(order.products) && ["paid", "pending"].includes(order.status)).map(order => ({ ...order, products: order.products.map(product => ({ ...product, brands: getBrands(product) })) })) : [];
		} catch { return []; }
	}
	function saveOrders() {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)); return true; }
		catch { toast("浏览器存储空间不足，请减少图片大小后重试。", true); return false; }
	}
	function renderOrders() {
		$("#orderCount").textContent = orders.length;
		$("#orderList").innerHTML = orders.length ? [...orders].reverse().map(order => `<div class="order-item"><div><strong>${escape(order.id)}</strong><p>${order.years.join("、")} 年 · ${order.products.length} 个产品 · ${escape(uniquePairs(order.products).map(product => product.brand.trim()).join("、"))}</p></div><div><span class="status ${order.status === "paid" ? "green" : "amber"}">${order.status === "paid" ? "已支付" : "待支付"}</span><span>¥${money(order.amount)}</span><button class="text-button" data-action="view-order" data-id="${escape(order.id)}">${order.status === "paid" ? "查看服务" : "继续支付"}${icon("chevron-right")}</button></div></div>`).join("") : '<div class="empty-orders">暂无追加记录</div>';
	}
	function createOrder() {
		if (busy) return;
		busy = true;
		$("#createOrder").disabled = true;
		orders = readOrders();
		const result = quote();
		if (result.issues.length) {
			busy = false;
			$("#createOrder").disabled = false;
			closeOverlay("#confirmOverlay");
			renderQuote();
			setFormError(result.issues[0].message);
			return;
		}
		const order = {
			id: `AP${Date.now()}`,
			baseId: state.baseId,
			productId: quote().selectedProduct?.id || "",
			productName: quote().selectedProduct?.name || "",
			years: [...state.years].sort(),
			products: JSON.parse(JSON.stringify(state.products)),
			reusedFromBase: state.reused,
			amount: result.total,
			details: [{ year: state.years.includes(2026) && state.years.includes(2027) ? "2026+2027" : "2027", years: [...state.years].sort(), amount: result.total }],
			status: "pending",
			createdAt: new Date().toISOString(),
			servicePeriods: []
		};
		orders.push(order);
		if (!saveOrders()) {
			orders.pop();
			$("#createOrder").disabled = false;
			busy = false;
			return;
		}
		$("#confirmOverlay").hidden = true;
		$("#appendOverlay").hidden = true;
		resetForm(false);
		currentOrderId = order.id;
		renderOrders();
		renderPayment();
		showOverlay("#paymentOverlay");
		$("#createOrder").disabled = false;
		busy = false;
	}
	function renderPayment() {
		const order = orders.find(item => item.id === currentOrderId);
		if (!order) return;
		const paid = order.status === "paid";
		const base = BASE_SERVICES[order.baseId] || baseService();
		$("#paymentBody").innerHTML = `<div class="payment-main"><div class="payment-status ${paid ? "success" : ""}">${icon(paid ? "circle-check" : "clock")}<div><h3>${paid ? "追加成功" : "追加订单已生成"}</h3><p>${paid ? "追加服务单已生成，服务区间按所购年度分别记录。" : "订单支付后生成追加服务单。"}</p></div></div><div class="payment-order-id">订单编号 ${escape(order.id)} · 关联基础单 ${escape(order.baseId)}</div><div class="service-record"><div><strong>${escape(order.productName)} · ${escape(uniquePairs(order.products).map(product => `${product.type} / ${product.brand.trim()}`).join("、"))}</strong>${paid ? `<span class="status green">已支付</span>` : `<span>¥${money(order.amount)}</span>`}</div>${paid ? order.servicePeriods.map(period => `<p>追加服务单 ${escape(period.serviceId)}</p><p class="service-period">独立服务区间 ${period.start} 至 ${period.end}</p>`).join("") : `<p>服务区间 ${order.details[0].years.map(year => `${year}-01-01 至 ${year}-12-31`).join(" · ")}</p>`}</div><div class="payment-amount"><span>${paid ? "已支付" : "应付金额"}</span><strong>¥${money(order.amount)}</strong></div><p class="payment-mock-note">${paid ? `基础服务截止 ${base.end}；追加服务仅覆盖本次所购年度。` : "支付不会发生真实扣款。"}</p></div>`;
		$("#paymentFooter").innerHTML = paid
			? `<button class="btn primary" data-action="return-base">${state.returnView === "dashboard" ? "返回工作台" : "返回基础服务"}</button>`
			: `<button class="btn" data-action="pay-later">稍后支付</button><button class="btn primary" data-action="pay">${icon("credit-card")}确认支付</button>`;
	}
	function payOrder() {
		if (busy) return;
		busy = true;
		orders = readOrders();
		const order = orders.find(item => item.id === currentOrderId);
		if (!order || order.status === "paid") { renderPayment(); busy = false; return; }
		const previous = JSON.parse(JSON.stringify(order));
		order.status = "paid";
		order.servicePeriods = order.years.map((year, index) => ({
			year,
			serviceId: `${order.id.replace("AP", "SV")}-${index + 1}`,
			start: year === 2026 ? DEMO_DATE : `${year}-01-01`,
			end: `${year}-12-31`
		}));
		if (!saveOrders()) { orders[orders.indexOf(order)] = previous; busy = false; return; }
		renderPayment();
		renderOrders();
		$("#paymentFooter button").focus();
		toast("支付成功，已生成追加服务单");
		busy = false;
	}
	function sampleProduct() {
		const product = state.products.find(item => item.id === state.activeId);
		if (!product) return;
		const index = state.products.indexOf(product);
		Object.assign(product, {
			type: "屏幕设备",
			brands: [index ? `NOVA ${index + 1}` : "NOVA"],
			fromBase: false
		});
		state.dirty = true;
		renderRows();
		renderEditor();
		renderQuote();
		setFormError("");
	}
	function handleAction(action, id, index) {
		switch (action) {
			case "goto-services": showServicePage(); break;
			case "show-renewal": window.location.href = "renewal.html"; break;
			case "open-guide": openGuide(); break;
			case "choose-base": openAppend(id || DEFAULT_BASE_ID, "dashboard"); break;
			case "open-more": {
				const menu = $("#moreMenu");
				menu.hidden = !menu.hidden;
				$("#moreActions").setAttribute("aria-expanded", String(!menu.hidden));
				if (!menu.hidden) {
					const rect = $("#moreActions").getBoundingClientRect();
					menu.style.left = `${Math.min(window.innerWidth - 190, Math.max(12, rect.right - 168))}px`;
					menu.style.top = `${Math.min(rect.bottom + 7, window.innerHeight - 225)}px`;
				}
				break;
			}
			case "service-period":
				$("#moreMenu").hidden = true;
				toast("基础服务区间：2026-01-01 至 2027-12-31");
				break;
			case "close": closeAppend(); break;
			case "toggle-brands": $("#brandMenu").hidden ? openBrandMenu() : closeBrandMenu(); break;
			case "done-brands": closeBrandMenu(true); break;
			case "clear-brands": {
				const product = state.products.find(item => item.id === state.activeId);
				product.brands = [];
				brandsChanged();
				break;
			}
			case "create-brand": createBrand(); break;
			case "add-brand":
			case "remove-brand":
				break;
			case "add": addProduct(); break;
			case "sample": sampleProduct(); break;
			case "edit": editProduct(id, true); break;
			case "copy": {
				const original = state.products.find(product => product.id === id);
				if (original?.fromBase) { toast("基础商品带入项不可复制", true); break; }
				if (original) { const { id: discarded, ...values } = original; addProduct(values); toast("已复制产品，请核对品牌与产品信息"); }
				break;
			}
			case "remove": {
				const index = state.products.findIndex(product => product.id === id);
				if (index < 0) break;
				if (state.products[index].fromBase) { toast("基础商品带入项不可删除", true); break; }
				state.products.splice(index, 1);
				if (state.activeId === id) state.activeId = state.products[Math.max(0, index - 1)]?.id || null;
				state.dirty = true;
				renderRows(); renderEditor(); renderQuote(); setFormError("");
				break;
			}
			case "previous":
			case "next": {
				const index = state.products.findIndex(product => product.id === state.activeId);
				editProduct(state.products[index + (action === "next" ? 1 : -1)].id, true);
				break;
			}
			case "view-order": currentOrderId = id; renderPayment(); showOverlay("#paymentOverlay"); break;
			case "pay": payOrder(); break;
			case "pay-later":
			case "return-base": {
				closeOverlay("#paymentOverlay");
				if (state.returnView === "dashboard") showDashboard();
				else showServicePage();
				break;
			}
		}
	}
	function renderServices() {
		const keyword = $("#serviceKeyword").value.trim().toLocaleLowerCase();
		const rows = Array.from({ length: 10 }, (_, index) => ({
			id: index === 2 ? DEFAULT_BASE_ID : `SV20261110${String(index + 2).padStart(4, "0")}`,
			orderId: `DD20261110${String(index + 1).padStart(4, "0")}`,
			company: index === 2 ? "示例智联科技有限公司" : `示例企业${String(index + 1).padStart(2, "0")}有限公司`,
			index
		})).filter(row => `${row.id} ${row.company}`.toLocaleLowerCase().includes(keyword));
		$("#serviceRows").innerHTML = rows.length ? rows.map(row => `<tr class="${row.index === 2 ? "entry-row" : ""}"><td><input type="checkbox" data-service-check aria-label="选择 ${escape(row.company)}"></td><td>${row.index + 1}</td><td><span class="service-id">${row.id}</span></td><td>${row.orderId}</td><td>${escape(row.company)}</td><td>新-德国WEEE注册＋申报（${row.index === 2 ? "26-01-01 至 27-12-31" : "2026-01-01 至 2026-12-31"}）</td><td>服务类型（SaaS服务） 类目数量（1） 品牌数量（1）</td><td class="service-operation"><span class="service-static-action">${row.index < 2 ? "查看资料　查看产品服务期" : "查看证书　查看资料"}</span>${row.index === 2 ? '<button class="text-button more-action" id="moreActions" data-action="open-more" aria-haspopup="menu" aria-expanded="false">更多操作</button>' : ""}</td></tr>`).join("") : '<tr><td colspan="8" class="no-services">暂无匹配的基础服务</td></tr>';
		$("#serviceResultCount").textContent = rows.length;
		$("#servicePageCount").textContent = `共 ${rows.length} 条`;
		$("#selectedServices").textContent = "0";
		$("#selectAllServices").checked = false;
	}
	function downloadTypeGuide() {
		const bytes = Uint8Array.from(atob(window.CERTIFICATE_TYPE_GUIDE), character => character.charCodeAt(0));
		const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
		const link = document.createElement("a");
		link.href = url;
		link.download = "德国WEEE类目说明.pdf";
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10000);
	}
	function renderCalendar() {
		const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
		const days = [];
		weekdays.forEach(day => days.push(`<span class="weekday">${day}</span>`));
		[26, 27, 28, 29, 30, 31].forEach(day => days.push(`<span class="calendar-day current">${day}</span>`));
		for (let day = 1; day <= 30; day++) {
			const marks = [8, 10, 15].includes(day) ? " event-dot" : "";
			const today = day === 11 ? " today" : "";
			days.push(`<span class="calendar-day${today}${marks}"><span>${day}</span></span>`);
		}
		[1, 2, 3, 4, 5, 6].forEach(day => days.push(`<span class="calendar-day current">${day}</span>`));
		$("#calendarGrid").innerHTML = days.join("");
	}

	$("#openAppend").addEventListener("click", () => openAppend(DEFAULT_BASE_ID, "list"));
	$("#closeGuide").addEventListener("click", closeGuide);
	$("#guideCancel").addEventListener("click", closeGuide);
	["#guideCompany", "#guideCountry", "#guideCategory"].forEach(selector => $(selector).addEventListener("input", renderGuideServices));
	["#guideCountry", "#guideCategory"].forEach(selector => $(selector).addEventListener("change", renderGuideServices));
	$("#addProduct").addEventListener("click", () => addProduct());
	$("#submitAppend").addEventListener("click", showConfirmation);
	$("#createOrder").addEventListener("click", createOrder);
	$("#closeConfirm").addEventListener("click", () => closeOverlay("#confirmOverlay"));
	$("#editAgain").addEventListener("click", () => closeOverlay("#confirmOverlay"));
	$("#closePayment").addEventListener("click", () => closeOverlay("#paymentOverlay"));
	$("#continueEditing").addEventListener("click", () => closeOverlay("#discardOverlay"));
	$("#discardForm").addEventListener("click", finishClose);
	$("#searchServices").addEventListener("click", renderServices);
	$("#resetServices").addEventListener("click", () => { $("#serviceKeyword").value = ""; renderServices(); });
	$("#serviceKeyword").addEventListener("keydown", event => { if (event.key === "Enter") renderServices(); });
	$("#selectAllServices").addEventListener("change", event => {
		$$("[data-service-check]").forEach(input => input.checked = event.target.checked);
		$("#selectedServices").textContent = $$("[data-service-check]:checked").length;
	});
	document.addEventListener("click", event => {
		if (event.target.closest(".type-guide, .type-guide-icon")) { event.preventDefault(); event.stopPropagation(); downloadTypeGuide(); return; }
		if (!event.target.closest(".brand-field")) closeBrandMenu();
		if (!event.target.closest("#moreMenu, #moreActions")) { $("#moreMenu").hidden = true; $("#moreActions")?.setAttribute("aria-expanded", "false"); }
		const button = event.target.closest("[data-action]");
		if (button) { handleAction(button.dataset.action, button.dataset.id, button.dataset.index); return; }
		const row = event.target.closest("tr[data-product]");
		if (row) editProduct(row.dataset.product);
	});
	document.addEventListener("input", event => {
		if (event.target.id === "brandSearch") { renderBrandOptions(); return; }
		if (event.target.matches("[data-brand-input]")) {
			const product = state.products.find(item => item.id === state.activeId);
			const index = Number(event.target.dataset.index);
			if (!product || !Number.isInteger(index)) return;
			if (product.fromBase && index < (Number(product.baseBrandCount) || 0)) return;
			product.brands[index] = event.target.value;
			state.dirty = true;
			renderRows();
			renderQuote();
			updateFieldErrors();
			setFormError("");
			return;
		}
		const input = event.target.closest("[data-field]");
		if (!input) return;
		const product = state.products.find(item => item.id === state.activeId);
		if (!product) return;
		if (product.fromBase && input.dataset.field !== "addedBrandCount") return;
		product[input.dataset.field] = input.value;
		if (input.dataset.field === "brandCount") product.brandCount = Number(input.value);
		if (input.dataset.field === "addedBrandCount") product.addedBrandCount = Number(input.value);
		state.dirty = true;
		renderRows();
		renderQuote();
		updateFieldErrors();
		setFormError("");
	});
	document.addEventListener("change", event => {
		if (event.target.matches("[data-brand]")) {
			const product = state.products.find(item => item.id === state.activeId);
			const brand = event.target.dataset.brand;
			product.brands = event.target.checked ? [...getBrands(product), brand] : getBrands(product).filter(existing => normalize(existing) !== normalize(brand));
			brandsChanged();
			[...$("#brandOptions").querySelectorAll("[data-brand]")].find(input => input.dataset.brand === brand)?.focus({ preventScroll: true });
		}
		if (event.target.matches("[data-service-check]")) $("#selectedServices").textContent = $$("[data-service-check]:checked").length;
		if (event.target.name === "yearOption") {
			state.years = [...(APPEND_YEAR_OPTIONS.find(option => option.id === event.target.value)?.years || [])];
			state.dirty = true;
			$("#yearError").hidden = Boolean(state.years.length);
			setFormError("");
			renderQuote();
		}
	});
	document.addEventListener("keydown", event => {
		if (event.key === "Enter" && event.target.id === "brandSearch") { event.preventDefault(); createBrand(); return; }
		if (event.key === "Escape" && $("#brandMenu") && !$("#brandMenu").hidden) { event.preventDefault(); closeBrandMenu(true); return; }
		const row = event.target.closest("tr[data-product]");
		if (row && event.target === row && event.key === "Enter") editProduct(row.dataset.product, true);
		const topOverlay = [$("#guideOverlay"), $("#discardOverlay"), $("#paymentOverlay"), $("#confirmOverlay"), $("#appendOverlay")].find(element => !element.hidden);
		if (!topOverlay) return;
		if (event.key === "Escape") {
			event.preventDefault();
			if (topOverlay.id === "appendOverlay") closeAppend();
			else if (topOverlay.id === "guideOverlay") closeGuide();
			else closeOverlay(`#${topOverlay.id}`);
		}
		if (event.key === "Tab") {
			const nodes = [...topOverlay.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled):not([type=file]), select:not(:disabled), [tabindex="0"]')].filter(element => element.getClientRects().length);
			if (!nodes.length) return;
			const first = nodes[0], last = nodes[nodes.length - 1];
			if (event.shiftKey && (document.activeElement === first || !topOverlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
			if (!event.shiftKey && (document.activeElement === last || !topOverlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
		}
	});
	window.addEventListener("resize", () => closeBrandMenu());
	document.addEventListener("scroll", event => { if (!event.target.closest?.(".brand-menu")) positionBrandMenu(); }, true);
	window.addEventListener("storage", event => {
		if (event.key === STORAGE_KEY) { orders = readOrders(); renderOrders(); renderQuote(); }
	});
	hydrateIcons();
	renderCalendar();
	renderServices();
	resetForm(true);
	renderOrders();
})();
