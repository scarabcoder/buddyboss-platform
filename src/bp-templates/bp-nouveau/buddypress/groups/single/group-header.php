<?php
/**
 * BuddyBoss - Groups Header
 *
 * @since BuddyPress 3.0.0
 * @version 3.1.0
 */
?>

<?php bp_get_template_part( 'groups/single/parts/header-item-actions' ); ?>

<?php if ( ! bp_disable_group_avatar_uploads() ) : ?>
	<div id="item-header-avatar">
		<a href="<?php echo esc_url( bp_get_group_permalink() ); ?>" class="bp-tooltip" data-bp-tooltip="<?php echo esc_attr( bp_get_group_name() ); ?>">

			<?php bp_group_avatar(); ?>

		</a>
	</div><!-- #item-header-avatar -->
<?php endif; ?>

<div id="item-header-content">

	<p class="highlight group-status bp-tooltip" data-bp-tooltip="<?php echo esc_html( bp_get_group_status_description() ); ?>"><strong><?php echo esc_html( bp_nouveau_group_meta()->status ); ?></strong></p>

	<p class="activity">
        <a href="<?php echo esc_url( bp_get_group_permalink() . 'members' ); ?>"><?php echo esc_html( bp_get_group_member_count() ); ?></a>
	</p>

	<?php bp_nouveau_group_hook( 'before', 'header_meta' ); ?>

	<?php if ( bp_nouveau_group_has_meta_extra() ) : ?>
		<div class="item-meta">

			<?php echo bp_nouveau_group_meta()->extra; ?>

		</div><!-- .item-meta -->
	<?php endif; ?>

	<?php if ( ! bp_nouveau_groups_front_page_description() && bp_nouveau_group_has_meta( 'description' ) ) : ?>
		<div class="group-description">
			<?php bp_group_description(); ?>
		</div><!-- //.group_description -->
	<?php endif; ?>
</div><!-- #item-header-content -->

<?php bp_nouveau_group_header_buttons(); ?>
