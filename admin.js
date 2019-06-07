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

	var prefabData = fields.reduce((data, field) => {
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
	var customTitleField = acf.getFields({name: 'custom_layout_title', parent: layout}).pop();

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

	var fcField = acf.getField(layoutEl.closest('.acf-field-flexible-content').attr('data-key'));

	$.get(`${SiteInfo.restUrl}vtl/vtlreusablelayouts/${prefabId}`)
		.then(data => {
			for (var i=0; i<data.layouts.length; i++) {
				var l = data.layouts[i];

				var added = fcField.add({
					layout: l.layout,
					before: layoutEl
				});

				for (var name in l.data) {
					var key = added.find(`[data-name="${name}"]`).attr('data-key');
					var subField = acf.getField(acf.findField(key, added));
					var val = l.data[name];

					switch (subField.data.type) {
						case 'image':
						case 'file':
							var atts = {};
							for (var k in val) {
								atts[k] = val[k];
							}
							val.attributes = atts;
							subField.render(val);
							break;

						case 'wysiwyg':
							var editorWrap = subField.$el.find('.wp-editor-wrap');
							if (editorWrap.length > 0) {
								var editorID = editorWrap.eq(0).attr('id').replace(/^wp-/, '').replace(/-wrap$/, '')
								window.tinyMCE.get(editorID).setContent(val);
							}
							break;

						case 'oembed':
							var url = $(val).attr('src').split('?').shift();

							subField.$search().val(url);
							subField.val(url);
							subField.$el.find('.canvas-media').html(val);

							break;

						case 'gallery':
							for (var attIndex in val) {
								var att = val[attIndex];
								subField.appendAttachment(att, attIndex);
							}

							break;

						case 'checkbox':
							subField.$inputs().each(function(i, checkbox) {
								if (val.indexOf(checkbox.value) >= 0) {
									checkbox.setAttribute('checked', 'checked');
								}
							});
							break;

						case 'radio':
							subField.$control().find('[value="'+val+'"]').prop('checked', 'checked');
							break;

						case 'button_group':
							subField.val(val);
							subField.$el.find('input[value="' + val + '"]').prop('checked', 'checked').trigger('click');
							break;

						case 'true_false':
							if (val) {
								subField.$input().prop('checked', 'checked');
							}
							break;

						case 'post_object':
							subField.$el.find('.select2-selection__rendered').html(val.post_title);
							subField.$el.find('.select2-hidden-accessible').html('<option selected value="' + val.ID + '">' + val.post_title + '</option>')
							subField.val(val.ID);
							break;

						case 'page_link':
							subField.$el.find('.select2-selection__rendered').html(val);
							subField.$el.find('.select2-hidden-accessible').html('<option selected value="' + val + '">' + val + '</option>')
							subField.val(val);
							break;

						case 'relationship':
							(function (field, value) {
								var loadCheck = setInterval(function () {
									if (!field.get('loading')) {
										clearInterval(loadCheck);
										for (var relIndex in value) {
											var post = value[relIndex];
											field.$el.find('[data-id=' + post.ID + ']').trigger('click');
										}
									}
								}, 100);
							})(subField, val);

							break;

						case 'taxonomy':
							for (var taxIndex in val) {
								subField.$el
									.find('[value=' + val[taxIndex] + ']')
									.prop('checked', 'checked');
							}
							break;

						case 'user':
							var userLabel = val.user_nicename + ' (' + val.nickname + ')';
							subField.$el.find('.select2-selection__rendered').html(userLabel);
							subField.$el.find('.select2-hidden-accessible').html('<option selected value="' + val.ID + '">' + userLabel + '</option>')
							subField.val(val.ID);
							break;

						case 'google_map':
							break;

						case 'date_picker':
						case 'date_time_picker':
						case 'time_picker':
							subField.val(val);
							subField.$el.find('[type=text]').val(val);
							break;

						default:
							subField.val(val);
					}
				}
			}

			fcField.removeLayout(layoutEl);
		});
}

function onAdminReady() {
	if (window.acf) {
		initializePrefabs();
	}
}

function initializePrefabs() {
	$(CONTROLS_SELECTOR).each((i, el) => {
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
	dismiss.on('click', function() {
		output.remove();
	});

	output.append(dismiss);

	$('h1').eq(0).before(output);
}

window.adminNotice = adminNotice;

document.addEventListener('DOMContentLoaded', onAdminReady);
