<?php
class VTL_Skeletor_Reusable_Layouts_REST_Controller extends WP_REST_Controller {
	public $post_factory = null;

	public function __construct($post_type, $post_factory) {
		$this->namespace = '/vtl';
		$this->resource_name = $post_type;
		$this->post_factory = $post_factory;
	}

	public function register_routes() {
		register_rest_route($this->namespace, "/{$this->resource_name}", [
			'methods'  => 'POST',
			'callback' => [$this, 'create_reusable_layout'],
		]);
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
			'message' => sprintf('Successfully saved “%s”!', $params['name']),
		]);
	}
}
