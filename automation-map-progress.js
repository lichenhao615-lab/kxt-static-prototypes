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

	// 用明确的灰、灰绿、浅绿、绿、深绿锚点拉开不同完成度的视觉差异。
	const rateColor = (ratio) => {
		const stops = [[222, 222, 222], [193, 207, 195], [127, 184, 141], [43, 129, 69], [4, 71, 35]];
		const position = ratio * (stops.length - 1);
		const index = Math.min(Math.floor(position), stops.length - 2);
		const offset = position - index;
		return stops[index].map((channel, channelIndex) =>
			Math.round(channel + (stops[index + 1][channelIndex] - channel) * offset));
	};
	const rateInk = (channels) => {
		const linear = channels.map((channel) => {
			const value = channel / 255;
			return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
		});
		const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
		return luminance > 0.179 ? "#000" : "#fff";
	};

	document.querySelectorAll("[data-automation-current][data-automation-total]").forEach((element) => {
		const current = Number(element.dataset.automationCurrent);
		const total = Number(element.dataset.automationTotal);
		if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current < 0 || current > total) return;
		const ratio = current / total;
		const percent = Math.round(ratio * 100);
		const color = rateColor(ratio);
		element.style.setProperty("--rate-color", `rgb(${color.join(", ")})`);
		element.style.setProperty("--rate-ink", rateInk(color));
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
			indicator.innerHTML = '<span class="rate-arrow" aria-hidden="true">↑</span><span>新增</span>';
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
		indicator.innerHTML = `<span class="rate-arrow" aria-hidden="true">${arrow}</span><span>${Math.abs(change).toFixed(1)}</span>`;
		indicator.title = `较${baselineLabel}${change > 0 ? "提高" : change < 0 ? "下降" : "持平"}${change === 0 ? "" : ` ${Math.abs(change).toFixed(1)} 个百分点`}；本期 ${current}/${total}，对比期 ${previous[0]}/${previous[1]}。`;
		indicator.setAttribute("aria-label", indicator.title);
		target.appendChild(indicator);
	});
})();
