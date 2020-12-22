<?php
/**
 * BuddyBoss Admin Screen.
 *
 * This file contains information about BuddyBoss.
 *
 * @since   BuddyBoss 2.0.0
 * @package BuddyBoss
 */

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;
?>

<div id="bp-hello-backdrop" style="display: none"></div>
<div id="bp-hello-container" class="bp-hello-buddyboss" role="dialog" aria-labelledby="bp-hello-title"
style="display: none">
	<div class="bp-hello-header" role="document">
		<div class="bp-hello-close">
			<button type="button" class="close-modal button bp-tooltip" data-bp-tooltip-pos="down"
					data-bp-tooltip="Close pop-up">
				<?php
				esc_html_e( 'Close', 'buddyboss' );
				?>
			</button>
		</div>

		<div class="bp-hello-title">
			<h1 id="bp-hello-title" tabindex="-1">Modeartion</h1>
		</div>
	</div>

	<div class="bp-hello-content">
		<?php
		esc_html_e( 'For making user spam you need to activate the moderation component.', 'buddyboss' );
		?>
	</div>
</div>