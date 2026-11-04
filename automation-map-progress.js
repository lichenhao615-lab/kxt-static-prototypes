(() => {
	if (window.parent !== window) document.documentElement.classList.add("embedded");

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
})();
