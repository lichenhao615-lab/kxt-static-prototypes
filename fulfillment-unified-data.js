(() => {
	"use strict";
	window.fulfillmentDemoRecords = [
		{ number: "SV20261105194835087461", order: "DD2611047966020201", kind: "基础服务", company: "长沙畔德商贸有限公司", customer: "跨客", product: "德国VAT转代理+申报", category: "VAT", country: "德国", node: "下号", status: "已下号", owner: "未记录", accountant: "名称未查到", production: true },
		{ number: "DEMO-ZZ-001", order: "DEMO-DD-002", kind: "增值服务", company: "远航商贸有限公司", customer: "远航", product: "德国VAT税务咨询", category: "VAT", country: "德国", node: "审核", status: "待审核", owner: "陈晓", accountant: "张静" },
		{ number: "DEMO-ZJ-001", order: "DEMO-DD-003", kind: "追加服务", company: "星辰贸易有限公司", customer: "星辰", product: "德国VAT资料补充", category: "VAT", country: "德国", node: "制单", status: "制单中", owner: "王敏", accountant: "张静" },
		{ number: "DEMO-XF-001", order: "DEMO-DD-004", kind: "续费服务", company: "海川科技有限公司", customer: "海川", product: "德国VAT续费申报", category: "VAT", country: "德国", node: "提交资料", status: "待提交", owner: "李明", accountant: "待分配" }
	];
	const base = window.fulfillmentDemoRecords[0];
	window.fulfillmentDemoRecords.slice(1).forEach(item => {
		item.parentNumber = base.number;
		item.company = base.company;
		item.customer = base.customer;
	});
})();
