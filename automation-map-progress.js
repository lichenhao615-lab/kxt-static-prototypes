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

	// 在同一灰绿区间连续插值，让矩阵和重点项目使用一致的完成度色阶。
	const rateColor = (ratio) => {
		const gray = [125, 133, 139];
		const green = [8, 114, 63];
		return `rgb(${gray.map((value, index) => Math.round(value + (green[index] - value) * ratio)).join(", ")})`;
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
				<strong>${percent}%</strong><span class="rate-fraction">${current}/${total}</span>
				<progress value="${current}" max="${total}" aria-label="自动化率 ${percent}%，${current}/${total}"></progress>
			</div>`;
		}
	});

	document.querySelectorAll("[data-product-key]").forEach((item) => {
		const marker = item.querySelector("[data-automation-current][data-automation-total]");
		const previous = snapshots[baselineMonth][item.dataset.productKey];
		const cell = item.querySelector(".comparison-cell");
		const project = item.classList.contains("priority-project");
		let target = cell;
		if (project) {
			target = document.createElement("p");
			target.className = "project-comparison";
			item.lastElementChild.appendChild(target);
		}
		if (!target) return;
		if (!marker || !previous) {
			target.innerHTML = '<span class="comparison-empty">暂无对比数据</span>';
			return;
		}
		const current = Number(marker.dataset.automationCurrent);
		const total = Number(marker.dataset.automationTotal);
		if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current < 0 || current > total) return;
		const previousRatio = previous[0] / previous[1];
		const change = Math.round((current / total - previousRatio) * 1000) / 10 || 0;
		const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
		const delta = `${change > 0 ? "+" : ""}${change.toFixed(1)} 个百分点`;
		const previousPercent = Math.round(previousRatio * 100);
		target.dataset.change = change.toFixed(1);
		target.dataset.baseline = baselineMonth;
		target.title = `本期 ${current}/${total}；对比期 ${previous[0]}/${previous[1]}，${(previousRatio * 100).toFixed(1)}%`;
		if (project) {
			target.classList.add(direction);
			target.textContent = `较${baselineLabel} ${change === 0 ? "持平" : delta}`;
		} else {
			target.innerHTML = `<div class="comparison-value ${direction}"><strong>${delta}</strong><small>较${baselineLabel} ${previousPercent}%${change === 0 ? " · 持平" : ""}</small></div>`;
		}
	});
})();
