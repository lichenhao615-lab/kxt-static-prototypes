(() => {
	if (window.parent === window) return;
	const page = document.querySelector(".page");
	if (!page) return;
	let scheduled = false;
	const reportHeight = () => {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			const bounds = page.getBoundingClientRect();
			if (bounds.width === 0) return;
			// Measure content instead of scrollHeight, which includes the iframe's current height.
			const height = Math.ceil(bounds.bottom + window.scrollY + parseFloat(getComputedStyle(page).marginBottom)) + 2;
			window.parent.postMessage({ type: "automation-map-height", height }, "*");
		});
	};
	new ResizeObserver(reportHeight).observe(page);
	window.addEventListener("message", (event) => {
		if (event.source === window.parent && event.data?.type === "automation-map-measure") reportHeight();
	});
	window.addEventListener("load", reportHeight);
	document.fonts.ready.then(reportHeight);
	reportHeight();
})();
