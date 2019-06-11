/* globals acf */
const CONTROLS_SELECTOR = '.acf-fc-layout-controls';
const BUTTON = '<a class="acf-icon -pencil small light acf-js-tooltip" href="#" data-name="save-prefab" title="Save as Reusable Layout"></a>';

function addPrefabButtonToControls(controls) {
	controls.find('.-minus').after(BUTTON);
}

function getLayoutAsPrefab(layout) {
	var fields = acf.getFields({
		parent: layout
	});

	var prefabData = fields.reduce(function (data, field) {
		var namePrefix = '';
		var fieldName = field.data.name;

		var fieldInstanceName = field.$input().eq(0).attr('name');
		if (fieldInstanceName) {
			var segments = fieldInstanceName.match(/\[[^[\]]+\]/gi);

			if (segments) {
				fieldInstanceName = segments.pop().replace(/\[|\]/g, '');
			}
		}

		if (fieldName && fieldInstanceName) {

			var parentRow = field.$el.closest('.acf-row');

			if (parentRow.length > 0) {
				var parentRepeater = parentRow.closest('.acf-field');
				var rowIndex = parentRow.attr('data-id').split('-').pop();
				var repeaterName = parentRepeater.attr('data-name');

				namePrefix = `${repeaterName}_${rowIndex}_`;
			}

			data[namePrefix + fieldName] = field.val();
			data['_' + namePrefix + fieldName] = fieldInstanceName;
		}

		return data;
	}, {});

	return {
		layout: layout.attr('data-layout'),
		data: prefabData
	};
}

function onClickSavePrefab(e) {
	var clicked = $(e.currentTarget);
	var layout = clicked.closest('.layout');
	var prefab = getLayoutAsPrefab(layout);

	var customTitle = '';
	var customTitleField = acf.getFields({ name: 'custom_layout_title', parent: layout }).pop();

	if (customTitleField) {
		customTitle = customTitleField.val();
	}

	prefab.name = window.prompt('Enter a name for your Reusable Layout', customTitle);

	if (!prefab.name) {
		return;
	} else {
		$.post(`${SiteInfo.restUrl}vtl/vtlreusablelayouts`, prefab)
			.then(data => {
				var fcField = acf.getField(layout.closest('.acf-field-flexible-content').attr('data-key'));

				fcField.$el.find('.clones')
					.eq(0)
					.append(data.layout);

				fcField.add({
					layout: data.layoutData.name,
					before: layout,
				});

				fcField.removeLayout(layout);

				adminNotice(`<p>${data.message}</p>`);
			});
	}
}

function onClickBreakApart(e) {
	var clicked = $(e.currentTarget);
	var prefabId = clicked.attr('data-prefab-id');
	var layoutEl = clicked.closest('.layout');

	clicked.closest('.acf-input').slideUp('slow').after('<p class="break-apart-loading">Loading… <i class="acf-spinner is-active"></i></p>');

	var fcField = acf.getField(layoutEl.closest('.acf-field-flexible-content').attr('data-key'));

	$.get(`${SiteInfo.restUrl}vtl/vtlreusablelayouts/${prefabId}`)
		.then(function (data) {
			for (var i = 0; i < data.layouts.length; i++) {
				var l = data.layouts[i];

				var added = fcField.add({
					layout: l.layout,
					before: layoutEl
				});

				for (var name in l.data) {
					var key = added.find(`[data-name="${name}"]`).attr('data-key');
					var subField = acf.getField(acf.findField(key, added));
					var val = l.data[name];

					setFieldValue(subField, val);
				}
			}

			layoutEl.slideUp(400, function () {
				fcField.removeLayout(layoutEl);
			});
		});
}

function setSelect2FieldValue(field, value, label) {
	field.$el.find('.select2-selection__rendered').html(label);
	field.$el.find('.select2-hidden-accessible').html('<option selected value="' + value + '">' + label + '</option>')
	field.val(value);
}

