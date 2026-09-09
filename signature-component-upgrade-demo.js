(() => {
	const STORAGE_KEY = "signature-component-upgrade-demo-v2";
	const index = window.SIGNATURE_EFFECTIVE_INDEX || {
		generatedAt: "local-fallback",
		statistics: {
			effectiveProductRows: 0,
			effectiveFlows: 0,
			flowsWithSignature: 1,
			formsWithActualSignatureComponent: 2,
			signatureFieldOccurrences: { legalInfoSign: 1, legalInfoSignCn: 1 },
			duplicateDimensionTriplets: 0,
			signatureFlowsWithBindingConflict: 0,
			missingReferencedForms: 0,
			disabledReferencedForms: 0,
			formsWithDuplicateSignatureComponents: 0,
			flowsWithBothSignatureFields: [996]
		},
		flows: [{
			flowId: 996,
			flowName: "墨西哥RFC转代理+申报服务流程",
			currentVersionNo: 1,
			bindings: [{ typeId: 5, typeName: "转代理+申报", categoryId: 2, categoryName: "VAT", countryCode: "MX", countryName: "墨西哥" }],
			hasBindingConflict: false,
			conflictingFlowIds: [],
			forms: [
				{ formId: 16, formName: "墨西哥VAT注册表单", status: 1, components: [{ key: "996-16-legalInfoSign-0", field: "legalInfoSign", componentType: "SignInputNew", required: true, hidden: false, observedRequirementClass: "chinese", fieldCopyMismatch: true, proposed: { valueSource: "legalInfoNamePy", caseRule: "given-title-family-normal", orderRule: "reverse", inkColor: "blue", inkColorHex: "#005CE6", ruleBasis: "字段契约：英文/拼音签字" } }] },
				{ formId: 68, formName: "瑞典VAT转代理表单", status: 1, components: [{ key: "996-68-legalInfoSignCn-0", field: "legalInfoSignCn", componentType: "SignInputNew", required: true, hidden: false, observedRequirementClass: "chinese", fieldCopyMismatch: false, proposed: { valueSource: "legalInfoNameCn", caseRule: "preserve", orderRule: "normal", inkColor: "blue", inkColorHex: "#005CE6", ruleBasis: "字段契约：中文签字" } }] }
			]
		}]
	};

	const sourceSamples = {
		legalInfoNameCn: "李明",
		legalInfoNamePy: "Li Ming",
		legalInfoNameEn: "Ming Li"
	};
	const sourceLabels = {
		legalInfoNameCn: "legalInfoNameCn · 法人姓名中文",
		legalInfoNamePy: "legalInfoNamePy · 法人姓名拼音",
		legalInfoNameEn: "legalInfoNameEn · 法人姓名英文"
	};
	const caseOptions = [
		{ value: "preserve", label: "保持原文大小写" },
		{ value: "given-title-family-normal", label: "名首字母大写，其余小写；姓首字母大写" },
		{ value: "given-title-family-upper", label: "名首字母大写，其余小写；姓全部大写" }
	];
	const orderOptions = [
		{ value: "normal", label: "正序" },
		{ value: "reverse", label: "倒序（反向取用）" }
	];
	const colorOptions = [
		{ value: "black", label: "黑色（#141A1C）" },
		{ value: "blue", label: "蓝色（#005CE6）" }
	];

	const flowSelect = document.getElementById("flowSelect");
	const formSelect = document.getElementById("formSelect");
	const signatureGrid = document.getElementById("signatureGrid");
	const componentPanel = document.getElementById("componentPanel");
	const dataSummary = document.getElementById("dataSummary");
	const toast = document.getElementById("toast");
	const clone = value => JSON.parse(JSON.stringify(value));
	const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
	const colorHex = color => color === "blue" ? "#005CE6" : "#141A1C";
	const caseLabel = value => caseOptions.find(option => option.value === value)?.label || value;
	const orderLabel = value => orderOptions.find(option => option.value === value)?.label || value;
	const optionMarkup = (options, selected) => options.map(option => '<option value="' + escapeHtml(option.value) + '"' + (option.value === selected ? " selected" : "") + '>' + escapeHtml(option.label) + "</option>").join("");

	let selectedFlowId = 996;
	let selectedFormId = "all";
	let selectedComponentKey = null;
	let state = { components: [], savedAt: null };

	function showToast(message) {
		toast.textContent = message;
		toast.classList.add("show");
		clearTimeout(showToast.timer);
		showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
	}

	function currentFlow() {
		return index.flows.find(flow => String(flow.flowId) === String(selectedFlowId)) || index.flows[0];
	}

	function flowBindingLabel(flow) {
		const binding = flow?.bindings?.[0];
		if (!binding) return "未找到类型 / 类目 / 国家绑定";
		return [binding.countryName, binding.categoryName, binding.typeName].filter(Boolean).join(" / ");
	}

	function flowOptionLabel(flow) {
		return "#" + flow.flowId + " · " + (flow.flowName || "未命名流程") + " · " + flowBindingLabel(flow);
	}

	function syncFlowOptions() {
		flowSelect.innerHTML = index.flows.map(flow => '<option value="' + escapeHtml(flow.flowId) + '">' + escapeHtml(flowOptionLabel(flow)) + "</option>").join("");
		flowSelect.value = String(selectedFlowId);
		if (flowSelect.value !== String(selectedFlowId) && index.flows[0]) {
			selectedFlowId = index.flows[0].flowId;
			flowSelect.value = String(selectedFlowId);
		}
	}

	function syncFormOptions() {
		const flow = currentFlow();
		const forms = flow?.forms || [];
		formSelect.innerHTML = '<option value="all">全部签名表单（' + forms.length + '）</option>' + forms.map(form => '<option value="' + escapeHtml(form.formId) + '">表单 ' + escapeHtml(form.formId) + ' · ' + escapeHtml(form.formName || "未命名表单") + '</option>').join("");
		if (selectedFormId !== "all" && !forms.some(form => String(form.formId) === String(selectedFormId))) selectedFormId = "all";
		formSelect.value = String(selectedFormId);
	}

	function fallbackProposed(flow, component) {
		const chinese = component.field === "legalInfoSignCn";
		const polandSpecial = (flow.bindings || []).some(binding => binding.countryCode === "PL" && ["包装法", "电气法", "电池法"].includes(binding.categoryName));
		return {
			valueSource: chinese ? "legalInfoNameCn" : "legalInfoNamePy",
			caseRule: chinese ? "preserve" : (polandSpecial ? "given-title-family-upper" : "given-title-family-normal"),
			orderRule: chinese ? "normal" : "reverse",
			inkColor: "blue",
			inkColorHex: "#005CE6",
			ruleBasis: chinese ? "字段契约：中文签字" : (polandSpecial ? "参考图二：波兰 EPR 特殊规则" : "参考图二：通用拼音规则")
		};
	}

	function displayValue(item) {
		const raw = String(sourceSamples[item.valueSource] || "未填写取值").trim();
		let parts = raw.split(/\s+/).filter(Boolean);
		if (item.orderRule === "reverse" && parts.length > 1) parts = [parts.at(-1), ...parts.slice(1, -1), parts[0]];
		if (item.caseRule === "given-title-family-normal" || item.caseRule === "given-title-family-upper") {
			parts = parts.map((part, index) => {
				const normalized = part.toLowerCase();
				if (!/^[a-z]+$/i.test(normalized)) return part;
				const title = normalized.charAt(0).toUpperCase() + normalized.slice(1);
				return item.caseRule === "given-title-family-upper" && index === parts.length - 1 ? normalized.toUpperCase() : title;
			});
		}
		return parts.join(" ");
	}

	function selectedForms() {
		const forms = currentFlow()?.forms || [];
		return selectedFormId === "all" ? forms : forms.filter(form => String(form.formId) === String(selectedFormId));
	}

	function buildComponents() {
		const flow = currentFlow();
		const result = [];
		selectedForms().forEach(form => {
			(form.components || []).forEach(component => {
				const proposed = component.proposed || fallbackProposed(flow, component);
				const saved = state.components.find(item => item.key === component.key);
				result.push({
					...clone(component),
					...clone(saved || {}),
					key: component.key,
					formId: form.formId,
					formName: form.formName,
					title: component.field === "legalInfoSignCn" ? "中文签字" : "英文 / 拼音签字",
					valueSource: saved?.valueSource || proposed.valueSource,
					caseRule: saved?.caseRule || proposed.caseRule,
					orderRule: saved?.orderRule || proposed.orderRule,
					color: saved?.color || proposed.inkColor || "blue",
					trace: true,
					original: sourceSamples[saved?.valueSource || proposed.valueSource] || "未填写取值",
					strokes: Array.isArray(saved?.strokes) ? saved.strokes : [],
					hasInk: Boolean(saved?.hasInk || saved?.inkData),
					inkData: saved?.inkData || null,
					proposed
				});
			});
		});
		return result;
	}

	function updateSummary() {
		const flow = currentFlow();
		const stats = index.statistics || {};
		const forms = flow?.forms?.length || 0;
		const conflict = flow?.hasBindingConflict ? " · 该绑定存在流程冲突" : "";
		dataSummary.textContent = "数据快照：" + (stats.effectiveFlows || 0) + " 个生效流程 · 当前含签名 " + (stats.flowsWithSignature || 0) + " 个 · " + forms + " 个签名表单" + conflict;
		dataSummary.title = "查询时间：" + (index.generatedAt || "未记录") + "；" + flowBindingLabel(flow);
	}

	function qrCellIsDark(x, y, seed) {
		const inFinder = (originX, originY) => x >= originX && x < originX + 7 && y >= originY && y < originY + 7;
		const finderValue = (originX, originY) => {
			const dx = x - originX;
			const dy = y - originY;
			return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
		};
		if (inFinder(0, 0)) return finderValue(0, 0);
		if (inFinder(14, 0)) return finderValue(14, 0);
		if (inFinder(0, 14)) return finderValue(0, 14);
		return ((x * 13 + y * 17 + seed * 19 + x * y) % 7) < 3;
	}

	function renderQr(panel, item) {
		const seed = item.field === "legalInfoSignCn" ? 3 : 7;
		const cells = [];
		for (let y = 0; y < 21; y += 1) {
			for (let x = 0; x < 21; x += 1) cells.push('<span class="' + (qrCellIsDark(x, y, seed) ? "dark" : "") + '"></span>');
		}
		panel.innerHTML = cells.join("");
	}

	function renderCanvas(card, item) {
		const canvas = card.querySelector("canvas");
		const rect = canvas.getBoundingClientRect();
		const width = Math.max(1, rect.width);
		const height = Math.max(1, rect.height);
		const scale = window.devicePixelRatio || 1;
		const ctx = canvas.getContext("2d");
		canvas.width = Math.round(width * scale);
		canvas.height = Math.round(height * scale);
		ctx.setTransform(scale, 0, 0, scale, 0, 0);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.lineWidth = 2.4;
		ctx.strokeStyle = colorHex(item.color);
		const strokes = Array.isArray(item.strokes) ? item.strokes : (item.strokes = []);
		const drawStroke = stroke => {
			if (!stroke?.length) return;
			ctx.beginPath();
			ctx.moveTo(stroke[0].x, stroke[0].y);
			stroke.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
			ctx.stroke();
			ctx.closePath();
		};
		strokes.forEach(drawStroke);
		if (!strokes.length && item.inkData) {
			const savedInk = new Image();
			savedInk.onload = () => ctx.drawImage(savedInk, 0, 0, width, height);
			savedInk.src = item.inkData;
		}
		let currentStroke = null;
		let drawing = false;
		const point = event => {
			const box = canvas.getBoundingClientRect();
			return { x: event.clientX - box.left, y: event.clientY - box.top };
		};
		const start = event => {
			event.preventDefault();
			drawing = true;
			canvas.setPointerCapture?.(event.pointerId);
			currentStroke = [];
			strokes.push(currentStroke);
			const p = point(event);
			currentStroke.push(p);
			ctx.beginPath();
			ctx.moveTo(p.x, p.y);
		};
		const move = event => {
			if (!drawing) return;
			event.preventDefault();
			const p = point(event);
			currentStroke.push(p);
			ctx.lineTo(p.x, p.y);
			ctx.stroke();
		};
		const end = () => {
			if (!drawing) return;
			drawing = false;
			ctx.closePath();
			if (!currentStroke || currentStroke.length <= 2) strokes.pop();
			currentStroke = null;
			item.hasInk = strokes.length > 0;
			item.inkData = item.hasInk ? canvas.toDataURL("image/png") : null;
			card.classList.toggle("has-ink", item.hasInk);
		};
		canvas.onpointerdown = start;
		canvas.onpointermove = move;
		canvas.onpointerup = end;
		canvas.onpointercancel = end;
		canvas.onpointerleave = end;
		card.querySelector("[data-clear]").onclick = event => {
			event.stopPropagation();
			ctx.clearRect(0, 0, width, height);
			strokes.length = 0;
			item.hasInk = false;
			item.inkData = null;
			card.classList.remove("has-ink");
			showToast(item.title + "已清空，可重新书写");
		};
	}

	function renderSignatures() {
		if (!state.components.length) {
			signatureGrid.innerHTML = '<div class="notice info">当前生效流程的已关联表单中没有目标签名字段。</div>';
			return;
		}
		signatureGrid.innerHTML = state.components.map(item => {
			const selected = selectedComponentKey === item.key ? "selected" : "";
			const ink = item.hasInk || item.inkData ? "has-ink" : "";
			const title = escapeHtml(item.title);
			const value = escapeHtml(displayValue(item));
			const binding = escapeHtml((item.formName || "表单") + " · 表单 " + item.formId);
			const mismatch = item.fieldCopyMismatch ? '<div class="mismatch-note">现有表单文案与字段契约不一致，建议迁移时复核；本 DEMO 仍按目标字段展示。</div>' : "";
			const stateText = item.hidden ? "现有表单隐藏" : "数据库已匹配";
			return '<section class="signature-zone" data-zone-key="' + escapeHtml(item.key) + '" aria-label="' + title + '组件">' +
				'<div class="zone-head"><div class="zone-title"><span class="zone-badge">' + (item.field === "legalInfoSignCn" ? "中" : "A") + '</span><span>' + title + '</span><small class="flow-binding">' + binding + '</small></div></div>' +
				'<article class="sign-card ' + selected + " " + ink + '" data-key="' + escapeHtml(item.key) + '">' +
				'<div class="sign-head"><span class="sign-badge">' + (item.field === "legalInfoSignCn" ? "中" : "A") + '</span><div class="sign-name"><strong>' + title + '</strong><span>' + escapeHtml(item.field) + '</span></div><span class="sign-state ' + (item.hidden ? "warn" : "") + '">' + escapeHtml(stateText) + '</span></div>' +
				'<div class="sign-body"><div class="sign-layout">' +
				'<div class="sign-write"><div class="panel-label"><b>签名</b><span>临摹已开启</span></div><div class="origin"><span>取值字段：<b>' + escapeHtml(item.valueSource) + '</b></span><span class="value-preview">' + value + '</span></div><div class="guide"><span class="guide-label">原文辅助层 · 可直接书写</span><span class="trace-text ' + (item.field === "legalInfoSignCn" ? "cn" : "latin") + '">' + value + '</span><canvas class="sign-canvas" aria-label="' + title + '签名画布"></canvas></div><div class="sign-meta"><span class="swatch ' + escapeHtml(item.color) + '"></span>' + (item.color === "blue" ? "蓝色 · #005CE6" : "黑色 · #141A1C") + '<span>· ' + escapeHtml(orderLabel(item.orderRule)) + '</span></div><div class="sign-footer"><button type="button" class="mini-btn" data-clear>清空</button><button type="button" class="mini-btn primary" data-select>编辑属性</button></div></div>' +
				'<div class="sample-panel"><div class="panel-label"><b>示例图</b><span>同步取值</span></div><div class="sample-image" aria-label="' + title + '示例图"><span class="sample-watermark">SIGNATURE SAMPLE</span><span class="sample-script ' + (item.field === "legalInfoSignCn" ? "cn" : "latin") + '" style="color:' + colorHex(item.color) + '">' + value + '</span><span class="sample-line"></span></div><span class="sample-caption">' + escapeHtml(caseLabel(item.caseRule)) + '</span></div>' +
				'<div class="qr-panel"><div class="panel-label"><b>二维码</b><span>签署入口</span></div><div class="qr-box"><div class="qr-grid" aria-label="签署二维码"></div></div><span class="qr-caption">扫描二维码完成签名</span></div>' +
				'</div><div class="sign-tip">提示：浅色文字仅用于辅助临摹，保存签名时不写入图片。</div>' + mismatch + '</div></article></section>';
		}).join("");
		signatureGrid.querySelectorAll(".sign-card").forEach(card => {
			const key = card.dataset.key;
			const item = state.components.find(component => component.key === key);
			card.onclick = event => { if (!event.target.closest("button")) selectComponent(key); };
			card.querySelector("[data-select]").onclick = event => { event.stopPropagation(); selectComponent(key); };
			if (item) {
				renderCanvas(card, item);
				renderQr(card.querySelector(".qr-grid"), item);
			}
		});
	}

	function selectComponent(key) {
		selectedComponentKey = key;
		if (!state.components.some(item => item.key === key)) selectedComponentKey = state.components[0]?.key || null;
		renderSignatures();
		renderComponentPanel();
	}

	function renderComponentPanel() {
		const item = state.components.find(component => component.key === selectedComponentKey) || state.components[0];
		if (!item) {
			componentPanel.innerHTML = '<div class="panel-title">组件属性<span>暂无目标字段</span></div><div class="notice info">当前生效流程没有可配置的签名字段。</div>';
			return;
		}
		selectedComponentKey = item.key;
		const flow = currentFlow();
		const flowConflict = flow?.hasBindingConflict ? '<div class="notice warn">该类型 / 类目 / 国家绑定对应多个流程（' + escapeHtml((flow.conflictingFlowIds || []).join("、")) + '），请在生产发布前确认唯一流程。</div>' : "";
		const mismatch = item.fieldCopyMismatch ? '<div class="mismatch-note">数据库文案曾标记为中文，但字段为 legalInfoSign；本 DEMO 按字段契约作为英文 / 拼音组件展示。</div>' : "";
		componentPanel.innerHTML = '<div class="panel-title">组件属性<span>已选：' + escapeHtml(item.title) + '</span></div>' +
			'<div class="status-line"><span>表单 ' + escapeHtml(item.formId) + ' · ' + escapeHtml(item.formName || "未命名表单") + '</span><span class="status-pill">建议配置</span></div>' +
			'<div class="component-context"><b>' + escapeHtml(flow?.flowName || "未命名流程") + '</b><br>' + escapeHtml(flowBindingLabel(flow)) + '<br><span>字段：' + escapeHtml(item.field) + ' · 临摹固定开启</span></div>' +
			'<div class="prop"><label for="valueSourceSelect">取值字段</label><select id="valueSourceSelect">' + optionMarkup(Object.entries(sourceLabels).map(([value, label]) => ({ value, label })), item.valueSource) + '</select></div>' +
			'<div class="prop"><label for="caseRuleSelect">大小写规则</label><select id="caseRuleSelect">' + optionMarkup(caseOptions, item.caseRule) + '</select></div>' +
			'<div class="prop"><label for="reverseOrderSwitch">取值顺序</label><select id="reverseOrderSwitch" class="order-select" aria-label="取值顺序（反向取用）">' + optionMarkup(orderOptions, item.orderRule) + '</select><div class="prop-hint">选择倒序即开启反向取用，调换可拆分姓名的名 / 姓顺序。</div></div>' +
			'<div class="prop"><label for="colorSelect">签字颜色</label><select id="colorSelect">' + optionMarkup(colorOptions, item.color) + '</select></div>' +
			'<div class="notice info">配置状态为建议值：数据库当前仅保存旧组件结构；四项属性将在正式组件升级后持久化。</div>' + flowConflict + mismatch;
		componentPanel.querySelector("#valueSourceSelect").onchange = event => { item.valueSource = event.target.value; item.original = sourceSamples[item.valueSource] || "未填写取值"; renderSignatures(); renderComponentPanel(); };
		componentPanel.querySelector("#caseRuleSelect").onchange = event => { item.caseRule = event.target.value; renderSignatures(); renderComponentPanel(); };
		componentPanel.querySelector("#reverseOrderSwitch").onchange = event => { item.orderRule = event.target.value; renderSignatures(); renderComponentPanel(); };
		componentPanel.querySelector("#colorSelect").onchange = event => { item.color = event.target.value; renderSignatures(); renderComponentPanel(); };
	}

	function loadSelection() {
		state.components = buildComponents();
		selectedComponentKey = state.components[0]?.key || null;
		syncFormOptions();
		updateSummary();
		renderSignatures();
		renderComponentPanel();
	}

	function serialize() {
		return {
			version: 2,
			selectedFlowId,
			selectedFormId,
			selectedComponentKey,
			components: state.components.map(item => ({
				key: item.key,
				field: item.field,
				valueSource: item.valueSource,
				caseRule: item.caseRule,
				orderRule: item.orderRule,
				color: item.color,
				trace: true,
				strokes: item.strokes,
				hasInk: item.hasInk,
				inkData: item.inkData
			})),
			savedAt: state.savedAt
		};
	}

	function restoreSaved() {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
			if (!saved || saved.version !== 2) return false;
			if (index.flows.some(flow => String(flow.flowId) === String(saved.selectedFlowId))) selectedFlowId = saved.selectedFlowId;
			selectedFormId = saved.selectedFormId || "all";
			state.components = (saved.components || []).map(item => ({ ...item }));
			state.savedAt = saved.savedAt || null;
			syncFlowOptions();
			loadSelection();
			if (saved.selectedComponentKey && state.components.some(item => item.key === saved.selectedComponentKey)) selectComponent(saved.selectedComponentKey);
			return true;
		} catch (error) {
			return false;
		}
	}

	flowSelect.onchange = event => { selectedFlowId = event.target.value; selectedFormId = "all"; state.components = []; loadSelection(); };
	formSelect.onchange = event => { selectedFormId = event.target.value; state.components = []; loadSelection(); };
	document.getElementById("saveBtn").onclick = () => {
		state.savedAt = new Date().toISOString();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
		showToast("配置已保存，刷新页面可验证持久化");
	};
	document.getElementById("resetBtn").onclick = () => {
		localStorage.removeItem(STORAGE_KEY);
		selectedFlowId = index.flows.some(flow => flow.flowId === 996) ? 996 : index.flows[0]?.flowId;
		selectedFormId = "all";
		state.components = [];
		loadSelection();
		showToast("已恢复默认配置");
	};
	window.addEventListener("resize", () => renderSignatures());

	syncFlowOptions();
	syncFormOptions();
	loadSelection();
	restoreSaved();
	window.__signatureDemo = { index, getState: () => ({ selectedFlowId, selectedFormId, selectedComponentKey, components: clone(state.components) }) };
})();
