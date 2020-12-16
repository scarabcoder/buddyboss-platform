<?php
/**
 * BP REST: BP_REST_Group_Messages_Endpoint class
 *
 * @package BuddyBoss
 * @since 0.1.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Group Messages endpoints.
 *
 * @since 0.1.0
 */
class BP_REST_Group_Messages_Endpoint extends WP_REST_Controller {

	/**
	 * Reuse some parts of the BP_REST_Messages_Endpoint class.
	 *
	 * @since 0.1.0
	 *
	 * @var BP_REST_Messages_Endpoint
	 */
	protected $message_endppoint;

	/**
	 * Constructor.
	 *
	 * @since 0.1.0
	 */
	public function __construct() {
		$this->namespace         = bp_rest_namespace() . '/' . bp_rest_version();
		$this->rest_base         = buddypress()->messages->id;
		$this->message_endppoint = new BP_REST_Messages_Endpoint();
	}

	/**
	 * Register the component routes.
	 *
	 * @since 0.1.0
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/group',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_item' ),
					'permission_callback' => array( $this, 'create_item_permissions_check' ),
					'args'                => $this->get_collection_params(),
				),
				'schema' => array( $this, 'get_item_schema' ),
			)
		);
	}

	/**
	 * Init a Messages Thread or add a reply to an existing Thread.
	 * -- from bp_nouveau_ajax_groups_send_message();
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return WP_REST_Response | WP_Error
	 * @since 0.1.0
	 *
	 * @api            {POST} /wp-json/buddyboss/v1/messages/group Create Group Thread
	 * @apiName        CreateBBGroupThread
	 * @apiGroup       Messages
	 * @apiDescription Create Group thread
	 * @apiVersion     1.0.0
	 * @apiPermission  LoggedInUser
	 * @apiParam {String} message Content of the Message to add to the Thread.
	 * @apiParam {Number} group_id A unique numeric ID for the Group.
	 * @apiParam {Number} user_id Limit result to messages created by a specific user.
	 * @apiParam {String=open,private} type=open Type of message, Group thread or private reply.
	 * @apiParam {String=all,individual} users=all Group thread users individual or all.
	 * @apiParam {Array} [users_list] Limit result to messages created by a specific user.
	 */
	public function create_item( $request ) {
		global $wpdb, $bp;

		$group         = ( isset( $request['group_id'] ) && ! empty( $request['group_id'] ) ) ? $request['group_id'] : '';
		$message       = ( isset( $request['message'] ) && ! empty( $request['message'] ) ) ? $request['message'] : '';
		$users_list    = ( isset( $request['users_list'] ) && ! empty( $request['users_list'] ) ) ? $request['users_list'] : '';
		$message_users = ( isset( $request['users'] ) && ! empty( $request['users'] ) ) ? $request['users'] : '';
		$message_type  = ( isset( $request['type'] ) && ! empty( $request['type'] ) ) ? $request['type'] : '';

		// verification for phpcs.
		wp_verify_nonce( wp_create_nonce( 'group_messages' ), 'group_messages' );

		// Get Members list if "All Group Members" selected.
		if ( 'all' === $message_users ) {

			// Fetch all the group members.
			$args = array(
				'per_page'            => 9999999999999999999,
				'group_id'            => $group,
				'exclude'             => array( bp_loggedin_user_id() ),
				'exclude_admins_mods' => false,
			);

			$group_members = groups_get_group_members( $args );
			$members       = wp_list_pluck( $group_members['members'], 'ID' );

			// We get members array from $_POST['users_list'] because user already selected them.
		} else {
			$members = $users_list;
		}

		if ( empty( $group ) ) {
			return new WP_Error(
				'bp_rest_no_group_selected',
				__( 'Sorry, Group id is missing.', 'buddyboss' ),
				array(
					'status' => 400,
				)
			);
		}

		if ( empty( $members ) ) {
			return new WP_Error(
				'bp_rest_no_members_selected',
				__( 'Sorry, you have not selected any members.', 'buddyboss' ),
				array(
					'status' => 400,
				)
			);
		}

		$_POST            = array();
		$_POST['users']   = $message_users;
		$_POST['type']    = $message_type;
		$_POST['content'] = $message;
		$_POST['group']   = $group;

		// If "Group Thread" selected.
		if ( 'open' === $message_type ) {

			// "All Group Members" selected.
			if ( 'all' === $message_users ) {

				// Comma separated members list to find in meta query.
				$message_users_ids = implode( ',', $members );

				// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "message_users_ids".
				$_POST['message_meta_users_list'] = $message_users_ids;

				$group_thread                 = groups_get_groupmeta( (int) $group, 'group_message_thread' );
				$is_deleted                   = false;
				$group_thread_id              = '';
				$_POST['message_thread_type'] = '';

				if ( '' !== $group_thread ) {
					// phpcs:ignore
					$total_threads = $wpdb->get_results( $wpdb->prepare( "SELECT is_deleted FROM {$bp->messages->table_name_recipients} WHERE thread_id = %d", (int) $group_thread ) ); // db call ok; no-cache ok;
					foreach ( $total_threads as $thread ) {
						if ( 1 === (int) $thread->is_deleted ) {
							$is_deleted = true;
							break;
						}
					}

					if ( $is_deleted || empty( $total_threads ) ) {
						// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
						$_POST['message_thread_type'] = 'new';
					}
				}

				if ( '' !== $group_thread && ! $is_deleted && isset( $_POST['message_thread_type'] ) && empty( $_POST['message_thread_type'] ) ) {
					// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
					$_POST['message_thread_type'] = 'reply';
					$group_thread_id              = $group_thread;
				} else {

					// Backward compatibility when we dont store thread_id in group meta.
					$meta = array(
						array(
							'key'     => 'group_id',
							'value'   => $group,
							'compare' => '=',
						),
						array(
							'key'     => 'group_message_users',
							'value'   => 'all',
							'compare' => '=',
						),
						array(
							'key'     => 'group_message_type',
							'value'   => 'open',
							'compare' => '=',
						),
						array(
							'key'   => 'message_users_ids',
							'value' => $message_users_ids,
						),
					);

					// Check if there is already previously group thread created.
					if ( bp_has_message_threads(
						array( 'meta_query' => $meta ) // phpcs:ignore
					) ) {

						$thread_id = 0;

						while ( bp_message_threads() ) {
							bp_message_thread();
							$thread_id = bp_get_message_thread_id();

							if ( $thread_id ) {
								break;
							}
						}

						// If $thread_id found then add as a reply to that thread.
						if ( $thread_id ) {
							$group_thread_id = $thread_id;

							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'reply';

							// Create a new group thread.
						} else {
							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'new';
						}

						// Create a new group thread.
					} else {
						// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
						$_POST['message_thread_type'] = 'new';
					}
				}

				/**
				 * Create Message based on the `message_thread_type` and `group_thread_id`.
				 */
				if ( isset( $_POST['message_thread_type'] ) && 'new' === $_POST['message_thread_type'] ) {
					$send = $this->bp_rest_groups_messages_new_message(
						array(
							'recipients'    => $members,
							'subject'       => wp_trim_words( $message, messages_get_default_subject_length() ),
							'content'       => $message,
							'error_type'    => 'wp_error',
							'append_thread' => false,
						)
					);

					if ( ! is_wp_error( $send ) && ! empty( $send ) ) {
						groups_update_groupmeta( (int) $group, 'group_message_thread', $send );
					}

					return $this->bp_rest_groups_messages_validate_message( $send, $request );
				} elseif ( isset( $_POST['message_thread_type'] ) && 'reply' === $_POST['message_thread_type'] && ! empty( $group_thread_id ) ) {
					groups_update_groupmeta( (int) $group, 'group_message_thread', $group_thread_id );

					$new_reply = $this->bp_rest_groups_messages_new_message(
						array(
							'thread_id'    => $group_thread_id,
							'subject'      => ! empty( $message ) ? $message : ' ',
							'content'      => ! empty( $message ) ? $message : ' ',
							'date_sent'    => bp_core_current_time(),
							'mark_visible' => true,
							'error_type'   => 'wp_error',
						)
					);

					return $this->bp_rest_groups_messages_validate_message( $new_reply, $request );
				}

				// "Individual Members" Selected.
			} else {
				$meta = array(
					array(
						'key'     => 'group_message_type',
						'value'   => 'open',
						'compare' => '!=',
					),
				);

				$individual_thread_id         = 0;
				$_POST['message_thread_type'] = '';

				// Check if there is already previously individual group thread created.
				if ( bp_has_message_threads( array( 'meta_query' => $meta ) ) ) { // phpcs:ignore

					$thread_id = 0;

					while ( bp_message_threads() ) {
						bp_message_thread();
						$thread_id = bp_get_message_thread_id();

						if ( $thread_id ) {

							// get the thread recipients.
							$thread                     = new BP_Messages_Thread( $thread_id );
							$thread_recipients          = $thread->get_recipients();
							$previous_thread_recipients = array();

							// Store thread recipients to $previous_ids array.
							foreach ( $thread_recipients as $thread_recipient ) {
								if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
									$previous_thread_recipients[] = $thread_recipient->user_id;
								}
							}

							$current_recipients = array();
							$current_recipients = $members;
							$members_recipients = array();

							// Store current recipients to $members array.
							foreach ( $current_recipients as $single_recipients ) {
								$members_recipients[] = (int) $single_recipients;
							}

							// check both previous and current recipients are same.
							$is_recipient_match = ( is_array( $previous_thread_recipients ) && is_array( $members_recipients ) && count( $previous_thread_recipients ) === count( $members_recipients ) && array_diff( $previous_thread_recipients, $members_recipients ) === array_diff( $members_recipients, $previous_thread_recipients ) );

							$group_thread = (int) groups_get_groupmeta( (int) $group, 'group_message_thread' );

							// If recipients are matched.
							if ( $is_recipient_match && (int) $thread_id !== $group_thread ) {
								break;
							}
						}
					}

					// If $thread_id found then add as a reply to that thread.
					if ( $thread_id ) {
						// get the thread recipients.
						$thread                     = new BP_Messages_Thread( $thread_id );
						$thread_recipients          = $thread->get_recipients();
						$previous_thread_recipients = array();

						$last_message = BP_Messages_Thread::get_last_message( $thread_id );
						$message_type = bp_messages_get_meta( $last_message->id, 'group_message_users', true );

						// Store thread recipients to $previous_ids array.
						foreach ( $thread_recipients as $thread_recipient ) {
							if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
								$previous_thread_recipients[] = $thread_recipient->user_id;
							}
						}

						$current_recipients = array();
						$current_recipients = $members;
						$members_recipients = array();

						// Store current recipients to $members array.
						foreach ( $current_recipients as $single_recipients ) {
							$members_recipients[] = (int) $single_recipients;
						}

						// check both previous and current recipients are same.
						$is_recipient_match = ( is_array( $previous_thread_recipients ) && is_array( $members_recipients ) && count( $previous_thread_recipients ) === count( $members_recipients ) && array_diff( $previous_thread_recipients, $members_recipients ) === array_diff( $members_recipients, $previous_thread_recipients ) );

						$group_thread = (int) groups_get_groupmeta( (int) $group, 'group_message_thread' );

						// If recipients are matched.
						if ( $is_recipient_match && (int) $thread_id !== $group_thread ) {
							$individual_thread_id = $thread_id;

							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'reply';

							// Else recipients not matched.
						} else {
							$previous_threads = BP_Messages_Message::get_existing_threads( $members, bp_loggedin_user_id() );
							$existing_thread  = 0;
							if ( $previous_threads ) {
								foreach ( $previous_threads as $thread ) {

									$is_active_recipient = BP_Messages_Thread::is_thread_recipient( $thread->thread_id, bp_loggedin_user_id() );

									if ( $is_active_recipient ) {
										// get the thread recipients.
										$thread                     = new BP_Messages_Thread( $thread->thread_id );
										$thread_recipients          = $thread->get_recipients();
										$previous_thread_recipients = array();

										// Store thread recipients to $previous_ids array.
										foreach ( $thread_recipients as $thread_recipient ) {
											if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
												$previous_thread_recipients[] = $thread_recipient->user_id;
											}
										}

										$current_recipients = array();
										$current_recipients = $members;
										$members            = array();

										// Store current recipients to $members array.
										foreach ( $current_recipients as $single_recipients ) {
											$members[] = (int) $single_recipients;
										}

										// check both previous and current recipients are same.
										$is_recipient_match = ( is_array( $previous_thread_recipients ) && is_array( $members ) && count( $previous_thread_recipients ) === count( $members ) && array_diff( $previous_thread_recipients, $members ) === array_diff( $members, $previous_thread_recipients ) );

										// check any messages of this thread should not be a open & all.
										$message_ids  = wp_list_pluck( $thread->messages, 'id' );
										$add_existing = true;
										foreach ( $message_ids as $id ) {
											// group_message_users not open.
											$message_users = bp_messages_get_meta( $id, 'group_message_users', true ); // all - individual.
											if ( 'all' === $message_users ) {
												$add_existing = false;
												break;
											}
										}

										// If recipients are matched.
										if ( $is_recipient_match && $add_existing ) {
											$existing_thread = (int) $thread->thread_id;
										}
									}
								}

								if ( $existing_thread > 0 ) {
									$individual_thread_id = $existing_thread;

									// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
									$_POST['message_thread_type'] = 'reply';
								} else {
									// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
									$_POST['message_thread_type'] = 'new';
								}
							} else {
								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'new';
							}
						}
						// Else no thread found.
					} else {
						$previous_threads = BP_Messages_Message::get_existing_threads( $members, bp_loggedin_user_id() );
						$existing_thread  = 0;
						if ( $previous_threads ) {
							foreach ( $previous_threads as $thread ) {
								$is_active_recipient = BP_Messages_Thread::is_thread_recipient( $thread->thread_id, bp_loggedin_user_id() );
								if ( $is_active_recipient ) {

									// get the thread recipients.
									$thread                     = new BP_Messages_Thread( $thread->thread_id );
									$thread_recipients          = $thread->get_recipients();
									$previous_thread_recipients = array();

									// Store thread recipients to $previous_ids array.
									foreach ( $thread_recipients as $thread_recipient ) {
										if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
											$previous_thread_recipients[] = $thread_recipient->user_id;
										}
									}

									$current_recipients = array();
									$current_recipients = $members;
									$members            = array();

									// Store current recipients to $members array.
									foreach ( $current_recipients as $single_recipients ) {
										$members[] = (int) $single_recipients;
									}

									// check both previous and current recipients are same.
									$is_recipient_match = ( is_array( $previous_thread_recipients ) && is_array( $members ) && count( $previous_thread_recipients ) === count( $members ) && array_diff( $previous_thread_recipients, $members ) === array_diff( $members, $previous_thread_recipients ) );

									// check any messages of this thread should not be a open & all.
									$message_ids  = wp_list_pluck( $thread->messages, 'id' );
									$add_existing = true;
									foreach ( $message_ids as $id ) {
										// group_message_users not open.
										$message_users = bp_messages_get_meta( $id, 'group_message_users', true ); // all - individual.
										if ( 'all' === $message_users ) {
											$add_existing = false;
											break;
										}
									}

									// If recipients are matched.
									if ( $is_recipient_match && $add_existing ) {
										$existing_thread = (int) $thread->thread_id;
									}
								}
							}

							if ( $existing_thread > 0 ) {
								$individual_thread_id = $existing_thread;

								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'reply';
							} else {
								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'new';
							}
						} else {
							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'new';
						}
					}

