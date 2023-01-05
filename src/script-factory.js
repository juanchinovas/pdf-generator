/*eslint-disable*/

Vue.component = Vue.component ?? function (name, componentInfo) {
	window.__customComponents = window.__customComponents ?? [];
	window.__customComponents.push({ name, componentInfo });
};

function initVue(templateData) {
	const vueFactory = ((Vue.createApp && initVue3) || initVue2);
	return vueFactory({
		el: "#app",
		mixins: window.mixins,
		data: () => templateData
	});
}

function initVue2(vueInit) {
	Vue.component("v-style", {
		render: function (createElement) {
			return createElement("style", [
				{ text: "* {-webkit-print-color-adjust: exact; color-adjust: exact;}" },
				...this.$slots.default
			]);
		}
	});
	return [vueInit];
}

function initVue3(vueInit) {
	const app = Vue.createApp(vueInit)
		.component("v-style", {
			setup: (_, { slots }) => {
				return () => Vue.h("style", [
					"* {-webkit-print-color-adjust: exact; color-adjust: exact;}",
					...slots.default()
				]);
			}
		});

	window.__customComponents?.forEach(({ name, componentInfo }) => app.component(name, componentInfo));
	return [app, vueInit.el];
}
