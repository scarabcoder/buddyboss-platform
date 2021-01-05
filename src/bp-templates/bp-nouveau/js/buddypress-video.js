/* jshint browser: true */
/* global bp, BP_Nouveau, Dropzone, videojs */
/* @version 1.0.0 */
window.bp = window.bp || {};

( function ( exports, $ ) {

	// Bail if not set.
	if ( typeof BP_Nouveau === 'undefined' ) {
		return;
	}

	bp.Nouveau = bp.Nouveau || {};

	/**
	 * [Video description]
	 *
	 * @type {Object}
	 */
	bp.Nouveau.Video = {

		/**
		 * [start description]
		 *
		 * @return {[type]} [description]
		 */
		start: function () {

			this.setupGlobals();

			// Listen to events ("Add hooks!").
			this.addListeners();

		},

		/**
		 * [setupGlobals description]
		 *
		 * @return {[type]} [description]
		 */
		setupGlobals: function () {

			var bodySelector = $( 'body' );

			this.current_page             = 1;
			this.video_dropzone_obj       = null;
			this.video_thumb_dropzone_obj = [];
			this.dropzone_video           = [];
			this.dropzone_video_thumb     = [];
			this.video_album_id           = typeof BP_Nouveau.video.album_id !== 'undefined' ? BP_Nouveau.video.album_id : false;

			if ( ! this.video_album_id && parseInt( BP_Nouveau.media.current_album ) > 0 ) {
				this.video_album_id = parseInt( BP_Nouveau.media.current_album );
			}

			this.video_group_id = typeof BP_Nouveau.video.group_id !== 'undefined' ? BP_Nouveau.video.group_id : false;
			this.current_tab    = bodySelector.hasClass( 'single-topic' ) || bodySelector.hasClass( 'single-forum' ) ? false : 'bp-video-dropzone-content';

			// set up dropzones auto discover to false so it does not automatically set dropzones.
			if ( typeof window.Dropzone !== 'undefined' ) {
				window.Dropzone.autoDiscover = false;
			}

			this.videoOptions = {
				url: BP_Nouveau.ajaxurl,
				timeout: 3 * 60 * 60 * 1000,
				dictFileTooBig: BP_Nouveau.video.dictFileTooBig,
				acceptedFiles: BP_Nouveau.video.video_type,
				createImageThumbnails: false,
				dictDefaultMessage: BP_Nouveau.video.dropzone_video_message,
				autoProcessQueue: true,
				addRemoveLinks: true,
				uploadMultiple: false,
				maxFiles: typeof BP_Nouveau.video.maxFiles !== 'undefined' ? BP_Nouveau.video.maxFiles : 10,
				maxFilesize: typeof BP_Nouveau.video.max_upload_size !== 'undefined' ? BP_Nouveau.video.max_upload_size : 2,
				dictInvalidFileType: BP_Nouveau.video.dictInvalidFileType,
			};

			this.videoThumbnailOptions = {
				url: BP_Nouveau.ajaxurl,
				timeout: 3 * 60 * 60 * 1000,
				dictFileTooBig: BP_Nouveau.video.dictFileTooBig,
				dictDefaultMessage: BP_Nouveau.video.dropzone_video_thumbnail_message,
				acceptedFiles: 'image/jpeg,image/png',
				autoProcessQueue: true,
				addRemoveLinks: true,
				uploadMultiple: false,
				maxFiles: 1,
				maxFilesize: typeof BP_Nouveau.video.max_upload_size !== 'undefined' ? BP_Nouveau.video.max_upload_size : 2,
				dictMaxFilesExceeded: BP_Nouveau.video.video_dict_file_exceeded,
			};

			// if defined, add custom dropzone options.
			if ( typeof BP_Nouveau.video.dropzone_options !== 'undefined' ) {
				Object.assign( this.options, BP_Nouveau.video.dropzone_options );
			}

		},

		/**
		 * [addListeners description]
		 */
		addListeners: function () {
			var bpNouveau = $( '.bp-nouveau' );

			$( document ).on( 'click', '#bp-add-video', this.openUploader.bind( this ) );
			$( document ).on( 'click', '.bp-video-thumbnail-submit', this.submitVideoThumbnail.bind( this ) );
			$( document ).on( 'click', '.ac-video-thumbnail-edit', this.openEditThumbnailUploader.bind( this ) );
			$( document ).on( 'click', '.bp-video-thumbnail-uploader-close', this.closeEditThumbnailUploader.bind( this ) );
			$( document ).on( 'click', '#bp-video-uploader-close', this.closeUploader.bind( this ) );
			$( document ).on( 'click', '#bp-video-submit', this.submitVideo.bind( this ) );
			$( document ).on( 'click', '.bp-video-uploader .modal-container .bb-field-uploader-actions', this.uploadVideoNavigate.bind( this ) );
			$( document ).on( 'click', '.bb-activity-video-elem .video-action-wrap .video-action_more, #video-stream.video .bb-item-thumb .video-action-wrap .video-action_more, #media-stream.media .bb-video-thumb .video-action-wrap .video-action_more, .bb-activity-video-elem .video-action-wrap .video-action_list li a', this.videoActivityActionButton.bind( this ) );
			$( document ).on( 'click', '.activity .bp-video-move-activity, #media-stream .bp-video-move-activity, #video-stream .bp-video-move-activity', this.moveVideoIntoAlbum.bind( this ) );
			$( document ).on( 'click', '.bp-video-open-create-popup-album', this.createAlbumInPopup.bind( this ) );
			$( document ).on( 'click', '.ac-video-close-button', this.closeVideoMove.bind( this ) );
			$( document ).on( 'click', '.ac-video-move', this.openVideoMove.bind( this ) );
			$( document ).on( 'change', '.bb-video-check-wrap [name="bb-video-select"]', this.addSelectedClassToWrapper.bind( this ) );
			$( document ).on( 'click', '#bb-select-deselect-all-video', this.toggleSelectAllVideo.bind( this ) );
			$( document ).on( 'click', '.video-action_list .edit_video', this.editVideo.bind( this ) );
			$( document ).on( 'click', '.video-action_list .video-file-delete, #bb-delete-video', this.deleteVideo.bind( this ) );

			// Video Album, Video Directory.
			bpNouveau.on( 'click', '#bb-create-video-album', this.openCreateVideoAlbumModal.bind( this ) );
			bpNouveau.on( 'click', '#bp-video-create-album-close', this.closeCreateVideoAlbumModal.bind( this ) );
			$( document ).on( 'click', '#bp-video-create-album-submit', this.saveAlbum.bind( this ) );
			// Video Load More
			$( '.bp-nouveau [data-bp-list="video"]' ).on( 'click', 'li.load-more', this.injectVideos.bind( this ) );

			// Create Album.
			$( document ).on( 'click', '.bp-video-create-popup-album-submit', this.submitCreateAlbumInPopup.bind( this ) );

		},

		submitVideoThumbnail: function ( event ) {
			var self   = this,
				target = $( event.currentTarget ),
				data;
			event.preventDefault();

			if ( target.hasClass( 'saving' ) ) {
				return false;
			}

			target.addClass( 'saving' );

			var videoId                  = $( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-edit-thumbnail-hidden-video-id' ).val();
			var videoAttachmentId        = $( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-edit-thumbnail-hidden-attachment-id' ).val();
			var videoCheckedAttachmentId = $( '.bp-video-thumbnail-uploader.opened-edit-thumbnail input[type="radio"]:checked' ).val();

			data = {
				'action': 'video_thumbnail_save',
				'_wpnonce': BP_Nouveau.nonces.video,
				'video_thumbnail': self.dropzone_video_thumb,
				'video_id': videoId,
				'video_attachment_id': videoAttachmentId,
				'video_default_id': videoCheckedAttachmentId,
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data,
					success: function ( response ) {
						if ( response.success ) {
							if( $( '.bb-activity-video-elem a.bb-video-cover-wrap[data-id="' + videoId + '"]' ).find( 'img' ).length ) {
								$( '.bb-activity-video-elem a.bb-video-cover-wrap[data-id="' + videoId + '"]' ).find( 'img' ).attr( 'src', response.data.thumbnail );
							}
							if( $( '.bb-activity-video-elem .video-js[data-id="' + videoId + '"]' ).find( '.vjs-poster' ).length ) {
								$( '.bb-activity-video-elem .video-js[data-id="' + videoId + '"]' ).attr( 'poster', response.data.thumbnail );
								$( '.bb-activity-video-elem .video-js[data-id="' + videoId + '"]' ).find('video').attr( 'poster', response.data.thumbnail );
								$( '.bb-activity-video-elem .video-js[data-id="' + videoId + '"]' ).find( '.vjs-poster' ).css( 'background-image', 'url("' + response.data.thumbnail + '")' );
							}
							for ( var i = 0; i < self.dropzone_video_thumb.length; i++ ) {
								self.dropzone_video_thumb[ i ].saved = true;
							}
							self.closeEditThumbnailUploader( event );
						}
						target.removeClass( 'saving' );
					}
				}
			);
		},

		uploadVideoNavigate: function ( event ) {

			event.preventDefault();

			var target = $( event.currentTarget ), currentPopup = $( target ).closest( '#bp-video-uploader' );

			if ( $( target ).hasClass( 'bb-field-uploader-next' ) ) {
				currentPopup.find( '.bb-field-steps-1' ).slideUp( 200 ).siblings( '.bb-field-steps' ).slideDown( 200 );
				currentPopup.find( '#bp-video-submit, #bp-video-prev, .bp-video-open-create-popup-album, #bb-video-privacy' ).show();
				if ( Number( $( currentPopup ).find( '.bb-album-selected-id' ) ) !== 0 && $( currentPopup ).find( '.location-album-list li.is_active' ).length ) {
					$( currentPopup ).find( '.location-album-list' ).scrollTop( $( currentPopup ).find( '.location-album-list li.is_active' ).offset().top - $( currentPopup ).find( '.location-album-list' ).offset().top );
				}
				$( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span:not(.hidden)' ).each( function ( i ) {
					if ( i > 0 ) {
						if ( $( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item' ).width() > $( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb' ).width() ) {
							$( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span.hidden' ).append( $( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span' ).eq( 2 ) );

							if ( !$( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item .more_options' ).length ) {
								$( '<span class="more_options">...</span>' ).insertAfter( $( currentPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span' ).eq( 0 ) );
							}

						}
					}
				} );
			} else {
				$( target ).hide();
				currentPopup.find( '#bp-video-prev, .bp-video-open-create-popup-album' ).hide();
				currentPopup.find( '.bb-field-steps-2' ).slideUp( 200 ).siblings( '.bb-field-steps' ).slideDown( 200 );
				if ( currentPopup.closest( '#bp-media-single-folder' ).length ) {
					$( '#bb-video-privacy' ).hide();
				}
			}

		},

		/**
		 * Video Activity action Button
		 */
		videoActivityActionButton: function ( event ) {
			event.preventDefault();

			$( event.currentTarget ).closest( '.bb-activity-video-elem' ).toggleClass( 'is-visible' ).siblings().removeClass( 'is-visible' ).closest( '.activity-item' ).siblings().find( '.bb-activity-video-elem' ).removeClass( 'is-visible' );

			if ( $( event.currentTarget ).closest( '.bb-activity-video-elem' ).length < 1 ) {
				$( event.currentTarget ).closest( '.bb-video-thumb' ).toggleClass( 'is-visible' ).parent().siblings().find( '.bb-video-thumb' ).removeClass( 'is-visible' );
			}

			if ( event.currentTarget.tagName.toLowerCase() == 'a' && ( ! $( event.currentTarget ).hasClass( 'video-action_more' ) ) ) {
				$( event.currentTarget ).closest( '.bb-activity-video-elem' ).removeClass( 'is-visible' );
				$( event.currentTarget ).closest( '.bb-item-thumb' ).removeClass( 'is-visible' );
			}
		},

		toggleSelectAllVideo: function ( event ) {
			event.preventDefault();

			if ( $( event.currentTarget ).hasClass( 'selected' ) ) {
				$( event.currentTarget ).data( 'bp-tooltip', BP_Nouveau.media.i18n_strings.selectall );
				this.deselectAllVideo( event );
			} else {
				$( event.currentTarget ).data( 'bp-tooltip', BP_Nouveau.media.i18n_strings.unselectall );
				this.selectAllVideo( event );
			}

			$( event.currentTarget ).toggleClass( 'selected' );
		},

		selectAllVideo: function ( event ) {
			event.preventDefault();

			$( '#buddypress' ).find( '#video-stream li' ).find( '.bb-video-check-wrap [name="bb-video-select"]' ).each(
				function () {
					$( this ).prop( 'checked', true );
					$( this ).closest( '.bb-item-thumb' ).addClass( 'selected' );
					$( this ).closest( '.bb-video-check-wrap' ).find( '.bp-tooltip' ).attr( 'data-bp-tooltip', BP_Nouveau.media.i18n_strings.unselect );
				}
			);
		},

		deselectAllVideo: function ( event ) {
			event.preventDefault();

			$( '#buddypress' ).find( '#video-stream li' ).find( '.bb-video-check-wrap [name="bb-video-select"]' ).each(
				function () {
					$( this ).prop( 'checked', false );
					$( this ).closest( '.bb-item-thumb' ).removeClass( 'selected' );
					$( this ).closest( '.bb-video-check-wrap' ).find( '.bp-tooltip' ).attr( 'data-bp-tooltip', BP_Nouveau.media.i18n_strings.select );
				}
			);
		},

		addSelectedClassToWrapper: function ( event ) {
			var target = event.currentTarget;
			if ( $( target ).is( ':checked' ) ) {
				$( target ).closest( '.bb-video-check-wrap' ).find( '.bp-tooltip' ).attr( 'data-bp-tooltip', BP_Nouveau.media.i18n_strings.unselect );
				$( target ).closest( '.bb-item-thumb' ).addClass( 'selected' );
			} else {
				$( target ).closest( '.bb-item-thumb' ).removeClass( 'selected' );
				$( target ).closest( '.bb-video-check-wrap' ).find( '.bp-tooltip' ).attr( 'data-bp-tooltip', BP_Nouveau.media.i18n_strings.select );

				var selectAllVideo = $( '.bp-nouveau #bb-select-deselect-all-video' );
				if ( selectAllVideo.hasClass( 'selected' ) ) {
					selectAllVideo.removeClass( 'selected' );
				}
			}
		},

		submitVideo: function ( event ) {
			var self = this, target = $( event.currentTarget ), data, privacy = $( '#bb-video-privacy' );
			event.preventDefault();

			if ( target.hasClass( 'saving' ) ) {
				return false;
			}

			target.addClass( 'saving' );

			if ( self.current_tab === 'bp-video-dropzone-content' ) {

				var post_content = $( '#bp-video-post-content' ).val();

				var targetPopup = $( event.currentTarget ).closest( '.open-popup' );
				var selectedAlbum = targetPopup.find( '.bb-album-selected-id' ).val();
				var hasNotAlbum = true;
				if ( selectedAlbum.length && parseInt( selectedAlbum ) > 0 ) {
					hasNotAlbum = false;
					selectedAlbum = selectedAlbum;
					for ( var i = 0; i < self.dropzone_video.length; i++ ) {
						self.dropzone_video[ i ].album_id = selectedAlbum;
					}

				} else {
					selectedAlbum = self.album_id;
				}

				data             = {
					'action': 'video_save',
					'_wpnonce': BP_Nouveau.nonces.video,
					'videos': self.dropzone_video,
					'content': post_content,
					'album_id': selectedAlbum,
					'group_id': self.video_group_id,
					'privacy': privacy.val()
				};

				$( '#bp-video-dropzone-content .bp-feedback' ).remove();

				$.ajax(
					{
						type: 'POST',
						url: BP_Nouveau.ajaxurl,
						data: data,
						success: function ( response ) {
							if ( response.success ) {

								if ( $( '#bp-media-single-album' ).length ) {
									// Prepend in Single Album

									if ( ! $( '#media-stream ul.media-list' ).length ) {
										$( '#media-stream' ).html(
											$( '<ul></ul>' ).
											addClass( 'media-list item-list bp-list bb-photo-list grid' )
										);
										$( '.bb-videos-actions' ).show();
									}

									// Prepend the activity.
									bp.Nouveau.inject( '#media-stream ul.media-list', response.data.video, 'prepend' );

								} else {

									// It's the very first media, let's make sure the container can welcome it!
									if ( ! $( '#video-stream ul.video-list' ).length ) {
										$( '#video-stream' ).html(
											$( '<ul></ul>' ).
											addClass( 'video-list item-list bp-list bb-video-list grid' )
										);
										$( '.bb-videos-actions' ).show();
									}

									// Prepend the activity.
									bp.Nouveau.inject( '#video-stream ul.video-list', response.data.video, 'prepend' );

								}

								for ( var i = 0; i < self.dropzone_video.length; i++ ) {
									self.dropzone_video[ i ].saved = true;
								}

								self.closeUploader( event );

								// replace dummy image with original image by faking scroll event to call bp.Nouveau.lazyLoad.
								jQuery( window ).scroll();

							} else {
								$( '#bp-video-dropzone-content' ).prepend( response.data.feedback );
							}

							target.removeClass( 'saving' );
						}
					}
				);

			} else if ( self.current_tab === 'bp-existing-video-content' ) {
				var selected = [];
				$( '.bp-existing-video-wrap .bb-video-check-wrap [name="bb-video-select"]:checked' ).each(
					function () {
						selected.push( $( this ).val() );
					}
				);
				data = {
					'action': 'video_move_to_album',
					'_wpnonce': BP_Nouveau.nonces.video,
					'medias': selected,
					'album_id': self.video_album_id,
					'group_id': self.video_group_id
				};

				$( '#bp-existing-video-content .bp-feedback' ).remove();

				$.ajax(
					{
						type: 'POST',
						url: BP_Nouveau.ajaxurl,
						data: data,
						success: function ( response ) {
							if ( response.success ) {

								// It's the very first media, let's make sure the container can welcome it!
								if ( ! $( '#video-stream ul.media-list' ).length ) {
									$( '#video-stream' ).html( $( '<ul></ul>' ).addClass( 'video-list item-list bp-list bb-video-list grid' ) );
									$( '.bb-video-actions' ).show();
								}

								// Prepend the activity.
								bp.Nouveau.inject( '#video-stream ul.video-list', response.data.video, 'prepend' );

								// remove selected media from existing media list.
								$( '.bp-existing-video-wrap .bb-video-check-wrap [name="bb-video-select"]:checked' ).each(
									function () {
										if ( $( this ).closest( 'li' ).data( 'id' ) === $( this ).val() ) {
											$( this ).closest( 'li' ).remove();
										}
									}
								);

								jQuery( window ).scroll();

								self.closeUploader( event );
							} else {
								$( '#bp-existing-video-content' ).prepend( response.data.feedback );
							}

							target.removeClass( 'saving' );
						}
					}
				);
			} else if ( ! self.current_tab ) {
				self.closeUploader( event );
				target.removeClass( 'saving' );
			}

		},

		clearFolderLocationUI: function ( event ) {

			var closest_parent = jQuery( event.currentTarget ).closest( '.has-folderlocationUI' );
			if ( closest_parent.length > 0 ) {

				closest_parent.find( '.location-album-list-wrap-main .location-album-list-wrap .location-album-list li' ).each(
					function () {
						jQuery( this ).removeClass( 'is_active' ).find( 'span.selected:not(.disabled)' ).removeClass( 'selected' );
						jQuery( this ).find( 'ul' ).hide();
					}
				);

				closest_parent.find( '.location-album-list-wrap-main .location-album-list-wrap .location-album-list li' ).show().children( 'span, i' ).show();
				closest_parent.find( '.location-folder-title' ).text( BP_Nouveau.video.target_text );
				closest_parent.find( '.location-folder-back' ).hide().closest( '.has-folderlocationUI' ).find( '.bb-folder-selected-id' ).val( '0' );
				closest_parent.find( '.ac_document_search_folder' ).val( '' );
				closest_parent.find( '.bb-model-header h4 span' ).text( '...' );
				closest_parent.find( '.ac_document_search_folder_list ul' ).html( '' ).parent().hide().siblings( '.location-album-list-wrap' ).find( '.location-album-list' ).show();
			}
		},

		openUploader: function ( event ) {
			var self = this;
			var currentTarget;
			var parentsOpen;
			event.preventDefault();

			this.moveToIdPopup = BP_Nouveau.video.move_to_id_popup;
			this.moveToTypePopup = BP_Nouveau.video.current_type;

			if ( typeof window.Dropzone !== 'undefined' && $( 'div.video-uploader-wrapper #video-uploader' ).length ) {

				$( '#bp-video-uploader' ).show();

				if ( $( '#bp-video-uploader' ).find( '.bb-field-steps.bb-field-steps-2' ).length ) {
					currentTarget = '#bp-video-uploader.bp-video-uploader';
					if ( Number( $( currentTarget ).find( '.bb-album-selected-id' ).data( 'value' ) ) !== 0 ) {
						parentsOpen = $( currentTarget ).find( '.bb-album-selected-id' ).data( 'value' );
						$( currentTarget ).find( '#bb-video-privacy' ).prop( 'disabled', true );
					} else {
						parentsOpen = 0;
					}
					if ( '' !== this.moveToIdPopup ) {
						$.ajax(
							{
								url: BP_Nouveau.ajaxurl,
								type: 'post',
								data: {
									action: 'media_get_album_view',
									id: this.moveToIdPopup,
									type: this.moveToTypePopup,
								}, success: function ( response ) {
									$( document ).find( '.location-album-list-wrap h4 span.where-to-move-profile-or-group-media' ).html( response.data.first_span_text );
									if ( '' === response.data.html ) {
										$( document ).find( '.open-popup .location-album-list-wrap' ).hide();
										$( document ).find( '.open-popup .location-album-list-wrap-main span.no-album-exists' ).show();
									} else {
										$( document ).find( '.open-popup .location-album-list-wrap-main span.no-album-exists' ).hide();
										$( document ).find( '.open-popup .location-album-list-wrap' ).show();
									}

									$( document ).find( '.popup-on-fly-create-album .privacy-field-wrap-hide-show' ).show();
									$( document ).find( '.open-popup .bb-album-create-from' ).val( 'profile' );

									$( currentTarget ).find( '.location-album-list-wrap .location-album-list' ).remove();
									$( currentTarget ).find( '.location-album-list-wrap' ).append( response.data.html );
									$( currentTarget ).find( 'ul.location-album-list span[data-id="' + parentsOpen + '"]' ).trigger( 'click' );
									$( currentTarget ).find( '.bb-album-selected-id' ).val( parentsOpen );
								}
							}
						);
					}
				}

				$( document ).on( 'click', currentTarget + ' .location-album-list li span', function ( e ) {
					e.preventDefault();
					if ( $( this ).parent().hasClass( 'is_active' ) ) {
						return;
					}
					if ( $( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).data( 'id' ) != 0 ) {
						$( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).remove();
					}
					$( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item' ).append( '<span class="is-disabled" data-id="' + $( this ).attr( 'id' ) + '">' + $( this ).text() + '</span>' );
					$( this ).addClass( 'selected' ).parent().addClass( 'is_active' ).siblings().removeClass( 'is_active' ).children( 'span' ).removeClass( 'selected' );
					if ( parentsOpen == $( e.currentTarget ).data( 'id' ) ) {
						$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-model-footer .bp-media-move' ).addClass( 'is-disabled' );
					} else {
						$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-model-footer .bp-media-move' ).removeClass( 'is-disabled' );
					}
					if ( $( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-model-footer .bp-media-move' ).hasClass( 'is-disabled' ) ) {
						return; //return if parent album is same.
					}
					$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-album-selected-id' ).val( $( e.currentTarget ).data( 'id' ) );

					var mediaPrivacy = $( e.currentTarget ).closest( '#bp-video-uploader' ).find( '#bb-video-privacy' );

					if ( Number( $( e.currentTarget ).data( 'id' ) ) !== 0 ) {
						mediaPrivacy.find( 'option' ).removeAttr( 'selected' );
						mediaPrivacy.val( $( e.currentTarget ).parent().data( 'privacy' ) );
						mediaPrivacy.prop( 'disabled', true );
					} else {
						mediaPrivacy.find( 'option' ).removeAttr( 'selected' );
						mediaPrivacy.val( 'public' );
						mediaPrivacy.prop( 'disabled', false );
					}
				} );

				$( document ).on( 'click', currentTarget + ' .breadcrumb .item > span', function ( e ) {

					if ( $( this ).hasClass( 'is-disabled' ) ) {
						return;
					}

					$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-album-selected-id' ).val( 0 );
					$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.location-album-list li span' ).removeClass( 'selected' ).parent().removeClass( 'is_active' );

					if ( $( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).hasClass( 'is-disabled' ) ) {
						$( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).remove();
					}

					if ( parentsOpen == $( e.currentTarget ).data( 'id' ) ) {
						$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-model-footer .bp-media-move' ).addClass( 'is-disabled' );
					} else {
						$( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-model-footer .bp-media-move' ).removeClass( 'is-disabled' );
					}
					var mediaPrivacy = $( e.currentTarget ).closest( '#bp-video-uploader' ).find( '#bb-video-privacy' );
					var selectedAlbumPrivacy = $( e.currentTarget ).closest( '#bp-video-uploader' ).find( '.location-album-list li.is_active' ).data( 'privacy' );
					if ( Number( $( e.currentTarget ).closest( '.bb-field-wrap' ).find( '.bb-album-selected-id' ).val() ) !== 0 ) {
						mediaPrivacy.find( 'option' ).removeAttr( 'selected' );
						mediaPrivacy.val( selectedAlbumPrivacy === undefined ? 'public' : selectedAlbumPrivacy );
						mediaPrivacy.prop( 'disabled', true );
					} else {
						mediaPrivacy.find( 'option' ).removeAttr( 'selected' );
						mediaPrivacy.val( 'public' );
						mediaPrivacy.prop( 'disabled', false );
					}

				} );

				self.video_dropzone_obj = new Dropzone( 'div.video-uploader-wrapper #video-uploader', self.videoOptions );

				self.video_dropzone_obj.on(
					'sending',
					function ( file, xhr, formData ) {
						formData.append( 'action', 'video_upload' );
						formData.append( '_wpnonce', BP_Nouveau.nonces.video );
					}
				);

				self.video_dropzone_obj.on(
					'addedfile',
					function () {
						setTimeout(
							function () {
								if ( self.video_dropzone_obj.getAcceptedFiles().length ) {
									$( '#bp-video-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video.length, self.video_dropzone_obj.getAcceptedFiles().length ) ).show();
								}
							},
							1000
						);
					}
				);

				self.video_dropzone_obj.on(
					'error',
					function ( file, response ) {
						if ( file.accepted ) {
							if ( typeof response !== 'undefined' && typeof response.data !== 'undefined' && typeof response.data.feedback !== 'undefined' ) {
								$( file.previewElement ).find( '.dz-error-message span' ).text( response.data.feedback );
							}
						} else {
							if ( !jQuery( '.media-error-popup' ).length ) {
								$( 'body' ).append( '<div id="bp-media-create-folder" style="display: block;" class="open-popup media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.video.invalid_video_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							}
							this.removeFile( file );
						}
					}
				);

				self.video_dropzone_obj.on(
					'queuecomplete',
					function () {
						$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.upload );
					}
				);

				self.video_dropzone_obj.on(
					'processing',
					function () {
						$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.uploading + '...' );
					}
				);

				self.video_dropzone_obj.on(
					'success',
					function ( file, response ) {
						if ( response.data.id ) {
							file.id                  = response.id;
							response.data.uuid       = file.upload.uuid;
							response.data.menu_order = self.dropzone_video.length;
							response.data.album_id   = self.video_album_id;
							response.data.group_id   = self.video_group_id;
							response.data.saved      = false;
							self.dropzone_video.push( response.data );
						} else {
							if ( !jQuery( '.media-error-popup' ).length ) {
								$( 'body' ).append( '<div id="bp-video-create-folder" style="display: block;" class="open-popup media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response.data.feedback + '</p></div></div></div></div></transition></div>' );
							}
							this.removeFile( file );
						}
						$( '.bb-field-steps-1 #bp-video-next, #bp-video-submit' ).show();
						$( '.bb-field-steps-1' ).addClass( 'controls-added' );
						$( '#bp-video-submit' ).show();
						$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.uploading + '...' );
						$( '#bp-video-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video.length, self.video_dropzone_obj.getAcceptedFiles().length ) ).show();
					}
				);

				self.video_dropzone_obj.on(
					'removedfile',
					function ( file ) {

						if ( self.dropzone_video.length ) {
							for ( var i in self.dropzone_video ) {
								if ( file.upload.uuid == self.dropzone_video[ i ].uuid ) {

									if ( typeof self.dropzone_video[ i ].saved !== 'undefined' && ! self.dropzone_video[ i ].saved ) {
										self.removeVideoAttachment( self.dropzone_video[ i ].id );
									}

									self.dropzone_video.splice( i, 1 );
									break;
								}
							}
						}

						if ( ! self.video_dropzone_obj.getAcceptedFiles().length ) {
							$( '#bp-video-uploader-modal-status-text' ).text( '' );
							$( '#bp-video-next' ).hide();
							$( '.bb-field-steps-1' ).removeClass( 'controls-added' );
							$( '#bp-video-submit' ).hide();
						} else {
							$( '#bp-video-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video.length, self.video_dropzone_obj.getAcceptedFiles().length ) ).show();
						}
					}
				);

			}
		},

		openEditThumbnailUploader: function ( event ) {
			var self = this;
			event.preventDefault();

			var target            = $( event.currentTarget );
			var videoAttachmentId = target.attr( 'data-video-attachment-id' );
			var videoId           = target.attr( 'data-video-id' );
			var popupSelector     = '';

			if ( $( event.currentTarget ).closest( '.activity-inner' ).length > 0 ) {
				popupSelector = $( event.currentTarget ).closest( '.activity-inner' );
			} else if ( $( event.currentTarget ).closest( '#video-stream.video' ).length > 0 ) {
				popupSelector = $( event.currentTarget ).closest( '#video-stream.video' );
			} else if ( $( event.currentTarget ).closest( '#media-stream.media' ).length > 0 ) {
				popupSelector = $( event.currentTarget ).closest( '#media-stream.media' );
			} else if ( $( event.currentTarget ).closest( '.forums-video-wrap' ).length > 0 ) {
				popupSelector = $( event.currentTarget ).closest( '.forums-video-wrap' );
			} else if ( $( event.currentTarget ).closest( '.comment-item' ).length > 0 ) {
				popupSelector = $( event.currentTarget ).closest( '.comment-item' );
			}

			$( popupSelector ).find( '.bp-video-thumbnail-uploader' ).addClass( 'opened-edit-thumbnail' ).show();

			$( document ).on(
				'click',
				'.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-auto-generated .bb-action-check-wrap',
				function() {
					$( this ).closest( '.bp-video-thumbnail-uploader' ).find( '.bp-video-thumbnail-submit' ).show();
				}
			);

			if ( typeof window.Dropzone !== 'undefined' && $( 'div.bp-video-thumbnail-uploader.opened-edit-thumbnail div.video-thumbnail-uploader-wrapper .video-thumbnail-uploader-dropzone-select' ).length ) {

				$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-edit-thumbnail-hidden-video-id' ).val( videoId );
				$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-edit-thumbnail-hidden-attachment-id' ).val( videoAttachmentId );

				self.video_thumb_dropzone_obj = new Dropzone( 'div.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-thumbnail-uploader-dropzone-select', self.videoThumbnailOptions );

				self.video_thumb_dropzone_obj.on(
					'sending',
					function ( file, xhr, formData ) {
						formData.append( 'action', 'video_thumbnail_upload' );
						formData.append( '_wpnonce', BP_Nouveau.nonces.video );
					}
				);

				self.video_thumb_dropzone_obj.on(
					'addedfile',
					function ( file ) {

						if ( file.video_thumbnail_edit_data ) {
							self.dropzone_video_thumb.push( file.video_thumbnail_edit_data );
							$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-thumbnail-uploader-wrapper .dropzone.dz-clickable' ).addClass( 'dz-max-files-reached' );
						} else {
							setTimeout(
								function () {
									if ( self.video_thumb_dropzone_obj.getAcceptedFiles().length ) {
										$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video_thumb.length, self.video_thumb_dropzone_obj.getAcceptedFiles().length ) ).show();
									}
								},
								1000
							);
						}
					}
				);

				self.video_thumb_dropzone_obj.on(
					'error',
					function ( file, response ) {
						if ( file.accepted ) {
							if ( typeof response !== 'undefined' && typeof response.data !== 'undefined' && typeof response.data.feedback !== 'undefined' ) {
								$( file.previewElement ).find( '.dz-error-message span' ).text( response.data.feedback );
							}
						} else {
							if ( !jQuery( '.media-error-popup' ).length ) {
								$( 'body' ).append( '<div id="bp-video-move-popup" style="display: block;" class="open-popup video-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							}
							this.removeFile( file );
						}
					}
				);

				self.video_thumb_dropzone_obj.on(
					'queuecomplete',
					function () {
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.upload_thumb );
					}
				);

				self.video_thumb_dropzone_obj.on(
					'processing',
					function () {
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.uploading + '...' );
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail' ).find( '.bp-video-thumbnail-auto-generated' ).addClass( 'disabled' ).find( 'input[type="radio"]' ).prop( 'checked', false );
					}
				);

				self.video_thumb_dropzone_obj.on(
					'success',
					function ( file, response ) {
						if ( response.data.id ) {
							file.id                  = response.id;
							response.data.uuid       = file.upload.uuid;
							response.data.menu_order = self.dropzone_video.length;
							response.data.album_id   = self.video_album_id;
							response.data.group_id   = self.video_group_id;
							response.data.saved      = false;
							self.dropzone_video_thumb.push( response.data );
						} else {
							if ( !jQuery( '.media-error-popup' ).length ) {
								$( 'body' ).append( '<div id="bp-video-move-popup" style="display: block;" class="open-popup media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							}
							this.removeFile( file );
						}
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-submit' ).show();
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.uploading + '...' );
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video_thumb.length, self.video_thumb_dropzone_obj.getAcceptedFiles().length ) );
						$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail' ).find( '.bp-video-thumbnail-auto-generated' ).addClass( 'disabled' ).find( 'input[type="radio"]' ).prop( 'checked', false );
					}
				);

				self.video_thumb_dropzone_obj.on(
					'removedfile',
					function ( file ) {
						if ( self.dropzone_video_thumb.length ) {
							for ( var i in self.dropzone_video_thumb ) {
								if ( file.upload.uuid == self.dropzone_video_thumb[ i ].uuid ) {

									if ( typeof self.dropzone_video_thumb[ i ].saved !== 'undefined' && ! self.dropzone_video_thumb[ i ].saved ) {
										self.removeVideoThumbnailAttachment( self.dropzone_video_thumb[ i ].id );
									}

									self.dropzone_video_thumb.splice( i, 1 );
									break;
								}
							}
						}
						if ( ! self.video_thumb_dropzone_obj.getAcceptedFiles().length ) {
							$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-status-text' ).text( '' );
							$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-submit' ).hide();
							$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail' ).find( '.bp-video-thumbnail-auto-generated' ).removeClass( 'disabled' );
						} else {
							$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video_thumb.length, self.video_thumb_dropzone_obj.getAcceptedFiles().length ) ).show();
						}
					}
				);

				var data = {
					'action': 'video_get_edit_thumbnail_data',
					'_wpnonce': BP_Nouveau.nonces.video,
					'attachment_id': videoAttachmentId,
					'video_id': videoId,
				};

				$.ajax(
					{
						type: 'POST',
						url: BP_Nouveau.ajaxurl,
						data: data,
						success: function ( response ) {
							if ( response.success ) {

								if ( response.data.default_images ) {
									var ulSelector = $( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-auto-generated ul.video-thumb-list' );
									ulSelector.html( '' );
									ulSelector.html( response.data.default_images );
									ulSelector.removeClass( 'loading' );
								}

								if ( response.data.dropzone_edit ) {
									var mock_file = false;

									mock_file = false;
									mock_file = {
										name: response.data.dropzone_edit.name,
										accepted: true,
										kind: 'image',
										upload: {
											filename: response.data.dropzone_edit.name,
											uuid: response.data.dropzone_edit.attachment_id
										},
										dataURL: response.data.dropzone_edit.url,
										id: response.data.dropzone_edit.attachment_id,
										video_thumbnail_edit_data: {
											'id': response.data.dropzone_edit.attachment_id,
											'media_id': response.data.dropzone_edit.id,
											'name': response.data.dropzone_edit.name,
											'thumb': response.data.dropzone_edit.thumb,
											'url': response.data.dropzone_edit.url,
											'uuid': response.data.dropzone_edit.attachment_id,
											'menu_order': 0,
											'saved': true
										}
									};

									if ( self.video_thumb_dropzone_obj ) {
										self.video_thumb_dropzone_obj.files.push( mock_file );
										self.video_thumb_dropzone_obj.emit( 'addedfile', mock_file );
										self.createThumbnailFromUrl( mock_file );
										$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail' ).find( '.bp-video-thumbnail-auto-generated' ).addClass( 'disabled' ).find( 'input[type="radio"]' ).prop( 'checked', false );

									}
								}
							}
						}
					}
				);
			}
		},

		createThumbnailFromUrl: function ( mock_file ) {
			var self = this;
			self.video_thumb_dropzone_obj.createThumbnailFromUrl(
				mock_file,
				self.video_thumb_dropzone_obj.options.thumbnailWidth,
				self.video_thumb_dropzone_obj.options.thumbnailHeight,
				self.video_thumb_dropzone_obj.options.thumbnailMethod,
				true,
				function ( thumbnail ) {
					self.video_thumb_dropzone_obj.emit( 'thumbnail', mock_file, thumbnail );
					self.video_thumb_dropzone_obj.emit( 'complete', mock_file );
				}
			);
		},

		closeEditThumbnailUploader: function ( event ) {
			event.preventDefault();

			$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.upload_thumb );
			$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .bp-video-thumbnail-uploader-modal-status-text' ).text( '' );
			$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail .video-thumbnail-uploader-wrapper .video-thumbnail-uploader-dropzone-select' ).html( '' );
			this.video_thumb_dropzone_obj.destroy();
			this.dropzone_video_thumb = [];
			$( '.bp-video-thumbnail-uploader.opened-edit-thumbnail' ).hide();
			$( '.bp-video-thumbnail-uploader' ).removeClass( 'opened-edit-thumbnail' );
			$( '.bp-video-thumbnail-uploader' ).find( '.video-thumb-list' ).html( '' );
			$( window ).scroll();
		},

		openAlbumUploader: function ( event ) {
			var self = this;
			event.preventDefault();

			if ( typeof window.Dropzone !== 'undefined' && $( 'div#video-album-uploader' ).length ) {

				$( '#bp-video-uploader' ).show();

				self.video_dropzone_obj = new Dropzone( 'div#video-album-uploader', self.videoOptions );

				self.video_dropzone_obj.on(
					'sending',
					function ( file, xhr, formData ) {
						formData.append( 'action', 'video_upload' );
						formData.append( '_wpnonce', BP_Nouveau.nonces.video );
					}
				);

				self.video_dropzone_obj.on(
					'addedfile',
					function () {
						setTimeout(
							function () {
								if ( self.video_dropzone_obj.getAcceptedFiles().length ) {
									$( '#bp-video-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video.length, self.video_dropzone_obj.getAcceptedFiles().length ) ).show();
								}
							},
							1000
						);
					}
				);

				self.video_dropzone_obj.on(
					'error',
					function ( file, response ) {
						if ( file.accepted ) {
							if ( typeof response !== 'undefined' && typeof response.data !== 'undefined' && typeof response.data.feedback !== 'undefined' ) {
								$( file.previewElement ).find( '.dz-error-message span' ).text( response.data.feedback );
							}
						} else {
							if ( !jQuery( '.media-error-popup' ).length ) {
								$( 'body' ).append( '<div id="bp-video-move-popup" style="display: block;" class="open-popup media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							}
							this.removeFile( file );
						}
					}
				);

				self.video_dropzone_obj.on(
					'queuecomplete',
					function () {
						$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.upload );
					}
				);

				self.video_dropzone_obj.on(
					'processing',
					function () {
						$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.uploading + '...' );
					}
				);

				self.video_dropzone_obj.on(
					'success',
					function ( file, response ) {
						if ( response.data.id ) {
							file.id                  = response.id;
							response.data.uuid       = file.upload.uuid;
							response.data.menu_order = self.dropzone_video.length;
							response.data.album_id   = self.video_album_id;
							response.data.group_id   = self.video_group_id;
							response.data.saved      = false;
							self.dropzone_video.push( response.data );
						} else {
							if ( !jQuery( '.media-error-popup' ).length ) {
								$( 'body' ).append( '<div id="bp-video-move-popup" style="display: block;" class="open-popup media-error-popup"><transition name="modal"><div class="modal-mask bb-white bbm-model-wrap"><div class="modal-wrapper"><div id="boss-media-create-album-popup" class="modal-container has-folderlocationUI"><header class="bb-model-header"><h4>' + BP_Nouveau.media.invalid_media_type + '</h4><a class="bb-model-close-button errorPopup" href="#"><span class="dashicons dashicons-no-alt"></span></a></header><div class="bb-field-wrap"><p>' + response + '</p></div></div></div></div></transition></div>' );
							}
							this.removeFile( file );
						}
						$( '#bp-video-submit' ).show();
						$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.uploading + '...' );
						$( '#bp-video-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video.length, self.video_dropzone_obj.getAcceptedFiles().length ) ).show();
					}
				);

				self.video_dropzone_obj.on(
					'removedfile',
					function ( file ) {
						if ( self.dropzone_video.length ) {
							for ( var i in self.dropzone_video ) {
								if ( file.upload.uuid == self.dropzone_video[ i ].uuid ) {

									if ( typeof self.dropzone_video[ i ].saved !== 'undefined' && ! self.dropzone_video[ i ].saved ) {
										self.removeVideoAttachment( self.dropzone_video[ i ].id );
									}

									self.dropzone_video.splice( i, 1 );
									break;
								}
							}
						}
						if ( ! self.video_dropzone_obj.getAcceptedFiles().length ) {
							$( '#bp-video-uploader-modal-status-text' ).text( '' );
							$( '#bp-video-submit' ).hide();
						} else {
							$( '#bp-video-uploader-modal-status-text' ).text( wp.i18n.sprintf( BP_Nouveau.video.i18n_strings.upload_status, self.dropzone_video.length, self.video_dropzone_obj.getAcceptedFiles().length ) ).show();
						}
					}
				);
			}
		},

		removeVideoAttachment: function ( id ) {
			var data = {
				'action': 'media_delete_attachment',
				'_wpnonce': BP_Nouveau.nonces.media,
				'id': id
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data
				}
			);
		},

		removeVideoThumbnailAttachment: function ( id ) {
			var data = {
				'action': 'video_thumbnail_delete_attachment',
				'_wpnonce': BP_Nouveau.nonces.video,
				'id': id
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data
				}
			);
		},

		closeUploader: function ( event ) {
			event.preventDefault();
			$( '#bp-video-uploader' ).hide();
			$( '#bp-video-uploader-modal-title' ).text( BP_Nouveau.video.i18n_strings.upload );
			$( '#bp-video-uploader-modal-status-text' ).text( '' );
			if ( this.video_dropzone_obj ) {
				this.video_dropzone_obj.destroy();
			}
			this.dropzone_video = [];

			var currentPopup = $( event.currentTarget ).closest( '#bp-video-uploader' );

			$( '.close-create-popup-album' ).trigger( 'click' );
			$( '.close-create-popup-folder' ).trigger( 'click' );
			currentPopup.find( '.breadcrumbs-append-ul-li .item span[data-id="0"]' ).trigger( 'click' );

			if ( currentPopup.find( '.bb-field-steps' ).length ) {
				currentPopup.find( '.bb-field-steps-1' ).show().siblings( '.bb-field-steps-2' ).hide();
				currentPopup.find( '.bb-field-steps-1 #bp-video-next' ).hide();
				currentPopup.find( '.bb-field-steps-1' ).removeClass( 'controls-added' );
				currentPopup.find( '#bp-video-prev, #bp-video-submit, .bp-video-open-create-popup-album, .create-popup-album-wrap' ).hide();
			}

			this.clearFolderLocationUI( event );
		},

		toggle_video_uploader: function () {
			var self = this;

			self.open_video_uploader();

		},

		open_video_uploader: function () {
			var self = this;
			if ( self.$el.find( '#activity-post-media-uploader' ).hasClass( 'open' ) ) {
				return false;
			}

		},

		editVideo: function ( e ) {
			e.preventDefault();

			// ToDo: Open Edit Popup here
			console.log( 'Open Edit Popup here' );
		},

		deleteVideo: function ( event ) {
			var target = $( event.currentTarget );
			event.preventDefault();

			var video              = [];
			var buddyPressSelector = $( '#buddypress' );
			var type               = target.attr( 'data-type' );
			var fromWhere          = target.data( 'item-from' );
			var id                 = '';
			var activityId         = '';

			if ( 'video' === type ) {
				if ( ! confirm( BP_Nouveau.video.i18n_strings.video_delete_confirm ) ) {
					return false;
				}
			}

			if ( target.hasClass( 'bb-delete' ) ) {

				if ( ! confirm( BP_Nouveau.video.i18n_strings.video_delete_confirm ) ) {
					return false;
				}

				buddyPressSelector.find( '.video-list:not(.existing-video-list)' ).find( '.bb-video-check-wrap [name="bb-video-select"]:checked' ).each(
					function () {
						$( this ).closest( '.bb-video-thumb' ).addClass( 'loading deleting' );
						video.push( $( this ).val() );
					}
				);

			}

			activityId = target.data( 'parent-activity-id' );
			if ( fromWhere && fromWhere.length && 'activity' === fromWhere && video.length == 0 ) {
				id = target.attr( 'data-item-id' );
				video.push( id );
			}

			if ( video.length == 0 ) {
				video.push( target.data( 'item-id' ) );
			}

			if ( video.length == 0 ) {
				return false;
			}

			target.prop( 'disabled', true );
			$( '#buddypress #video-stream.video .bp-feedback' ).remove();

			var data = {
				'action': 'video_delete',
				'_wpnonce': BP_Nouveau.nonces.video,
				'video': video,
				'activity_id': activityId,
				'from_where': fromWhere,
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data,
					success: function ( response ) {
						var feedback = '';
						if ( fromWhere && fromWhere.length && 'activity' === fromWhere ) {
							if ( response.success ) {
								$.each(
									video,
									function ( index, value ) {
										if ( $( '#activity-stream ul.activity-list li.activity .activity-content .activity-inner .bb-activity-video-wrap div[data-id="' + value + '"]' ).length ) {
											$( '#activity-stream ul.activity-list li.activity .activity-content .activity-inner .bb-activity-video-wrap div[data-id="' + value + '"]' ).remove();
										}
										if ( $( 'body .bb-activity-video-elem.' + value ).length ) {
											$( 'body .bb-activity-video-elem.' + value ).remove();
										}
									}
								);

								var length = $( '#activity-stream ul.activity-list li[data-bp-activity-id="' + activityId + '"] .activity-content .activity-inner .bb-activity-video-elem' ).length;
								if ( length == 0 ) {
									$( '#activity-stream ul.activity-list li[data-bp-activity-id="' + activityId + '"]' ).remove();
								}

								if ( false === response.data.delete_activity ) {
									$( 'body #buddypress .activity-list li#activity-' + activityId ).replaceWith( response.data.activity_content );
								}
							}
						} else if ( fromWhere && fromWhere.length && 'video' === fromWhere ) {
							if ( response.success ) {
								if ( 'yes' === BP_Nouveau.video.is_video_directory ) {
									var store = bp.Nouveau.getStorage( 'bp-video' );
									var scope = store.scope;
									if ( 'personal' === scope ) {
										$( document ).find( 'li#video-personal a' ).trigger( 'click' );
										$( document ).find( 'li#video-personal' ).trigger( 'click' );
									} else if ( 'groups' === scope ) {
										$( document ).find( 'li#video-groups a' ).trigger( 'click' );
										$( document ).find( 'li#video-groups' ).trigger( 'click' );
									} else {
										$( document ).find( 'li#video-all a' ).trigger( 'click' );
										$( document ).find( 'li#video-all' ).trigger( 'click' );
									}
								} else {
									if ( response.data.video_personal_count ) {
										$( '#buddypress' ).find( '.bp-wrap .users-nav ul li#video-personal-li a span.count' ).text( response.data.video_personal_count );
									}

									if ( response.data.video_group_count ) {
										$( '#buddypress' ).find( '.bp-wrap .groups-nav ul li#videos-groups-li a span.count' ).text( response.data.video_group_count );
									}
									$.each(
										video,
										function ( index, value ) {
											if ( $( '#video-stream ul.video-list li[data-id="' + value + '"]' ).length ) {
												$( '#video-stream ul.video-list li[data-id="' + value + '"]' ).remove();
											}
										}
									);
									if ( $( '#buddypress' ).find( '.video-list:not(.existing-video-list)' ).find( 'li:not(.load-more)' ).length == 0 ) {
										$( '.bb-videos-actions' ).hide();
										feedback = '<aside class="bp-feedback bp-messages info">\n' +
											'\t<span class="bp-icon" aria-hidden="true"></span>\n' +
											'\t<p>' + BP_Nouveau.video.i18n_strings.no_videos_found + '</p>\n' +
											'\t</aside>';
										$( '#buddypress [data-bp-list="video"]' ).html( feedback );
									}
								}
							}
						} else {
							setTimeout(
								function () {
									target.prop( 'disabled', false );
								},
								500
							);
							if ( response.success ) {
								buddyPressSelector.find( '.video-list:not(.existing-video-list)' ).find( '.bb-video-check-wrap [name="bb-video-select"]:checked' ).each(
									function () {
										$( this ).closest( 'li' ).remove();
									}
								);
								if ( $( '#buddypress' ).find( '.video-list:not(.existing-video-list)' ).find( 'li:not(.load-more)' ).length == 0 ) {
									$( '.bb-videos-actions' ).hide();
									feedback = '<aside class="bp-feedback bp-messages info">\n' +
										'\t<span class="bp-icon" aria-hidden="true"></span>\n' +
										'\t<p>' + BP_Nouveau.video.i18n_strings.no_videos_found + '</p>\n' +
										'\t</aside>';
									$( '#buddypress [data-bp-list="video"]' ).html( feedback );
								}
							} else {
								$( '#buddypress #video-stream.video' ).prepend( response.data.feedback );
							}
						}

						// replace dummy image with original image by faking scroll event to call bp.Nouveau.lazyLoad.
						jQuery( window ).scroll();

					}
				}
			);

		},

		// Video Directory

		openCreateVideoAlbumModal: function ( event ) {
			event.preventDefault();

			this.openAlbumUploader( event );
			$( '#bp-video-create-album' ).show();
		},

		closeCreateVideoAlbumModal: function ( event ) {
			event.preventDefault();

			this.closeUploader( event );
			$( '#bp-video-create-album' ).hide();
			$( '#bb-album-title' ).val( '' );

		},

		saveAlbum: function ( event ) {
			console.log( 'HelloWorld!' );
			var target  = $( event.currentTarget ), self = this, title = $( '#bb-album-title' ),
				privacy = $( '#bb-album-privacy' );

			if ( target.hasClass( 'saving' ) ) {
				return false;
			}

			event.preventDefault();

			if ( $.trim( title.val() ) === '' ) {
				title.addClass( 'error' );
				return false;
			} else {
				title.removeClass( 'error' );
			}

			if ( ! self.group_id && $.trim( privacy.val() ) === '' ) {
				privacy.addClass( 'error' );
				return false;
			} else {
				privacy.removeClass( 'error' );
			}

			target.addClass( 'saving' );
			target.attr( 'disabled', true );
			var data = {
				'action': 'video_album_save',
				'_wpnonce': BP_Nouveau.nonces.video,
				'title': title.val(),
				'videos': self.dropzone_video,
				'privacy': privacy.val()
			};

			if ( self.album_id ) {
				data.album_id = self.album_id;
			}

			if ( self.group_id ) {
				data.group_id = self.group_id;
			}

			// remove all feedback erros from the DOM.
			$( '#bp-media-single-album .bp-feedback' ).remove();
			$( '#boss-media-create-album-popup .bp-feedback' ).remove();

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data,
					success: function ( response ) {
						setTimeout(
							function () {
								target.removeClass( 'saving' );
								target.prop( 'disabled', false );
							},
							500
						);
						if ( response.success ) {
							if ( self.album_id ) {
								$( '#bp-single-album-title' ).text( title.val() );
								$( '#bb-album-privacy' ).val( privacy.val() );
								self.cancelEditAlbumTitle( event );
							} else {
								$( '#buddypress .bb-albums-list' ).prepend( response.data.album );
								window.location.href = response.data.redirect_url;
							}
						} else {
							if ( self.album_id ) {
								$( '#bp-media-single-album' ).prepend( response.data.feedback );
							} else {
								$( '#boss-media-create-album-popup .bb-model-header' ).after( response.data.feedback );
							}
						}
					}
				}
			);

		},

		injectVideos: function ( event ) {
			var store = bp.Nouveau.getStorage( 'bp-video' ),
				scope = store.scope || null, filter = store.filter || null;

			if ( $( event.currentTarget ).hasClass( 'load-more' ) ) {
				var next_page = ( Number( this.current_page ) * 1 ) + 1, self = this, search_terms = '';

				// Stop event propagation.
				event.preventDefault();

				$( event.currentTarget ).find( 'a' ).first().addClass( 'loading' );

				if ( $( '#buddypress .dir-search input[type=search]' ).length ) {
					search_terms = $( '#buddypress .dir-search input[type=search]' ).val();
				}

				bp.Nouveau.objectRequest(
					{
						object: 'video',
						scope: scope,
						filter: filter,
						search_terms: search_terms,
						page: next_page,
						method: 'append',
						target: '#buddypress [data-bp-list] ul.bp-list'
					}
				).done(
					function ( response ) {
						if ( true === response.success ) {
							$( event.currentTarget ).remove();

							// Update the current page.
							self.current_page = next_page;

							jQuery( window ).scroll();
						}
					}
				);
			}
		},

		/**
		 * [openVideoMove description]
		 *
		 * @param  {[type]} event [description]
		 * @return {[type]}       [description]
		 */
		openVideoMove: function ( event ) {
			event.preventDefault();

			var video_move_popup, video_parent_id, video_id, currentTarget;

			this.moveToIdPopup   = $( event.currentTarget ).attr( 'id' );
			this.moveToTypePopup = $( event.currentTarget ).attr( 'data-type' );

			if ( $( event.currentTarget ).closest( '.activity-inner' ).length > 0 ) {
				video_move_popup = $( event.currentTarget ).closest( '.activity-inner' );
			} else if ( $( event.currentTarget ).closest( '#media-stream.media' ).length > 0 ) {
				video_move_popup = $( event.currentTarget ).closest( '#media-stream.media' );
			} else if ( $( event.currentTarget ).closest( '#video-stream.video' ).length > 0 ) {
				video_move_popup = $( event.currentTarget ).closest( '#video-stream.video' );
			} else if ( $( event.currentTarget ).closest( '.comment-item' ).length > 0 ) {
				video_move_popup = $( event.currentTarget ).closest( '.comment-item' );
			}

			$( video_move_popup ).find( '.bp-video-move-file' ).addClass( 'open' ).show();
			video_id        = $( event.currentTarget ).closest( '.video-action-wrap' ).siblings( 'a' ).data( 'id' );
			video_parent_id = $( event.currentTarget ).closest( '.video-action-wrap' ).siblings( 'a' ).data( 'album-id' );

			if ( video_id === undefined ) {
				video_id        = $( event.currentTarget ).closest( '.video-action-wrap' ).siblings( 'div.video-js' ).data( 'id' );
				video_parent_id = $( event.currentTarget ).closest( '.video-action-wrap' ).siblings( 'div.video-js' ).data( 'album-id' );
			}

			video_move_popup.find( '.bp-video-move' ).attr( 'id', video_id );
			video_move_popup.find( '.bb-model-footer .bp-video-move' ).addClass( 'is-disabled' );

			// For Activity Feed.
			if ( $( event.currentTarget ).closest( '.conflict-activity-ul-li-comment' ).closest( 'li.comment-item' ).length ) {
				currentTarget = '#' + $( event.currentTarget ).closest( '.conflict-activity-ul-li-comment' ).closest( 'li' ).attr( 'id' ) + '.comment-item .bp-video-move-file';
			} else {
				currentTarget = '#' + $( event.currentTarget ).closest( 'li.activity-item' ).attr( 'id' ) + ' > .activity-content .bp-video-move-file';
			}

			$( currentTarget ).find( '.bp-document-move' ).attr( 'id', $( event.currentTarget ).closest( '.document-activity' ).attr( 'data-id' ) );

			// Change if this is not from Activity Page.
			if ( $( event.currentTarget ).closest( '.media-list' ).length > 0 || $( event.currentTarget ).closest( '.video-list' ).length > 0 ) {
				currentTarget = '.bp-video-move-file';
			}

			if ( 'group' === this.moveToTypePopup ) {
				$( document ).find( '.location-album-list-wrap h4' ).show();
			} else {
				$( document ).find( '.location-album-list-wrap h4' ).hide();
			}

			$( currentTarget ).addClass( 'open-popup' );

			$( currentTarget ).find( '.location-album-list-wrap .location-album-list' ).remove();
			$( currentTarget ).find( '.location-album-list-wrap' ).append( '<ul class="location-album-list is-loading"><li><i class="bb-icon-loader animate-spin"></i></li></ul>' );

			var parentsOpen = video_parent_id;
			var getFrom     = this.moveToTypePopup;
			if ( '' !== this.moveToIdPopup ) {
				$.ajax(
					{
						url: BP_Nouveau.ajaxurl,
						type: 'post',
						data: {
							action: 'media_get_album_view',
							id: this.moveToIdPopup,
							type: this.moveToTypePopup,
						}, success: function ( response ) {
							$( document ).find( '.location-album-list-wrap h4 span.where-to-move-profile-or-group-video' ).html( response.data.first_span_text );
							if ( '' === response.data.html ) {
								$( document ).find( '.open-popup .location-album-list-wrap' ).hide();
								$( document ).find( '.open-popup .location-album-list-wrap-main span.no-album-exists' ).show();
							} else {
								$( document ).find( '.open-popup .location-album-list-wrap-main span.no-album-exists' ).hide();
								$( document ).find( '.open-popup .location-album-list-wrap' ).show();
							}
							if ( 'group' === getFrom ) {
								$( document ).find( '.popup-on-fly-create-album .privacy-field-wrap-hide-show' ).hide();
								$( document ).find( '.open-popup .bb-album-create-from' ).val( 'group' );
							} else {
								$( document ).find( '.popup-on-fly-create-album .privacy-field-wrap-hide-show' ).show();
								$( document ).find( '.open-popup .bb-album-create-from' ).val( 'profile' );
							}
							$( currentTarget ).find( '.location-album-list-wrap .location-album-list' ).remove();
							$( currentTarget ).find( '.location-album-list-wrap' ).append( response.data.html );
							$( currentTarget ).find( 'ul.location-album-list span#' + parentsOpen ).trigger( 'click' );
						}
					}
				);
			}

			$( document ).on(
				'click',
				currentTarget + ' .location-album-list li span',
				function ( e ) {
					e.preventDefault();
					if ( $( this ).parent().hasClass( 'is_active' ) ) {
						return;
					}

					if ( $( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).data( 'id' ) != 0 ) {
						$( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).remove();
					}

					$( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item' ).append( '<span class="is-disabled" data-id="' + $( this ).attr( 'id' ) + '">' + $( this ).text() + '</span>' );

					$( this ).addClass( 'selected' ).parent().addClass( 'is_active' ).siblings().removeClass( 'is_active' ).children( 'span' ).removeClass( 'selected' );
					var parentsOpen = $( document ).find( 'a.bb-open-video-theatre[data-id="' + video_id + '"]' ).data( 'album-id' );
					if ( Number( parentsOpen ) == Number( $( e.currentTarget ).data( 'id' ) ) ) {
						$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-model-footer .bp-video-move' ).addClass( 'is-disabled' );
					} else {
						$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-model-footer .bp-video-move' ).removeClass( 'is-disabled' );
					}
					if ( $( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-model-footer .bp-video-move' ).hasClass( 'is-disabled' ) ) {
						return; // return if parent album is same.
					}
					$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-album-selected-id' ).val( $( e.currentTarget ).data( 'id' ) );
				}
			);

			$( document ).on(
				'click',
				currentTarget + ' .breadcrumb .item > span',
				function ( e ) {

					if ( $( this ).hasClass( 'is-disabled' ) ) {
						return;
					}

					$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-album-selected-id' ).val( 0 );
					$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.location-album-list li span' ).removeClass( 'selected' ).parent().removeClass( 'is_active' );

					if ( $( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).hasClass( 'is-disabled' ) ) {
						$( this ).closest( '.location-album-list-wrap' ).find( '.breadcrumb .item span:last-child' ).remove();
					}

					if ( parentsOpen == $( e.currentTarget ).data( 'id' ) ) {
						$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-model-footer .bp-video-move' ).addClass( 'is-disabled' );
					} else {
						$( e.currentTarget ).closest( '.bp-video-move-file' ).find( '.bb-model-footer .bp-video-move' ).removeClass( 'is-disabled' );
					}

				}
			);

		},

		createAlbumInPopup: function ( event ) {
			event.preventDefault();

			var getParentFolderId = parseInt( $( document ).find( '.open-popup .bb-album-selected-id' ).val() );
			var getCreateIn       = $( document ).find( '.open-popup .bb-album-create-from' ).val();
			if ( getParentFolderId > 0 ) {
				$( document ).find( '.open-popup .privacy-field-wrap-hide-show' ).hide();
			} else {
				$( document ).find( '.open-popup .privacy-field-wrap-hide-show' ).show();
			}

			if ( 'group' === getCreateIn ) {
				$( document ).find( '.popup-on-fly-create-album .privacy-field-wrap-hide-show' ).hide();
			} else {
				$( document ).find( '.popup-on-fly-create-album .privacy-field-wrap-hide-show' ).show();
			}

			$( '.modal-container .bb-model-footer' ).hide();
			$( '.bb-field-wrap-search' ).hide();
			$( '.bp-video-open-create-popup-album' ).hide();
			$( '.location-album-list-wrap-main' ).hide();
			$( '.bb-field-steps-2 #bp-media-prev' ).hide();
			$( '.create-popup-album-wrap' ).show();
			$( event.currentTarget ).closest( '.has-folderlocationUI' ).find( '.bb-model-header' ).children().hide();
			$( event.currentTarget ).closest( '.has-folderlocationUI' ).find( '.bb-model-header' ).append( '<p>Create Album</p>' );
			$( '.modal-container #bb-folder-privacy' ).addClass( 'new-folder-create-privacy' );
			$( document ).find( '.open-popup .error' ).hide();
		},

		/**
		 * [closeVideoMove description]
		 *
		 * @param  {[type]} event [description]
		 * @return {[type]}       [description]
		 */
		closeVideoMove: function ( event ) {
			event.preventDefault();
			if ( $( event.currentTarget ).closest( '.bp-video-move-file' ).find( '.location-album-list-wrap .breadcrumb .item span:last-child' ).data( 'id' ) != 0 ) {
				$( event.currentTarget ).closest( '.bp-video-move-file' ).find( '.location-album-list-wrap .breadcrumb .item span:last-child' ).remove();
			}
			$( event.currentTarget ).closest( '.bp-video-move-file' ).hide();

		},

		moveVideoIntoAlbum: function ( event ) {
			var target = $( event.currentTarget );
			var self   = this;
			event.preventDefault();

			var video_id = target.attr( 'id' );
			var album_id = target.closest( '.bp-video-move-file' ).find( '.bb-album-selected-id' ).val();

			if ( '' === video_id || '' === album_id ) {
				target.closest( '.modal-container' ).find( '.location-album-list' ).addClass( 'has-error' );
				return false;
			}

			target.closest( '.modal-container' ).find( '.location-album-list' ).removeClass( 'has-error' );
			target.addClass( 'loading' );

			var activityId = '';
			activityId     = $( document ).find( 'li.move_video a[data-video-id="' + video_id + '"]' ).attr( 'data-parent-activity-id' );

			var groupId = parseInt( self.group_id );
			if ( ! groupId ) {
				groupId = false;
				if ( 'group' === $( document ).find( 'li.move_video a[data-video-id="' + video_id + '"]' ).attr( 'data-type' ) ) {
					groupId = $( document ).find( 'li.move_video a[data-video-id="' + video_id + '"]' ).attr( 'id' );
				}
			}

			var data = {
				'action': 'video_move',
				'_wpnonce': BP_Nouveau.nonces.video,
				'video_id': video_id,
				'album_id': album_id,
				'group_id': groupId,
				'activity_id': activityId
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data,
					success: function ( response ) {
						if ( response.success ) {
							if ( 'yes' === BP_Nouveau.video.is_video_directory ) {
								var store = bp.Nouveau.getStorage( 'bp-video' );
								var scope = store.scope;
								if ( 'personal' === scope ) {
									$( document ).find( 'li#video-personal a' ).trigger( 'click' );
									$( document ).find( 'li#video-personal' ).trigger( 'click' );
								} else {
									$( document ).find( 'li#video-all a' ).trigger( 'click' );
									$( document ).find( 'li#video-all' ).trigger( 'click' );
								}
							} else {
								if ( parseInt( BP_Nouveau.video.current_album ) > 0 ) {
									$( '#video-stream ul.video-list li[data-id="' + video_id + '"]' ).remove();
								} else if ( $( '#activity-stream ul.activity-list li .activity-content .activity-inner .bb-activity-video-wrap div[data-id="' + video_id + '"]' ).length && ! $( '#activity-stream ul.activity-list li .activity-content .activity-inner .bb-activity-video-wrap div[data-id="' + video_id + '"]' ).parent().hasClass( 'bb-video-length-1' ) ) {
									$( '#activity-stream ul.activity-list li .activity-content .activity-inner .bb-activity-video-wrap div[data-id="' + video_id + '"]' ).remove();
									if ( activityId && activityId.length ) {
										$( '#activity-stream ul.activity-list li[data-bp-activity-id="' + activityId + '"] .activity-content .activity-inner .bb-activity-video-wrap' ).remove();
										$( '#activity-stream ul.activity-list li[data-bp-activity-id="' + activityId + '"] .activity-content .activity-inner' ).append( response.data.video_content );
										// replace dummy image with original image by faking scroll event to call bp.Nouveau.lazyLoad.
										jQuery( window ).scroll();
									}
								}
								$( document ).find( '.open-popup .error' ).hide();
								$( document ).find( '.open-popup .error' ).html( '' );
								target.removeClass( 'loading' );
								$( document ).removeClass( 'open-popup' );
							}
							target.closest( '.bp-video-move-file' ).find( '.ac-video-close-button' ).trigger( 'click' );
							$( document ).find( 'a.bb-open-video-theatre[data-id="' + video_id + '"]' ).data( 'album-id', album_id );

						} else {
							/* jshint ignore:start */
							alert( response.data.feedback.replace( '&#039;', '\'' ) );
							/* jshint ignore:end */
						}
					}
				}
			);
		},

		submitCreateAlbumInPopup: function ( event ) {
			event.preventDefault();

			var targetPopup   = $( event.currentTarget ).closest( '.open-popup' );
			var currentAction = $( targetPopup ).find( '.bp-video-create-popup-album-submit' );
			var hiddenValue   = targetPopup.find( '.bb-album-selected-id' ).val();
			if ( '' === hiddenValue ) {
				hiddenValue = 0;
			}

			this.currentTargetParent = hiddenValue;

			var currentAlbum    = this.currentTargetParent;
			var groupId         = 0;
			var title           = $.trim( $( event.currentTarget ).closest( '.modal-container' ).find( '.popup-on-fly-create-album-title' ).val() );
			var titleSelector   = $( event.currentTarget ).closest( '.modal-container' ).find( '.popup-on-fly-create-album-title' );
			var privacy         = '';
			var privacySelector = '';
			var newParent       = 0;
			if ( 'group' === this.moveToTypePopup ) {
				privacy = 'grouponly';
				groupId = this.moveToIdPopup;
			} else {
				privacy         = $( event.currentTarget ).closest( '.modal-container' ).find( '.popup-on-fly-create-album #bb-album-privacy' ).val();
				privacySelector = $( event.currentTarget ).closest( '.modal-container' ).find( '.popup-on-fly-create-album #bb-album-privacy' );
			}
			if ( '' === title ) {
				alert( BP_Nouveau.media.create_album_error_title );
				return false;
			}

			currentAction.addClass( 'loading' );

			// Defer this code to run at last
			setTimeout(
				function () {
					var data = {
						'action': 'media_album_save',
						'_wpnonce': BP_Nouveau.nonces.media,
						'title': title,
						'privacy': privacy,
						'parent': currentAlbum,
						'group_id': groupId
					};
					$.ajax(
						{
							type: 'POST',
							url: BP_Nouveau.ajaxurl,
							data: data,
							async: false,
							success: function ( response ) {
								if ( response.success ) {
									targetPopup.find( '.location-album-list-wrap .location-album-list' ).remove();
									targetPopup.find( '.location-album-list-wrap' ).append( response.data.tree_view );
									if ( bp.Nouveau.Media.folderLocationUI ) {
										bp.Nouveau.Media.folderLocationUI( targetPopup, response.data.album_id );
									}
									newParent = response.data.album_id;

									if ( '' === response.data.tree_view ) {
										targetPopup.find( '.location-album-list-wrap' ).hide();
										targetPopup.find( '.location-album-list-wrap-main span.no-album-exists' ).show();
									} else {
										targetPopup.find( '.location-album-list-wrap-main span.no-album-exists' ).hide();
										targetPopup.find( '.location-album-list-wrap' ).show();

									}

									targetPopup.find( 'ul.location-album-list span#' + newParent ).trigger( 'click' );
									targetPopup.find( '.bb-model-footer' ).show();
									targetPopup.find( '.bb-field-wrap-search' ).show();
									targetPopup.find( '.bp-video-open-create-popup-album' ).show();
									targetPopup.find( '.location-album-list-wrap-main' ).show();
									targetPopup.find( '.create-popup-album-wrap' ).hide();
									targetPopup.find( '.bb-field-steps-2 #bp-media-prev' ).show();
									targetPopup.find( '.bb-album-selected-id' ).val();
									targetPopup.find( '.bb-album-selected-id' ).val( newParent );
									targetPopup.find( '.bb-model-header' ).children().show();
									targetPopup.find( '.bb-model-header p' ).hide();
									titleSelector.val( '' );
									if ( '' !== privacySelector ) {
										privacySelector.val( 'public' );
									}
									$( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span:not(.hidden)' ).each(
										function ( i ) {

											if ( i > 0 ) {
												if ( $( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item' ).width() > $( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb' ).width() ) {

													$( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span.hidden' ).append( $( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span' ).eq( 2 ) );

													if ( ! $( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item .more_options' ).length ) {
														  $( '<span class="more_options">...</span>' ).insertAfter( $( targetPopup ).find( '.breadcrumbs-append-ul-li .breadcrumb .item span' ).eq( 0 ) );
													}

												}
											}
										}
									);

									currentAction.removeClass( 'loading' );
								}
							}
						}
					);
					this.currentTargetParent = newParent;
					targetPopup.find( '.location-album-list li.is_active' ).show().children( 'span, i' ).show().siblings( 'ul' ).hide();
					targetPopup.find( '.location-album-list li.is_active' ).siblings( 'li' ).show().children( 'span, i' ).show().siblings( 'ul' ).hide();
					targetPopup.find( '.location-album-list li span.selected' ).removeClass( 'selected' );
					targetPopup.find( '.location-album-list li.is_active' ).children( 'span' ).addClass( 'selected' );
				},
				0
			);
		},
	};

	// Launch BP Nouveau Video.
	bp.Nouveau.Video.start();

	/**
	 * [Video description]
	 *
	 * @type {Object}
	 */
	bp.Nouveau.Video.Theatre = {

		/**
		 * [start description]
		 *
		 * @return {[type]} [description]
		 */
		start: function () {
			this.setupGlobals();

			// Listen to events ("Add hooks!").
			this.addListeners();

		},

		/**
		 * [setupGlobals description]
		 *
		 * @return {[type]} [description]
		 */
		setupGlobals: function () {

			this.videos              = [];
			this.current_video       = false;
			this.current_video_index = 0;
			this.is_open_video       = false;
			this.nextVideoLink       = $( '.bb-next-media' );
			this.previousVideoLink   = $( '.bb-prev-media' );
			this.activity_ajax       = false;
			this.group_id            = typeof BP_Nouveau.video.group_id !== 'undefined' ? BP_Nouveau.video.group_id : false;

		},

		/**
		 * [addListeners description]
		 */
		addListeners: function () {

			$( document ).on( 'click', '.bb-open-video-theatre', this.openTheatre.bind( this ) );
			$( document ).on( 'click', '.bb-prev-media', this.previous.bind( this ) );
			$( document ).on( 'click', '.bb-next-media', this.next.bind( this ) );
			$( document ).on( 'click', '.bp-add-video-activity-description', this.openVideoActivityDescription.bind( this ) );
			$( document ).on( 'click', '#bp-activity-description-new-reset', this.closeVideoActivityDescription.bind( this ) );
			$( document ).on( 'click', '#bp-activity-description-new-submit', this.submitVideoActivityDescription.bind( this ) );
			$( document ).on( 'bp_activity_ajax_delete_request_video', this.videoActivityDeleted.bind( this ) );

		},
		openTheatre: function ( event ) {
			event.preventDefault();
			var target = $( event.currentTarget ), id, self = this;

			// alert("openTheatre called");
			// alert(target);
			if ( target.closest( '#bp-existing-video-content' ).length ) {
				return false;
			}
			// alert("Not return");

			self.setupGlobals();
			self.setVideos( target );

			id = target.data( 'id' );
			self.setCurrentVideo( id );
			self.showVideo();
			self.navigationCommands();

			if ( typeof BP_Nouveau.activity !== 'undefined' && self.current_video && typeof self.current_video.activity_id !== 'undefined' && self.current_video.activity_id != 0 && ! self.current_video.is_forum ) {
				self.getActivity();
			} else {
				self.getVideosDescription();
			}

			$( '.bb-media-model-wrapper.document' ).hide();
			$( '.bb-media-model-wrapper.video' ).show();
			self.is_open_video = true;

			// document.addEventListener( 'keyup', self.checkPressedKey.bind( self ) );
		},

		getVideosDescription: function () {
			var self = this;

			$( '.bb-media-info-section .activity-list' ).addClass( 'loading' ).html( '<i class="bb-icon-loader animate-spin"></i>' );

			if ( self.activity_ajax != false ) {
				self.activity_ajax.abort();
			}

			self.activity_ajax = $.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: {
						action: 'video_get_video_description',
						id: self.current_video.id,
						attachment_id: self.current_video.attachment_id,
						nonce: BP_Nouveau.nonces.video
					},
					success: function ( response ) {
						if ( response.success ) {
							$( '.bb-media-model-wrapper.video .bb-media-section' ).find( 'figure' ).html( response.data.video_data );
							$( '.bb-media-info-section:visible .activity-list' ).removeClass( 'loading' ).html( response.data.description );
							$( '.bb-media-info-section:visible' ).show();
							$( window ).scroll();
						} else {
							$( '.bb-media-info-section.media' ).hide();
						}
					}
				}
			);
		},

		setVideos: function ( target ) {
			var video_elements = $( '.bb-open-video-theatre' ), i = 0, self = this;
			// check if on activity page, load only activity video in theatre.
			if ( $( 'body' ).hasClass( 'activity' ) ) {
				video_elements = $( target ).closest( '.bb-activity-video-wrap' ).find( '.bb-open-video-theatre' );
			}

			if ( typeof video_elements !== 'undefined' ) {
				self.videos = [];
				for ( i = 0; i < video_elements.length; i++ ) {
					var video_element = $( video_elements[ i ] );
					if ( ! video_element.closest( '#bp-existing-media-content' ).length ) {

						var m = {
							id: video_element.data( 'id' ),
							attachment: video_element.data( 'attachment-full' ),
							activity_id: video_element.data( 'activity-id' ),
							attachment_id: video_element.data( 'attachment-id' ),
							privacy: video_element.data( 'privacy' ),
							parent_activity_id: video_element.data( 'parent-activity-id' ),
							album_id: video_element.data( 'album-id' ),
							group_id: video_element.data( 'group-id' ),
							is_forum: false
						};

						if ( video_element.closest( '.forums-media-wrap' ).length ) {
							m.is_forum = true;
						}

						if ( typeof m.privacy !== 'undefined' && m.privacy == 'message' ) {
							m.is_message = true;
						} else {
							m.is_message = false;
						}

						self.videos.push( m );
					}
				}
			}
		},
		setCurrentVideo: function ( id ) {
			var self = this, i = 0;
			for ( i = 0; i < self.videos.length; i++ ) {
				if ( id === self.videos[ i ].id ) {
					self.current_video = self.videos[ i ];
					self.current_index = i;
					break;
				}
			}
		},
		showVideo: function () {
			var self = this;
			if ( typeof self.current_video === 'undefined' ) {
				return false;
			}
			// refresh video.
			$( '.bb-media-model-wrapper.video .bb-media-section' ).find( 'figure' ).addClass( 'loading' ).html( '<i class="bb-icon-loader animate-spin"></i>' );

			// privacy.
			var video_privacy_wrap = $( '.bb-media-section .bb-media-privacy-wrap' );

			if ( video_privacy_wrap.length ) {
				video_privacy_wrap.show();
				video_privacy_wrap.find( 'ul.media-privacy li' ).removeClass( 'selected' );
				video_privacy_wrap.find( '.bp-tooltip' ).attr( 'data-bp-tooltip', '' );
				var selected_video_privacy_elem = video_privacy_wrap.find( 'ul.media-privacy' ).find( 'li[data-value=' + self.current_video.privacy + ']' );
				selected_video_privacy_elem.addClass( 'selected' );
				video_privacy_wrap.find( '.bp-tooltip' ).attr( 'data-bp-tooltip', selected_video_privacy_elem.text() );
				video_privacy_wrap.find( '.privacy' ).removeClass( 'public' ).removeClass( 'loggedin' ).removeClass( 'onlyme' ).removeClass( 'friends' ).addClass( self.current_video.privacy );

				// hide privacy setting of video if activity is present.
				if ( ( typeof BP_Nouveau.activity !== 'undefined' &&
					typeof self.current_video.activity_id !== 'undefined' &&
					self.current_video.activity_id != 0 ) ||
					self.group_id ||
					self.current_video.is_forum ||
					self.current_video.group_id ||
					self.current_video.album_id ||
					self.current_video.is_message
				) {
					video_privacy_wrap.hide();
				}
			}

			// update navigation.
			self.navigationCommands();
		},
		navigationCommands: function () {
			var self = this;
			if ( self.current_index == 0 && self.current_index != ( self.videos.length - 1 ) ) {
				self.previousVideoLink.hide();
				self.nextVideoLink.show();
			} else if ( self.current_index == 0 && self.current_index == ( self.videos.length - 1 ) ) {
				self.previousVideoLink.hide();
				self.nextVideoLink.hide();
			} else if ( self.current_index == ( self.videos.length - 1 ) ) {
				self.previousVideoLink.show();
				self.nextVideoLink.hide();
			} else {
				self.previousVideoLink.show();
				self.nextVideoLink.show();
			}
		},
		next: function ( event ) {
			event.preventDefault();
			var self = this, activity_id;
			self.resetRemoveActivityCommentsData();
			if ( typeof self.videos[ self.current_index + 1 ] !== 'undefined' ) {
				self.current_index = self.current_index + 1;
				activity_id        = self.current_video.activity_id;
				self.current_video = self.videos[ self.current_index ];
				self.showVideo();
				if ( activity_id != self.current_video.activity_id ) {
					self.getActivity();
				} else {
					self.getVideosDescription();
				}
			} else {
				self.nextLink.hide();
			}
		},

		previous: function ( event ) {
			event.preventDefault();
			var self = this, activity_id;
			self.resetRemoveActivityCommentsData();
			if ( typeof self.videos[ self.current_index - 1 ] !== 'undefined' ) {
				self.current_index = self.current_index - 1;
				activity_id        = self.current_video.activity_id;
				self.current_video = self.videos[ self.current_index ];
				self.showVideo();
				if ( activity_id != self.current_video.activity_id ) {
					self.getActivity();
				} else {
					self.getVideosDescription();
				}
			} else {
				self.previousLink.hide();
			}
		},

		resetRemoveActivityCommentsData: function () {
			var self = this, activity_comments = false, activity_meta = false, activity_state = false, activity = false,
				html = false, classes = false;
			if ( self.current_video.parent_activity_comments ) {
				activity          = $( '.bb-media-model-wrapper.video [data-bp-activity-id="' + self.current_video.activity_id + '"]' );
				activity_comments = activity.find( '.activity-comments' );
				if ( activity_comments.length ) {
					html    = activity_comments.html();
					classes = activity_comments.attr( 'class' );
					activity_comments.remove();
					activity_comments = $( '[data-bp-activity-id="' + self.current_video.activity_id + '"] .activity-comments' );
					if ( activity_comments.length ) {
						activity_comments.html( html );
						activity_comments.attr( 'class', classes );
					}
				}
				activity_state = activity.find( '.activity-state' );
				if ( activity_state.length ) {
					html    = activity_state.html();
					classes = activity_state.attr( 'class' );
					activity_state.remove();
					activity_state = $( '[data-bp-activity-id="' + self.current_video.activity_id + '"] .activity-state' );
					if ( activity_state.length ) {
						activity_state.html( html );
						activity_state.attr( 'class', classes );
					}
				}
				activity_meta = activity.find( '.activity-meta' );
				if ( activity_meta.length ) {
					html    = activity_meta.html();
					classes = activity_meta.attr( 'class' );
					activity_meta.remove();
					activity_meta = $( '[data-bp-activity-id="' + self.current_video.activity_id + '"] .activity-meta' );
					if ( activity_meta.length ) {
						activity_meta.html( html );
						activity_meta.attr( 'class', classes );
					}
				}
				activity.remove();
			}
		},

		getActivity: function () {
			var self = this;

			$( '.bb-video-info-section .activity-list' ).addClass( 'loading' ).html( '<i class="bb-icon-loader animate-spin"></i>' );

			if ( typeof BP_Nouveau.activity !== 'undefined' &&
				self.current_video &&
				typeof self.current_video.activity_id !== 'undefined' &&
				self.current_video.activity_id != 0 &&
				! self.current_video.is_forum
			) {

				if ( self.activity_ajax != false ) {
					self.activity_ajax.abort();
				}

				$( '.bb-media-info-section.media' ).show();
				var on_page_activity_comments = $( '[data-bp-activity-id="' + self.current_video.activity_id + '"] .activity-comments' );
				if ( on_page_activity_comments.length ) {
					self.current_video.parent_activity_comments = true;
					on_page_activity_comments.html( '' );
				}

				self.activity_ajax = $.ajax(
					{
						type: 'POST',
						url: BP_Nouveau.ajaxurl,
						data: {
							action: 'video_get_activity',
							id: self.current_video.activity_id,
							group_id: ! _.isUndefined( self.current_video.group_id ) ? self.current_video.group_id : 0,
							video_id: ! _.isUndefined( self.current_video.id ) ? self.current_video.id : 0,
							nonce: BP_Nouveau.nonces.video
						},
						success: function ( response ) {
							if ( response.success ) {

								$( '.bb-media-model-wrapper.video .bb-media-section' ).find( 'figure' ).html( response.data.video_data );
								$( '.bb-media-info-section:visible .activity-list' ).removeClass( 'loading' ).html( response.data.activity );
								$( '.bb-media-info-section:visible' ).show();

								jQuery( window ).scroll();
							}
						}
					}
				);
			} else {
				$( '.bb-media-info-section.media' ).hide();
			}
		},

		openVideoActivityDescription: function ( event ) {
			event.preventDefault();
			var target = $( event.currentTarget );

			if ( target.parents( '.activity-video-description' ).find( '.bp-edit-video-activity-description' ).length < 1 ) {
				return false;
			}

			target.parents( '.activity-video-description' ).find( '.bp-edit-video-activity-description' ).show().addClass( 'open' );
			target.parents( '.activity-video-description' ).find( '.bp-video-activity-description' ).hide();
			target.hide();
		},

		closeVideoActivityDescription: function ( event ) {
			event.preventDefault();
			var target = $( event.currentTarget );

			if ( target.parents( '.activity-video-description' ).length < 1 ) {
				return false;
			}

			var default_value = target.parents( '.activity-video-description' ).find( '#add-activity-description' ).get( 0 ).defaultValue;

			target.parents( '.activity-video-description' ).find( '.bp-add-video-activity-description' ).show();
			target.parents( '.activity-video-description' ).find( '.bp-video-activity-description' ).show();
			target.parents( '.activity-video-description' ).find( '#add-activity-description' ).val( default_value );
			target.parents( '.activity-video-description' ).find( '.bp-edit-video-activity-description' ).hide().removeClass( 'open' );
		},

		submitVideoActivityDescription: function ( event ) {
			event.preventDefault();

			var target        = $( event.currentTarget ),
				parent_wrap   = target.parents( '.activity-video-description' ),
				description   = parent_wrap.find( '#add-activity-description' ).val(),
				attachment_id = parent_wrap.find( '#bp-attachment-id' ).val();

			var data = {
				'action': 'video_description_save',
				'description': description,
				'attachment_id': attachment_id,
				'_wpnonce': BP_Nouveau.nonces.video,
			};

			$.ajax(
				{
					type: 'POST',
					url: BP_Nouveau.ajaxurl,
					data: data,
					async: false,
					success: function ( response ) {
						if ( response.success ) {
							target.parents( '.activity-video-description' ).find( '.bp-video-activity-description' ).html( response.data.description ).show();
							target.parents( '.activity-video-description' ).find( '.bp-add-video-activity-description' ).show();
							parent_wrap.find( '#add-activity-description' ).val( response.data.description );
							parent_wrap.find( '#add-activity-description' ).get( 0 ).defaultValue = response.data.description;
							if ( response.data.description == '' ) {
								target.parents( '.activity-video-description' ).find( '.bp-add-video-activity-description' ).removeClass( 'show-edit' ).addClass( 'show-add' );
							} else {
								target.parents( '.activity-video-description' ).find( '.bp-add-video-activity-description' ).addClass( 'show-edit' ).removeClass( 'show-add' );
							}

							target.parents( '.activity-video-description' ).find( '.bp-edit-video-activity-description' ).hide().removeClass( 'open' );
							target.parents( '.activity-video-description' ).find( '.bp-video-activity-description' ).show();
							target.parents( '.activity-video-description' ).find( '.bp-feedback.error' ).remove();
						} else {
							target.parents( '.activity-video-description' ).prepend( response.data.feedback );
						}
					}
				}
			);
		},

		videoActivityDeleted: function ( event, data ) {
			var self = this, i = 0;
			if ( self.is_open_video && typeof data !== 'undefined' && data.action === 'delete_activity' && self.current_video.activity_id == data.id ) {

				$( document ).find( '[data-bp-list="video"] .bb-open-video-theatre[data-id="' + self.current_video.id + '"]' ).closest( 'li' ).remove();
				$( document ).find( '[data-bp-list="activity"] .bb-open-video-theatre[data-id="' + self.current_video.id + '"]' ).closest( '.bb-activity-video-elem' ).remove();

				for ( i = 0; i < self.videos.length; i++ ) {
					if ( self.videos[ i ].activity_id == data.id ) {
						self.videos.splice( i, 1 );
						break;
					}
				}

				if ( self.current_index == 0 && self.current_index != ( self.videos.length ) ) {
					self.current_index = -1;
					self.next( event );
				} else if ( self.current_index == 0 && self.current_index == ( self.videos.length ) ) {
					$( document ).find( '[data-bp-list="activity"] li.activity-item[data-bp-activity-id="' + self.current_video.activity_id + '"]' ).remove();
					self.closeTheatre( event );
				} else if ( self.current_index == ( self.videos.length ) ) {
					self.previous( event );
				} else {
					self.current_index = -1;
					self.next( event );
				}
			}
		},
	};

	// Launch BP Nouveau Video Theatre.
	bp.Nouveau.Video.Theatre.start();

	/**
	 * [Video Player description]
	 *
	 * @type {Object}
	 */
	bp.Nouveau.Video.Player = {

		/**
		 * [start description]
		 *
		 * @return {[type]} [description]
		 */
		start: function () {
			this.setupGlobals();

			// Listen to events ("Add hooks!").
			this.addListeners();

		},

		/**
		 * [setupGlobals description]
		 *
		 * @return {[type]} [description]
		 */
		setupGlobals: function () {

			// Video File Activity Preview.
			bp.Nouveau.Video.Player.openPlayer();

			$( window ).on(
				'scroll resize',
				function () {
					bp.Nouveau.Video.Player.openPlayer();
				}
			);

		},

		/**
		 * [addListeners description]
		 */
		addListeners: function () {

			$( document ).on( 'click', '.video-js', this.openPlayer.bind( this ) );

		},

		openPlayer: function () {

			$( '.video-js:not(.loaded)' ).each(
				function () {

					var self    = this;
					var options = {};

					videojs(
						self,
						options,
					function onPlayerReady() {
						this.on(
							'ended',
							function () {
							}
						);
					}
					);

					$( this ).addClass( 'loaded' );
				}
			);

		},
	};

	// Launch BP Nouveau Video Player.
	bp.Nouveau.Video.Player.start();

} )( bp, jQuery );