					// Else no previous thread found.
				} else {
					$previous_threads = BP_Messages_Message::get_existing_threads( $members, bp_loggedin_user_id() );
					$existing_thread  = 0;

					if ( $previous_threads ) {
						foreach ( $previous_threads as $thread ) {

							$is_active_recipient = BP_Messages_Thread::is_thread_recipient( $thread->thread_id, bp_loggedin_user_id() );

							if ( $is_active_recipient ) {
								// get the thread recipients.
								$thread                     = new BP_Messages_Thread( $thread->thread_id );
								$thread_recipients          = $thread->get_recipients();
								$previous_thread_recipients = array();

								// Store thread recipients to $previous_ids array.
								foreach ( $thread_recipients as $thread_recipient ) {
									if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
										$previous_thread_recipients[] = $thread_recipient->user_id;
									}
								}

								$current_recipients = array();
								$current_recipients = $members;
								$members            = array();

								// Store current recipients to $members array.
								foreach ( $current_recipients as $single_recipients ) {
									$members[] = (int) $single_recipients;
								}

								// check both previous and current recipients are same.
								$is_recipient_match = ( is_array( $previous_thread_recipients ) && is_array( $members ) && count( $previous_thread_recipients ) === count( $members ) && array_diff( $previous_thread_recipients, $members ) === array_diff( $members, $previous_thread_recipients ) );

								// check any messages of this thread should not be a open & all.
								$message_ids  = wp_list_pluck( $thread->messages, 'id' );
								$add_existing = true;
								foreach ( $message_ids as $id ) {
									// group_message_users not open.
									$message_users = bp_messages_get_meta( $id, 'group_message_users', true ); // all - individual.
									if ( 'all' === $message_users ) {
										$add_existing = false;
										break;
									}
								}

								// If recipients are matched.
								if ( $is_recipient_match && $add_existing ) {
									$existing_thread = (int) $thread->thread_id;
								}
							}
						}

						if ( $existing_thread > 0 ) {
							$individual_thread_id = $existing_thread;

							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'reply';
						} else {
							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'new';
						}
					} else {
						// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
						$_POST['message_thread_type'] = 'new';
					}
				}

				/**
				 * Create Message based on the `message_thread_type` and `individual_thread_id`.
				 */
				if ( isset( $_POST['message_thread_type'] ) && 'new' === $_POST['message_thread_type'] ) {
					$send = $this->bp_rest_groups_messages_new_message(
						array(
							'recipients'    => $members,
							'subject'       => wp_trim_words( $message, messages_get_default_subject_length() ),
							'content'       => $message,
							'error_type'    => 'wp_error',
							'append_thread' => false,
						)
					);

					return $this->bp_rest_groups_messages_validate_message( $send, $request, 'individual' );
				} elseif ( isset( $_POST['message_thread_type'] ) && 'reply' === $_POST['message_thread_type'] && ! empty( $individual_thread_id ) ) {
					$new_reply = $this->bp_rest_groups_messages_new_message(
						array(
							'thread_id'    => $individual_thread_id,
							'subject'      => ! empty( $message ) ? $message : ' ',
							'content'      => ! empty( $message ) ? $message : ' ',
							'date_sent'    => bp_core_current_time(),
							'mark_visible' => true,
							'error_type'   => 'wp_error',
						)
					);

					return $this->bp_rest_groups_messages_validate_message( $new_reply, $request, 'individual' );
				}
			}

			// Else "Private Reply (BCC)" selected.
		} else {

			$all_members = $members;

			$messages_all = array();

			// We have to send Message to all members to "Individual" message in both cases like "All Group Members" OR "Individual Members" selected.
			foreach ( $members as $member ) {
				$meta = array(
					array(
						'key'     => 'group_message_type',
						'value'   => 'open',
						'compare' => '!=',
					),
				);

				$thread_loop_message_member = $member;
				$thread_loop_message_sent   = false;

				// Find existing thread which are private.
				if ( bp_has_message_threads( array( 'meta_query' => $meta ) ) ) { // phpcs:ignore

					$thread_id = 0;

					$member_thread_id = 0;

					while ( bp_message_threads() ) {
						bp_message_thread();

						$thread_id = bp_get_message_thread_id();

						if ( $thread_id ) {
							// get the thread recipients.
							$thread                     = new BP_Messages_Thread( $thread_id );
							$thread_recipients          = $thread->get_recipients();
							$previous_thread_recipients = array();

							// Store thread recipients to $previous_ids array.
							foreach ( $thread_recipients as $thread_recipient ) {
								if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
									$previous_thread_recipients[] = $thread_recipient->user_id;
								}
							}

							$current_recipients   = array();
							$current_recipients[] = $thread_loop_message_member;
							$member_arr           = array();

							// Store current recipients to $members array.
							foreach ( $current_recipients as $single_recipients ) {
								$member_arr[] = (int) $single_recipients;
							}

							$first_message = BP_Messages_Thread::get_first_message( $thread_id );
							$message_user  = bp_messages_get_meta( $first_message->id, 'group_message_users', true );
							$message_type  = bp_messages_get_meta( $first_message->id, 'group_message_type', true ); // open - private.

							// check both previous and current recipients are same.
							$is_recipient_match = ( $previous_thread_recipients === $member_arr );

							// If recipients are matched.
							if ( $is_recipient_match && 'all' !== $message_user ) {
								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'reply';
								$member_thread_id             = $thread_id;

								$thread_loop_message_sent = true;

								// If recipients then break the loop and go ahead because we don't need to check other threads.
								break;
							} elseif ( $is_recipient_match && 'all' === $message_user && 'open' !== $message_type ) {
								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'reply';
								$member_thread_id             = $thread_id;

								$thread_loop_message_sent = true;

								// If recipients then break the loop and go ahead because we don't need to check other threads.
								break;
							}
						}
					}

					// If there is no any thread matched.
					if ( false === $thread_loop_message_sent ) {
						$member_check     = array();
						$member_check[]   = $member;
						$member_check[]   = bp_loggedin_user_id();
						$previous_threads = BP_Messages_Message::get_existing_threads( $member_check, bp_loggedin_user_id() );
						$existing_thread  = 0;

						if ( $previous_threads ) {
							foreach ( $previous_threads as $thread ) {

								$is_active_recipient = BP_Messages_Thread::is_thread_recipient( $thread->thread_id, bp_loggedin_user_id() );

								if ( $is_active_recipient ) {
									// get the thread recipients.
									$thread                     = new BP_Messages_Thread( $thread->thread_id );
									$thread_recipients          = $thread->get_recipients();
									$previous_thread_recipients = array();

									// Store thread recipients to $previous_ids array.
									foreach ( $thread_recipients as $thread_recipient ) {
										if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
											$previous_thread_recipients[] = $thread_recipient->user_id;
										}
									}

									$current_recipients = array();
									if ( is_array( $member ) ) {
										$current_recipients = $member;
									} else {
										$current_recipients[] = $member;
									}
									$members = array();

									// Store current recipients to $members array.
									foreach ( $current_recipients as $single_recipients ) {
										$members[] = (int) $single_recipients;
									}

									$first_message = BP_Messages_Thread::get_first_message( $thread->thread_id );
									$message_user  = bp_messages_get_meta( $first_message->id, 'group_message_users', true );
									$message_type  = bp_messages_get_meta( $first_message->id, 'group_message_type', true ); // open - private.

									// check both previous and current recipients are same.
									$is_recipient_match = ( $previous_thread_recipients === $members );

									// If recipients are matched.
									if ( $is_recipient_match && 'all' !== $message_user ) {
										$existing_thread = (int) $thread->thread_id;
									} elseif ( $is_recipient_match && 'all' === $message_user && 'open' !== $message_type ) {
										$existing_thread = (int) $thread->thread_id;
									}
								}
							}

							if ( $existing_thread > 0 ) {
								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'reply';

								$member_thread_id = $existing_thread;

							} else {
								// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
								$_POST['message_thread_type'] = 'new';
							}
						} else {
							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'new';
						}
					}

					/**
					 * Create Message based on the `message_thread_type` and `member_thread_id`.
					 */
					if ( isset( $_POST['message_thread_type'] ) && 'new' === $_POST['message_thread_type'] ) {
						$messages_all[] = $this->bp_rest_groups_messages_new_message(
							array(
								'recipients'    => $member,
								'subject'       => wp_trim_words( $message, messages_get_default_subject_length() ),
								'content'       => $message,
								'error_type'    => 'wp_error',
								'is_hidden'     => true,
								'append_thread' => false,
							)
						);
					} elseif ( isset( $_POST['message_thread_type'] ) && 'reply' === $_POST['message_thread_type'] && ! empty( $member_thread_id ) ) {
						$messages_all[] = $this->bp_rest_groups_messages_new_message(
							array(
								'thread_id'    => $member_thread_id,
								'subject'      => ! empty( $message ) ? $message : ' ',
								'content'      => ! empty( $message ) ? $message : ' ',
								'date_sent'    => bp_core_current_time(),
								'mark_visible' => true,
								'error_type'   => 'wp_error',
							)
						);
					}
					// If no existing private thread found.
				} else {

					$member_check     = array();
					$member_check[]   = $member;
					$member_check[]   = bp_loggedin_user_id();
					$previous_threads = BP_Messages_Message::get_existing_threads( $member_check, bp_loggedin_user_id() );
					$existing_thread  = 0;
					$member_thread_id = 0;

					if ( $previous_threads ) {
						foreach ( $previous_threads as $thread ) {

							$is_active_recipient = BP_Messages_Thread::is_thread_recipient( $thread->thread_id, bp_loggedin_user_id() );

							if ( $is_active_recipient ) {

								// get the thread recipients.
								$thread                     = new BP_Messages_Thread( $thread->thread_id );
								$thread_recipients          = $thread->get_recipients();
								$previous_thread_recipients = array();

								// Store thread recipients to $previous_ids array.
								foreach ( $thread_recipients as $thread_recipient ) {
									if ( bp_loggedin_user_id() !== $thread_recipient->user_id ) {
										$previous_thread_recipients[] = $thread_recipient->user_id;
									}
								}

								$current_recipients = array();
								if ( is_array( $member ) ) {
									$current_recipients = $member;
								} else {
									$current_recipients[] = $member;
								}
								$members = array();

								// Store current recipients to $members array.
								foreach ( $current_recipients as $single_recipients ) {
									$members[] = (int) $single_recipients;
								}

								$first_message = BP_Messages_Thread::get_first_message( $thread->thread_id );
								$message_user  = bp_messages_get_meta( $first_message->id, 'group_message_users', true );
								$message_type  = bp_messages_get_meta( $first_message->id, 'group_message_type', true ); // open - private.

								// check both previous and current recipients are same.
								$is_recipient_match = ( $previous_thread_recipients === $members );

								// If recipients are matched.
								if ( $is_recipient_match && 'all' !== $message_user ) {
									$existing_thread = (int) $thread->thread_id;
								} elseif ( $is_recipient_match && 'all' === $message_user && 'open' !== $message_type ) {
									$existing_thread = (int) $thread->thread_id;
								}
							}
						}

						if ( $existing_thread > 0 ) {
							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'reply';

							$member_thread_id = $existing_thread;
						} else {
							// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
							$_POST['message_thread_type'] = 'new';
						}
					} else {
						// This post variable will using in "bp_media_messages_save_group_data" function for storing message meta "group_message_thread_type".
						$_POST['message_thread_type'] = 'new';
					}

					/**
					 * Create Message based on the `message_thread_type` and `member_thread_id`.
					 */
					if ( isset( $_POST['message_thread_type'] ) && 'new' === $_POST['message_thread_type'] ) {
						$messages_all[] = $this->bp_rest_groups_messages_new_message(
							array(
								'recipients'    => $member,
								'subject'       => wp_trim_words( $message, messages_get_default_subject_length() ),
								'content'       => $message,
								'error_type'    => 'wp_error',
								'is_hidden'     => true,
								'append_thread' => false,
							)
						);
					} elseif ( isset( $_POST['message_thread_type'] ) && 'reply' === $_POST['message_thread_type'] && ! empty( $member_thread_id ) ) {
						$messages_all[] = $this->bp_rest_groups_messages_new_message(
							array(
								'thread_id'    => $member_thread_id,
								'subject'      => ! empty( $message ) ? $message : ' ',
								'content'      => ! empty( $message ) ? $message : ' ',
								'date_sent'    => $date_sent = bp_core_current_time(),
								'mark_visible' => true,
								'error_type'   => 'wp_error',
							)
						);
					}
				}
			}

			$error = array();

			$retval = array(
				'message' => '',
				'errors'  => array(),
				'data'    => array(),
			);

			if ( 'all' !== $message_users ) {
				$retval['message'] = sprintf(
				/* translators: Message member count. */
					__( 'Your message was sent privately to %s members of this group.', 'buddyboss' ),
					count( $all_members )
				);
			} else {
				$retval['message'] = __( 'Your message was sent privately to all members of this group.', 'buddyboss' );
			}

			if ( ! empty( $messages_all ) ) {
				foreach ( $messages_all as $message ) {
					if ( is_wp_error( $message ) ) {
						$error[] = $message->get_error_message();
					} else {
						$thread = new BP_Messages_Thread( (int) $message );

						$last_message  = wp_list_filter( $thread->messages, array( 'id' => $thread->last_message_id ) );
						$last_message  = reset( $last_message );
						$fields_update = $this->update_additional_fields_for_object( $last_message, $request );

						if ( is_wp_error( $fields_update ) ) {
							$error[] = $fields_update;
						}

						$retval['data'][] = $this->prepare_response_for_collection(
							$this->message_endppoint->prepare_item_for_response( $thread, $request )
						);
					}
				}
			}

			if ( ! empty( $error ) ) {
				$retval['errors'] = $error;
			}

			$response = rest_ensure_response( $retval );

			/**
			 * Fires after a thread is fetched via the REST API.
			 *
			 * @param BP_Messages_Box_Template $messages_box Fetched thread.
			 * @param WP_REST_Response         $response     The response data.
			 * @param WP_REST_Request          $request      The request sent to the API.
			 *
			 * @since 0.1.0
			 */
			do_action( 'bp_rest_group_messages_create_items', $message, $response, $request );

			return $response;

		}
	}

	/**
	 * Check if a given request has access to create a message.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return WP_Error|bool
	 * @since 0.1.0
	 */
	public function create_item_permissions_check( $request ) {
		$retval = true;

		if ( ! is_user_logged_in() ) {
			$retval = new WP_Error(
				'bp_rest_authorization_required',
				__( 'Sorry, you need to be logged in to create a group message.', 'buddyboss' ),
				array(
					'status' => rest_authorization_required_code(),
				)
			);
		}

		if ( true === $retval && function_exists( 'bp_disable_group_messages' ) && false === bp_disable_group_messages() ) {
			$retval = new WP_Error(
				'bp_rest_authorization_required',
				__( 'Sorry, you are not allowed to create a group message.', 'buddyboss' ),
				array(
					'status' => rest_authorization_required_code(),
				)
			);
		}

		/**
		 * Filter the messages `create_item` permissions check.
		 *
		 * @param bool|WP_Error   $retval  Returned value.
		 * @param WP_REST_Request $request The request sent to the API.
		 *
		 * @since 0.1.0
		 */
		return apply_filters( 'bp_rest_messages_group_create_item_permissions_check', $retval, $request );
	}

	/**
	 * Get the message schema, conforming to JSON Schema.
	 *
	 * @return array
	 * @since 0.1.0
	 */
	public function get_item_schema() {
		$schema = array(
			'$schema'    => 'http://json-schema.org/draft-04/schema#',
			'title'      => 'bp_messages',
			'type'       => 'object',
			'properties' => array(
				'message' => array(
					'context'     => array( 'embed', 'view', 'edit' ),
					'description' => __( 'Information for the user.', 'buddyboss' ),
					'type'        => 'string',
				),
				'data'    => array(
					'context'     => array( 'embed', 'view', 'edit' ),
					'description' => __( 'Message thread', 'buddyboss' ),
					'readonly'    => true,
					'type'        => 'object',
					'properties'  => array(),
				),
			),
		);

		$schema['properties']['data']['properties'] = $this->message_endppoint->get_item_schema()['properties'];

		/**
		 * Filters the message schema.
		 *
		 * @param array $schema The endpoint schema.
		 *
		 * @since 0.1.0
		 */
		return apply_filters( 'bp_rest_message_schema', $this->add_additional_fields_schema( $schema ) );
	}

	/**
	 * Get the query params for Messages collections.
	 *
	 * @return array
	 * @since 0.1.0
	 */
	public function get_collection_params() {
		$params                       = parent::get_collection_params();
		$params['context']['default'] = 'edit';
		unset( $params['page'], $params['per_page'], $params['search'] );

		$params['group_id'] = array(
			'description'       => __( 'A unique numeric ID for the Group.', 'buddyboss' ),
			'type'              => 'integer',
			'required'          => true,
			'sanitize_callback' => 'absint',
			'validate_callback' => 'rest_validate_request_arg',
		);

		$params['message'] = array(
			'description'       => __( 'Content of the Message to add to the Thread.', 'buddyboss' ),
			'type'              => 'string',
			'required'          => true,
			'validate_callback' => 'rest_validate_request_arg',
		);

		$params['users'] = array(
			'description'       => __( 'Group thread users individual or all.', 'buddyboss' ),
			'type'              => 'string',
			'required'          => true,
			'enum'              => array( 'all', 'individual' ),
			'validate_callback' => 'rest_validate_request_arg',
		);

		$params['users_list'] = array(
			'description'       => __( 'Limit result to messages created by a specific user.', 'buddyboss' ),
			'type'              => 'array',
			'items'             => array( 'type' => 'integer' ),
			'sanitize_callback' => 'bp_rest_sanitize_string_list',
			'validate_callback' => 'rest_validate_request_arg',
		);

		$params['type'] = array(
			'description'       => __( 'Type of message, Group thread or private reply.', 'buddyboss' ),
			'type'              => 'string',
			'required'          => true,
			'enum'              => array( 'open', 'private' ),
			'validate_callback' => 'rest_validate_request_arg',
		);

		/**
		 * Filters the collection query params.
		 *
		 * @param array $params Query params.
		 */
		return apply_filters( 'bp_rest_messages_group_collection_params', $params );
	}


	/**
	 * Create New Group Message.
	 * -- from bp_groups_messages_new_message();
	 *
	 * @param array|string $args         {
	 *                                   Array of arguments.
	 *
	 * @type int           $sender_id    Optional. ID of the user who is sending the
	 *                                 message. Default: ID of the logged-in user.
	 * @type int           $thread_id    Optional. ID of the parent thread. Leave blank to
	 *                                 create a new thread for the message.
	 * @type array         $recipients   IDs or usernames of message recipients. If this
	 *                                 is an existing thread, it is unnecessary to pass a $recipients
	 *                                 argument - existing thread recipients will be assumed.
	 * @type string        $subject      Optional. Subject line for the message. For
	 *                                 existing threads, the existing subject will be used. For new
	 *                                 threads, 'No Subject' will be used if no $subject is provided.
	 * @type string        $content      Content of the message. Cannot be empty.
	 * @type string        $date_sent    Date sent, in 'Y-m-d H:i:s' format. Default: current date/time.
	 * @type bool          $is_hidden    Optional. Whether to hide the thread from sender messages inbox or not. Default: false.
	 * @type bool          $mark_visible Optional. Whether to mark thread visible to all other participants. Default: false.
	 * @type string        $error_type   Optional. Error type. Either 'bool' or 'wp_error'. Default: 'bool'.
	 * }
	 *
	 * @return int|bool|WP_Error ID of the message thread on success, false on failure.
	 */
	public function bp_rest_groups_messages_new_message( $args = '' ) {
		$send = '';
		remove_action( 'messages_message_sent', 'messages_notification_new_message', 10 );
		add_action( 'messages_message_sent', 'group_messages_notification_new_message', 10 );

		$r = bp_parse_args(
			$args,
			array(
				'sender_id'     => bp_loggedin_user_id(),
				'thread_id'     => false,   // False for a new message, thread id for a reply to a thread.
				'recipients'    => array(), // Can be an array of usernames, user_ids or mixed.
				'subject'       => false,
				'content'       => false,
				'date_sent'     => bp_core_current_time(),
				'append_thread' => false,
				'is_hidden'     => false,
				'mark_visible'  => false,
				'group_thread'  => true,
				'error_type'    => 'wp_error',
			),
			'bp_groups_messages_new_message'
		);

		// Attempt to send the message.
		$send = messages_new_message( $r );

		remove_action( 'messages_message_sent', 'group_messages_notification_new_message', 10 );
		add_action( 'messages_message_sent', 'messages_notification_new_message', 10 );

		return $send;
	}

	/**
	 * Check group message has been successfully sent or not.
	 * - bp_groups_messages_validate_message();
	 *
	 * @param mixed           $send    int|bool|WP_Error.
	 * @param WP_REST_Request $request Rest request.
	 * @param string          $type    Type of the message `all` or `individual`.
	 *
	 * @return WP_Error
	 */
	public function bp_rest_groups_messages_validate_message( $send, $request, $type = 'all' ) {
		if ( is_wp_error( $send ) ) {
			return new WP_Error(
				'bp_rest_unknown_error',
				$send->get_error_message(),
				array(
					'status' => rest_authorization_required_code(),
				)
			);
		} elseif ( ! empty( $send ) ) {
			$thread = new BP_Messages_Thread( (int) $send );

			$recipients_count = ( count( $thread->recipients ) > 1 ? count( $thread->recipients ) - ( isset( $request['user_id'] ) && ! empty( $request['user_id'] ) ? 1 : 0 ) : 0 );

			if ( 'individual' === $type ) {
				$retval['message'] = sprintf(
				/* translators: Message member count. */
					__( 'Your message was sent to %s members of this group.', 'buddyboss' ),
					$recipients_count
				);
			} else {
				$retval['message'] = __( 'Your message was sent to all members of this group.', 'buddyboss' );
			}

			$last_message  = wp_list_filter( $thread->messages, array( 'id' => $thread->last_message_id ) );
			$last_message  = reset( $last_message );
			$fields_update = $this->update_additional_fields_for_object( $last_message, $request );

			if ( is_wp_error( $fields_update ) ) {
				return $fields_update;
			}

			$retval['data'][] = $this->prepare_response_for_collection(
				$this->message_endppoint->prepare_item_for_response( $thread, $request )
			);

			$response = rest_ensure_response( $retval );

			/**
			 * Fires after a thread is fetched via the REST API.
			 *
			 * @param BP_Messages_Box_Template $messages_box Fetched thread.
			 * @param WP_REST_Response         $response     The response data.
			 * @param WP_REST_Request          $request      The request sent to the API.
			 *
			 * @since 0.1.0
			 */
			do_action( 'bp_rest_group_messages_create_items', $thread, $response, $request );

			return $response;
		}
	}
}
