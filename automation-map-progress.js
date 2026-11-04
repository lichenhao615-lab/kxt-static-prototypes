(() => {
	if (window.parent !== window) document.documentElement.classList.add("embedded");

	// 九月依据已归档明细，十月依据用户确认的通晒截图；缺失项不补零。
	const snapshots = {
		"2026-09": {
			"vat:ES": [15, 22],
			"epr:ES:包装法": [14, 17]
		},
		"2026-10": {
			"vat:DE": [8, 12],
			"vat:FR": [2, 5],
			"vat:ES": [18, 27],
			"epr:ES:包装法": [14, 17],
			"epr:FR:包装法": [4, 7],
			"epr:DE:WEEE": [5, 17],
			"epr:DE:电池法": [6, 12]
		}
	};
	const baselineMonth = new URLSearchParams(window.location.search).get("period") === "current" ? "2026-10" : "2026-09";
	const baselineLabel = baselineMonth === "2026-10" ? "10月" : "9月";

	// 完成度从 0% 的中性灰连续过渡至 100% 的深绿。
	const rateColor = (ratio) => {
		return `hsl(140, ${(ratio * 76).toFixed(1)}%, ${(55 - ratio * 27).toFixed(1)}%)`;
	};

	document.querySelectorAll("[data-automation-current][data-automation-total]").forEach((element) => {
		const current = Number(element.dataset.automationCurrent);
		const total = Number(element.dataset.automationTotal);
		if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current < 0 || current > total) return;
		const ratio = current / total;
		const percent = Math.round(ratio * 100);
		element.style.setProperty("--rate-color", rateColor(ratio));
		element.style.setProperty("--rate-angle", `${ratio * 360}deg`);
		if (element.classList.contains("progress-ring")) {
			element.innerHTML = `<strong>${percent}%</strong>`;
			element.setAttribute("role", "img");
			element.setAttribute("aria-label", `自动化率 ${percent}%，当前 ${current}，总数 ${total}`);
		} else {
			element.innerHTML = `<div class="rate-value" title="自动化率：${current}/${total}">
				<div class="rate-heading"><strong>${percent}%</strong></div>
				<div class="rate-details"><progress value="${current}" max="${total}" aria-label="自动化率 ${percent}%，${current}/${total}"></progress><span class="rate-fraction">${current}/${total}</span></div>
			</div>`;
		}
	});

	document.querySelectorAll("[data-product-key]").forEach((item) => {
		const marker = item.querySelector("[data-automation-current][data-automation-total]");
		const previous = snapshots[baselineMonth][item.dataset.productKey];
		const project = item.classList.contains("priority-project");
		const target = project ? item.querySelector("p") : item.querySelector(".rate-heading");
		if (!target || !marker) return;
		const current = Number(marker.dataset.automationCurrent);
		const total = Number(marker.dataset.automationTotal);
		if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current < 0 || current > total) return;
		const indicator = document.createElement("span");
		indicator.className = "rate-change";
		indicator.dataset.baseline = baselineMonth;
		if (!previous) {
			indicator.classList.add("new");
			indicator.dataset.kind = "new";
			indicator.textContent = "↑新增";
			indicator.title = `${baselineLabel}暂无自动化率记录，本期新增数据：${current}/${total}（${Math.round(current / total * 100)}%）；不将缺失数据视为 0%。`;
			indicator.setAttribute("aria-label", indicator.title);
			target.appendChild(indicator);
			return;
		}
		const previousRatio = previous[0] / previous[1];
		const change = Math.round((current / total - previousRatio) * 1000) / 10 || 0;
		const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
		const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
		indicator.classList.add(direction);
		indicator.dataset.kind = direction;
		indicator.dataset.change = change.toFixed(1);
		indicator.textContent = `${arrow}${Math.abs(change).toFixed(1)}`;
		indicator.title = `较${baselineLabel}${change > 0 ? "提高" : change < 0 ? "下降" : "持平"}${change === 0 ? "" : ` ${Math.abs(change).toFixed(1)} 个百分点`}；本期 ${current}/${total}，对比期 ${previous[0]}/${previous[1]}。`;
		indicator.setAttribute("aria-label", indicator.title);
		target.appendChild(indicator);
	});
})();
