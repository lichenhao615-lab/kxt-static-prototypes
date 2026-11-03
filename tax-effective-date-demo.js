(() => {
	"use strict";
	const $ = (id) => document.getElementById(id);
	const clone = (value) => JSON.parse(JSON.stringify(value));
	const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const storageKey = "kxt.tax-effective-date-demo.v1";
	const products = {
		de: { country: "德国", title: "新版德国VAT注册表单（注册、半托管）" },
		fr: { country: "法国", title: "法国VAT注册表单（注册、申报）" },
		cz: { country: "捷克", title: "捷克VAT注册表单（注册、申报）" },
		sa: { country: "沙特", title: "沙特VAT注册表单（注册、申报）" },
		es: { country: "西班牙", title: "西班牙VAT注册表单（注册、申报）" },
		se: { country: "瑞典", title: "瑞典VAT注册表单（注册、申报）" },
		jp: { country: "日本", title: "日本JCT注册表单（注册、申报）" }
	};
	function defaults(country) {
		return { country, label: "期望税号生效日期", required: true, span: 12, placeholder: "请选择期望税号生效日期",
			enabled: true, base: "submission", mode: "warn", match: ["cz", "sa"].includes(country) ? "window" : "exact",
			cutoff: 20, inclusive: true, beforeMonths: country === "fr" ? 1 : 2, afterMonths: country === "fr" ? 2 : 3,
			months: ["cz", "sa"].includes(country) ? 1 : 2, tolerance: ["cz", "sa"].includes(country) ? 7 : 0,
			notBeforeFounded: country === "fr", noPast: country !== "fr", showHint: true, extraHint: "",
			unlockInvalid: true };
	}
	let saved = { forms: Object.fromEntries(Object.keys(products).map((key) => [key, { title: products[key].title, config: defaults(key) }])), submissions: {} };
	let storageAvailable = true;
	try {
		const stored = JSON.parse(localStorage.getItem(storageKey));
		if (stored && stored.forms && stored.forms.de) {
			for (const [key, form] of Object.entries(stored.forms)) {
				if (products[form.config?.country]) saved.forms[key] = { title: form.title, config: { ...defaults(form.config.country), ...form.config } };
			}
			saved.submissions = stored.submissions || {};
		}
	} catch { storageAvailable = false; }
	let currentForm = "de";
	let draft = clone(saved.forms[currentForm].config);
	let toastTimer;
	let confirmCallback;
	let previewSubmitted = false;
	let rejectionUnlocked = false;
	let activeTab = "component";
	let previewResultSnapshot = "";

	// 图标取自仓库已有 lucide-static 图标集，内联后可直接打开本地 HTML。
	const iconPaths = {
		"chevron-left": '<path d="m15 18-6-6 6-6"/>',
		search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
		play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
		"undo-2": '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
		eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
		"upload-cloud": '<path d="M12 13v8"/><path d="m8 17 4-4 4 4"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>',
		"settings-2": '<path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
		"circle-help": '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
		"calendar-days": '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>',
		calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8"/><path d="M16 14v4"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
		info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
		save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
		x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
		"calendar-check": '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="m9 15 2 2 4-4"/>'
	};
	const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
	function renderIcons(root = document) { root.querySelectorAll("i[data-icon]").forEach((el) => { el.outerHTML = icon(el.dataset.icon); }); }
	function dirty() { return JSON.stringify(draft) !== JSON.stringify(saved.forms[currentForm].config); }
	function toast(text, error = false) {
		clearTimeout(toastTimer);
		$("toast").textContent = text;
		$("toast").style.color = error ? "#bc3939" : "";
		$("toast").hidden = false;
		toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3000);
	}
	function persist(next) {
		try { localStorage.setItem(storageKey, JSON.stringify(next)); storageAvailable = true; saved = next; return true; }
		catch { storageAvailable = false; toast("本地保存失败，请检查浏览器存储权限；当前修改仍保留在页面中。", true); return false; }
	}
	function updateDirtyState() {
		$("saveState").textContent = dirty() ? "未保存" : "已保存";
		$("footerStatus").textContent = dirty() ? "配置已修改，保存后生效" : "字段：taxInfoExpectTime";
	}
	function date(value) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
		const parsed = new Date(`${value}T00:00:00Z`);
		return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : parsed;
	}
	const iso = (value) => value.toISOString().slice(0, 10);
	function shiftMonths(value, offset, first = false) {
		const y = value.getUTCFullYear(), m = value.getUTCMonth() + Number(offset);
		const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
		return new Date(Date.UTC(y, m, first ? 1 : Math.min(value.getUTCDate(), lastDay)));
	}
	function compute(config, context) {
		if (!config.enabled) return { recommendation: "", branch: "日期规则未启用", reason: "保留日期格式及必填校验。", pattern: "free" };
		const baseText = config.base === "first" ? context.first : context.submission;
		const baseDate = date(baseText);
		if (!baseDate) return { error: config.base === "first" ? "缺少首次提交日期，无法计算推荐日期。" : "缺少本次提交日期，无法计算推荐日期。" };
		const month = baseDate.getUTCMonth(), day = baseDate.getUTCDate();
		let result, branch, reason, pattern = "first";
		const early = config.inclusive ? day <= config.cutoff : day < config.cutoff;
		if (config.country === "fr") {
			if (["mainland", "hongkong"].includes(context.region)) {
				const next = month % 3 === 2;
				result = new Date(Date.UTC(baseDate.getUTCFullYear(), Math.floor(month / 3) * 3 + (next ? 3 : 0), 1));
				branch = `法国 · 季报 · ${next ? "下季度" : "本季度"}首日`;
				reason = "大陆、香港公司：季度前两个月取本季度首日，季度末月取下季度首日。";
				pattern = "quarter";
			} else if (context.region === "eu") {
				const months = early ? config.beforeMonths : config.afterMonths;
				result = shiftMonths(baseDate, months, true);
				branch = `法国 · 月报 · 往后${months}个月1号`;
				reason = `欧盟公司：按${config.cutoff}号分档，截止日${config.inclusive ? "含" : "不含"}当天；本次命中${early ? "截止日前" : "截止日后"}。`;
			} else {
				return { error: "公司注册地区未匹配法国规则，请联系交付人员确认申报周期。", branch: "法国 · 未匹配地区" };
			}
		} else if (config.country === "de") {
			const months = early ? config.beforeMonths : config.afterMonths;
			result = shiftMonths(baseDate, months, true);
			branch = `德国 · 往后${months}个月1号`;
			reason = `${baseText} 为计算基准，按${config.cutoff}号分档，截止日${config.inclusive ? "含" : "不含"}当天。`;
		} else {
			const sameDay = ["cz", "sa"].includes(config.country);
			result = shiftMonths(baseDate, config.months, !sameDay);
			branch = `${products[config.country].country} · 往后${config.months}个月${sameDay ? "同日" : "1号"}`;
			reason = sameDay ? "增加自然月并保留日号；目标月份无对应日时，取该月最后一天。" : "按月份往后推算后取1号，不按固定天数或满两个月计算。";
			pattern = sameDay ? "any" : "first";
		}
		return { recommendation: iso(result), branch, reason, pattern };
	}
	function context(preview = false) {
		return preview ? { submission: $("previewSubmission").value, first: $("previewFirst").value, region: $("previewRegion").value, founded: $("previewFounded").value }
			: { submission: $("scenarioDate").value, first: $("scenarioDate").value, region: $("scenarioRegion").value, founded: $("scenarioFounded").value };
	}
	function hint(config, result, ctx) {
		if (!config.enabled) return config.extraHint || "";
		let text = result.error || `建议填写 ${result.recommendation}。`;
		if (!result.error) {
			if (config.country === "fr") text += result.pattern === "quarter" ? "按季报规则填写季度首日。" : "按月报规则和提交日期计算。";
			else if (["cz", "sa"].includes(config.country)) text += `按提交日期增加${config.months}个自然月。`;
			else text += `按提交月份推算，日期取1号。`;
			if (config.match === "window") text += `允许前后各${config.tolerance}天。`;
			if (config.match === "later") text += "可选推荐日期及之后符合日历规则的日期。";
			if (config.notBeforeFounded) text += "不得早于公司成立日期。";
			if (config.notBeforeFounded && date(ctx?.founded) && result.recommendation < ctx.founded) text += "推荐日期早于公司成立日期，请联系交付确认可用日期。";
			if (config.noPast && date(ctx?.submission) && result.recommendation < ctx.submission) text += "推荐日期早于本次提交日期，请调整规则或联系交付确认。";
		}
		return `${text}${config.extraHint ? ` ${config.extraHint}` : ""}`;
	}
	function validate(value, config, ctx) {
		const result = compute(config, ctx);
		if (!value) return { hard: config.required ? `请选择${config.label}。` : "", deviation: "", result };
		const chosen = date(value);
		if (!chosen) return { hard: "日期格式不正确，请按 YYYY-MM-DD 填写。", result };
		if (!config.enabled) return { hard: "", deviation: "", result };
		if (result.error) return { hard: result.error, result };
		if (config.notBeforeFounded && !date(ctx.founded)) return { hard: "请先填写公司成立日期。", result };
		if (config.notBeforeFounded && value < ctx.founded) return { hard: "期望税号生效日期不能早于公司成立日期。", result };
		if (config.noPast && !date(ctx.submission)) return { hard: "缺少本次提交日期，无法校验过去日期。", result };
		if (config.noPast && value < ctx.submission) return { hard: "期望税号生效日期不能早于本次提交日期，请重新选择。", result };
		let matched;
		if (config.match === "window") {
			const days = Math.abs((chosen.valueOf() - date(result.recommendation).valueOf()) / 86400000);
			matched = days <= config.tolerance;
		} else if (config.match === "later") {
			const calendarMatch = result.pattern === "quarter" ? chosen.getUTCDate() === 1 && chosen.getUTCMonth() % 3 === 0
				: result.pattern === "first" ? chosen.getUTCDate() === 1 : true;
			matched = value >= result.recommendation && calendarMatch;
		} else matched = value === result.recommendation;
		const deviation = matched ? "" : `当前日期 ${value} 不符合所配日期规则，推荐日期为 ${result.recommendation}${config.match === "window" ? `，允许前后各${config.tolerance}天` : ""}。`;
		return { hard: "", deviation, result };
	}
	function pendingText() {
		const notes = ["演示计算基准为“本次提交日期”，正式提交节点需交付确认。"];
		if (["de", "fr"].includes(draft.country)) notes.push(`${draft.cutoff}号及截止日归属为演示参数，待交付确认。`);
		if (["cz", "sa"].includes(draft.country) && draft.match === "window") notes.push(`前后各${draft.tolerance}天为演示容差，原表仅写“一星期范围内波动”。`);
		return notes.join(" ");
	}
	function renderForms() {
		$("formPreset").innerHTML = Object.entries(saved.forms).map(([key, form]) => `<option value="${key}">${escapeHtml(form.title)}</option>`).join("");
		$("formPreset").value = currentForm;
		$("rulePreset").innerHTML = Object.entries(products).map(([key, p]) => `<option value="${key}">${p.country}${key === "jp" ? "JCT" : "VAT"}注册 + 申报</option>`).join("");
	}
	function renderCountrySettings() {
		let html = "";
		if (["de", "fr"].includes(draft.country)) {
			if (draft.country === "fr") html += '<div class="rule-editor"><div class="section-heading"><strong>大陆 / 香港 · 季报</strong></div><div class="quarter-rules"><span>季度第1、2个月提交</span><strong>本季度首日</strong><span>季度第3个月提交</span><strong>下季度首日</strong></div><p class="setting-note">其他境外地区暂不自动归类，交付确认后补充。</p></div>';
			html += `<div class="rule-editor">${draft.country === "fr" ? '<div class="section-heading"><strong>欧盟公司 · 月报</strong></div>' : ""}
				<div class="two-fields"><label class="stack">每月截止日<input data-config="cutoff" type="number" min="1" max="28"></label><label class="stack">截止日归属<select data-config="inclusive"><option value="true">含当天（≤）</option><option value="false">不含当天（＜）</option></select></label></div>
				<div class="two-fields"><label class="stack">截止日前：往后月数<input data-config="beforeMonths" type="number" min="0" max="24"></label><label class="stack">截止日后：往后月数<input data-config="afterMonths" type="number" min="0" max="24"></label></div>
				<div class="rule-output">计算结果取目标月份的 1 号</div></div>`;
		} else {
			html = `<div class="rule-editor"><div class="two-fields"><label class="stack">往后推算月数<input data-config="months" type="number" min="0" max="24"></label><label class="stack">取值日期<input readonly value="${["cz", "sa"].includes(draft.country) ? "同日 / 月末兜底" : "目标月份1号"}"></label></div></div>`;
		}
		if (draft.match === "window") html += '<div class="rule-editor"><label class="stack">推荐日期前后各允许（天）<input data-config="tolerance" type="number" min="0" max="31"></label></div>';
		$("countrySettings").innerHTML = html;
	}
	function syncControls() {
		document.querySelectorAll("[data-config]").forEach((el) => {
			const value = draft[el.dataset.config];
			if (el.type === "checkbox") el.checked = Boolean(value);
			else el.value = String(value);
		});
		$("rulePreset").value = draft.country;
		$("spanValue").textContent = draft.span;
		$("ruleControls").hidden = !draft.enabled;
		$("francePastNote").hidden = draft.country !== "fr";
		$("scenarioDateLabel").textContent = draft.base === "first" ? "模拟首次提交日期" : "模拟提交日期";
	}
	function renderCalculation() {
		const result = compute(draft, context());
		$("canvasLabel").innerHTML = `${draft.required ? "<em>*</em> " : ""}${escapeHtml(draft.label)} ${icon("circle-help")}`;
		$("canvasHint").textContent = hint(draft, result, context());
		$("canvasHint").hidden = !draft.showHint;
		$("canvasDate").placeholder = draft.placeholder;
		$("selectedField").classList.toggle("wide", draft.span === 24);
		$("recommendedDate").textContent = result.recommendation || (draft.enabled ? "无法计算" : "未启用");
		$("ruleBranch").textContent = result.branch || "缺少条件";
		$("calculationReason").textContent = result.error || result.reason;
		$("pendingNote").textContent = draft.enabled ? pendingText() : "";
		updateDirtyState();
	}
	function renderAll() { renderCountrySettings(); syncControls(); renderCalculation(); renderIcons(); }
	function showConfirm(title, text, callback) {
		confirmCallback = callback;
		$("confirmTitle").textContent = title;
		$("confirmText").textContent = text;
		$("confirmDialog").showModal();
	}
	function switchForm(key) {
		const apply = () => {
			currentForm = key; draft = clone(saved.forms[key].config);
			$("canvasDate").value = "";
			$("formPreset").value = key; renderAll();
		};
		if (dirty()) {
			$("formPreset").value = currentForm;
			showConfirm("切换表单", "当前配置尚未保存，切换后将放弃本次修改。", apply);
		} else apply();
	}
	function saveForm() {
		if (!draft.label.trim()) { toast("字段名称不能为空。", true); return; }
		const next = clone(saved);
		next.forms[currentForm].config = clone(draft);
		if (persist(next)) { updateDirtyState(); toast("表单配置已保存，刷新后可继续查看。"); }
	}
	function restore() {
		if (!dirty()) { toast("当前没有未保存的修改。"); return; }
		showConfirm("恢复已保存配置", "将放弃本次未保存的配置，恢复到上次保存的版本。", () => {
			draft = clone(saved.forms[currentForm].config); renderAll(); toast("已恢复上次保存的配置。");
		});
	}
	function previewStateFingerprint() {
		return JSON.stringify({ value: $("previewDate").value, context: context(true), status: $("previewStatus").value });
	}
	function renderPreview() {
		const ctx = context(true), result = compute(draft, ctx), value = $("previewDate").value;
		const validation = validate(value, draft, ctx);
		$("previewLabel").innerHTML = `${draft.required ? '<em>*</em> ' : ""}${escapeHtml(draft.label)}`;
		$("previewHint").textContent = hint(draft, result, ctx);
		$("previewHint").hidden = !draft.showHint;
		$("previewBranch").textContent = result.branch || "无法命中";
		$("previewRecommendation").textContent = result.error || (result.recommendation ? `推荐日期：${result.recommendation}` : "自由选择日期");
		$("firstDateWrap").hidden = draft.base !== "first";
		const completed = $("previewStatus").value === "completed";
		const rejected = $("previewStatus").value === "rejected";
		const needsCorrection = Boolean(draft.enabled && (validation.hard || validation.deviation));
		if (rejected && draft.unlockInvalid && needsCorrection) rejectionUnlocked = true;
		if (!rejected) rejectionUnlocked = false;
		const unlock = rejected && draft.unlockInvalid && rejectionUnlocked;
		const locked = completed || (rejected && !unlock);
		$("previewDate").disabled = locked;
		$("previewRegion").disabled = completed || rejected;
		$("previewFounded").disabled = completed || rejected;
		$("useRecommended").disabled = locked || !result.recommendation
			|| (draft.notBeforeFounded && (!date(ctx.founded) || result.recommendation < ctx.founded))
			|| (draft.noPast && date(ctx.submission) && result.recommendation < ctx.submission);
		$("submitPreview").disabled = completed || previewSubmitted;
		$("lockNotice").hidden = !locked && !unlock;
		$("lockNotice").textContent = completed ? "流转已完成，资料不可修改或再次提交。" : unlock
			? "当前日期不符合本次规则，已临时开放此日期字段供本次修正；其它锁定资料不变。"
			: "该字段处于锁定状态；如需修改，请联系审核人员。";
		if (previewResultSnapshot && previewResultSnapshot !== previewStateFingerprint()) {
			$("previewResult").hidden = true; previewResultSnapshot = "";
			$("previewSaveState").textContent = "内容已变更，请重新提交";
		}
	}
	function openPreview() {
		previewSubmitted = false;
		rejectionUnlocked = false;
		previewResultSnapshot = "";
		$("previewFormName").textContent = saved.forms[currentForm].title + (dirty() ? " · 未保存配置预览" : "");
		$("previewSubmission").value = $("scenarioDate").value;
		$("previewFirst").value = $("scenarioDate").value;
		$("previewRegion").value = $("scenarioRegion").value;
		$("previewFounded").value = $("scenarioFounded").value;
		const old = saved.submissions[currentForm];
		$("previewDate").value = old?.value || "";
		$("previewStatus").value = "draft";
		$("previewResult").hidden = true;
		$("previewSaveState").textContent = old ? `上次模拟提交：${old.value || "未填写"}` : "尚未提交";
		renderPreview();
		$("previewDialog").showModal();
	}
	function showResult(type, text, continueButton = false) {
		const el = $("previewResult");
		el.className = `validation-result ${type}`;
		el.innerHTML = `<div>${escapeHtml(text)}</div>${continueButton ? '<button class="button" data-action="confirm-submit">已知悉，继续提交</button>' : ""}`;
		el.hidden = false;
		previewResultSnapshot = previewStateFingerprint();
	}
	function submitPreview(confirmed = false) {
		if (previewSubmitted || $("previewStatus").value === "completed") return;
		const validation = validate($("previewDate").value, draft, context(true));
		if (validation.hard) { showResult("error", validation.hard); $("previewSaveState").textContent = "提交未通过"; return; }
		if (validation.deviation && draft.mode === "block") { showResult("error", validation.deviation); $("previewSaveState").textContent = "提交未通过"; return; }
		if (validation.deviation && !confirmed) {
			showResult("warning", validation.deviation + " 确认后可继续提交。", true);
			$("previewSaveState").textContent = "等待确认推荐日期"; return;
		}
		const next = clone(saved);
		next.submissions[currentForm] = { value: $("previewDate").value, ...context(true), acknowledged: Boolean(validation.deviation) };
		if (!persist(next)) return;
		previewSubmitted = true;
		showResult("success", validation.deviation ? "已确认日期差异，模拟提交成功。" : "日期校验通过，模拟提交成功。");
		$("previewSaveState").textContent = "模拟资料已保存在本机";
		$("submitPreview").disabled = true;
	}
	function handleConfigChange(el) {
		const key = el.dataset.config;
		if (!key) return;
		let value;
		if (el.type === "checkbox") value = el.checked;
		else if (el.type === "number" || el.type === "range") {
			if (el.value === "" || !el.checkValidity()) { toast(`请输入 ${el.min} 至 ${el.max} 之间的整数。`, true); el.value = draft[key]; return; }
			value = Number(el.value);
		} else if (key === "inclusive") value = el.value === "true";
		else value = el.value;
		draft[key] = value;
		if (key === "match") renderCountrySettings();
		syncControls(); renderCalculation();
	}
	const actions = {
		preview: openPreview, save: saveForm, restore,
		"focus-config": () => { setTab("component"); $("rulePreset").focus(); },
		sample: () => toast("此处保留原表单样式，本次演示聚焦生效日期配置。"),
		"close-preview": () => $("previewDialog").close(),
		"close-confirm": () => { $("confirmDialog").close(); confirmCallback = null; },
		"close-save-as": () => $("saveAsDialog").close(),
		"use-recommended": () => {
			const result = compute(draft, context(true));
			if (result.recommendation && !$("useRecommended").disabled) {
				$("previewDate").value = result.recommendation; previewSubmitted = false; renderPreview();
			}
		},
		"submit-preview": () => submitPreview(),
		"confirm-submit": () => submitPreview(true),
		"save-as": () => {
			$("newFormName").value = `${saved.forms[currentForm].title}（副本）`;
			$("newFormError").hidden = true; $("saveAsDialog").showModal();
		},
		"confirm-save-as": () => {
			const title = $("newFormName").value.trim();
			const err = !title ? "请输入表单名称。" : Object.values(saved.forms).some((form) => form.title === title) ? "表单名称已存在，请修改。" : !draft.label.trim() ? "字段名称不能为空。" : "";
			if (err) { $("newFormError").textContent = err; $("newFormError").hidden = false; return; }
			const key = `copy_${Date.now()}`, next = clone(saved);
			next.forms[key] = { title, config: clone(draft) };
			if (persist(next)) { currentForm = key; renderForms(); renderAll(); $("saveAsDialog").close(); toast("已保存为新表单，原表单配置保持不变。"); }
		}
	};
	function setTab(tab) {
		activeTab = tab;
		document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
		$("controlPane").hidden = tab !== "control";
		$("componentPane").hidden = tab !== "component";
	}
	document.addEventListener("click", (event) => {
		const action = event.target.closest("[data-action]");
		if (action) { event.preventDefault(); actions[action.dataset.action]?.(); }
		const tab = event.target.closest("[data-tab]");
		if (tab) setTab(tab.dataset.tab);
	});
	document.addEventListener("change", (event) => { if (event.target.dataset.config) handleConfigChange(event.target); });
	document.addEventListener("input", (event) => {
		if (event.target.matches("[data-config]:is(input:not([type=number]):not([type=checkbox]), textarea)")) handleConfigChange(event.target);
	});
	$("confirmAction").addEventListener("click", () => { const callback = confirmCallback; confirmCallback = null; $("confirmDialog").close(); callback?.(); });
	$("formPreset").addEventListener("change", (event) => switchForm(event.target.value));
	$("rulePreset").addEventListener("change", (event) => {
		const country = event.target.value;
		const old = draft;
		draft = { ...defaults(country), label: old.label, required: old.required, span: old.span, placeholder: old.placeholder, extraHint: old.extraHint, enabled: old.enabled, showHint: old.showHint, base: old.base };
		renderAll();
	});
	["scenarioDate", "scenarioRegion", "scenarioFounded"].forEach((id) => $(id).addEventListener("change", renderCalculation));
	["previewSubmission", "previewFirst", "previewRegion", "previewFounded", "previewStatus", "previewDate"].forEach((id) => $(id).addEventListener("change", () => { previewSubmitted = false; renderPreview(); }));
	$("selectedField").addEventListener("click", () => { if (activeTab !== "component") setTab("component"); });
	$("selectedField").addEventListener("keydown", (event) => { if (event.key === "Enter") { setTab("component"); $("rulePreset").focus(); } });
	$("componentSearch").addEventListener("input", (event) => {
		document.querySelectorAll(".component-tile").forEach((tile) => { tile.hidden = !tile.textContent.includes(event.target.value.trim()); });
	});
	const basicComponents = ["输入框", "数字输入框", "文本输入框", "选择器", "多选框", "单选框", "按钮", "开关", "文本字段", "日期选择框", "日期范围", "月份选择", "月份范围", "时间选择", "树形选择", "级联选择", "上传组件", "店铺信息母版", "法人信息母版", "公司信息母版"];
	const customComponents = ["公司经营地址", "输入框按钮", "德国电池选项", "补申报周期", "变更时间", "预览资料包", "字段显示", "提示文案"];
	$("basicComponents").innerHTML = basicComponents.map((name) => `<button class="component-tile" data-action="${name === "日期选择框" ? "focus-config" : "sample"}">${name}</button>`).join("");
	$("customComponents").innerHTML = `<button class="component-tile chosen" data-action="focus-config">${icon("calendar-days")}期望税号生效日期</button>` + customComponents.map((name) => `<button class="component-tile" data-action="sample">${name}</button>`).join("");
	window.addEventListener("beforeunload", (event) => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } });
	renderForms(); renderAll();
	if (!storageAvailable) toast("浏览器存储不可用，配置将仅保留在当前页面。", true);
	// 独立演示接口用于日期边界核验，不连接业务服务。
	window.taxDateDemo = { compute, validate, defaults, getDraft: () => clone(draft), getSaved: () => clone(saved) };
})();
