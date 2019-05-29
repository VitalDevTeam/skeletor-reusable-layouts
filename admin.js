/* globals acf */
const CONTROLS_SELECTOR = '.acf-fc-layout-controls';
const BUTTON = '<a class="acf-icon -pencil small light acf-js-tooltip" href="#" data-name="save-prefab" title="Save as Reusable Layout"></a>';

function addPrefabButtonToControls(controls) {
	controls.find('.-minus').after(BUTTON);
}

function getLayoutAsPrefab(layout) {
	let fields = acf.getFields({
		parent: layout
	});

	let prefabData = fields.reduce((data, field) => {
		let namePrefix = '';
		let fieldName = field.data.name;

		if (fieldName) {
			let parentRow = field.$el.closest('.acf-row');


			if (parentRow.length > 0) {
				let parentRepeater = parentRow.closest('.acf-field');
				let rowIndex = parentRow.attr('data-id').split('-').pop();
				let repeaterName = parentRepeater.attr('data-name');

				namePrefix = `${repeaterName}_${rowIndex}_`;
			}

			data[namePrefix + fieldName] = field.val();
		}

		return data;
	}, {});

	return {
		layout: layout.attr('data-layout'),
		data: prefabData
	};
}

function onClickSavePrefab(e) {
	let clicked = $(e.currentTarget);
	let layout = clicked.closest('.layout');
	let prefab = getLayoutAsPrefab(layout);

	let customTitle = '';
	let customTitleField = acf.getFields({name: 'custom_layout_title', parent: layout}).pop();

	if (customTitleField) {
		customTitle = customTitleField.val();
	}

	prefab.name = window.prompt('Enter a name for your Reusable Layout', customTitle);

	if (!prefab.name) {
		return;
	} else {
		$.post(`${SiteInfo.restUrl}vtl/vtlreusablelayouts`, prefab)
			.then(data => window.alert(data.message));
	}
}

function onAdminReady() {
	if (window.acf) {
		initializePrefabs();
	}
}

function initializePrefabs() {
	$(CONTROLS_SELECTOR).each((i, el) => {
		let controls = $(el);
		let layout = controls.closest('.layout');

		//yo dawg
		if (!layout.attr('data-layout').match(/^reusable_layout/)) {
			addPrefabButtonToControls(controls)
		}
	});

	$(document).on('click', '[data-name="save-prefab"]', onClickSavePrefab);
}

document.addEventListener('DOMContentLoaded', onAdminReady);
