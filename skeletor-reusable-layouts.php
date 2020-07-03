<?php
/**
 * Plugin Name: Skeletor Reusable Layouts
 * Description: Add-on for Skeletor to create a library of Reusable Layouts which automatically appear in the Global Layouts menu
 * Version: 1.2.3-beta
 * Author: Vital Design
 * Author URI: https://vtldesign.com
 */

require_once(__DIR__ . '/rest-api-controller.php');

class VTL_Skeletor_Reusable_Layouts {
	private static $rest_controller;

	public static $post_type = 'vtlreusablelayouts';

	public static function get_reusable_layout_layouts() {
		$gb_posts = get_posts([
			'post_type'      => static::$post_type,
			'posts_per_page' => -1,
		]);

		return array_map(['VTL_Skeletor_Reusable_Layouts', 'reusable_layout_to_global_layout'], $gb_posts);
	}

	public static function get_layout_message_field($block_id) {
		if (!$p = get_post($block_id)) {
			return false;
		}

		$edit_url = admin_url("post.php?post={$p->ID}&action=edit");
		$message = <<<MSG
This will automatically display the content from the <strong>“{$p->post_title}”</strong> Reusable Layout.

<a href="{$edit_url}" target="_blank" class="button primary large">Edit Reusable Layout</a> <a href="javascript:void(0)" data-prefab-id="{$p->ID}" class="button primary large break-apart">Break Apart</a>
MSG;
		return [
			'key'     => "layout_{$p->post_name}_message",
			'type'    => 'message',
			'message' => $message,
		];
	}

	public static function reusable_layout_to_global_layout($block_id) {
		if (!$p = get_post($block_id)) {
			return false;
		}

		$edit_url = admin_url("post.php?post={$p->ID}&action=edit");

		return [
			'key'        => "layout_{$p->post_name}",
			'name'       => "reusable_layout_{$p->post_name}",
			'label'      => "Reusable Layouts / {$p->post_title}",
			'display'    => 'block',
			'sub_fields' => [static::get_layout_message_field($block_id)],
		];
	}

	public static function init() {
		register_post_type(static::$post_type, [
			'label'              => 'Reusable Layouts',
			'public'             => false,
			'show_ui'            => true,
			'menu_icon'          => 'dashicons-update',
			'publicly_queryable' => false,
			'has_archive'        => false,
			'rewrite'            => false,
		]);

		$gb_posts = get_posts([
			'post_type' => static::$post_type,
			'status'    => 'publish',
			'posts_per_page' => -1,
		]);

		foreach ($gb_posts as $p) {
			add_filter("render_reusable_layout_{$p->post_name}", function() use ($p) {
				return static::render_reusable_layout($p);
			});
		}
	}

	public static function render_reusable_layout($reusable_layout) {
		return VTL_Global_Layouts::get_flexible_layouts('layouts', $reusable_layout);
	}

	public static function rest_api_init() {
		$controller = new VTL_Skeletor_Reusable_Layouts_REST_Controller(
			static::$post_type,
			['VTL_Skeletor_Reusable_Layouts', 'build_reusable_layout']
		);

		$controller->register_routes();
	}

	public static function build_reusable_layout($id, $params) {
		$layout = $params['layout'];
		$data = $params['data'];
		$name = $params['name'];

		update_post_meta($id, 'block_layouts', '');
		update_post_meta($id, '_block_layouts', 'field_reusable_layout_layouts_clone');
		update_post_meta($id, 'layouts', [$layout]);
		update_post_meta($id, '_layouts', 'field_global_layouts');

		foreach ($data as $key => $val) {
			if (preg_match('/^_/', $key)) {
				$meta_key = sprintf('_layouts_0%s', $key);
			} else {
				$meta_key = sprintf('layouts_0_%s', $key);
			}

			update_post_meta($id, $meta_key, $val);
		}
	}

	public static function acf_init() {
		acf_add_local_field_group([
			'key'            => 'group_reusable_layout_fields',
			'title'          => 'Reusable Layout Fields',
			'fields'         => [
				[
					'key'     => 'field_reusable_layout_layouts_clone',
					'label'   => 'Layouts',
					'name'    => 'block_layouts',
					'type'    => 'clone',
					'clone'   => ['group_global_layouts'],
					'display' => 'seamless',
					'layout'  => 'block',
				],
			],
			'location'       => [
				[
					[
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => static::$post_type,
					],
				],
			],
			'menu_order'     => 0,
			'position'       => 'acf_after_title',
			'style'          => 'seamless',
			'hide_on_screen' => ['the_content'],
			'active'         => true,
		]);
	}

	public static function get_global_layouts($layouts) {
		$reusable_layout_layouts = VTL_Skeletor_Reusable_Layouts::get_reusable_layout_layouts();

		foreach ($reusable_layout_layouts as $l) {
			$layouts[$l['key']] = $l;
		}

		return $layouts;
	}

	public static function acf_validate_save_post() {
		if (array_key_exists('post_type', $_POST) && $_POST['post_type'] === static::$post_type) {
			$block_layouts = $_POST['acf']['field_reusable_layout_layouts_clone']['field_reusable_layout_layouts_clone_field_global_layouts'];

			foreach ($block_layouts as $k=>$l) {
				if (array_key_exists('acf_fc_layout', $l) && $l['acf_fc_layout'] == "reusable_layout_{$_POST['post_name']}") {
					acf_add_validation_error("acf[field_reusable_layout_layouts_clone][field_reusable_layout_layouts_clone_field_global_layouts][{$k}][acf_fc_layout]", 'A Reusable Layout is not allowed to contain itself!');
				}
			}
		}
	}

	public static function admin_enqueue_scripts() {
		wp_enqueue_script(
			static::$post_type,
			plugins_url('admin.js', __FILE__),
			false,
			filemtime(__DIR__ . '/admin.js'),
			true
		);
	}
}

add_action('init', ['VTL_Skeletor_Reusable_Layouts', 'init']);
add_action('rest_api_init', ['VTL_Skeletor_Reusable_Layouts', 'rest_api_init']);
add_action('admin_enqueue_scripts', ['VTL_Skeletor_Reusable_Layouts', 'admin_enqueue_scripts']);
add_action('acf/init', ['VTL_Skeletor_Reusable_Layouts', 'acf_init']);
add_action('acf/validate_save_post', ['VTL_Skeletor_Reusable_Layouts', 'acf_validate_save_post']);
add_filter('get_global_layouts', ['VTL_Skeletor_Reusable_Layouts', 'get_global_layouts']);