function setFieldValue(field, value) {
	switch (field.data.type) {
		case 'repeater':
			//Clean out any row there by default
			var rows = field.$rows();
			if (rows.length > 0) {
				field.remove(field.$rows().eq(0));
			}

			for (var rowIndex in value) {
				var row = value[rowIndex];
				var rowEl = field.add();

				for (var rowName in row) {
					var rowVal = row[rowName];
					var repeaterSubField = acf.getField(rowEl.find('[data-name="' + rowName + '"]'));

					setFieldValue(repeaterSubField, rowVal);
				}
			}

			break;

		case 'clone':
			for (var cloneKey in value) {
				var cloneValue = value[cloneKey];
				var cloneSubField = acf.getField(field.$el.find('[data-name="' + cloneKey + '"]'));

				setFieldValue(cloneSubField, cloneValue);
			}
			break;

		case 'image':
		case 'file':
			var atts = {};
			for (var k in value) {
				atts[k] = value[k];
			}
			value.attributes = atts;
			field.render(value);
			break;

		case 'wysiwyg':
			var $wrap = field.$control();
			if ($wrap.hasClass('delay')) {
				$wrap.removeClass('delay');
				$wrap.find('.acf-editor-toolbar').remove();
				field.initializeEditor();
			}

			var editorWrap = field.$el.find('.wp-editor-wrap');
			if (editorWrap.length > 0) {
				var editorID = editorWrap.eq(0).attr('id').replace(/^wp-/, '').replace(/-wrap$/, '')
				window.tinyMCE.get(editorID).setContent(value);
			}

			break;

		case 'oembed':
			var url = $(value).attr('src').split('?').shift();

			field.$search().val(url);
			field.val(url);
			field.$el.find('.canvas-media').html(value);

			break;

		case 'gallery':
			for (var attIndex in value) {
				var att = value[attIndex];
				field.appendAttachment(att, attIndex);
			}

			break;

		case 'checkbox':
			field.$inputs().each(function (i, checkbox) {
				if (value.indexOf(checkbox.value) >= 0) {
					checkbox.setAttribute('checked', 'checked');
				}
			});
			break;

		case 'radio':
			field.$control().find('[value="' + value + '"]').prop('checked', 'checked');
			break;

		case 'button_group':
			field.val(value);
			field.$el.find('input[value="' + value + '"]').prop('checked', 'checked').trigger('click');
			break;

		case 'true_false':
			if (value) {
				field.$input().prop('checked', 'checked');
			}
			break;

		case 'post_object':
			setSelect2FieldValue(field, value.ID, value.post_title);
			break;

		case 'page_link':
			setSelect2FieldValue(field, value, value);
			break;

		case 'relationship':
			var loadCheck = setInterval(function () {
				if (!field.get('loading')) {
					clearInterval(loadCheck);
					for (var relIndex in value) {
						var post = value[relIndex];
						field.$el.find('[data-id=' + post.ID + ']').trigger('click');
					}
				}
			}, 100);

			break;

		case 'taxonomy':
			for (var taxIndex in value) {
				field.$el
					.find('[value=' + value[taxIndex] + ']')
					.prop('checked', 'checked');
			}
			break;

		case 'user':
			var userLabel = value.user_nicename + ' (' + value.nickname + ')';
			setSelect2FieldValue(field, value.ID, userLabel);
			break;

		case 'google_map':
			break;

		case 'date_picker':
		case 'date_time_picker':
		case 'time_picker':
			field.val(value);
			field.$el.find('[type=text]').val(value);
			break;

		default:
			field.val(value);
	}
}

function onAdminReady() {
	if (window.acf) {
		initializePrefabs();
	}
}

function initializePrefabs() {
	$(CONTROLS_SELECTOR).each(function (i, el) {
		var controls = $(el);
		var layout = controls.closest('.layout');

		//yo dawg
		if (!layout.attr('data-layout').match(/^reusable_layout/)) {
			addPrefabButtonToControls(controls)
		}
	});

	$(document)
		.on('click', '[data-name="save-prefab"]', onClickSavePrefab)
		.on('click', '.break-apart[data-prefab-id]', onClickBreakApart);
}

function adminNotice(html) {
	var output = $('<div class="notice notice-info is-dismissible"></div>');
	output.html(html);

	var dismiss = $('<button type="button" class="notice-dismiss"><span class="screen-reader-text">Dismiss this notice</span></button>');
	dismiss.on('click', function () {
		output.remove();
	});

	output.append(dismiss);

	$('h1').eq(0).before(output);
}

window.adminNotice = adminNotice;

document.addEventListener('DOMContentLoaded', onAdminReady);
