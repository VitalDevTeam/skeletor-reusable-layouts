Skeletor Reusable Layouts
=========================

By [Vital](https://vtldesign.com)

This plugin adds a Custom Post Type called “Reusable Layouts” to your Skeletor-based theme which can be populated with content using the same Global Layouts used for Pages. Then some fancy-pants filter work automagically makes it so that all of your Reusable Layouts appear in the Global Layouts. This is extremely useful for blocks of content that you want to use in multiple places throughout the site, but only have to edit a single copy of.

Additionally, this plugin adds a Save as Reusable Layout to all (non-reusable) Flexible Content layouts! Very handy for those occasions where you want to re-use a layout you’ve already built.

Things to know
--------------
* Saving a layout instance to be a Reusable Layout means only a *single* layout is used, but if you’re manually creating one (or editing one) you can add multiple layouts to a single Reusable Layout!
* Reusable Layouts are allowed to contain other Reusable Layouts, but not themselves. Set up reusable CTAs like “Boat CTA”, “Car CTA”, “Bike CTA” for specific content/layout instances, then stuff like “Primary Campaign CTA” or “Footer CTA” which contain the Reusable Layout(s) you want to display.
* Repeater fields will work just fine, but Repeater fields nested inside Repeater fields will not. If we really need something like that to work I’m sure we could update `getLayoutAsPrefab()` in admin.js to build those names recursively.
* This relies on Skeletor having a `get_global_layouts` filter in VTL_Global_Layouts::get_global_layouts(). This was added in [commit ede3d0c on 2019-05-21](https://bitbucket.org/madebyvital/skeletor/commits/ede3d0cd487cb692abe56f440a8eccd7c8959938). If you’re running an older version of Skeletor that has VTL_Global_Layouts, this should be a quick and easy update to make.

Future Updates
--------------
* A 'Break Apart' button to convert from the Reusable Layout back to regular populated Global Layouts would be nice.
* A way to override values, while still using the Reusable Layout, would also be pretty nice. Something like [Unity’s Prefab Instance Overrides](https://docs.unity3d.com/Manual/PrefabInstanceOverrides.html)
* After using the Save as Reusable Layout button, the saved layout will be replaced with the new Reusable Layout, but the Add Layout button menu remains unchanged. We need to find a way to update this, but until then you’ll need to refresh the editor if you want to use your newly generated Reusable Layout on the same page you created it from. *(honestly though this feels like something that would happen so infrequently it’s probably not worth the effort)*
