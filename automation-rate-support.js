(() => {
	if (window.parent !== window) document.documentElement.classList.add("embedded");

	const sources = {
		ES: {
			label: "西班牙 VAT",
			updated: "2026-11-25",
			groups: [
				{
					name: "注册",
					items: [
						["上传资料", "上传资料", "", "否", "待规划"],
						["审核", "待审核", "审核资料", "是", "待规划"],
						["制作", "待制作", "", "", ""],
						["制作", "中西语授权书", "", "是", "已完成"],
						["制作", "CR翻译件", "", "是", "已完成"],
						["制作", "CRS翻译件", "", "是", "已完成"],
						["制作", "APO授权书", "", "是", "已完成"],
						["制作", "身份证原件", "", "是", "已完成"],
						["制作", "身份证翻译件", "", "是", "已完成"],
						["制作", "信用报告原件", "", "是", "已完成"],
						["制作", "信用报告翻译件", "", "是", "已完成"],
						["制作", "营业执照翻译件", "", "是", "已完成"],
						["制作", "自动上传资料包", "", "是", "待规划"],
						["客户签回", "客户邮寄原件", "客户邮寄原件", "否", ""],
						["客户签回", "客户下载回签并上传到系统（确认邮寄）", "客户下载回签并上传到系统（确认邮寄）", "否", ""],
						["海牙认证", "审核客户回传文件", "", "否", ""],
						["海牙认证", "邮寄原件到香港律所", "", "否", ""],
						["海牙认证", "登记邮寄物流单号", "", "否", ""],
						["海牙认证", "上传海牙文件、授权书时间", "", "否", ""],
						["海牙认证", "包含海牙文件的资料包提交给会计师", "", "否", ""],
						["注册递交", "030提交和回执－法人税号", "", "", ""],
						["注册递交", "036文件和回执－本土税号（录入税号）", "", "", ""],
						["注册递交", "036文件和回执－欧盟税号（增值服务）", "", "", ""],
						["RPA自动化", "030文件内容填写保存", "", "是", "已完成"],
						["RPA自动化", "西班牙列表信息爬取", "", "是", "已完成"],
						["RPA自动化", "获取030回执文件", "", "是", "已完成"],
						["RPA自动化", "文件回传到系统（030）", "", "是", "开发中"],
						["RPA自动化", "本土税号：税局官网填写036信息，得到036文件下载导出", "", "是", "已完成"],
						["RPA自动化", "本土税号：税局官网上传036文件＋海牙，下载036本土税号回执", "", "是", "已完成"],
						["RPA自动化", "文件回传到系统（本土税号）", "", "是", "开发中"],
						["RPA自动化", "欧盟税号：税局官网填写提交036信息－首次提交", "", "是", "已完成"],
						["RPA自动化", "获取回执（欧盟税号首次提交）", "", "是", "开发中"],
						["RPA自动化", "文件回传到系统（欧盟税号首次提交）", "", "是", "开发中"],
						["RPA自动化", "欧盟税号：税局官网填写提交036信息－二次提交", "", "是", "开发中"],
						["客户邮寄原件", "客户邮寄原件", "", "否", ""],
						["客户邮寄原件", "客户下载回签并上传到系统（确认邮寄）", "", "否", ""],
						["客户邮寄原件", "审核客户回传文件", "", "否", ""],
						["客户邮寄原件", "邮寄原件到香港律所", "", "否", ""],
						["客户邮寄原件", "登记邮寄物流单号", "", "否", ""],
						["客户邮寄原件", "上传海牙文件、授权书时间", "", "否", ""],
						["客户邮寄原件", "包含海牙文件的资料包提交给会计师", "", "否", ""]
					]
				},
				{
					name: "申报",
					items: [
						["上传资料", "上传销售数据", "", "是", "已完成"],
						["上传资料", "生成ECL明细", "", "是", "已完成"],
						["上传资料", "一键计算", "", "是", "已完成"],
						["上传资料", "生成税金函", "", "是", "已完成"],
						["上传资料", "生成税金明细", "", "是", "已完成"],
						["待缴纳税金", "上传缴税凭证", "", "是", "已完成"],
						["待递交申报", "待递交申报", "", "", ""],
						["等待回执", "上传回执", "", "是", "已完成"],
						["申报处理", "校验发票税号", "", "是", "待规划"],
						["申报处理", "导出西班牙349数据", "", "是", "已完成"],
						["申报处理", "批量修改sheet名称", "", "否", ""],
						["申报处理", "ECL表格分组合并", "", "否", ""],
						["申报处理", "递交至会计师", "", "是", "已完成"]
					]
				}
			]
		},
		DE: {
			label: "德国 VAT",
			updated: "2026-11-25",
			groups: [{
				name: "注册",
				items: [
					["上传资料", "上传资料", "", "是", "已完成"],
					["审核", "审核", "已接入 AI 预审，减少返工率", "是", "已完成"],
					["待复核", "待复核", "", "", ""],
					["处理中", "处理中", "", "", ""],
					["注册完成", "注册服务完成", "", "", ""],
					["预览资料包", "营业执照翻译件", "", "是", "已完成"],
					["预览资料包", "身份证翻译件", "", "是", "已完成"],
					["预览资料包", "仓储合同", "", "是", "已完成"],
					["预览资料包", "收件授权书", "", "是", "已完成"],
					["预览资料包", "电子邮件沟通声明协议", "", "是", "已完成"],
					["预览资料包", "法人身份证翻译件", "", "是", "已完成"],
					["预览资料包", "电子邮件沟通声明协议", "", "是", "已完成"],
					["分单", "分单，缺少自动分单，每一单需要手动点击分单", "", "是", "待规划"],
					["税号录入", "批量上传本土税号", "", "是", "已完成"],
					["税号录入", "批量上传欧盟税号", "", "是", "已完成"],
					["RPA自动化", "核对客户店铺后台地址链接有效性", "", "否", "已完成"],
					["推送API", "文件过大问题", "", "是", "已完成"],
					["预览资料包", "欧盟－法人信息问卷", "", "是", "已完成"],
					["预览资料包", "欧盟－仓储问卷", "", "是", "已完成"],
					["预览资料包", "欧盟－主问卷", "", "是", "已完成"],
					["推送API", "特殊字符，接口超时", "", "是", "待规划"],
					["邮件处理", "邮件分类识别", "", "否", "待规划"]
				]
			}]
		},
		FR: {
			label: "法国 VAT",
			updated: "2026-11-25",
			groups: [{
				name: "注册",
				items: [
					["制作", "DEL、PO、自营（法国公司、香港公司）", "不同会计师的格式不同", "", ""],
					["制作", "营业执照原件", "", "是", "已完成"],
					["制作", "身份证原件", "", "是", "已完成"],
					["制作", "中文版公司章程", "", "是", "已完成"],
					["制作", "法人签字", "", "是", "已完成"],
					["制作", "前台店铺信息", "", "是", "已完成"],
					["资料包", "注册信息采集表", "配置资料包", "是", "待规划"],
					["资料包", "客户信息汇总表", "配置资料包", "是", "待规划"],
					["资料包", "法语授权书", "配置资料包", "是", "待规划"],
					["资料制作", "身份证翻译件", "语言适配（法语），借鉴西班牙", "是", "待规划"],
					["资料制作", "营业执照翻译件", "语言适配（法语），借鉴西班牙", "是", "待规划"],
					["上传资料", "上传资料", "", "", ""],
					["审核", "待审核", "", "否", ""],
					["注册递交", "待提交", "", "", ""],
					["注册递交", "处理中", "", "", ""],
					["注册递交", "部分完成", "", "", ""],
					["证书回传", "收到渠道会计师的税号证书邮件", "", "否", ""],
					["证书回传", "收到渠道会计师的税号回执", "", "否", ""],
					["资料交付", "下载资料包再次复核，通过邮件发给渠道会计师", "80% 走自营自动化", "否", ""],
					["分单", "手动分单（最好是自动分单，通过分单规则）", "", "是", "待规划"],
					["税号录入", "批量录入税号", "批量录入偶尔会出错（格式不对或未分单）", "是", "已完成"],
					["证书录入", "批量上传证书", "批量上传会出错，目前逐条录入", "是", "已完成"]
				]
			}]
		}
	};

	let dialog;
	let previousFocus;
	const closeDialog = () => {
		if (!dialog || dialog.hidden) return;
		dialog.style.display = "none";
		dialog.hidden = true;
		document.documentElement.classList.remove("support-open");
		previousFocus?.focus();
	};
	const handleEscape = (event) => {
		if (event.key === "Escape" && dialog && !dialog.hidden) closeDialog();
	};

	const getDialog = () => {
		if (dialog) return dialog;
		const hostDocument = document;
		dialog = hostDocument.createElement("div");
		dialog.className = "support-dialog";
		dialog.hidden = true;
		dialog.setAttribute("role", "dialog");
		dialog.setAttribute("aria-modal", "true");
		dialog.innerHTML = `
			<div class="support-backdrop" data-support-backdrop></div>
			<div class="support-dialog-head">
				<div>
					<h2 data-support-title></h2>
					<p data-support-meta></p>
				</div>
				<button class="support-close" type="button" aria-label="关闭支持点明细">×</button>
			</div>
			<div class="support-dialog-body" data-support-body></div>`;
		hostDocument.body.appendChild(dialog);
		document.documentElement.classList.add("support-open");
		dialog.querySelector(".support-close").addEventListener("click", closeDialog);
		dialog.querySelector("[data-support-backdrop]").addEventListener("click", closeDialog);
		document.addEventListener("keydown", handleEscape);
		return dialog;
	};

	const renderSource = (country) => {
		const source = sources[country];
		const total = source.groups.reduce((sum, group) => sum + group.items.length, 0);
		dialog.querySelector("[data-support-title]").textContent = `${source.label} · 支持点明细`;
		dialog.querySelector("[data-support-meta]").textContent = `${total} 个支持点 · 数据更新于 ${source.updated}`;
		dialog.querySelector("[data-support-body]").innerHTML = source.groups.map((group) => `
			<section class="support-group">
				<div class="support-group-heading">
					<h3>${group.name}</h3>
					<span>${group.items.length} 项</span>
				</div>
				<div class="support-list">
					${group.items.map(([stage, name, description, automated, status], index) => `
						<div class="support-item">
							<span class="support-index">${String(index + 1).padStart(2, "0")}</span>
							<div class="support-copy">
								<div><strong>${name}</strong><span class="support-stage">${stage}</span></div>
								${description ? `<p>${description}</p>` : ""}
							</div>
							<span class="support-tag ${automated === "是" ? "yes" : automated === "否" ? "no" : "unknown"}">${automated ? `自动化 ${automated}` : "未标注"}</span>
							<span class="support-tag ${status === "已完成" ? "done" : status === "开发中" ? "working" : status === "待规划" ? "planned" : "unknown"}">${status || "未标注"}</span>
						</div>`).join("")}
				</div>
			</section>`).join("");
		dialog.querySelector("[data-support-body]").scrollTop = 0;
	};

	const openSource = (trigger) => {
		previousFocus = trigger;
		const country = trigger.dataset.support;
		getDialog();
		renderSource(country);
		dialog.hidden = false;
		dialog.style.display = "";
		dialog.querySelector(".support-close").focus();
		window.parent?.postMessage({ type: "automation-support-open" }, "*");
	};
	document.addEventListener("support-close", closeDialog);
	window.addEventListener("message", (event) => {
		if (event.source === window.parent && event.data?.type === "automation-support-close") closeDialog();
	});

	document.querySelectorAll("[data-support]").forEach((trigger) => {
		trigger.addEventListener("click", () => openSource(trigger));
	});
})();
