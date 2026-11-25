(function () {
	"use strict";

	const STORAGE_KEY = "kxt-category-channel-demo-v3";
	const LEGACY_STORAGE_KEY = "kxt-category-channel-demo-v2";
	const STORE_VERSION = 3;
	const PRODUCTS = [
		{ id: "60", name: "国内工商财税", parentId: null, enabled: true },
		{ id: "1", name: "VAT", parentId: null, enabled: true },
		{ id: "69", name: "成本结算测试专用", parentId: "1", enabled: false },
		{ id: "64", name: "其他", parentId: "1", enabled: true },
		{ id: "4", name: "IOSS", parentId: "1", enabled: true },
		{ id: "3", name: "OSS", parentId: "1", enabled: true },
		{ id: "2", name: "VAT", parentId: "1", enabled: true },
		{ id: "5", name: "EPR", parentId: null, enabled: true },
		{ id: "51", name: "包装法", parentId: "5", enabled: true },
		{ id: "22", name: "产品合规", parentId: null, enabled: true },
		{ id: "27", name: "知识产权", parentId: null, enabled: true },
		{ id: "30", name: "海外工商财税", parentId: null, enabled: true }
	];
	const CHANNELS = [
		{ id: "A1", name: "VAT", parentId: null, enabled: true },
		{ id: "A1-1", name: "VAT", parentId: "A1", enabled: true },
		{ id: "A1-2", name: "IOSS", parentId: "A1", enabled: true },
		{ id: "A1-3", name: "OSS", parentId: "A1", enabled: true },
		{ id: "A1-4", name: "B2B", parentId: "A1", enabled: true },
		{ id: "A1-5", name: "CDS注册", parentId: "A1", enabled: true },
		{ id: "A1-6", name: "ACP", parentId: "A1", enabled: true },
		{ id: "A1-7", name: "JCT", parentId: "A1", enabled: true },
		{ id: "A1-8", name: "RFC", parentId: "A1", enabled: true },
		{ id: "A1-9", name: "海牙认证", parentId: "A1", enabled: true },
		{ id: "A1-10", name: "翻译", parentId: "A1", enabled: true },
		{ id: "A2", name: "EPR", parentId: null, enabled: true },
		{ id: "A2-1", name: "包装法", parentId: "A2", enabled: false },
		{ id: "A2-2", name: "德国包装法", parentId: "A2", enabled: false },
		{ id: "A3", name: "知识产权", parentId: null, enabled: true },
		{ id: "A4", name: "授权代表", parentId: null, enabled: true },
		{ id: "A5", name: "检测认证", parentId: null, enabled: false },
		{ id: "A6", name: "国际工商", parentId: null, enabled: true },
		{ id: "A102", name: "海牙认证", parentId: null, enabled: true },
		{ id: "A103", name: "综合业务", parentId: null, enabled: true },
		{ id: "A104", name: "跨境税务", parentId: null, enabled: true },
		{ id: "A104-1", name: "英国VAT", parentId: "A104", enabled: true },
		{ id: "A104-2", name: "欧洲税务", parentId: "A104", enabled: true }
	];
	const SEED_RELATIONS = {
		"A1-1": ["2"], "A104-1": ["2"], "A1-2": ["4"], "A1-3": ["3"], "A2-1": ["51"]
	};
	const SEED_TIME = "2026-11-25 09:30:00";
	const $ = (selector) => document.querySelector(selector);
	const $$ = (selector) => Array.from(document.querySelectorAll(selector));
	const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
	const icon = (name) => '<i data-lucide="' + name + '" aria-hidden="true"></i>';
	const product = (id) => PRODUCTS.find((item) => item.id === id);
	const channel = (id) => CHANNELS.find((item) => item.id === id);
	const getDepth = (item, source) => item.parentId ? 1 + getDepth(source.find((node) => node.id === item.parentId), source) : 1;
	const isSecondary = (item, source) => Boolean(item && getDepth(item, source) === 2);
	const sanitizeRelations = (relations) => Object.fromEntries(Object.entries(relations || {}).flatMap(([channelId, productIds]) => {
		if (!isSecondary(channel(channelId), CHANNELS)) return [];
		const ids = [...new Set((Array.isArray(productIds) ? productIds : [productIds]).map(String).filter((id) => isSecondary(product(id), PRODUCTS)))].sort();
		return ids.length ? [[channelId, ids]] : [];
	}));
	const productPath = (id) => {
		const item = product(id);
		return item ? (item.parentId ? productPath(item.parentId) + " / " : "") + item.name : "未关联";
	};
	const channelPath = (id) => {
		const item = channel(id);
		return item ? (item.parentId ? channelPath(item.parentId) + " / " : "") + item.name : "";
	};
	const now = () => {
		const date = new Date();
		const number = (value) => String(value).padStart(2, "0");
		return date.getFullYear() + "-" + number(date.getMonth() + 1) + "-" + number(date.getDate()) + " " + number(date.getHours()) + ":" + number(date.getMinutes()) + ":" + number(date.getSeconds());
	};
	const freshStore = () => ({ version: STORE_VERSION, relations: sanitizeRelations(SEED_RELATIONS), productVersions: {}, history: [], updatedAt: {}, readonly: false });
	const normalizeStore = (saved) => ({
		...freshStore(), ...saved, version: STORE_VERSION, relations: sanitizeRelations(saved.relations),
		productVersions: saved.productVersions && typeof saved.productVersions === "object" ? saved.productVersions : {},
		history: Array.isArray(saved.history) ? saved.history.filter((item) => isSecondary(product(item.productId), PRODUCTS)).map((item) => ({
			...item, added: (item.added || []).filter((id) => isSecondary(channel(id), CHANNELS)),
			removed: (item.removed || []).filter((id) => isSecondary(channel(id), CHANNELS))
		})) : []
	});
	let store = freshStore();
	let storageAvailable = true;
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
		if (saved && saved.version === STORE_VERSION && saved.relations && typeof saved.relations === "object") {
			store = normalizeStore(saved);
		} else {
			const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
			if (legacy && legacy.version === 2 && legacy.relations) {
				store = normalizeStore(legacy);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
			}
		}
	} catch (_) {
		storageAvailable = false;
	}
	const state = {
		page: "products", keyword: "", association: "", status: "",
		expandedProducts: new Set(PRODUCTS.filter((item) => !item.parentId).map((item) => item.id)),
		expandedChannels: new Set(CHANNELS.filter((item) => !item.parentId).map((item) => item.id)),
		drawer: null, failNext: false, toastTimer: null, modalClose: null, returnFocus: null, modalReturnFocus: null
	};

	function refreshIcons() {
		if (window.lucide) window.lucide.createIcons({ attrs: { width: 16, height: 16, "aria-hidden": "true" } });
	}

	function persist(next) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
			storageAvailable = true;
			store = next;
			return true;
		} catch (_) {
			storageAvailable = false;
			return false;
		}
	}

	function notify(message, error) {
		const toast = $("#toast");
		clearTimeout(state.toastTimer);
		toast.innerHTML = icon(error ? "circle-alert" : "circle-check") + "<span>" + escapeHtml(message) + "</span>";
		toast.className = "toast" + (error ? " error" : " success");
		toast.hidden = false;
		refreshIcons();
		state.toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
	}

	function relationIds(productId, relations = store.relations) {
		if (!isSecondary(product(productId), PRODUCTS)) return [];
		return CHANNELS.filter((item) => isSecondary(item, CHANNELS) && (relations[item.id] || []).includes(productId)).map((item) => item.id);
	}

	function relatedProductIds(channelId, relations = store.relations) {
		return relations[channelId] || [];
	}

	function productFingerprint(productId, relations = store.relations) {
		return JSON.stringify(relationIds(productId, relations));
	}

	function readLatestStore() {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
			if (saved && saved.version === STORE_VERSION) return normalizeStore(saved);
		} catch (_) { /* 持久化时会显示存储失败，不丢弃当前草稿。 */ }
		return store;
	}

	function applyProductDraft(relations, productId, draft) {
		const next = sanitizeRelations(relations);
		for (const item of CHANNELS) {
			const ids = new Set(next[item.id] || []);
			if (draft.has(item.id)) ids.add(productId);
			else ids.delete(productId);
			if (ids.size) next[item.id] = [...ids].sort();
			else delete next[item.id];
		}
		return next;
	}

	function hasChildren(item, source) {
		return source.some((child) => child.parentId === item.id);
	}

	function matchingSecondaryRows() {
		const source = state.page === "products" ? PRODUCTS : CHANNELS;
		const keyword = state.keyword.toLocaleLowerCase();
		return source.filter((item) => {
			if (!isSecondary(item, source)) return false;
			if (keyword && ![item.id, state.page === "products" ? productPath(item.id) : channelPath(item.id), state.page === "channels" ? relatedProductIds(item.id).map(productPath).join(" ") : ""].join(" ").toLocaleLowerCase().includes(keyword)) return false;
			const mapped = state.page === "products" ? relationIds(item.id).length > 0 : relatedProductIds(item.id).length > 0;
			if (state.association && mapped !== (state.association === "mapped")) return false;
			if (state.status && item.enabled !== (state.status === "enabled")) return false;
			return true;
		});
	}

	function visibleRows() {
		const source = state.page === "products" ? PRODUCTS : CHANNELS;
		if (state.keyword || state.association || state.status) return matchingSecondaryRows();
		const expanded = state.page === "products" ? state.expandedProducts : state.expandedChannels;
		return source.filter((item) => !item.parentId || (isSecondary(item, source) && expanded.has(item.parentId)));
	}

	function treeCell(item, source) {
		const expanded = state.page === "products" ? state.expandedProducts : state.expandedChannels;
		const parent = hasChildren(item, source);
		return '<div class="tree-cell">' + (item.parentId ? '<span class="level-spacer"></span>' : "") +
			(parent ? '<button class="tree-toggle" type="button" data-action="toggle-tree" data-id="' + item.id + '" aria-label="' + (expanded.has(item.id) ? "收起" : "展开") + escapeHtml(item.name) + '" aria-expanded="' + expanded.has(item.id) + '">' + icon(expanded.has(item.id) ? "chevron-down" : "chevron-right") + "</button>" : '<span class="tree-spacer"></span>') +
			'<span>' + escapeHtml(item.parentId && (state.keyword || state.association || state.status) ? (state.page === "products" ? productPath(item.id) : channelPath(item.id)) : item.name) + "</span></div>";
	}

	function status(item) {
		return '<span class="status ' + (item.enabled ? "enabled" : "disabled") + '">' + (item.enabled ? "启用" : "禁用") + "</span>";
	}

	function renderTable() {
		const isProducts = state.page === "products";
		const source = isProducts ? PRODUCTS : CHANNELS;
		const rows = visibleRows();
		$("#main-table").className = "data-table " + (isProducts ? "product-table" : "channel-table");
		$("#table-head").innerHTML = "<tr>" +
			(isProducts ? '<th style="width:73px">类目ID</th><th style="width:185px">类目名称</th><th style="width:230px">关联二级渠道</th><th style="width:90px">关联状态</th><th style="width:80px">更新人</th><th style="width:155px">更新时间</th><th style="width:70px">状态</th><th style="width:155px">操作</th>' :
				'<th style="width:105px">渠道业务ID</th><th style="width:195px">渠道业务</th><th style="width:235px">关联产品类目</th><th style="width:100px">关联状态</th><th style="width:85px">业务状态</th><th style="width:155px">更新时间</th><th style="width:155px">操作</th>') + "</tr>";
		$("#table-body").innerHTML = rows.length ? rows.map((item) => {
			const configurable = isSecondary(item, source);
			const mapped = isProducts ? relationIds(item.id) : relatedProductIds(item.id);
			const updated = store.updatedAt[(isProducts ? "p:" : "c:") + item.id] || SEED_TIME;
			let html = '<tr data-row-id="' + item.id + '"' + (configurable ? "" : ' class="group-row"') + '><td class="code">' + item.id + "</td><td>" + treeCell(item, source) + "</td>";
			if (!configurable) {
				html += isProducts ? '<td class="muted">—</td><td class="muted">不适用</td><td>历史配置</td><td class="code">' + SEED_TIME + "</td><td>" + status(item) + '</td><td class="muted">一级分组</td>' : '<td class="muted">—</td><td class="muted">不适用</td><td>' + status(item) + '</td><td class="code">' + SEED_TIME + '</td><td class="muted">一级分组</td>';
				return html + "</tr>";
			}
			if (isProducts) {
				html += '<td><div class="relation-tags">' + (mapped.length ? mapped.slice(0, 2).map((id) => '<span class="relation-tag' + (channel(id).enabled ? "" : " disabled") + '" title="' + escapeHtml(channelPath(id)) + '">' + escapeHtml(channel(id).name) + (channel(id).enabled ? "" : " · 已禁用") + "</span>").join("") + '<span class="count-pill" title="共' + mapped.length + '项">' + mapped.length + "</span>" : '<span class="unmapped-text">暂无关联</span>') + "</div></td>";
				html += '<td>' + (mapped.length ? '<span class="association-mark">已关联</span>' : '<span class="status unmapped">未关联</span>') + "</td><td>" + (store.updatedAt["p:" + item.id] ? "当前用户" : "历史配置") + "</td><td class=\"code\">" + updated + "</td><td>" + status(item) + '</td><td><div class="row-actions"><button type="button" class="text-btn" data-action="associate" data-id="' + item.id + '">' + (store.readonly || !item.enabled ? "查看关联" : "关联渠道") + '</button><button type="button" class="text-btn" data-action="history" data-id="' + item.id + '">查看记录</button></div></td>';
			} else {
				html += "<td>" + (mapped.length ? '<div class="related-products"><div class="related-product-paths">' + mapped.map((id) => '<span title="类目ID：' + id + '">' + escapeHtml(productPath(id)) + "</span>").join("") + '</div><span class="count-pill" title="关联' + mapped.length + '个产品类目">' + mapped.length + "</span></div>" : '<span class="unmapped-text">未关联</span>') + "</td><td>" + (mapped.length ? '<span class="association-mark">已关联</span>' : '<span class="status unmapped">未关联</span>') + "</td><td>" + status(item) + '</td><td class="code">' + updated + '</td><td><div class="row-actions"><button class="text-btn" type="button" data-action="ownership" data-id="' + item.id + '">查看关联</button>' + (!store.readonly && item.enabled ? '<button class="text-btn" type="button" data-action="choose-target" data-id="' + item.id + '">去关联</button>' : "") + "</div></td>";
			}
			return html + "</tr>";
		}).join("") : '<tr><td colspan="' + (isProducts ? 8 : 7) + '" class="empty-state">' + icon("search-x") + '<div>暂无符合条件的数据</div><button class="text-btn" data-action="reset-filters" type="button">重置筛选条件</button></td></tr>';
		const configurableItems = source.filter((item) => isSecondary(item, source));
		const mappedCount = configurableItems.filter((item) => isProducts ? relationIds(item.id).length : relatedProductIds(item.id).length).length;
		const resultCount = matchingSecondaryRows().length;
		$("#total-count").textContent = "共 " + resultCount + " 条二级记录";
		$("#mapping-count").textContent = "已关联 " + mappedCount + " / " + configurableItems.length + (isProducts ? " 个二级类目" : " 项二级渠道");
		refreshIcons();
	}

	function resetFilters() {
		state.keyword = ""; state.association = ""; state.status = "";
		$("#filter-form").reset();
		renderTable();
	}

	function setPage(page) {
		state.page = page;
		const isProducts = page === "products";
		$$("[data-page]").forEach((node) => { node.classList.toggle("active", node.dataset.page === page); if (node.getAttribute("role") === "tab") node.setAttribute("aria-selected", String(node.dataset.page === page)); });
		$("#page-title").textContent = isProducts ? "类目渠道关联" : "渠道业务配置";
		$("#page-context").textContent = isProducts ? "" : "渠道管理 / 渠道服务管理";
		$("#page-context").hidden = isProducts;
		$("#keyword").placeholder = isProducts ? "类目ID / 类目名称" : "渠道业务ID / 名称 / 关联类目";
		$("#search-label").textContent = isProducts ? "类目ID或类目名称" : "渠道业务ID、名称或关联产品类目";
		resetFilters();
	}

	function readonlyFor(target) {
		return store.readonly || !target.enabled;
	}

	function targetEffectivelyEnabled(target) {
		return target.enabled && (!target.parentId || targetEffectivelyEnabled(product(target.parentId)));
	}

	function candidateRule(target, item, draft) {
		if (!isSecondary(target, PRODUCTS) || !isSecondary(item, CHANNELS)) return { disabled: true, reason: "仅支持二级类目关联二级渠道" };
		const current = relatedProductIds(item.id).includes(target.id);
		if (readonlyFor(target) || !targetEffectivelyEnabled(target)) return { disabled: true, reason: store.readonly ? "只读模式" : "产品类目已禁用" };
		if (current) return { disabled: false, reason: item.enabled ? "当前类目已关联" : "已禁用，保留历史关联，可解除" };
		if (!item.enabled) return { disabled: true, reason: "渠道业务已禁用" };
		let ancestor = item.parentId ? channel(item.parentId) : null;
		while (ancestor) {
			if (!ancestor.enabled) return { disabled: true, reason: "上级渠道业务已禁用" };
			ancestor = ancestor.parentId ? channel(ancestor.parentId) : null;
		}
		return { disabled: false, reason: draft.has(item.id) ? "已选择，保存后生效" : "可关联" };
	}

	function openDrawer(mode, id, autoSelect) {
		if ((mode === "associate" || mode === "history") && !isSecondary(product(id), PRODUCTS)) return;
		if (mode === "ownership" && !isSecondary(channel(id), CHANNELS)) return;
		state.returnFocus = document.activeElement;
		if (mode === "associate") {
			const ids = relationIds(id);
			state.drawer = { mode, id, original: new Set(ids), draft: new Set(ids), keyword: "", error: "", baseline: productFingerprint(id), baselineVersion: store.productVersions[id] || 0, conflict: false };
			if (autoSelect) {
				const target = product(id), item = channel(autoSelect);
				if (!candidateRule(target, item, state.drawer.draft).disabled) state.drawer.draft.add(autoSelect);
			}
		} else state.drawer = { mode, id };
		$("#overlay").hidden = false;
		document.body.style.overflow = "hidden";
		renderDrawer();
		$("#drawer-close").focus();
	}

	function drawerChanged() {
		const drawer = state.drawer;
		return drawer && drawer.mode === "associate" && (drawer.original.size !== drawer.draft.size || Array.from(drawer.original).some((id) => !drawer.draft.has(id)));
	}

	function closeDrawer(force) {
		if (!force && drawerChanged()) {
			openModal("放弃本次修改？", "<p>当前修改尚未保存，放弃后将恢复为上次保存的关联。</p>", [
				{ label: "继续编辑", action: closeModal }, { label: "放弃修改", danger: true, action: () => { closeModal(); closeDrawer(true); } }
			]);
			return;
		}
		$("#overlay").hidden = true;
		state.drawer = null;
		document.body.style.overflow = "";
		if (state.returnFocus && document.contains(state.returnFocus)) state.returnFocus.focus();
	}

	function renderDrawer() {
		const drawer = state.drawer;
		if (!drawer) return;
		$("#drawer-subtitle").hidden = drawer.mode === "associate";
		if (drawer.mode === "associate") renderAssociationDrawer();
		else if (drawer.mode === "history") renderHistoryDrawer();
		else renderOwnershipDrawer();
		refreshIcons();
	}

	function renderAssociationDrawer() {
		const drawer = state.drawer, target = product(drawer.id), readOnly = readonlyFor(target) || !targetEffectivelyEnabled(target);
		$("#drawer-title").textContent = "关联渠道业务";
		$("#drawer-subtitle").textContent = "";
		const candidates = CHANNELS.filter((item) => isSecondary(item, CHANNELS) && (!drawer.keyword || [item.id, item.name, channelPath(item.id)].join(" ").toLowerCase().includes(drawer.keyword.toLowerCase())));
		let html = '<div class="target-summary"><div class="summary-line"><span class="field-label">产品类目</span><span class="summary-name">' + escapeHtml(productPath(target.id)) + '</span><span class="level-label">二级类目</span></div><div class="summary-line"><span class="field-label">类目ID</span><span class="code">' + target.id + "</span></div></div>";
		if (!storageAvailable) html += '<div class="notice warning">' + icon("triangle-alert") + "<span>浏览器存储不可用，请允许本地存储后保存。</span></div>";
		if (readOnly) html += '<div class="notice info">' + icon("eye") + "<span>" + (store.readonly ? "当前为只读模式，可查看已保存的关联。" : "产品类目已禁用，仅可查看关联。") + "</span></div>";
		if (drawer.error) html += '<div class="notice error" id="save-error" role="alert">' + icon("circle-alert") + "<span>" + escapeHtml(drawer.error) + "</span></div>";
		html += '<div class="drawer-tools"><h3>选择二级渠道</h3><label class="input-wrap">' + icon("search") + '<input id="candidate-search" type="search" placeholder="二级渠道ID / 名称" aria-label="搜索渠道业务" value="' + escapeHtml(drawer.keyword) + '"></label></div><div class="candidate-wrap"><table class="candidate-table"><thead><tr><th class="candidate-check"></th><th class="candidate-code">渠道业务ID</th><th class="candidate-business">二级渠道</th><th class="candidate-state">状态</th></tr></thead><tbody>';
		html += candidates.length ? candidates.map((item) => {
			const rule = candidateRule(target, item, drawer.draft);
			const checked = drawer.draft.has(item.id);
			return '<tr class="candidate-row' + (checked ? " selected" : "") + (rule.disabled ? " blocked" : "") + '" data-candidate-row="' + item.id + '"><td class="candidate-check"><input type="checkbox" data-candidate="' + item.id + '" aria-label="选择 ' + item.id + " " + escapeHtml(item.name) + '"' + (checked ? " checked" : "") + (rule.disabled ? " disabled" : "") + ' title="' + escapeHtml(rule.reason) + '"></td><td class="code">' + item.id + '</td><td><div class="candidate-name">' + escapeHtml(item.name) + "</div>" + (item.parentId ? '<div class="candidate-context">上级：' + escapeHtml(channel(item.parentId).name) + " · " + item.parentId + "</div>" : "") + "</td><td>" + status(item) + "</td></tr>";
		}).join("") : '<tr><td class="empty-state" colspan="4">暂无符合条件的渠道业务</td></tr>';
		html += '</tbody></table></div><div class="selected-strip"><div class="selected-title">已选 <span class="count-pill" id="selected-total">' + drawer.draft.size + '</span> 项</div><div class="selected-items">';
		html += drawer.draft.size ? Array.from(drawer.draft).map((id) => {
			const item = channel(id);
			return '<span class="selected-chip' + (item.enabled ? "" : " disabled") + '">' + escapeHtml(item.name) + '<span class="code">' + id + "</span>" + (item.enabled ? "" : "<span>已禁用</span>") + (!readOnly ? '<button class="remove-chip" data-remove="' + id + '" type="button" aria-label="移除 ' + id + '" title="解除该关联">' + icon("x") + "</button>" : "") + "</span>";
		}).join("") : '<span class="empty-inline">暂无选择</span>';
		html += '</div><div class="selection-footnote">保存前的选择为草稿，取消不会修改已有关联。</div></div>';
		$("#drawer-content").innerHTML = html;
		$("#drawer-footer").innerHTML = '<span class="footer-info">已选 ' + drawer.draft.size + ' 项渠道业务</span><button id="drawer-cancel" class="btn" type="button">' + (readOnly ? "关闭" : "取消") + "</button>" + (!readOnly ? '<button id="save-relations" class="btn primary" type="button">' + icon("check") + "保存关联</button>" : "");
		$("#drawer-cancel").onclick = () => closeDrawer(false);
		if ($("#save-relations")) $("#save-relations").onclick = saveRelations;
		$("#candidate-search").addEventListener("input", (event) => {
			drawer.keyword = event.target.value;
			const position = event.target.selectionStart;
			renderDrawer();
			const search = $("#candidate-search"); search.focus();
			try { search.setSelectionRange(position, position); } catch (_) { /* search 输入在部分浏览器不支持选择范围。 */ }
		});
		$$("[data-candidate]").forEach((checkbox) => checkbox.addEventListener("change", () => {
			const id = checkbox.dataset.candidate;
			if (checkbox.checked) drawer.draft.add(id); else drawer.draft.delete(id);
			drawer.error = ""; const scroll = $("#drawer-content").scrollTop;
			renderDrawer(); $("#drawer-content").scrollTop = scroll;
		}));
		$$("[data-remove]").forEach((button) => button.addEventListener("click", () => { drawer.draft.delete(button.dataset.remove); drawer.error = ""; const scroll = $("#drawer-content").scrollTop; renderDrawer(); $("#drawer-content").scrollTop = scroll; }));
	}

	function validateRelations(target, proposed, added, removed) {
		if (!isSecondary(target, PRODUCTS)) return "仅二级产品类目可维护关联";
		if (store.readonly || !targetEffectivelyEnabled(target)) return "当前产品类目不可修改关联";
		for (const id of added) {
			const rule = candidateRule(target, channel(id), state.drawer.draft);
			if (rule.disabled) return channel(id).name + "（" + id + "）：" + rule.reason;
		}
		for (const [id, productIds] of Object.entries(proposed)) {
			const item = channel(id);
			if (!item || productIds.some((productId) => !product(productId))) return "关联数据已变化，请重新打开后重试";
			if (!isSecondary(item, CHANNELS) || productIds.some((productId) => !isSecondary(product(productId), PRODUCTS))) return "仅支持二级类目关联二级渠道";
		}
		return "";
	}

	function latestForDrawer() {
		const drawer = state.drawer, latest = readLatestStore();
		const changed = (latest.productVersions[drawer.id] || 0) !== drawer.baselineVersion || productFingerprint(drawer.id, latest.relations) !== drawer.baseline;
		store = latest;
		if (changed) drawer.conflict = true;
		if (drawer.conflict || latest.readonly) {
			drawer.error = latest.readonly ? "当前为只读模式，无法保存关联" : "该产品类目的关联已更新，请关闭抽屉后重新打开";
			renderDrawer();
			return null;
		}
		return latest;
	}

	function saveRelations() {
		const drawer = state.drawer, target = product(drawer.id);
		const latest = latestForDrawer();
		if (!latest) return;
		const added = Array.from(drawer.draft).filter((id) => !drawer.original.has(id));
		const removed = Array.from(drawer.original).filter((id) => !drawer.draft.has(id));
		if (!added.length && !removed.length) { notify("关联未发生变化"); closeDrawer(true); return; }
		const proposed = applyProductDraft(latest.relations, target.id, drawer.draft);
		const error = validateRelations(target, proposed, added, removed);
		if (error) { drawer.error = error; renderDrawer(); $("#save-error").scrollIntoView({ block: "nearest" }); return; }
		if (drawer.original.size && !drawer.draft.size) {
			openModal("解除全部关联？", "<p>将解除「" + escapeHtml(productPath(target.id)) + "」的全部渠道业务关联。</p><p>历史订单及业务记录会保留。</p>", [
				{ label: "取消", action: closeModal },
				{ label: "确认解除", danger: true, action: () => { closeModal(); commitRelations(added, removed); } }
			]);
		} else commitRelations(added, removed);
	}

	function commitRelations(added, removed) {
		const drawer = state.drawer;
		const latest = latestForDrawer();
		if (!latest) return;
		const proposed = applyProductDraft(latest.relations, drawer.id, drawer.draft);
		const error = validateRelations(product(drawer.id), proposed, added, removed);
		if (error) { drawer.error = error; renderDrawer(); return; }
		if (state.failNext) {
			state.failNext = false; $("#fail-toggle").checked = false;
			drawer.error = "保存失败，请重试"; renderDrawer(); notify("保存失败，请重试", true); return;
		}
		const date = now();
		const next = {
			...latest, relations: proposed,
			productVersions: { ...latest.productVersions, [drawer.id]: (latest.productVersions[drawer.id] || 0) + 1 },
			updatedAt: { ...latest.updatedAt, ["p:" + drawer.id]: date },
			history: [{ id: Date.now() + "-" + Math.random().toString(36).slice(2, 6), productId: drawer.id, added, removed, actor: "当前用户", at: date }, ...latest.history]
		};
		[...added, ...removed].forEach((id) => { next.updatedAt["c:" + id] = date; });
		if (!persist(next)) {
			drawer.error = "保存失败，浏览器本地存储不可用，请重试"; renderDrawer(); notify("保存失败，请重试", true); return;
		}
		closeDrawer(true); renderTable(); notify("关联已保存");
	}

	function renderHistoryDrawer() {
		const target = product(state.drawer.id);
		const records = store.history.filter((item) => item.productId === target.id);
		$("#drawer-title").textContent = "关联变更记录";
		$("#drawer-subtitle").textContent = productPath(target.id) + " · 类目ID " + target.id;
		let html = '<div class="history-list">';
		if (records.length) html += records.map((record) => '<article class="history-item"><div class="history-time">' + record.at + '</div><div class="history-actor">' + escapeHtml(record.actor) + " · 维护关联</div>" +
			(record.added.length ? '<div class="history-diff"><span class="diff-added">新增关联</span>' + record.added.map((id) => '<span class="relation-tag">' + escapeHtml(channel(id).name) + " · " + id + "</span>").join("") + "</div>" : "") +
			(record.removed.length ? '<div class="history-diff"><span class="diff-removed">解除关联</span>' + record.removed.map((id) => '<span class="relation-tag">' + escapeHtml(channel(id).name) + " · " + id + "</span>").join("") + "</div>" : "") + "</article>").join("");
		else html += '<div class="ownership-empty">' + icon("history") + "<div>暂无本次演示中的变更记录</div></div>";
		html += '</div><div class="notice info">' + icon("info") + "<span>历史关联不补造操作记录；从本次维护开始记录新增与解除操作。</span></div>";
		$("#drawer-content").innerHTML = html;
		$("#drawer-footer").innerHTML = '<button class="btn" id="drawer-cancel" type="button">关闭</button>';
		$("#drawer-cancel").onclick = () => closeDrawer(true);
	}

	function renderOwnershipDrawer() {
		const item = channel(state.drawer.id), owners = relatedProductIds(item.id);
		$("#drawer-title").textContent = "查看关联产品";
		$("#drawer-subtitle").textContent = "渠道业务关联的二级产品类目";
		$("#drawer-content").innerHTML = '<div class="target-summary"><div class="summary-line"><span class="summary-name">' + escapeHtml(channelPath(item.id)) + '</span><span class="code">' + item.id + "</span>" + status(item) + "</div></div>" +
			(owners.length ? '<div class="selected-title">已关联 <span class="count-pill">' + owners.length + '</span> 个产品类目</div><div class="linked-products">' + owners.map((id) => '<div class="linked-product-row"><div><div class="linked-product-name">' + escapeHtml(productPath(id)) + '</div><div class="candidate-context">类目ID：' + id + '</div></div><button class="text-btn" data-open-product="' + id + '" type="button">查看产品类目</button></div>').join("") + "</div>" : '<div class="ownership-empty">' + icon("unlink") + "<div>该二级渠道尚未关联产品类目</div></div>");
		$("#drawer-footer").innerHTML = '<button class="btn" id="drawer-cancel" type="button">关闭</button>' + (!store.readonly && item.enabled ? '<button class="btn primary" id="open-target-picker" type="button">' + icon("link") + "去关联</button>" : "");
		$("#drawer-cancel").onclick = () => closeDrawer(true);
		$$("[data-open-product]").forEach((button) => { button.onclick = () => { const id = button.dataset.openProduct; closeDrawer(true); setPage("products"); openDrawer("associate", id); }; });
		if ($("#open-target-picker")) $("#open-target-picker").onclick = () => { closeDrawer(true); chooseTarget(item.id); };
	}

	function openModal(title, content, actions, onClose) {
		state.modalReturnFocus = document.activeElement;
		$("#modal-title").textContent = title; $("#modal-content").innerHTML = content;
		$("#modal-footer").innerHTML = actions.map((action, index) => '<button type="button" class="btn' + (action.danger ? " danger" : index === actions.length - 1 && actions.length > 1 ? " primary" : "") + '" data-modal-action="' + index + '">' + escapeHtml(action.label) + "</button>").join("");
		actions.forEach((action, index) => $('[data-modal-action="' + index + '"]').onclick = action.action);
		state.modalClose = onClose || null; $("#modal-overlay").hidden = false; refreshIcons(); $("#modal-close").focus();
	}

	function closeModal() {
		$("#modal-overlay").hidden = true;
		if (state.modalClose) state.modalClose();
		state.modalClose = null;
		if (state.modalReturnFocus && document.contains(state.modalReturnFocus) && state.modalReturnFocus.getClientRects().length) state.modalReturnFocus.focus();
	}

	function chooseTarget(id) {
		const item = channel(id);
		if (!isSecondary(item, CHANNELS)) return;
		const options = PRODUCTS.filter((target) => isSecondary(target, PRODUCTS)).map((target) => {
			const rule = candidateRule(target, item, new Set());
			const linked = relatedProductIds(item.id).includes(target.id);
			return '<option value="' + target.id + '"' + (rule.disabled || linked ? " disabled" : "") + ">" + escapeHtml(productPath(target.id)) + "（ID " + target.id + "）" + (linked ? " · 已关联" : rule.disabled ? " · " + escapeHtml(rule.reason) : "") + "</option>";
		}).join("");
		openModal("选择二级产品类目", "<p>二级渠道：" + escapeHtml(channelPath(id)) + ' <span class="code">' + id + '</span></p><div class="form-stack"><label for="target-product">关联二级产品类目</label><select id="target-product"><option value="">请选择二级产品类目</option>' + options + '</select><div class="modal-inline-error" id="target-error" role="alert"></div></div>', [
			{ label: "取消", action: closeModal },
			{ label: "下一步", action: () => {
				const selected = $("#target-product").value;
				if (!selected) { $("#target-error").textContent = "请选择产品类目"; return; }
				closeModal(); setPage("products"); openDrawer("associate", selected, id);
			} }
		]);
	}

	$$("[data-page]").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
	$("#filter-form").addEventListener("submit", (event) => { event.preventDefault(); state.keyword = $("#keyword").value.trim(); state.association = $("#association-filter").value; state.status = $("#status-filter").value; renderTable(); });
	$("#reset-filters").onclick = resetFilters;
	$("#main-table").addEventListener("click", (event) => {
		const button = event.target.closest("[data-action]");
		if (!button) return;
		const id = button.dataset.id;
		if (button.dataset.action === "toggle-tree") {
			const expanded = state.page === "products" ? state.expandedProducts : state.expandedChannels;
			if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
			renderTable();
		}
		if (button.dataset.action === "associate") openDrawer("associate", id);
		if (button.dataset.action === "history") openDrawer("history", id);
		if (button.dataset.action === "ownership") openDrawer("ownership", id);
		if (button.dataset.action === "choose-target") chooseTarget(id);
		if (button.dataset.action === "reset-filters") resetFilters();
	});
	$("#drawer-close").onclick = () => closeDrawer(false);
	$("#drawer-backdrop").onclick = () => closeDrawer(false);
	$("#modal-close").onclick = closeModal;
	$("#settings-toggle").onclick = () => { const menu = $("#settings-menu"); menu.hidden = !menu.hidden; $("#settings-toggle").setAttribute("aria-expanded", String(!menu.hidden)); };
	document.addEventListener("click", (event) => { if (!event.target.closest(".settings-wrap")) { $("#settings-menu").hidden = true; $("#settings-toggle").setAttribute("aria-expanded", "false"); } });
	$("#readonly-toggle").checked = store.readonly;
	$("#readonly-banner").hidden = !store.readonly;
	$("#readonly-toggle").onchange = (event) => {
		const readonly = event.target.checked;
		if (!persist({ ...store, readonly })) { store.readonly = readonly; notify("浏览器存储不可用，本次设置仅在当前页面生效", true); }
		$("#readonly-banner").hidden = !readonly; renderTable();
	};
	$("#fail-toggle").onchange = (event) => { state.failNext = event.target.checked; };
	$("#reset-demo").onclick = () => {
		$("#settings-menu").hidden = true;
		openModal("重置示例数据？", "<p>将恢复初始关联并清空本机演示中的变更记录。</p>", [
			{ label: "取消", action: closeModal },
			{ label: "确认重置", danger: true, action: () => {
				if (!persist(freshStore())) { notify("重置失败，浏览器存储不可用", true); return; }
				state.failNext = false; $("#readonly-toggle").checked = false; $("#fail-toggle").checked = false; $("#readonly-banner").hidden = true; closeModal(); closeDrawer(true); setPage("products"); notify("示例数据已重置");
			} }
		]);
	};
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			if (!$("#modal-overlay").hidden) closeModal();
			else if (!$("#overlay").hidden) closeDrawer(false);
			else { $("#settings-menu").hidden = true; $("#settings-toggle").setAttribute("aria-expanded", "false"); }
		}
		if (event.key === "Tab") {
			const active = !$("#modal-overlay").hidden ? $("#modal") : !$("#overlay").hidden ? $("#drawer") : null;
			if (!active) return;
			const focusable = Array.from(active.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]")).filter((item) => item.getClientRects().length);
			const first = focusable[0], last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
			else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
		}
	});
	window.addEventListener("storage", (event) => {
		if (event.key !== STORAGE_KEY || !event.newValue) return;
		try {
			const saved = JSON.parse(event.newValue);
			if (saved.version !== STORE_VERSION) return;
			const next = normalizeStore(saved), drawer = state.drawer;
			if (drawer && drawer.mode === "associate") {
				const changed = (next.productVersions[drawer.id] || 0) !== drawer.baselineVersion || productFingerprint(drawer.id, next.relations) !== drawer.baseline;
				if (changed && drawerChanged()) {
					drawer.conflict = true;
					drawer.error = "该产品类目的关联已更新，请关闭抽屉后重新打开";
					notify(drawer.error, true);
				} else if (changed) {
					drawer.original = new Set(relationIds(drawer.id, next.relations));
					drawer.draft = new Set(drawer.original);
					drawer.baseline = productFingerprint(drawer.id, next.relations);
					drawer.baselineVersion = next.productVersions[drawer.id] || 0;
				}
			}
			store = next;
			$("#readonly-toggle").checked = store.readonly;
			$("#readonly-banner").hidden = !store.readonly;
			renderTable();
			if (state.drawer) renderDrawer();
		} catch (_) { /* 忽略不完整的跨标签页数据。 */ }
	});
	renderTable(); refreshIcons();
})();
