<?php
class VTL_Skeletor_Reusable_Layouts_REST_Controller extends WP_REST_Controller {
	public $post_factory = null;

	public function __construct($post_type, $post_factory) {
		$this->namespace = 'vtl';
		$this->resource_name = $post_type;
		$this->post_factory = $post_factory;
	}

	public function register_routes() {
		register_rest_route($this->namespace, "/{$this->resource_name}", [
			'methods'  => 'POST',
			'callback' => [$this, 'create_reusable_layout'],
		]);

		register_rest_route($this->namespace, "/{$this->resource_name}/(?P<id>[0-9]+)", [
			'methods'  => 'GET',
			'callback' => [$this, 'break_apart_reusable_layout'],
		]);
	}

	public function break_apart_reusable_layout($request) {
		$id = $request['id'];
		$title = get_the_title($id);

		$layouts = array_map(function($layout) {
			$layout_name = '';
			$layout_data = [];

			foreach ($layout as $key=>$val) {
				if ($key === 'acf_fc_layout') {
					$layout_name = $val;
				} else {
					$layout_data[$key] = $val;
				}
			}

			return [
				'layout' => $layout_name,
				'data'   => $layout_data,
			];
		}, get_field('layouts', $id));

		return rest_ensure_response([
			'message' => "Break apart Reusable Layout “{$title}”!",
			'layouts' => $layouts,
		]);
	}

	public function get_fake_reusable_layout_clone_data($reusable_layout_id) {
		$p = get_post($reusable_layout_id);
		if (!$p || $p->post_type !== 'vtlreusablelayouts') {
			return [];
		}

		$layout_slug = $p->post_name;
		$layout_title = "Reusable Layouts / {$p->post_title}";

		return [
			'key'        => uniqid("reusable_layout_{$layout_slug}"),
			'name'       => "reusable_layout_{$layout_slug}",
			'label'      => $layout_title,
			'display'    => 'block',
			'sub_fields' => [VTL_Skeletor_Reusable_Layouts::get_layout_message_field($reusable_layout_id)],
		];
	}

	public function get_fake_reusable_layout_clone($reusable_layout_id) {
		$fake_fc = new acf_field_flexible_content();

		$p = get_post($reusable_layout_id);
		if (!$p || $p->post_type !== 'vtlreusablelayouts') {
			return '';
		}

		$layout_slug = $p->post_name;
		$layout_title = "Reusable Layouts / {$p->post_title}";

		ob_start();
		$fake_fc->render_layout(
			[
				'key'   => uniqid('fake_fc_field'),
				'name'  => 'acf[field_global_layouts]',
				'_name' => 'acf[field_global_layouts]',
			],
			$this->get_fake_reusable_layout_clone_data($reusable_layout_id),
			'acfcloneindex',
			[]
		);

		return ob_get_clean();
	}

	public function create_reusable_layout($request) {
		$params = $request->get_params();

		$new_reusable_layout_id = wp_insert_post([
			'post_title'  => $params['name'],
			'post_type'   => $this->resource_name,
			'post_status' => 'publish',
		]);

		if (is_callable($this->post_factory)) {
			call_user_func($this->post_factory, $new_reusable_layout_id, $params);
		}

		return rest_ensure_response([
			'message'    => sprintf('Successfully saved “%s”!', $params['name']),
			'layout'     => $this->get_fake_reusable_layout_clone($new_reusable_layout_id),
			'layoutData' => $this->get_fake_reusable_layout_clone_data($new_reusable_layout_id),
		]);
	}
}
