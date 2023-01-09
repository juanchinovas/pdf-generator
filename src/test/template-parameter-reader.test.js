const TemplateParameterReader = require("../template-parameter-reader");

describe("template-parameter-reader", () => {
	let templateReader;
	
	beforeEach(() => {
		templateReader = new TemplateParameterReader();
	});


	describe("getParametersFrom", () => {
		it("returns simple template parameters", () => {
			expect(templateReader.getParametersFrom("<p>{{param}}<p>")).toEqual({
				param: "{{param}}",
			});
		});

		it("returns array template parameters", () => {
			expect(templateReader.getParametersFrom("<p v-for=\"item in list\">{{item}}<p>")).toEqual({
				list: [{}]
			});
		});

		it("returns object template parameters", () => {
			expect(templateReader.getParametersFrom("<p>{{list.item}}<p>")).toEqual({
				list: {
					item: "{{item}}"
				}
			});
		});

		it("returns complete template parameters ", () => {
			expect(templateReader.getParametersFrom(`
				<p>{{list.item}}<p>
				<p v-for="name of names">{{name}}<p>
				<p v-for="animal in animals">
					<span>{{animal.name}}</span>
				<p>
				<p>{{date}}<p>
			`)).toEqual({
				animals: [{
					name: "{{name}}"
				}],
				date: "{{date}}",
				list: {
					item: "{{item}}"
				},
				names: [{}],
			});
		});

		it("returns complete template parameters correctly when inner object param are used", () => {
			expect(templateReader.getParametersFrom(`
				<p>{{list.item.name}}<p>
				<p v-for="name of names">{{name}}<p>
				<p v-for="animal in animals">
					<span>{{animal.name}}</span>
				<p>
				<p>{{date}}<p>
			`)).toEqual({
				animals: [{
					name: "{{name}}"
				}],
				date: "{{date}}",
				list: {
					item: {
						name: {}
					}
				},
				names: [{}],
			});
		});
	});
});