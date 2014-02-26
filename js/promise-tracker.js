var apApp = apApp || {
  'settings': {}
};
(function($) {
// apApp.settings.mode = 'dev';
apApp.settings.mode = 'prod';
if (apApp.settings.mode == 'dev') {
  apApp.settings.serverUrl = 'http://drupal7.dev/ap/';
} else {
  // apApp.settings.serverUrl = 'http://drupal7.dev/ap/';
  apApp.settings.serverUrl = 'http://dev.uncharteddigital.com/ap/';
}
apApp.settings.cron = '';
apApp.settings.restUrl = apApp.settings.serverUrl + 'ap/rest/';
apApp.settings.cron_safe_threshold = 1 * 60; // 2 minute;
apApp.settings.dbPromiseTracker;
apApp.settings.timestamp = parseInt(new Date().getTime() / 1000);
apApp.settings.tips = {};
apApp.settings.FullPath;
apApp.settings.relationships = [];
apApp.settings.topicTids = [];
apApp.settings.profileUID;
apApp.settings.DbQueryCall;
apApp.settings.createNewChild;
apApp.settings.Connection;
apApp.settings.registation;
apApp.settings.queryExclude = {
  'init': true
};
apApp.settings.uploadQueryExclude = {};
apApp.settings.userProfile = {};
apApp.settings.goalsInvite = {};

// device APIs are available
document.addEventListener("deviceready", initApp, false);

// Initialize All functions
function initApp() {
  checkConnection();
  db();
  events();
  html();
}

function checkConnection() {
  if (apApp.settings.mode != 'dev') {
    var networkState = navigator.connection.type;
    if (Connection.NONE == networkState) {
      apApp.settings.Connection = false;
    } else {
      apApp.settings.Connection = true;
    }
  }
  else {
    apApp.settings.Connection = true;
  }
}

// Connect database
function db() {
  $.mobile.loading('show');
  if (window.requestFileSystem !== undefined) {
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, onFileSystemSuccess, _onFail);
  }
  apApp.settings.dbPromiseTracker = window.openDatabase("Database", "1.0", "PromiseTracker", 200000);
  apApp.settings.dbPromiseTracker.transaction(_dbInit, function(err) {
    _errorHandler(err, 275);
  });
}

// Copy main menu to all div[data-role="page"]
function html() {
  // copy main menu
  $('div[data-role="page"]').each(function(idx, el) {
    var $page = $(this);
    if ($page.has('#main-menu').length === 0) {
      var $panel = $('#home #main-menu').clone();
      $page.prepend($panel);
    }
  });
  $('div.ui-page nav[data-role="panel"]').trigger('updatelayout');

  $(document).on('swipeleft', '#message-popup > *', function(e) {
    $(this).hide(200);
  });
  // registration section
  // step 1: Create profile
  $('#submit-create-profile').on('click', function(e) {
    $("#message-popup label").hide(200, function() {
      $(this).remove();
    });
    var name = $('#create-profile-name').val(),
      image_path = $('#create-profile-photo-img').attr('src'),
      email = $('#create-profile-email').val(),
      password = $('#create-profile-confirm-password').val();
    if ($('#registration-first-step form .error').get(0)) {

    } else if (!name) {
      _messagePopup('Name is required.', true);
    } else if (!email) {
      _messagePopup('Email is required.', true);
    } else if (!password) {
      _messagePopup('Password is required.', true);
    } else {
      if ($(this).attr('data-disabled') == 'false') {
        _createUserProfile();
        $(this).attr('data-disabled', 'true');
      }
    }
    e.preventDefault();
  });
  // step 2: Assing child
  $('#submit-assing-children').on('click', function(e) {
    apApp.settings.createNewChild = false;
    $('#my-childrens-village li').each(function() {
      var $li = $(this);
      if ($li.find('select').get(0)) {
        var cid = $li.find('select').attr('data-cid');
        var relationship = $li.find('select').val();
        var data = {
          'uid': apApp.settings.profileUID,
          'cid': cid,
          'relationship': relationship
        }
        _insertRelationship(data);
        _updateChildTime(data);
      }
    });
    $.mobile.changePage('#registration-third-step', {
      transition: "slide"
    });
    e.preventDefault();
  });
  // step 2: Create child
  $('#submit-create-child').on('click', function(e) {
    apApp.settings.createNewChild = true;
    var name = $('#create-child-first-name').val(),
      birthDate = $('#create-child-birth-date').val(),
      image_path = $('#create-child-photo-img').attr('src'),
      relationship = $('#create-child-relationship').val();
    if ($('#registration-second-step form .error').get(0)) {

    } else if (!name) {
      _messagePopup('First Name is required.', true);
    } else if (!birthDate) {
      _messagePopup('Birthdate is required.', true);
    } else if (!relationship) {
      _messagePopup('Relationship is required.', true);
    } else if (!image_path) {
      _messagePopup('Image is required.', true);
    } else {
      $.mobile.changePage('#registration-third-step', {
        transition: "slide"
      });
    }
    e.preventDefault();
  });
  // step 3: Get started
  $('#submit-get-started').on('click', function(e) {
    if ($(this).attr('data-disabled') == 'false') {
      $(this).attr('data-disabled', 'true');
      _getStarted();
    }
    e.preventDefault();
  });
  $('#submit-update-child').on('click', function(e) {
    var data = {
      'cid': parseInt($(window).data('cid')),
      'uid': apApp.settings.profileUID,
      'updated': parseInt(new Date().getTime() / 1000),
      'first_name': $('#edit-child-first-name').val(),
      'last_name': $('#edit-child-last-name').val(),
      'birth_date': $('#edit-child-birth-date').val(),
      'image_path': $('#edit-child-photo-img').attr('src'),
      'update_photo': 0
    };

    if ($('#edit-child-photo-img').attr('src') != $('#edit-child-photo-img').data('osrc')) {
      data.update_photo = 1;
    }

    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('UPDATE childs ' +
        'SET first_name = ?, last_name = ?, birth_date = ?, image_path = ?, ' +
        'updated = ?, update_photo = ? ' +
        'WHERE cid = ?', [data.first_name, data.last_name, data.birth_date, data.image_path, data.updated, data.update_photo, data.cid],
        function(tx, results) {
          var cid = data.cid,
            reloadPage = false,
            villageSize = $('#edit-assign-village li.visible').size();
          if (villageSize > 0) {
            $('#edit-assign-village li.visible').each(function(idx, el) {
              if (idx + 1 == villageSize) {
                reloadPage = true;
              }
              var uid = $('select', this).data('uid'),
                relationship = $('select', this).val();
              tx.executeSql('UPDATE child_index ' +
                'SET relationship = ? ' +
                'WHERE cid = ? AND uid = ?', [relationship, cid, uid],
                function(tx, results) {
                  if (reloadPage) {
                    _reloadPage();
                  }
                }, function(err) {
                  _errorHandler(err, 383);
                });
            });
          } else {
            _reloadPage();
          }
        }, function(err) {
          _errorHandler(err, 389);
        });
    }, function(err) {
      _errorHandler(err, 390);
    });
    e.preventDefault();
  });
}

function events() {
  var childsCycleInit = false;
  if (window.plugin != undefined) {
    window.plugin.notification.local.onadd = function(id, state, json) {
      _messagePopup('Reminder id:' + id + ' has been added successfully.', false);
    }
    window.plugin.notification.local.onclick = function(id, state, json) {
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('SELECT r.title, r.message ' +
          'FROM reminder AS r ' +
          'WHERE r.rid = ?', [id], function(tx, results) {
            var len = results.rows.length;
            if (len) {
              var item = results.rows.item(0);
              _messagePopup('Reminder: ' + item.title + '. ' + item.message, false);
            }
          }, function(err) {
            _errorHandler(err, 233);
          });
      });
    };
  }
  $('#home .iscroll-wrapper').on('iscroll_onpulldown', _reloadPage);
  // jquery mobile events
  $(document)
    .on('pageinit', function(e) {
      $('.iscroll-wrapper', this).on('iscroll_onpulldown', _reloadPage);
    })
    .on('pagebeforeshow', function(e) { // event pagebeforeshow
      var pageId = $.mobile.activePage.attr('id');
      if (pageId != undefined) {
        var cid;
        if (pageId.indexOf('children-') >= 0 ||
          pageId.indexOf('search-goals-') >= 0 ||
          pageId.indexOf('add-goal-') >= 0) {
          var cid = $(e.target).data('cid');
          $(window).data('cid', cid);
          $('[data-role="panel"] a.search')
            .attr('href', '#search-goals-' + cid);
          $('#add-vilage-goals')
            .attr('href', '#children-' + cid);
          $('#my-goals li[data-icon="plus"] a')
            .attr('href', '#children-' + cid);
        }
      }
      setTimeout(function() {
        var iscrollView = $.mobile.activePage.find('.iscroll-wrapper').data('mobileIscrollview');
        if (iscrollView) {
          iscrollView.refresh();
        }
      }, 1000);
    })
    .on('pagebeforeshow', '#edit-child', function(e) {
      var cid = $(window).data('cid');
      if (cid !== undefined) {
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('SELECT c.first_name, c.last_name, c.birth_date, ' +
            'c.image_path ' +
            'FROM childs AS c ' +
            'WHERE c.cid = ?', [cid],
            function(tx, results) {
              var len = results.rows.length;
              if (len) {
                var item = results.rows.item(0);
                if (item !== undefined) {
                  $('#edit-child-fname').text(item.first_name);
                  $('#edit-child-first-name').val(item.first_name);
                  $('#edit-child-last-name').val(item.last_name);
                  $('#edit-child-birth-date').val(item.birth_date).change();
                  $('#edit-child-photo-img')
                    .attr('src', item.image_path)
                    .data('osrc', item.image_path);
                  // assign-village
                  tx.executeSql('SELECT u.uid, ci.relationship ' +
                    'FROM users AS u ' +
                    'LEFT JOIN child_index AS ci ON ci.uid = u.uid ' +
                    'WHERE ci.cid = ? ' +
                    'ORDER BY ci.uid ASC', [cid],
                    function(tx, results) {
                      var len = results.rows.length;
                      if (len) {
                        $('#edit-assign-village li.visible')
                          .addClass('hidden').removeClass('visible');
                        for (var i = 0; i < len; i++) {
                          var item = results.rows.item(i);
                          $('#edit-assign-village li[data-uid="' + item.uid + '"]')
                            .addClass('visible').removeClass('hidden')
                            .find('select').val(item.relationship).change();
                        }
                      }
                    }, function(err) {
                      _errorHandler(err, 452);
                    });
                }
              }
            }, function(err) {
              _errorHandler(err, 455);
            });
        });
      }
    })
    .on('pagebeforeshow', '#goal-settings', function(e, data) {
      // apApp.settings.dbPromiseTracker.transaction(function(tx) {
        // var timestp = parseInt(new Date().getTime() / 1000); // timestamp
        // tx.executeSql('INSERT INTO users (uid_origin, password, name, last_name, email, image_path, updated, created, status, update_photo) ' +
        //   'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        //   [0, 'testq', 'testqw', 'sadasdq', 'testusq@mail.dev', 'images/img/img01.jpg', timestp, timestp, 1, 1],
        //   function(tx, results) {
        //     _messagePopup('Person has been added.', false);
        //   }, function(err) {
        //     _errorHandler(err, 323);
        //   });

        // tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
        //   'VALUES (?, ?, ?)',
        //   [1, 2, 2],
        //   function(tx, results) {
        //     _messagePopup('Per222.', false);
        //   }, function(err) {
        //     _errorHandler(err, 323);
        //   });

        // tx.executeSql('SELECT * FROM users', [], _selectShowContentCB,
        //   function(err) {
        //     _errorHandler(err, 317);
        //   });
        //  tx.executeSql('SELECT * FROM child_index', [], _selectShowContentCB,
        //   function(err) {
        //     _errorHandler(err, 317);
        //   });
      // });
      var winData = $(window).data();
      $('#goal-settings-child-image').attr('src', winData.image_path);
      $('#goal-settings-first-name').text(winData.first_name);
      $('#goal-settings-title').text(winData.title);
      $('#goal-repeat').val('').change();
      $('#goal-time').val('').change();
      $('#goal-interval').val('').change();
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('SELECT u.uid, u.name, u.image_path ' +
          'FROM users AS u ' +
          'LEFT JOIN child_index AS ci ON ci.uid = u.uid ' +
          'WHERE ci.cid = ? ' +
          'ORDER BY ci.uid ASC', [winData.cid], function(tx, results) {
            var len = results.rows.length;
            if (len) {
              var $reminderPersons = $('#reminder-persons'),
                  uid = apApp.settings.profileUID;
              $reminderPersons.find('li').remove();
              for (var i = 0; i < len; i++) {
                var item = results.rows.item(i);
                var inlinePerson = _getHtml('inlinePerson', item);
                var person = '<span class="rounded"><span class="rounded-inner"><img src="' +
                  item.image_path + '" alt="" /></span></span>';
                $reminderPersons.append(inlinePerson);
              }
              $reminderPersons.find('li[data-uid="' + uid + '"]')
                .addClass('user active');
            }
          },
          function(err) {
            _errorHandler(err, 337);
          });

        // console.dirxml(winData);

        tx.executeSql('SELECT ri.uid, r.title, r.repeat, r.interval ' +
          'FROM reminder AS r ' +
          'LEFT JOIN reminder_index AS ri ON ri.rid = r.rid ' +
          'WHERE ri.cid = ? AND ri.gid = ? ' +
          'ORDER BY r.title ASC', [winData.cid, winData.gid], function(tx, results) {
            var len = results.rows.length;
            if (len) {
              for (var i = 0; i < len; i++) {
                var item = results.rows.item(i);
                $('#reminder-persons li[data-uid="' + item.uid + '"]').addClass('active');
              }
              var item = results.rows.item(1);
              console.dirxml(item);
              $('#goal-repeat').val(item.repeat).change().attr('rel', item.repeat);
              $('#goal-time').val(item.time).change().attr('rel', item.time);
              $('#goal-interval').val(item.interval).change().attr('rel', item.interval);
            }
          },
          function(err) {
            _errorHandler(err, 408);
          });
      });
    })
    .on('click', '#reminder-persons li', function(e) {
      if (!$(this).hasClass('user')) {
        $(this).toggleClass('active');
      }
      e.preventDefault();
    })
    .on('change', '#goal-repeat', function(e) {
      var itemValue = $(this).val();
      $('#goal-interval option').prop({
        'disabled': false,
      });
      $('#goal-interval').val('').change();
      switch (itemValue) {
        case 'daily':
          $('#goal-interval option[value*="monthly"]').prop('disabled', true);
          $('#goal-interval option[value*="yearly"]').prop('disabled', true);
          break;
        case 'weekly':
          $('#goal-interval option[value*="daily"]').prop('disabled', true);
          break;
        case 'monthly':
          $('#goal-interval option[value*="daily"]').prop('disabled', true);
          $('#goal-interval option[value*="weekly"]').prop('disabled', true);
          break;
        case 'yearly':
          $('#goal-interval option[value*="daily"]').prop('disabled', true);
          $('#goal-interval option[value*="weekly"]').prop('disabled', true);
          $('#goal-interval option[value*="monthly"]').prop('disabled', true);
          break;
      }
    })
    .on('pagechange', function(e) { // event pagechange
      // add active class on children pager
      var $pager = $('ul.list-pagerer.large.children-pager');
      var pageId = $.mobile.activePage.attr('id');
      if ($.mobile.activePage.find('.list-pagerer li').size() <= 1) {
        $.mobile.activePage.find('.list-pagerer').hide();
      }
      $pager.find('li.active').removeClass('active');
      $pager.find('a[href*="' + pageId + '"]').parent().addClass('active');
      if ($.fn.inFieldLabels) {
        $('label.placeholder').each(function(index, el) {
          var labelName = $(this).attr('for');
          $("#" + labelName).before(this);
        });
        $('label.placeholder').inFieldLabels();
      }
    })
    .on('pageinit', '#registration-first-step', function() {
      $.validator.addMethod('passmatch', function(value) {
        return value == $("#create-profile-password").val();
      }, 'Incorrect password confirmation.');
      $('#registration-first-step form').validate({
        rules: {
          password: {
            minlength: 5
          },
          password_confirm: {
            minlength: 5,
            equalTo: "#create-profile-password"
          }
        },
        errorPlacement: function(error, element) {
          $("#message-popup label").hide(0, function() {
            $(this).remove();
          });
          setTimeout(function() {
            $(error).hide(200, function() {
              $(this).remove();
            });
          }, 8000);
          error.appendTo("#message-popup");
        }
      });
    })
    .on('pageinit', '#team', function() {
      $("#team form").validate({
        errorPlacement: function(error, element) {
          $("#message-popup label").hide(0, function() {
            $(this).remove();
          });
          setTimeout(function() {
            $(error).hide(200, function() {
              $(this).remove();
            });
          }, 8000);
          error.appendTo("#message-popup");
        }
      });
    })
    .on('pageinit', '#registration-second-step', function() {
      $("#registration-second-step form").validate({
        errorPlacement: function(error, element) {
          $("#message-popup label").hide(0, function() {
            $(this).remove();
          });
          setTimeout(function() {
            $(error).hide(200, function() {
              $(this).remove();
            });
          }, 8000);
          error.appendTo("#message-popup");
        }
      });
    })
    .on('pageinit', '#sign-in', function() {
      $("#sign-in form").validate({
         messages: {
           'sign-in-email' : {
             required: "Email is required",
             email: "Please enter correct email"
           },
           'sign-in-password' : {
             required :  "Password is required"
           }
        },
        errorPlacement: function(error, element) {
          $("#message-popup label").hide(0, function() {
            $(this).remove();
          });
          setTimeout(function() {
            $(error).hide(200, function() {
              $(this).remove();
            });
          }, 8000);
          error.appendTo("#message-popup");
        },
        submitHandler: function(form) {
          // some other code
          var data = {
            'email' : $("#sign-in form #sign-in-email").val(),
            'password' : $("#sign-in form #sign-in-password").val()
          }
          if ( $('#submit-sign-in').attr('data-disabled') == 'false') {
            _loginToApp(data);
            $('#submit-sign-in').attr('data-disabled','true');
          }
        }
      });
    })
    .on('change', 'input[type="date"]', function() {
      var inputName = $(this).attr('name');
      var $labelFor = $('label[for="' + inputName + '"]');
      if ($(this).val() != '') {
        $labelFor.hide();
      } else {
        $labelFor.show();
      }
    })
    // event swipe child image
    .on('swipeleft swiperight', '[data-role="page"] .child.item.inner',
      function(e) {
        switch (e.type) {
          case 'swipeleft':
            _swipeChildrenInfo('next'); // swipe events on children page
            break;
          case 'swiperight':
            _swipeChildrenInfo('prev'); // swipe events on children page
            break;
        }
      }
    )
    .on('swipeleft swiperight', 'li.checked-goal a', function(e) {
      switch (e.type) {
        case 'swipeleft':
          $(this).parents('ul').find('li.prepare-remove')
            .removeClass('prepare-remove');
          $(this).parents('li').addClass('prepare-remove');
          break;
        case 'swiperight':
          $(this).parents('ul').find('li.prepare-remove')
            .removeClass('prepare-remove');
          break;
      }
    })
    .on('click', 'li.checked-goal span.ui-icon', function(e) {
      $.mobile.loading('show');
      var $goal = $(this).parents('li.checked-goal');
      var data = {};
      data.cid = $goal.data('cid');
      data.gid = $goal.data('gid');
      if ($goal.hasClass('checked')) {
        data.completed = 0;
      } else {
        data.completed = 1;
      }
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        var timestp = parseInt(new Date().getTime() / 1000); // timestamp
        tx.executeSql('UPDATE goal_index SET completed = ?, updated = ? ' +
          'WHERE uid = ? AND cid = ? AND gid = ?', [data.completed, timestp, apApp.settings.profileUID, data.cid, data.gid],
          function(tx, results) {
            if ($goal.hasClass('checked')) {
              $('#my-goals li[data-gid="' + data.gid + '"]')
                .removeClass('checked');
              $('#village-goals li[data-gid="' + data.gid + '"]')
                .removeClass('checked');
              $goal.removeClass('checked');
            } else {
              $('#my-goals li[data-gid="' + data.gid + '"]')
                .addClass('checked');
              $('#village-goals li[data-gid="' + data.gid + '"]')
                .addClass('checked');
              $goal.addClass('checked');
            }
            _messagePopup('Goal was updated.', false);
            $.mobile.loading('hide');
          }, function(err) {
            _errorHandler(err, 597);
          });
      }, function(err) {
        _errorHandler(err, 598);
      });
      e.preventDefault();
    })
    .on('click', 'div.assign-village-holder a.submit', function(e) {
      var $holder = $(this).parents('div.assign-village-holder');
      $holder.find('li.hidden').slideToggle(200);
      $holder.find('ul').toggleClass('editable');
      if ($holder.find('ul').hasClass('editable')) {
        _messagePopup('To add a person swipe left. To remove - swipe right', false);
      }
      _refreshIscroll();
      e.preventDefault();
    })
    .on('swipeleft swiperight', 'ul.assign-village-list li', function(e) {
      if ($(this).parents('ul.assign-village-list').hasClass('editable')) {
        if (!$(this).hasClass('static')) {
          var data = {
            'cid': $(window).data('cid'),
            'uid': parseInt($(this).data('uid')),
            'relationship': parseInt($('select', this).val())
          };
          switch (e.type) {
            case 'swipeleft':
              if (!$(this).hasClass('visible')) {
                if ($.mobile.activePage.attr('id') == 'edit-child') {
                  apApp.settings.dbPromiseTracker.transaction(function(tx) {
                    tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
                      'VALUES (?, ?, 0)', [data.cid, data.uid], function(tx, results) {
                        _messagePopup('Person has been added.', false);
                      }, function(err) {
                        _errorHandler(err, 628);
                      });
                  });
                }
                $(this).addClass('visible');
                $(this).removeClass('hidden');
              }
              break;
            case 'swiperight':
              if (!$(this).hasClass('hidden')) {
                if ($.mobile.activePage.attr('id') == 'edit-child') {
                  apApp.settings.dbPromiseTracker.transaction(function(tx) {
                    tx.executeSql('DELETE FROM child_index WHERE cid = ? AND uid = ?', [data.cid, data.uid], function(tx, results) {
                      _messagePopup('Person has been removed.', false);
                    }, function(err) {
                      _errorHandler(err, 642);
                    });
                  });
                }
                $(this).addClass('hidden');
                $(this).removeClass('visible');
              }
              break;
          }
        }
      }
      e.preventDefault();
    })
    .on('click', '#send-notification', function(e) {
      var firstname = $('#add-to-village-firstname').val(),
        email = $('#add-to-village-email').val();
      if ($('#add-to-village-popup form .error').get(0)) {
        e.preventDefault();
      } else if (!firstname) {
        _messagePopup('Name is required.', true);
        e.preventDefault();
      } else if (!email) {
        _messagePopup('Email is required.', true);
        e.preventDefault();
      } else {
        var $popup = $(this).parents('div[data-role="popup"]');
        $popup.popup('close');
        _sendInvitation();
      }
    })
    .on('click', '.ui-popup-container .popup-buttons a.close', function(e) {
      var $popup = $(this).parents('div[data-role="popup"]');
      $popup.popup('close');
      e.preventDefault();
    })
    .on('click', '.popup-buttons a.invite-button', function(e) {
      var accepted = $(this).attr('data-accepted');
      var $popup = $(this).parents('div[data-role="popup"]');
      var invite_uid = $popup.attr('data-uid-origin');
      var register = $popup.attr('data-register');
      if (register == 1) {
        _handlerInvitationRegister(invite_uid, accepted);
      } else {
        _handlerInvitation(invite_uid, accepted);
      }
      $popup.popup('close');
      e.preventDefault();
    })
  // .on('click', '.ui-popup-container .popup-buttons a.invite', function(e) {
  //   $(this).parents('div[data-role="popup"]').popup('close');
  //   e.preventDefault();
  // })
  .on('click', 'a.main-menu-btn', function(e) {
    $(this).parents('div[data-role="page"]')
      .find('[data-role="panel"]').panel('open');
    e.preventDefault();
  })
    .on('click', 'h1.logo', function(e) { // set logo as link to home page
      $.mobile.changePage('#home', {
        transition: "slide",
        reverse: true
      });
      e.preventDefault();
    })
    .on('click', 'ul.ui-listview li span.delete', function() {
      if ($(this).parents('li').hasClass('checked-goal')) {
        $.mobile.loading('show');
        var $goal = $(this).parents('li');
        var data = {};
        data.cid = $goal.data('cid');
        data.gid = $goal.data('gid');
        data.title = $goal.find('a').text();
        // Update child
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('DELETE FROM goal_index ' +
            'WHERE gid = ? AND cid = ?', [data.gid, data.cid],
            function(tx, results) {
              _deleteGoal(tx, results, data, $goal);
            },
            function(err) {
              _errorHandler(err, 716);
            });
        }, function(err) {
          _errorHandler(err, 717);
        });
      }
    })
    .on('click', 'ul.ui-listview li span.edit', function() {
      var data = {
        'cid': $(window).data('cid'),
        'gid': $(this).parents('li').data('gid'),
        'title': $(this).parents('li').find('a').text(),
        'first_name': $.mobile.activePage.find('.child.item .title').text(),
        'image_path': $.mobile.activePage.find('.child.item img').attr('src')
      };
      $(window).data(data);
      $('#goal-settings').removeClass('is-new-goal').addClass('edit');
      $.mobile.changePage('#goal-settings', {
        allowSamePageTransition: true,
        transition: 'slide'
      });
    })
    .on('click', 'li.checked-goal-plus, .featured-goals .item', function(e) {
      var $goal = $(this);
      var data = {
        'cid': $goal.data('cid'),
        'gid': $goal.data('gid'),
        'status': 1,
        'title': $goal.find('a').text(),
        'age': parseInt($goal.parents('.main').find('.child.item').data('age')),
        'first_name': $goal.parents('.main').find('.child.item span.title').text(),
        'image_path': $goal.parents('.main').find('.child.item img').attr('src'),
        'completed': 0
      };
      $('#goal-settings').removeClass('is-new-goal').removeClass('edit');
      $(window).data(data);
      $.mobile.changePage('#goal-settings', {
        allowSamePageTransition: true,
        transition: 'slide'
      });
      e.preventDefault();
    })
    .on('change', 'select.in-topic', function(e) {
      if (this.value) {
        $.mobile.loading('show');
        var topicID = this.value,
          options = {
            'pagerName': 'add-topic-',
            'topicID': topicID
          },
          globalCid = $(window).data('cid'),
          topicName = $('option:checked', this).text();
        $(window).data('topic', topicID);
        if (!$('div[id*="' + options.pagerName + topicID + '-cid-"]').get(0)) {
          apApp.settings.dbPromiseTracker.transaction(function(tx) {
            tx.executeSql('SELECT c.image_path, c.cid, c.first_name, c.age, ' +
              'g.title, gi.cid as gcid, g.featured, g.gid, a.delta ' +
              'FROM childs AS c ' +
              'LEFT JOIN age AS a ON a.age = c.age ' +
              'LEFT JOIN goals AS g ON g.gid = a.entity_id ' +
              'LEFT JOIN goal_index AS gi ON gi.gid = g.gid ' +
              'LEFT JOIN topic AS t ON g.gid = t.entity_id ' +
              'WHERE a.type = "goal" AND t.type = "goal" AND t.topic=? ' +
              'ORDER BY g.featured DESC, g.title ASC', [topicID],
              function(tx, results) {
                if (results.rows.length) {
                  var children = _reorderChildrenResult(results),
                    pager = '<ul class="list-pagerer large children-pager">';
                  $.each(children, function(cid, child) {
                    if (child != undefined) {
                      child.topicID = topicID;
                      child.topicName = topicName;
                      var addTopicPage = _getHtml('addTopicPage', child);
                      $('#home').after(addTopicPage);
                      var $panel = $('#home #main-menu').clone();
                      // initialize child page
                      $('#' + options.pagerName + topicID + '-cid-' + cid)
                        .prepend($panel);
                      pager += _getHtml('pagerItem', child, options);
                    }
                  });
                  pager += '</ul>';
                  // add pager in child page
                  $(pager).appendTo('div[data-role="page"][id*="' +
                    options.pagerName + topicID + '-"] .child.item');
                  if (childsCycleInit === false) {
                    $('div[id*="add-topic-"] div.featured-goals').cycle({
                      fx: 'scrollHorz',
                      slides: '> .item',
                      speed: 500,
                      // swipe: true,
                      timeout: 0,
                      'autoHeight': 'calc',
                      pager: '> ul.list-pagerer',
                      pagerActiveClass: 'active',
                      pagerTemplate: '<li><a href="#">{{slideNum}}</a></li>',
                      'log': false
                    });
                    $('div[id*="add-topic-"] div.featured-goals').swipeleft(function(e){
                      $('div[id*="add-topic-"] div.featured-goals').cycle('next');
                      e.preventDefault();
                    });
                    $('div[id*="add-topic-"] div.featured-goals').swiperight(function(e){
                      $('div[id*="add-topic-"] div.featured-goals').cycle('prev');
                      e.preventDefault();
                    });
                    childsCycleInit = true;
                  }
                  $.mobile.loading('hide');
                  $.mobile.changePage('#' + options.pagerName + topicID +
                    '-cid-' + globalCid, {
                      transition: "slide"
                    });
                } else {
                  $.mobile.loading('hide');
                  _messagePopup('No results.', false);
                }
                $('#add-goal-' + globalCid).find('form').trigger('reset');
              }, function(err) {
                _errorHandler(err, 821);
              });
          });
        } else {
          $.mobile.loading('hide');
          $.mobile.changePage('#' + options.pagerName + topicID + '-cid-' +
            globalCid, {
              transition: "slide"
            });
        }
      }
      e.preventDefault();
    })
    .on('change', 'select.select-topic', function(e) {
      var data = {};
      data.cid = $(window).data('cid');
      data.tid = this.value;
      data.topicTitle = $('option:checked', this).text();
      if (data.tid) {
        $(this).parents('form')
          .find('div.input-goal').stop(true, true).slideDown(300);
      } else {
        $(this).parents('form')
          .find('div.input-goal').stop(true, true).slideUp(300)
          .find('input').val('');
      }
      _refreshIscroll();
      e.preventDefault();
    })
    .on('click', '#submit-goal-settings', function(e) {
      $.mobile.loading('show');
      var data = _formatGoalData();
      if ($('#goal-settings').hasClass('is-new-goal')) {
        // insert new goal
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('INSERT INTO goals (gid_origin, uid_origin, uid, title, featured, updated, created, status) ' +
            'VALUES (0, 0, ?, ?, 0, ?, ?, ?)', [apApp.settings.profileUID, data.title, data.timestamp, data.timestamp, data.status],
            function(tx, results) {
              data.gid = results.insertId;
              tx.executeSql('INSERT INTO age (entity_id, type, age, delta) ' +
                'VALUES (?, "goal", ?, 0)', [data.gid, data.age],
                function(tx, results) {
                  tx.executeSql('INSERT INTO topic (entity_id, type, topic, delta) ' +
                    'VALUES (?, "goal", ?, 0)', [data.gid, data.topic],
                    function(tx, results) {
                      tx.executeSql('INSERT INTO reminder (rid_origin, title, message, repeat, time, interval, start_date, end_date) ' +
                        'VALUES (0, ?, ?, ?, ?, ?, ?, ?)',
                        [data.first_name, data.title, data.goalRepeat, data.goalTime, data.goalInterval, data.start_date, data.end_date],
                        function(tx, results) {
                          data.rid = results.insertId;
                          $('#reminder-persons li.active').each(function(idx, el) {
                            var userID = $(this).data('uid');
                            tx.executeSql('INSERT INTO goal_index (gid, cid, uid, completed, updated) ' +
                              'VALUES (?, ?, ?, 0, ?)', [data.gid, data.cid, userID, data.timestamp],
                              function(tx, results) {}, function(err) {
                                _errorHandler(err, 738);
                              });
                            tx.executeSql('INSERT INTO reminder_index (rid, uid, cid, gid, updated) ' +
                              'VALUES (?, ?, ?, ?, ?)', [data.rid, userID, data.cid, data.gid, data.timestamp],
                              function(tx, results) {}, function(err) {
                                _errorHandler(err, 741);
                              });
                          });
                          _addNewGoalSuccessCB(data);
                        }, function(err) {
                          _errorHandler(err, 745);
                        });
                    }, function(err) {
                      _errorHandler(err, 730);
                    });
                }, function(err) {
                  _errorHandler(err, 724);
                });
            }, function(err) {
              _errorHandler(err, 741);
            });
        }, function(err) {
          _errorHandler(err, 744);
        });
      } else {
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('INSERT INTO reminder (rid_origin, title, message, repeat, time, interval, start_date, end_date) ' +
            'VALUES (0, ?, ?, ?, ?, ?, ?, ?)', [data.first_name, data.title, data.goalRepeat, data.goalTime, data.goalInterval, data.start_date, data.end_date],
            function(tx, results) {
              data.rid = results.insertId;
              $('#reminder-persons li.active').each(function(idx, el) {
                var userID = $(this).data('uid');
                tx.executeSql('INSERT INTO reminder_index (rid, uid, cid, gid, updated) ' +
                  'VALUES (?, ?, ?, ?, ?)', [data.rid, userID, data.cid, data.gid, data.timestamp],
                  function(tx, results) {}, function(err) {
                    _errorHandler(err, 894);
                  });
                tx.executeSql('INSERT INTO goal_index (gid, cid, uid, completed, updated) ' +
                  'VALUES (?, ?, ?, 0, ?)', [data.gid, data.cid, userID, data.timestamp],
                  function(tx, results) {}, function(err) {
                    _errorHandler(err, 895);
                  });
              });
              _addNewGoal(data);
            }, function(err) {
              _errorHandler(err, 897);
            });
        }, function(err) {
          _errorHandler(err, 904);
        });
      }
      e.preventDefault();
    })
    .on('click', '#edit-goal-settings', function(e) {
      $.mobile.loading('show');
      var data = _formatGoalData();
      if (data.goalInterval != data.goalIntervalOld ||
          data.goalRepeat != data.goalRepeatOld ||
          data.goalTime != data.goalTimeOld) {
        console.dirxml(data);
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('SELECT DISTINCT(r.rid), r.repeat, r.time, r.interval ' +
          'FROM reminder AS r ' +
          'LEFT JOIN reminder_index AS ri ON ri.rid = r.rid ' +
          'WHERE ri.cid = ? AND ri.gid = ? ' +
          'ORDER BY r.title ASC', [data.cid, data.gid], function(tx, results) {
            var len = results.rows.length;
            if (len) {
              for (var i = 0; i < len; i++) {
                var item = results.rows.item(i);
                console.dirxml(item);
                tx.executeSql('UPDATE reminder ' +
                  'SET repeat = ?, time = ?, interval = ?, end_date = ? ' +
                  'WHERE rid = ?', [item.repeat, item.time, item.interval, data.timestamp, item.rid],
                  function(tx, results) {},
                  function(err) {
                    _errorHandler(err, 960);
                  });
              }
            }
          }, function(err) {
            _errorHandler(err, 961);
          });
          // tx.executeSql('UPDATE reminder ' +
          //   'SET end_date = ? ' +
          //   'WHERE rid = ?', [end_date]);


          // tx.executeSql('INSERT INTO reminder (rid_origin, title, message, repeat, time, interval, start_date, end_date) ' +
          //   'VALUES (0, ?, ?, ?, ?, ?, ?, ?)', [data.first_name, data.title, data.goalRepeat, data.goalTime, data.goalInterval, data.start_date, data.end_date],
          //   function(tx, results) {
          //     data.rid = results.insertId;
          //     $('#reminder-persons li.active').each(function(idx, el) {
          //       var userID = $(this).data('uid');
          //       tx.executeSql('INSERT INTO reminder_index (rid, uid, cid, gid, updated) ' +
          //         'VALUES (?, ?, ?, ?, ?)', [data.rid, userID, data.cid, data.gid, data.timestamp]);
          //       tx.executeSql('INSERT INTO goal_index (gid, cid, uid, completed, updated) ' +
          //         'VALUES (?, ?, ?, 0, ?)', [data.gid, data.cid, userID, data.timestamp]);
          //     });
          //   });
        });
      }
      e.preventDefault();
    })
    .on('click', 'button.submit-goal', function(e) {
      var $form = $(this).parents('form');
      if (!$form.find('div.input-goal input').val()) {
        _messagePopup('Text field is required.', true);
      } else {
        var $form = $(this).parents('form');
        var data = {
          'cid': $(window).data('cid'),
          'topic': parseInt($form.find('select.select-topic option:checked')
            .val()),
          'status': ($form.find('input.public-goal').prop('checked')) ? 1 : 0,
          'title': $form.find('input.goal').val(),
          'age': parseInt($(this).data('age')),
          'first_name': $(this).data('first-name'),
          'image_path': $(this).data('image-path'),
          'completed': 0
        };
        $(window).data(data);
        $('#goal-settings').addClass('is-new-goal').removeClass('edit');
        $.mobile.changePage('#goal-settings', {
          allowSamePageTransition: true,
          transition: 'slide'
        });
      }
      e.preventDefault();
    })
    .on('click', 'a.upload-image', function(e) { // event upload image
      var photolibrary = false,
        $form = $(this).parents('form');
      if ($(this).hasClass('photolibrary')) {
        photolibrary = true;
      }
      if ($(this).hasClass('to-profile')) {
        _captureProfilePhoto(photolibrary);
      } else if ($(this).hasClass('to-child')) {
        if ($(this).hasClass('reg')) {
          var image = $('#create-child-photo-img'),
            imageHolder = $('#create-child-photo'),
            uploadLink = $('#create-child-upload-photo');
        } else if ($(this).hasClass('edit')) {
          var image = $('#edit-child-photo-img'),
            imageHolder = $('#edit-child-photo'),
            uploadLink = $('#edit-child-upload-photo');
        } else {
          var image = $('#add-child-photo-img'),
            imageHolder = $('#add-child-photo'),
            uploadLink = $('#add-child-upload-photo');
        }
        _captureChildPhoto(photolibrary, image, imageHolder, uploadLink);
      }
      e.preventDefault();
    })
    .on('change', '#my-childrens [id*="assign-children"]', function(e) {
      var data = {
        'relationship': $(this).val(),
        'cid': $(this).data('cid')
      };
      // Create or Update profile
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        // create user profile
        tx.executeSql('UPDATE child_index ' +
          'SET relationship = ? ' +
          'WHERE uid = ? AND cid = ?', [data.relationship, apApp.settings.profileUID, data.cid],
          function(tx, results) {
            _messagePopup('Updated', false);
          }, function(err) {
            _errorHandler(err, 932);
          });
      }, function(err) {
        _errorHandler(err, 933);
      });
      e.preventDefault();
    })
    .on('change', '.ui-select .ui-btn select', function(e) {
      if (this.value) {
        $(this).parents('.ui-select').addClass('not-empty');
      }
      else {
        $(this).parents('.ui-select').removeClass('not-empty');
      }
    })
    .on('click', 'ul.in-the-village a', function(e) {
      var popup = $(this).data('rel'),
          uid = $(this).parent('li').data('uid'),
          $ul = $(this).parents('ul.in-the-village'),
          activeSize = $ul.find('li.active').size(),
          unactiveSize = $ul.find('li').size();
      if (popup == undefined) {
        if ((unactiveSize-1) == activeSize) {
          $ul.find('li.active').removeClass('active');
          $('#village-goals li').removeClass('active');
        }
        if ($(this).parent('li').hasClass('active')) {
          $('#village-goals li[data-uid="' + uid + '"]').removeClass('active');
          $(this).parent('li').removeClass('active');
        }
        else {
          $(this).parent('li').addClass('active');
          $('#village-goals li[data-uid="' + uid + '"]').addClass('active');
        }
        e.preventDefault();
      }
    });

  // form submit
  $('#submit-add-new-child').on('click', function(e) {
    var birthDate = $('#add-child-birth-date').val();
    var child = {
      'first_name': $('#add-child-first-name').val(),
      'last_name': $('#add-child-last-name').val(),
      'birth_date': birthDate,
      'image_path': $('#add-child-photo-img').attr('src'),
      'age': _getAge(birthDate)
    };
    if ($('#add-child form .error').get(0)) {} else if (!child.first_name) {
      _messagePopup('First Name is required.', true);
    } else if (!child.birth_date) {
      _messagePopup('Birthdate is required.', true);
    } else if (!child.image_path) {
      _messagePopup('Image is required.', true);
    } else {
      // Add childrn to database
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        var ts = parseInt(new Date().getTime() / 1000);
        $.mobile.loading('show');
        tx.executeSql('INSERT INTO childs (cid_origin, uid, first_name, ' +
          'last_name, birth_date, image_path, age, updated, ' +
          'created, status, update_photo) ' +
          'VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)', [apApp.settings.profileUID, child.first_name,
            child.last_name, child.birth_date, child.image_path, child.age, ts, ts
          ],
          _saveChildSuccessCB, function(err) {
            _errorHandler(err, 965);
          });
      }, function(err) {
        _errorHandler(err, 966);
      });
    }
    e.preventDefault();
  });
  $('#create-child-relationship').change(function(e) {
    if (this.value) {
      $('label[for="create-child-relationship"]').hide();
    }
    else {
      $('label[for="create-child-relationship"]').show();
    }
  });
}

function _reloadPage() {
  window.localStorage.setItem("reloadedPage", $.mobile.activePage.attr('id'));
  $.mobile.loading('show');
  setTimeout(function() {
    $.mobile.loading('hide');
    var windowHref = window.location.origin + window.location.pathname;
    window.location.href = windowHref;
  }, 2000);
}

// Transaction success callback
function _dbSuccessHandler(tx) {
  if (apApp.settings.Connection) {
      _getInvitation();
      _getYourInvitation();
  } else {
    _queryExclude('_dbQuery');
  }
}

function _dbCronHandler(tx){
  tx.executeSql('SELECT timestamp FROM variable WHERE name = "cron"', [], _selectCronVariableCB, function(err) {
    _errorHandler(err, 41);
  });
}

function _selectCronVariableCB(tx, results) {
  var len = results.rows.length;
  if (len) {
    apApp.settings.cron = results.rows.item(0).timestamp;
  } else {
    apApp.settings.cron = 0;
  }
  var time = apApp.settings.timestamp - apApp.settings.cron;
  if ((time > apApp.settings.cron_safe_threshold || apApp.settings.registation) && apApp.settings.Connection) {
    _uploadContent();
  } else {
    _queryExclude('_dbQuery');
  }
}

function _addTopics(topics, key) {
  var size = Object.keys(topics).length;
  var i = 0,k;
  $.each(topics, function(tid, title) {
    var data = {
      'tid': tid,
      'title': title,
    };
    k = $.inArray(parseInt(tid), apApp.settings.topicTids);
    if (k == -1) {
        // Add new topics to database
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('INSERT INTO topics (tid, name) VALUES (?, ?)', [data.tid, data.title],
            function(tx, results) {
              i++;
              if (i == size && apApp.settings.topicTids.length == 0 && !apApp.settings.queryExclude.topics) {
                apApp.settings.queryExclude.topics = true;
                _queryExclude(key);
              }
            }, function(err) {
              _errorHandler(err, 80);
            });
        }, function(err) {
          _errorHandler(err, 81);
        });
    } else {
      apApp.settings.topicTids.splice(k,1);
      i++;
      if (i == size && apApp.settings.topicTids.length == 0 && !apApp.settings.queryExclude.topics) {
        apApp.settings.queryExclude.topics = true;
        _queryExclude(key);
      }
    }
  });
  if (apApp.settings.topicTids.length != 0) {
      $.each(apApp.settings.topicTids, function(i,tid){
        apApp.settings.dbPromiseTracker.transaction(function(tx){
          tx.executeSql('DELETE FROM topics WHERE tid = ?',[tid]);
        });
      });
      if (!apApp.settings.queryExclude.topics) {
        apApp.settings.queryExclude.topics = true;
        _queryExclude(key);
      }
  }
  apApp.settings.topicTids = [];
}

function _addTips(tips, key) {
  var size = Object.keys(tips).length;
  var i = 0;
  $.each(tips, function(nid, tip) {
    var data = {
      'nid': tip.nid,
      'title': tip.title,
      'body': tip.body,
      'created': tip.created,
      'updated': tip.changed
    };
    if (tip.insert == 1) {
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('INSERT INTO tips (nid, title, body, created, updated) ' +
          'VALUES (?, ?, ?, ?, ?)', [data.nid, data.title, data.body, data.created, data.updated],
          function(tx, results) {
            i++;
            if (i == size) {
              apApp.settings.queryExclude.tips = true;
              _queryExclude(key);
            }
            _insertAge(tip.age, results.insertId, 'tip');
            _insertTopics(tip.topics, results.insertId, 'tip');
          }, function(err) {
            _errorHandler(err, 108);
          });
      }, function(err) {
        _errorHandler(err, 109);
      });
    }
    if (tip.update == 1) {
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('SELECT tid FROM tips WHERE nid = ?', [data.nid], function(tx, results) {
          tid = results.rows.item(0).tid;
          i++;
          if (i == size) {
            apApp.settings.queryExclude.tips = true;
            _queryExclude(key);
          }
          // update tips age
          tx.executeSql('DELETE FROM age WHERE entity_id = ? AND type="tip"', [tid], function(tx, results) {
            _insertAge(tip.age, tid, 'tip');
          });
          // update tips topic
          tx.executeSql('DELETE FROM topic WHERE entity_id = ? AND type="tip"', [tid], function(tx, results) {
            _insertTopics(tip.topics, tid, 'tip');
          });
        });
        // update tips content
        tx.executeSql('UPDATE tips SET title = ?, body = ?, created = ?, updated = ? WHERE nid = ?', [data.title, data.body, data.created, data.updated, data.nid]);
      }, function(err) {
        _errorHandler(err, 131);
      });
    }
  });
}

function _addGoals(goals, key) {
  var size = Object.keys(goals).length;
  var i = 0;
  $.each(goals, function(nid, goal) {
    var data = {
      'gid_origin': goal.nid,
      'uid_origin': goal.uid,
      'title': goal.title,
      'featured': goal.featured,
      'created': goal.created,
      'updated': goal.changed,
      'status': 1
    };
    if (goal.insert == 1) {
      // insert new goal
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('INSERT INTO goals (gid_origin, uid_origin, ' +
          'title, featured, updated, created, status) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?)', [data.gid_origin, data.uid_origin, data.title,
            data.featured, data.created, data.updated, data.status
          ],
          function(tx, results) {
            i++;
            if (i == size) {
              apApp.settings.queryExclude.goals = true;
              _queryExclude(key);
            }
            _insertAge(goal.age, results.insertId, 'goal');
            _insertTopics(goal.topics, results.insertId, 'goal');
          }, function(err) {
            _errorHandler(err, 165);
          });
      }, function(err) {
        _errorHandler(err, 166);
      });
    }
    if (goal.update == 1) {
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('SELECT gid FROM goals WHERE gid_origin = ?', [data.gid_origin], function(tx, results) {
          gid = results.rows.item(0).gid;
          i++;
          if (i == size) {
            apApp.settings.queryExclude.goals = true;
            _queryExclude(key);
          }
          // update tips age
          tx.executeSql('DELETE FROM age WHERE entity_id = ? AND type="goal"', [gid], function(tx, results) {
            _insertAge(goal.age, gid, 'goal');
          });
          // update tips topic
          tx.executeSql('DELETE FROM topic WHERE entity_id = ? AND type="goal"', [gid], function(tx, results) {
            _insertTopics(goal.topics, gid, 'goal');
          });

        });
        // update tips content
        tx.executeSql('UPDATE goals SET title = ?, featured = ?, updated = ?, created = ?, status=?, uid_origin=? WHERE gid_origin = ?', [data.title, data.featured, data.updated, data.created, data.status, data.uid_origin, data.gid_origin]);

      }, function(err) {
        _errorHandler(err, 190);
      });
    }
  });
}

function _addChilds(childs, key) {
  var users = [];
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    childs.goalsInvite = [];
    if (childs.goals != undefined) {
      tx.executeSql('SELECT gid, gid_origin FROM goals WHERE gid_origin IN (' + childs.goals.join() + ')', [],
        function(tx, results) {
          var len = results.rows.length;
          if (len) {
            for (var i = 0; i < len; i++) {
              var item = results.rows.item(i);
              childs.goalsInvite[item.gid_origin] = item.gid;
            }
          }
          _addChildsProcess(tx, childs, key);
        }, function(err) {
          _errorHandler(err, 2655)
        });
    } else {
      _addChildsProcess(tx, childs, key);
    }
  });
}

function _addChildsProcess(tx, childs, key) {
  var users = [];
  tx.executeSql('SELECT uid, uid_origin FROM users', [], function(tx, results) {
    var len = results.rows.length;
    if (len) {
      for (var i = 0; i < len; i++) {
        var item = results.rows.item(i);
        users[item.uid_origin] = item.uid;
      }
      var size = Object.keys(childs.children).length;
      var i = 0;
      $.each(childs.children, function(i, child) {
        tx.executeSql('SELECT cid, updated, image_path FROM childs WHERE cid_origin = ?', [child.cid_origin], function(tx, results) {
          var len = results.rows.length;
          if (len) {
            child.cid = results.rows.item(0).cid;
            var updated = results.rows.item(0).updated;
            child.image_path = results.rows.item(0).image_path;
            if (child.updated != updated){
             _updateChild(child, users, childs.goalsInvite);
            }
          } else {
            _insertChild(child, users, childs.goalsInvite);
          }
          i++;
          if (i == size) {
            setTimeout(function(){
              apApp.settings.queryExclude.childs = true;
              _queryExclude(key);
            }, 1000*3);
          }
        });
      });
    }
  }, function(err) {
    _errorHandler(err, 1018);
  });
}

function _insertChild(child, users, goals) {
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('INSERT INTO childs (cid_origin, uid, first_name, ' +
      'last_name, birth_date, age, updated, created, status) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [child.cid_origin, users[child.uid_origin], child.first_name, child.last_name, child.birth_date, child.age, child.updated, child.created, child.status],
      function(tx, results) {
        _messagePopup('Add new child ' + child.first_name + ' ');
        child.cid = results.insertId;
        if (child.photo != undefined) _downloadChildPhoto(child);
        if (child.child_index != undefined) {
          _insertChildIndex(tx, child, users);
        }
        if (child.goal_index != undefined) {
          _insertChildGoalIndex(tx, child, users, goals);
        }
        if (child.reminders != undefined) {
          _updateReminderGoalIndex(tx, child, users, goals);
        }
      }, function(err) {
        _errorHandler(err, 1034)
      });
  });
}

function _updateChild(child, users, goals) {
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('UPDATE childs SET first_name = ?, last_name = ?, birth_date = ?, age = ?, ' +
      'updated = ?, created = ?, status = ? WHERE cid = ? ', [child.first_name, child.last_name, child.birth_date, child.age, child.updated, child.created, child.status, child.cid],
      function(tx, results) {
        if (child.photo != undefined) {
          var photo = apApp.settings.FullPath + '/' + child.photo;
          if (photo != child.image_path) _downloadChildPhoto(child);
        }
        if (child.reminders != undefined) {
          _updateReminderGoalIndex(tx, child, users, goals);
        }
        tx.executeSql('DELETE FROM child_index WHERE cid = ?', [child.cid],
          function(tx, results) {
            if (child.child_index != undefined) {
              _insertChildIndex(tx, child, users);
            }
          }, function(err) {
            _errorHandler(err, 1140)
          });
        tx.executeSql('DELETE FROM goal_index WHERE cid = ?', [child.cid],
          function(tx, results) {
            if (child.goal_index != undefined) {
              _insertChildGoalIndex(tx, child, users, goals);
            }
          }, function(err) {
            _errorHandler(err, 1140)
          });
      }, function(err) {
        _errorHandler(err, 1127)
      });
  });
}

function _updateReminderGoalIndex(tx, child, users, goals){
  var timestamp = parseInt(new Date().getTime() / 1000);
  $.each(child.reminders,function(i,reminder){
     tx.executeSql('SELECT rid FROM reminder WHERE rid_origin = ?', [reminder.rid_origin],
       function(tx, results) {
        var len = results.rows.length;
        if (len == 0) {
          reminder.title = child.first_name;
          reminder.cid = child.cid;
          if (goals[reminder.gid_origin] != undefined) reminder.gid = goals[reminder.gid_origin];
          if (timestamp < reminder.end_date) _insertReminder(tx, reminder, users, goals);
        }
      }, function(err) {
        _errorHandler(err, 1340)
      });
  });
}

function _insertReminder(tx, reminder, users, goals){
  tx.executeSql('INSERT INTO reminder (rid_origin, title, message, repeat, time, interval, start_date, end_date) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [reminder.rid_origin, reminder.title, reminder.message, reminder.repeat, reminder.time,  reminder.interval, reminder.start_date, reminder.end_date],
    function(tx, results) {
      reminder.rid = results.insertId;
      $.each(reminder.uids,function(i,uid_origin){
       if (users[uid_origin] != undefined) {
         tx.executeSql('INSERT INTO reminder_index (rid, uid, cid, gid, updated) ' +
           'VALUES (?, ?, ?, ?, ?)', [reminder.rid, users[uid_origin], reminder.cid, reminder.gid, apApp.settings.cron],
           function(tx, results) {
             if (users[uid_origin] == 1)  _addNewReminder(reminder);
           }, function(err) {
         _errorHandler(err, 1372);
        });
       }

      });

    }, function(err) {
      _errorHandler(err, 1377);
    });

}

function _addNewReminder(data){
  var start_date = new Date(data.start_date*1000),
  end_date = new Date(data.end_date*1000);
  var utc = new Date(start_date.getTime() + start_date.getTimezoneOffset() * 60000);
  _messagePopup('Reminder start_date: ' + start_date, false);
  _messagePopup('Reminder end_date: ' + end_date, false);
  _messagePopup('Goal "' + data.title + '" has been added', false);
  if (data.start_date != undefined) {
    if (window.plugin != undefined) {
      window.plugin.notification.local.add({
        id: data.rid, // is converted to a string
        title: data.title,
        message: data.message,
        repeat: data.repeat, // Has the options of 'hourly', 'daily', 'weekly', 'monthly', 'yearly'
        date: utc
      });
    }
  }
}

function _addUsers(users, key){
  var uids = [];
  $.each(users,function(uid,user){
    uids.push(uid);
  });
  var update_users = [];
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT * FROM users WHERE  uid_origin IN (' + uids.join() + ')', [], function(tx, results) {
      var len = results.rows.length;
      if (len) {
        for (var i = 0; i < len; i++) {
          var item = results.rows.item(i);
          users[item.uid_origin].image_path = item.image_path;
          if (users[item.uid_origin].name != item.name) {
            update_users.push(users[item.uid_origin]);
            continue;
          }
          if (users[item.uid_origin].photo != undefined) {
           var photo = apApp.settings.FullPath + '/' + users[item.uid_origin].photo;
           if (photo != item.image_path) update_users.push(users[item.uid_origin]);
          }
         }
         if (update_users.length) {
           _updateUsers(tx,update_users,key);
         } else {
           apApp.settings.queryExclude.users = true;
           _queryExclude(key);
         }
      } else{
        apApp.settings.queryExclude.users = true;
        _queryExclude(key);
      }

     }, function(err) {
      _errorHandler(err, 1127);
    });
  });
}

function _updateUsers(tx,users,key){
  var size = Object.keys(users).length;
  var i = 0;
  $.each(users, function(i, user) {
    tx.executeSql('UPDATE users SET name = ? WHERE uid_origin = ?', [user.name, user.uid_origin]);
    if (user.photo != undefined) {
     var photo = apApp.settings.FullPath + '/' + user.photo;
     if (photo != user.image_path) _downloadUserPhoto(user);
    }
    i++;
    if (i == size) {
       apApp.settings.queryExclude.users = true;
       _queryExclude(key);
    }
  });
}

function _insertChildIndex(tx, child, users) {
  //create child_index
  $.each(child.child_index, function(i, relationship) {
    if (users[relationship.uid] != undefined) {
      tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
        'VALUES (?, ?, ?)', [child.cid, users[relationship.uid], relationship.relationship],
        function(tx, results) {}, function(err) {
          _errorHandler(err, 1156)
        });
    }
  });
}

function _insertChildGoalIndex(tx, child, users, goals) {
  if (child.goal_index != undefined) {
    //create goal_index
    $.each(child.goal_index, function(i, goal) {
      if (goals[goal.gid_origin] != undefined &&
        users[goal.uid_origin] != undefined) {
        tx.executeSql('INSERT INTO goal_index (gid, cid, uid, completed, updated) ' +
          'VALUES (?, ?, ?, ?, ?)', [goals[goal.gid_origin], child.cid, users[goal.uid_origin], goal.completed, child.updated],
          function(tx, results) {}, function(err) {
            _errorHandler(err, 2741)
          });
      }
    });
  }
}

function _insertAge(ages, id, type) {
  $.each(ages, function(delta, age) {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('INSERT INTO age (entity_id, type, age, delta) ' +
        'VALUES (?, ?, ?, ?)', [id, type, age, delta]);
    }, function(err) {
      _errorHandler(err, 200);
    });
  });
}

function _insertTopics(topics, id, type) {
  $.each(topics, function(delta, topic) {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('INSERT INTO topic (entity_id, type, topic, delta) ' +
        'VALUES (?, ?, ?, ?)', [id, type, topic, delta]);
    }, function(err) {
      _errorHandler(err, 209);
    });
  });
}

function _queryExclude(key) {
  var queryExcluded = true;
  $.each(apApp.settings.queryExclude, function(idx, val) {
    if (val === false) {
      queryExcluded = false;
      return false;
    }
  });
  if (queryExcluded === true) {
    switch (key) {
      case '_dbQuery':
        if (apApp.settings.DbQueryCall === false) {
          apApp.settings.dbPromiseTracker.transaction(_dbQuery, function(err) {
            _errorHandler(err, 1106);
          });
          apApp.settings.dbPromiseTracker.transaction(function(){
            var reloadedPage = window.localStorage.getItem("reloadedPage");
            if (reloadedPage) {
              if (reloadedPage == 'goal-settings') {
                var cid = $(window).data('cid');
                reloadedPage = 'children-' + cid;
              }
              $.mobile.changePage('#' + reloadedPage, {
                transition: "none"
              });
            }
            $('#list-children').css('visibility', 'visible');
          }, function(err) {
            _errorHandler(err, 1585);
          });
        }
        break;
      case '_dbCronHandler':
        apApp.settings.dbPromiseTracker.transaction(_dbCronHandler, function(err) {
          _errorHandler(err, 1566);
        });
        break;
      case '_registerUser':
        _registerUser();
        break;
    }

  }
}

function _getContent(key) {
  _messagePopup('Get content from server', false);
  $.getJSON(apApp.settings.restUrl + "nodes?jsoncallback=?&timestamp=" +
    apApp.settings.cron + '&user_ID=' +
    apApp.settings.userProfile.uid_origin,
    function(response) {
      if (response.tips != undefined) {
        apApp.settings.queryExclude.tips = false;
        _addTips(response.tips, key);
      }
      if (response.goals != undefined) {
        apApp.settings.queryExclude.goals = false;
        _addGoals(response.goals, key);
      }
      if (response.childs != undefined) {
        apApp.settings.queryExclude.childs = false;
        _addChilds(response.childs, key);
      }
      if (response.users != undefined) {
        apApp.settings.queryExclude.users = false;
        _addUsers(response.users, key);
      }
      if (response.topics != undefined) {
        var topicsSize = Object.keys(response.topics).length;
        var tidsSize =  apApp.settings.topicTids.length;
        if (topicsSize != tidsSize) {
          apApp.settings.queryExclude.topics = false;
          _addTopics(response.topics, key);
        }
      }
      _queryExclude(key);
    });

  // undate timestamp for cron
  if (apApp.settings.cron == 0) {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('INSERT INTO variable (name, timestamp) ' +
        'VALUES ("cron", ?)', [apApp.settings.timestamp]);
    });
  } else {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('UPDATE variable SET timestamp = ? WHERE name = "cron"', [apApp.settings.timestamp]);
    });
  }
}

// Initialize the database
function _dbInit(tx) {
  apApp.settings.DbQueryCall = false;
  tx.executeSql('DROP TABLE IF EXISTS relationships');
  // tx.executeSql('DROP TABLE IF EXISTS variable');
  // tx.executeSql('DROP TABLE IF EXISTS users');
  // tx.executeSql('DROP TABLE IF EXISTS childs');
  // tx.executeSql('DROP TABLE IF EXISTS child_index');
  // tx.executeSql('DROP TABLE IF EXISTS relationships');
  // tx.executeSql('DROP TABLE IF EXISTS goals');
  // tx.executeSql('DROP TABLE IF EXISTS goal_index');
  // tx.executeSql('DROP TABLE IF EXISTS topics');
  // tx.executeSql('DROP TABLE IF EXISTS tips');
  // tx.executeSql('DROP TABLE IF EXISTS age');
  // tx.executeSql('DROP TABLE IF EXISTS topic');
  // tx.executeSql('DROP TABLE IF EXISTS reminder');
  // tx.executeSql('DROP TABLE IF EXISTS reminder_index');

  // create tables
  tx.executeSql('CREATE TABLE IF NOT EXISTS variable (name, timestamp)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS users (uid INTEGER PRIMARY KEY, ' +
    'uid_origin INTEGER, password, name, last_name, email, image_path, ' +
    'updated INTEGER, created INTEGER, status INTEGER, update_photo INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS childs (cid INTEGER PRIMARY KEY, ' +
    'cid_origin INTEGER, uid INTEGER, first_name, last_name, ' +
    'birth_date, image_path, age INTEGER, updated INTEGER, ' +
    'created INTEGER, status INTEGER, update_photo INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS child_index (cid INTEGER, ' +
    'uid INTEGER, relationship INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS relationships (rid INTEGER, ' +
    'title TEXT)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS goals (gid INTEGER PRIMARY KEY, ' +
    'gid_origin INTEGER, uid INTEGER, uid_origin INTEGER, title, ' +
    'featured INTEGER, updated INTEGER, created INTEGER, ' +
    'status INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS goal_index (gid INTEGER, ' +
    'cid INTEGER, uid INTEGER, completed INTEGER, updated INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS topics (tid INTEGER, name)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS tips (tid INTEGER PRIMARY KEY, ' +
    'nid INTEGER, title, body, updated INTEGER, created INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS age (entity_id INTEGER, type, ' +
    'age INTEGER, delta INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS topic (entity_id INTEGER, type, ' +
    'topic INTEGER, delta INTEGER)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS reminder (rid INTEGER PRIMARY KEY, ' +
    'rid_origin INTEGER, title, message, repeat, time, interval, start_date, end_date)');
  tx.executeSql('CREATE TABLE IF NOT EXISTS reminder_index (rid INTEGER, ' +
    'uid INTEGER, cid INTEGER, gid INTEGER, updated INTEGER)');

  // Create relationships
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (1, "Father")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (2, "Mother")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (3, "Brother")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (4, "Sister")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (5, "Grandmother")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (6, "Grandfather")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (7, "Family Member")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (8, "Teacher")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (9, "Babysitter")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (10, "Friend")');
  tx.executeSql('INSERT INTO relationships (rid, title) VALUES (11, "Other")');

  tx.executeSql('SELECT rid, title FROM relationships', [], function(tx, results) {
    var len = results.rows.length;
    if (len) {
      var relationshipsOptions = '';
      for (var i = 0; i < len; i++) {
        var item = results.rows.item(i);
        var selectOptions = '<option value="' + item.rid + '">';
        selectOptions += item.title;
        selectOptions += '</option>';
        relationshipsOptions += selectOptions;
      }
      apApp.settings.relationships = relationshipsOptions;
    }
    $('select.relationship').append(apApp.settings.relationships);
  }, function(err) {
    _errorHandler(err, 1030);
  });

  tx.executeSql('SELECT tid FROM topics', [], function(tx, results) {
    var len = results.rows.length;
    if (len) {
      for (var i = 0; i < len; i++) {
        var tid = results.rows.item(i).tid;
        apApp.settings.topicTids.push(tid);
      }
    }
  }, function(err) {
    _errorHandler(err, 1733);
  });

  tx.executeSql('SELECT * FROM users AS u WHERE u.uid = 1', [],
    function(tx, results) {
      var len = results.rows.length;
      apApp.settings.profileUID = 1;
      if (len === 0) {
        apApp.settings.registation = true;
        if (apApp.settings.Connection) {
          _getFirstContent('_registerUser');
        } else{
          _getEthernetConntent();
        }
      } else {
        apApp.settings.registation = false;
        apApp.settings.userProfile = results.rows.item(0);
        _dbSuccessHandler(tx);
      }
    }, function(err) {
      _errorHandler(err, 1045);
    });
}

function _dbQuery(tx) {
  var timestamp = parseInt(new Date().getTime() / 1000);
  tx.executeSql('SELECT r.rid, r.end_date ' +
    'FROM reminder AS r ' +
    'WHERE r.end_date < ?', [timestamp], function(tx, results) {
      var len = results.rows.length;
      if (len) {
        for (var i = 0; i < len; i++) {
          var item = results.rows.item(i);
          if (window.plugin != undefined) {
            window.plugin.notification.local.cancel(item.rid);
          }
          tx.executeSql('DELETE FROM reminder WHERE rid = ?', [item.rid],
            function(tx, results) {}, function(err) {
              _errorHandler(err, 1310);
            });
          tx.executeSql('DELETE FROM reminder_index WHERE rid = ?', [item.rid],
            function(tx, results) {}, function(err) {
              _errorHandler(err, 1314);
            });
        }
      }
    }, function(err) {
      _errorHandler(err, 1319);
    });
  tx.executeSql('SELECT DISTINCT(c.cid), t.title, t.body, a.age, topic.topic ' +
    'FROM childs AS c ' +
    'INNER JOIN age AS a ON a.age = c.age ' +
    'INNER JOIN tips AS t ON t.tid = a.entity_id ' +
    'LEFT JOIN topic AS topic ON t.tid = topic.entity_id ' +
    'WHERE a.type = "tip" AND topic.type = "tip" ' +
    'ORDER BY t.nid', [],
    function(tx, results) {
      var len = results.rows.length;
      if (len) {
        for (var i = 0; i < len; i++) {
          var item = results.rows.item(i);
          if (item.age != undefined) {
            var age = item.age;
            var topic = item.topic;
            if (apApp.settings.tips[age] == undefined) {
              apApp.settings.tips[age] = [];
            }
            if (apApp.settings.tips[age][topic] == undefined) {
              apApp.settings.tips[age][topic] = [];
            }
            apApp.settings.tips[age][topic].push({
              'title': item.title,
              'body': item.body
            });
            if ($.inArray(topic, apApp.settings.topicTids) == -1) {
              apApp.settings.topicTids.push(topic);
            }
          }
        }
      }
    }, function(err) {
      _errorHandler(err, 1080);
    });

  tx.executeSql('SELECT u.uid, u.image_path, u.name, u.last_name, u.email ' +
    'FROM users AS u', [], _selectUsersSuccessCB, function(err) {
      _errorHandler(err, 1083);
    });

  tx.executeSql('SELECT g.gid, c.image_path, c.cid, c.first_name, c.age, c.uid, gi.uid AS guid, ' +
    'gi.completed, g.title ' +
    'FROM childs AS c ' +
    'LEFT JOIN goal_index AS gi ON c.cid = gi.cid ' +
    'LEFT JOIN goals AS g ON gi.gid = g.gid ' +
    'ORDER BY c.cid DESC, gi.completed ASC', [], _selectChildSuccessCB, function(err) {
      _errorHandler(err, 1091);
    });

  tx.executeSql('SELECT c.image_path, c.cid, c.first_name, c.age, g.title, ' +
    'gi.cid as gcid, g.gid, a.delta ' +
    'FROM childs AS c ' +
    'LEFT JOIN age AS a ON a.age = c.age ' +
    'LEFT JOIN goals AS g ON g.gid = a.entity_id ' +
    'LEFT JOIN goal_index AS gi ON gi.gid = g.gid ' +
    'WHERE a.type = "goal" ' +
    'ORDER BY g.title ASC', [], _selectSearchPageSuccessCB, function(err) {
      _errorHandler(err, 1100);
    });

  // village-goals
  tx.executeSql('SELECT gi.*, c.image_path, g.title, u.image_path AS user_image_path  ' +
    'FROM goal_index AS gi ' +
    'LEFT JOIN goals AS g ON g.gid = gi.gid ' +
    'LEFT JOIN users AS u ON u.uid = gi.uid ' +
    'LEFT JOIN childs AS c ON c.cid = gi.cid', [], function(tx, results) {
      var len = results.rows.length,
          goals = '';
      if (len) {
        for (var i = 0; i < len; i++) {
          var item = results.rows.item(i);
          goals += _getHtml('villageGoalItem', item);
        }
        $('#village-goals li:first').after(goals);
      }
    }, function(err) {
      _errorHandler(err, 1121);
    });

  tx.executeSql('SELECT * FROM goals', [], function(tx, results) {
    if (!results.rows.length) {
      $('body').addClass('empty-search');
    }
  }, function(err) {
    _errorHandler(err, 1643);
  });
}

function _selectShowContentCB(tx, results) {
  var len = results.rows.length;
  if (len) {
    for (var i = 0; i < len; i++) {
      var item = results.rows.item(i);
      var out = '';
      for (var p in item) {
        out += p + ': ' + item[p] + '\n';
      }
      _messagePopup(out, false);
      console.dirxml(item);
    }
  }
  else {
    _messagePopup('Query is empty', false);
    console.dirxml('Query is empty');
  }
}

// Query the users success callback
function _selectUsersSuccessCB(tx, results) {
  // Set fields content on load page
  var profileImagePath = "";
  if (results.rows.length != 0) {
    var profile = results.rows.item(0);
    profileImagePath = profile.image_path;
    $('#profile-name').val(profile.name);
    $('#profile-last-name').val(profile.last_name);
    $('#profile-email').val(profile.email);
    if (profileImagePath) {
      $('#profile-photo-img')
        .attr('src', profileImagePath)
        .data('osrc', profileImagePath);
      $('#profile-photo').show();
      $('#profile-upload-photo').hide();
    }
  }

  // show village
  var len = results.rows.length;
  if (len) {
    for (var i = 0; i < len; i++) {
      var item = results.rows.item(i);
      var inlinePerson = _getHtml('inlinePerson', item);
      var person = '<span class="rounded"><span class="rounded-inner"><img src="' +
                   item.image_path + '" alt="" /></span></span>';
      $('ul.persons-inline.in-the-village').prepend(inlinePerson);
      $('[data-role="panel"] li.village a').append(person);
    }
  }

  $('#update-profile-settings').on('click', function(e) {
    var data = {
      'name': $('#profile-name').val(),
      'last_name': $('#profile-last-name').val(),
      'email': $('#profile-email').val(),
      'image_path': $('#profile-photo-img').attr('src'),
      'update_photo': 0
    };

    if ($('#profile-photo-img').attr('src') != $('#profile-photo-img').data('osrc')) {
      data.update_photo = 1;
    }

    // Create or Update profile
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      var updatedTimestamp = parseInt(new Date().getTime() / 1000);
      // create user profile
      tx.executeSql('UPDATE users SET name = ?, last_name = ?, email = ?, ' +
        'image_path = ?, updated = ?, update_photo = ? ' +
        'WHERE uid = ?', [data.name, data.last_name, data.email, data.image_path, updatedTimestamp, data.update_photo, apApp.settings.profileUID],
        function() {
          _messagePopup('Profile has been updated.', false);
          _reloadPage();
        });
    }, function(err) {
      _errorHandler(err, 1185);
    });
    e.preventDefault();
  });
}

// Query the childrens success callback
function _selectChildSuccessCB(tx, results) {
  var resultsLen = results.rows.length;
  if (resultsLen) {
    var children = _reorderChildrenResultChildPage(results),
      addGoalPager = '<ul class="list-pagerer large children-pager">',
      pager = '<ul class="list-pagerer large children-pager">',
      myGoals = '',
      options = {
        'articleLinked': true,
        'pagerName': 'children-'
      },
      goalOptions = {
        'selfUID' : true
      },
      addGoalOptions = {
        'pagerName': 'add-goal-'
      };
    // children.length is bug of count
    var globalCid,
      globalCidIsGeted = false;

    $.each(children, function(cid, child) {
      if (child != undefined) {
        var article = _getHtml('article', child, options),
          childPage = _getHtml('childPage', child),
          addGoalPage = _getHtml('addGoalPage', child),
          myChildLinkInMenu = _getHtml('myChildLinkInMenu', child);
        if (!globalCidIsGeted) {
          globalCid = cid;
          globalCidIsGeted = true;
        }
        myGoals += _getHtml('myGoals', child, goalOptions);
        pager += _getHtml('pagerItem', child, options);
        addGoalPager += _getHtml('pagerItem', child, addGoalOptions);

        // add child to home page
        $(article).prependTo('#list-children');
        // add child page after home page
        $('#home').after(childPage).after(addGoalPage);
        // add my child in navigation menu
        $('nav[data-role="panel"] li.search-holder')
          .after(myChildLinkInMenu);
        // add child in settings page
        tx.executeSql('SELECT ci.relationship ' +
          'FROM child_index AS ci ' +
          'WHERE ci.cid = ? AND ci.uid = ?', [child.cid, apApp.settings.profileUID],
          function(tx, results) {
            if (results.rows.length) {
              var item = results.rows.item(0);
              child.relationship = item.relationship;
              var myChildren = _getHtml('myChildren', child);
              $('#my-childrens li:last').after(myChildren);
            }
          }, function(err) {
            _errorHandler(err, 1091);
          }
        );
        var $panel = $('#home #main-menu').clone(),
          $addGoalpanel = $('#home #main-menu').clone();
        // initialize child page
        $('#' + options.pagerName + cid).prepend($panel);
        $('#' + addGoalOptions.pagerName + cid).prepend($addGoalpanel);
      }
    });
    $(window).data('cid', globalCid);
    $('[data-role="panel"] a.search')
      .attr('href', '#search-goals-' + globalCid);
    $('#add-vilage-goals')
      .attr('href', '#add-goal-' + globalCid);
    $('div.ui-page nav[data-role="panel"]').trigger('updatelayout');
    $('.ui-page nav[data-role="panel"] [data-role="listview"]').listview('refresh');
    $('div.ui-page ul.check-listview.ui-listview').listview('refresh');
    addGoalPager += '</ul>';
    pager += '</ul>';
    // insert topics to selects
    tx.executeSql('SELECT tid, name FROM topics', [], function(tx, results) {
      var len = results.rows.length;
      if (len) {
        var selectOptions = '';
        for (var i = 0; i < len; i++) {
          var item = results.rows.item(i);
          selectOptions += '<option value="' + item.tid + '">';
          selectOptions += item.name;
          selectOptions += '</option>';
        }
        if (selectOptions) {
          $(selectOptions).appendTo('select.select-topic, select.in-topic');
        }
      }
    }, function(err) {
      _errorHandler(err, 1263);
    });
    if (resultsLen > 1) {
      // add pager in child page
      $(pager).appendTo('div[data-role="page"][id*="' + options.pagerName + '"] .child.item');
      // add pager to Add Goal page
      $(addGoalPager).appendTo('div[data-role="page"][id*="' + addGoalOptions.pagerName + '"] .child.item');
    }
    // add goals in settings page
    $('#my-goals li:first').after(myGoals);
    setTimeout(function() {
      var iscrollView = $('#home .iscroll-wrapper').data('mobileIscrollview');
      if (iscrollView) {
        iscrollView.refresh();
      }
    }, 1000);
  }
  // assign-village
  tx.executeSql('SELECT u.uid, u.name, u.image_path ' +
    'FROM users AS u ' +
    'ORDER BY u.uid ASC', [],
    function(tx, results) {
      var len = results.rows.length;
      if (len) {
        var assignProfile = '';
        for (var i = 0; i < len; i++) {
          var item = results.rows.item(i);
          assignProfile += _getHtml('assignProfile', item);
        }
        $('ul.assign-village-list').each(function(idx, el) {
          $('li:last', this).after(assignProfile);
          if ($(this).parents('div.ui-page').get(0)) {
            $(this).listview('refresh');
            $(this).parents('div.ui-page').trigger('create');
          }
        });
      }
    }, function(err) {
      _errorHandler(err, 1284);
    });
}

function _refreshIscroll() {
  setTimeout(function() {
    var iscrollView = $.mobile.activePage.find('.iscroll-wrapper').data('mobileIscrollview');
    if (iscrollView) {
      iscrollView.refresh();
    }
  }, 1000);
}

function _reorderChildrenResult(results) {
  var children = {};
  for (var i = 0; i < results.rows.length; i++) {
    var item = results.rows.item(i),
      cid = item.cid;
    if (cid != undefined) {
      if (children[cid] == undefined) {
        children[cid] = {
          'cid': cid,
          'age': item.age,
          'first_name': item.first_name,
          'image_path': item.image_path,
          // 'relationship': (item.relationship != undefined) ? item.relationship : '',
          'goals': []
        };
      }
      if (cid != item.gcid || item.gcid == undefined) {
        if (item.gid != undefined) {
          if (item.completed == undefined) {
            item.completed = 0;
          }
          if (item.featured == undefined) {
            item.featured = 0;
          }
          children[cid].goals.push({
            'uid': item.uid,
            'gid': item.gid,
            'title': item.title,
            'completed': item.completed,
            'featured': item.featured
          });
        }
      }
    }
  }
  return children;
}

function _reorderChildrenResultChildPage(results){
  var children = {};
  for (var i = 0; i < results.rows.length; i++) {
    var item = results.rows.item(i),
      cid = item.cid;
    if (cid != undefined) {
      if (children[cid] == undefined) {
        children[cid] = {
          'cid': cid,
          'age': item.age,
          'first_name': item.first_name,
          'image_path': item.image_path,
          // 'relationship': (item.relationship != undefined) ? item.relationship : '',
          'goals': []
        };
      }
        if (item.gid != undefined) {
          if (item.completed == undefined) {
            item.completed = 0;
          }
          if (item.featured == undefined) {
            item.featured = 0;
          }
          if (item.guid == apApp.settings.profileUID) {
            children[cid].goals.push({
              'uid': item.guid,
              'gid': item.gid,
              'title': item.title,
              'completed': item.completed,
              'featured': item.featured
            });
          }
      }
    }
  }
  return children;
}

function _selectSearchPageSuccessCB(tx, results) {
  if (results.rows.length) {
    var children = _reorderChildrenResult(results),
      pager = '<ul class="list-pagerer large children-pager">',
      options = {
        'pagerName': 'search-goals-'
      };
    $.each(children, function(cid, child) {
      if (child != undefined) {
        pager += _getHtml('pagerItem', child, options);
        var goalsSearchPage = _getHtml('goalsSearchPage', child);
        $('#home').after(goalsSearchPage);
        var $panel = $('#home #main-menu').clone();
        // initialize child page
        $('#search-goals-' + cid).prepend($panel);
      }
    });
    pager += '</ul>';
    // add pager in child page
    $(pager)
      .appendTo('div[data-role="page"][id*="' + options.pagerName + '"] ' +
        '.child.item');
    // set href to search button
    var fcid = $('div[data-role="page"][id*="' + options.pagerName + '"]:last')
      .attr('id');
    $('[data-role="panel"] a.search').attr('href', '#' + fcid);
  }
  if ($('div.ui-page nav[data-role="panel"]').get(0)) {
    $('div.ui-page nav[data-role="panel"]').trigger('updatelayout');
  }
  $.mobile.loading('hide');
  var pageId = $.mobile.activePage.attr("id");
  if (pageId != 'home') {
    if ($('#home.ui-page').get(0)) {
      $('#home.ui-page').trigger('create');
    }
    $.mobile.changePage('#home', {
      transition: "none"
    });
  } else {
    _removeLoginPages();
  }
}

// getPicture from camera
function _captureProfilePhoto(photolibrary) {
  var source = navigator.camera.PictureSourceType.CAMERA;
  var toPhotoAlbum = true;
  if (photolibrary) {
    source = navigator.camera.PictureSourceType.PHOTOLIBRARY;
    toPhotoAlbum = false;
  }
  var options = {
    quality: 50,
    targetWidth: 640,
    targetHeight: 504,
    allowEdit: true,
    saveToPhotoAlbum: toPhotoAlbum,
    limit: 1,
    destinationType: navigator.camera.DestinationType.FILE_URI,
    sourceType: source
  };
  navigator.camera.getPicture(_captureProfilePhotoSuccess, function(err) {
    _messagePopup(JSON.stringify(err), false);
  }, options);
}

// Called when a photo is successfully retrieved
function _captureProfilePhotoSuccess(imageURI) {
  // Save profile image to database;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT uid FROM users WHERE uid = ?', [apApp.settings.profileUID],
      function(tx, results) {
        if (results.rows.length > 0) {
          var image = document.getElementById('profile-photo-img');
          if (image && imageURI) {
            var imageHolder = document.getElementById('profile-photo');
            imageHolder.style.display = 'block';
            $('#profile-upload-photo').hide();
            // Show the captured photo
            // The in-line CSS rules are used to resize the image
            image.src = imageURI;
            var ts = parseInt(new Date().getTime() / 1000);
            // Update profile
            tx.executeSql('UPDATE users SET image_path = ?, updated = ?, update_photo = ? ' +
              'WHERE uid = ?', [imageURI, ts, 1, apApp.settings.profileUID],
              function(tx, results) {
                _messagePopup('Photo was uploaded successfully.', false);
              }, function(err) {
                _errorHandler(err, 1437);
              });
          }
        } else {
          var image = document.getElementById('create-profile-photo-img'),
            imageHolder = document.getElementById('create-profile-photo');
          image.src = imageURI;
          imageHolder.style.display = 'block';
          $('#create-profile-upload-photo').hide();
        }
      }, function(err) {
        _errorHandler(err, 1446);
      });
  }, function(err) {
    _errorHandler(err, 1447);
  });
  $.mobile.activePage.find('div[data-role="popup"]').popup('close');
}

// getPicture from camera
function _captureChildPhoto(photolibrary, image, imageHolder, uploadLink) {
  var source = navigator.camera.PictureSourceType.CAMERA;
  var toPhotoAlbum = true;
  if (photolibrary) {
    source = navigator.camera.PictureSourceType.PHOTOLIBRARY;
    toPhotoAlbum = false;
  }
  var options = {
    quality: 50,
    targetWidth: 640,
    targetHeight: 504,
    allowEdit: true,
    saveToPhotoAlbum: toPhotoAlbum,
    limit: 1,
    destinationType: navigator.camera.DestinationType.FILE_URI,
    sourceType: source
  };
  navigator.camera.getPicture(function(imageURI) {
    _captureChildPhotoSuccess(imageURI, image, imageHolder, uploadLink);
  }, function(err) {
    _messagePopup(JSON.stringify(err), false);
  }, options);
}

// Called when a photo is successfully retrieved
function _captureChildPhotoSuccess(imageURI, image, imageHolder, uploadLink) {
  // Get image handle
  if (image.get(0) && imageURI) {
    imageHolder.show();
    uploadLink.hide();
    image.attr('src', imageURI); // Show the captured photo
  }
  $.mobile.activePage.find('div[data-role="popup"]').popup('close');
}

function _swipeChildrenInfo(direction) {
  var $active = $('div.ui-page.ui-page-active[data-role="page"]');
  var pageId = $active.attr('id');
  if (pageId) {
    var $pager = $active.find('ul.children-pager');
    var $pagerActive = $pager.find('a[href*="' + pageId + '"]');
    var $prevPage = $pagerActive.parent().prev();
    var $nextPage = $pagerActive.parent().next();
    var newPageId;
    var reverse = false;

    if (direction == 'prev') {
      if ($prevPage.length > 0) {
        newPageId = $prevPage.find('a').attr('href');
      } else {
        newPageId = $pagerActive.parent().parent()
          .find('li:last a').attr('href');
      }
      reverse = true;
    } else {
      if ($nextPage.length > 0) {
        newPageId = $nextPage.find('a').attr('href');
      } else {
        newPageId = $pagerActive.parent().parent()
          .find('li:first a').attr('href');
      }
    }
    $.mobile.changePage(newPageId, {
      transition: "slide",
      reverse: reverse
    });
  }
}

function _saveChildSuccessCB(tx, results) {
  var reloadPage = false,
    cid = results.insertId,
    villageSize = $('#assign-village li.visible').size();
  if (villageSize > 0) {
    $('#assign-village li.visible').each(function(idx, el) {
      if (idx + 1 == villageSize) {
        reloadPage = true;
      }
      var uid = $('select', this).data('uid'),
        relationship = $('select', this).val();
      tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
        'VALUES (?, ?, ?)', [cid, uid, relationship],
        function(tx, results) {
          if (reloadPage === true) {
            _reloadPage();
          }
        }, function(err) {
          _errorHandler(err, 1536);
        });
    });
  } else {
    _reloadPage();
  }
}

function _formatGoalData() {
  var data = $(window).data();
  data.timestamp = parseInt(new Date().getTime() / 1000); // timestamp
  data.goalRepeat = $('#goal-repeat').val();
  data.goalRepeatOld = $('#goal-repeat').attr('rel');
  data.goalTime = $('#goal-time').val();
  data.goalTimeOld = $('#goal-time').attr('rel');
  data.goalInterval = $('#goal-interval').val();
  data.goalIntervalOld = $('#goal-interval').attr('rel');
  data.start_date = new Date();
  data.end_date = new Date();

  var res = data.goalTime.split(':'),
      goalInterval = data.goalInterval.split('-'),
      days = parseInt(goalInterval[1]);
  data.start_date.setUTCHours(0, 0, 0, 0);
  data.end_date.setUTCHours(23, 59, 59, 0);
  switch (goalInterval[0]) {
    case 'day':
      data.end_date.setUTCDate(data.start_date.getUTCDate() + days);
      break;
    case 'month':
      data.end_date.setUTCMonth(data.start_date.getUTCMonth() + days);
      break;
    case 'year':
      data.end_date.setUTCFullYear(data.start_date.getUTCFullYear() + days);
      break;
  }
  data.start_date = parseInt(data.start_date.getTime() / 1000),
  data.end_date = parseInt(data.end_date.getTime() / 1000);
  return data;
}

function _addNewGoalSuccessCB(data) {
  _messagePopup('Reminder start_date: ' + data.start_date, false);
  _messagePopup('Reminder end_date: ' + data.end_date, false);
  if (data.start_date != undefined) {
    if (window.plugin != undefined) {
      var notificationDate = new Date(data.start_date*1000);
      var utc = new Date(notificationDate.getTime() + notificationDate.getTimezoneOffset() * 60000);
      window.plugin.notification.local.add({
        id: data.rid, // is converted to a string
        title: data.first_name,
        message: data.title,
        repeat: data.goalInterval, // Has the options of 'hourly', 'daily', 'weekly', 'monthly', 'yearly'
        date: utc
      });
    }
  }

  var $addGoalPage = $('#add-goal-' + data.cid),
    $childPage = $('#children-' + data.cid),
    goalItem = _getHtml('goalItemChecked', data),
    myGoalItem = _getHtml('myGoalItem', data);
  // reset send form elements
  $addGoalPage.find('form').trigger('reset')
    .find('div.input-goal').stop(true, true).slideUp(300);
  // add links
  $childPage.find('.main .check-listview li.add').after(goalItem);
  if ($childPage.hasClass('ui-page')) {
    $childPage.find('.main .check-listview[data-role="listview"]')
      .listview('refresh');
  }
  $('#my-goals li:first').after(myGoalItem);
  if ($('#settings.ui-page').get(0)) {
    $('#my-goals').listview('refresh');
  }
  $('#village-goals li:first').after(myGoalItem);
  if ($('#team.ui-page').get(0)) {
    $('#village-goals').listview('refresh');
  }
  $.mobile.loading('hide');
  _messagePopup('New Goal has been created.', false);

  // return to prev page
  if ($childPage.get(0)) {
    $.mobile.changePage('#children-' + data.cid, {
      transition: "slide",
      reverse: true
    });
  }
}

function _addNewGoal(data) {
  var goalItemChecked = _getHtml('goalItemChecked', data),
    myGoalItem = _getHtml('myGoalItem', data)
    $childPage = $('#children-' + data.cid);
  $('#children-' + data.cid)
    .find('.main .check-listview')
    .append(goalItemChecked);
  $('#children-' + data.cid)
    .find('.main .check-listview.ui-listview')
    .listview('refresh');
  $('#village-goals li:first').after(myGoalItem);
  if ($('#team.ui-page').get(0)) {
    $('#village-goals').listview('refresh');
  }
  $('#my-goals li:first').after(myGoalItem);
  if ($('#settings.ui-page').get(0)) {
    $('#my-goals').listview('refresh');
  }

  _messagePopup('Reminder start_date: ' + data.start_date, false);
  _messagePopup('Reminder end_date: ' + data.end_date, false);
  if (data.start_date != undefined) {
    if (window.plugin != undefined) {
      var notificationDate = new Date(data.start_date*1000);
      var utc = new Date(notificationDate.getTime() + notificationDate.getTimezoneOffset() * 60000);
      window.plugin.notification.local.add({
        id: data.rid, // is converted to a string
        title: data.first_name,
        message: data.title,
        repeat: data.goalInterval, // Has the options of 'hourly', 'daily', 'weekly', 'monthly', 'yearly'
        date: utc
      });
    }
  }
  $.mobile.loading('hide');
  _messagePopup('Goal "' + data.title + '" has been added', false);

  // return to prev page
  if ($childPage.get(0)) {
    $.mobile.changePage('#children-' + data.cid, {
      transition: "slide",
      reverse: true
    });
  }
}

function _deleteGoal(tx, results, data, $goal) {
  var goalItem = _getHtml('goalItem', data);

  $goal.slideUp(300);
  $('#search-goals-' + data.cid)
    .find('div.listview-filter ul')
    .prepend(goalItem);
  $('.ui-page .main .listview-filter .ui-listview').listview('refresh');
  $.mobile.loading('hide');
  _messagePopup('Goal "' + data.title + '" has been deleted', false);
}

// Action message
function _messagePopup(message, error) {
  var classes = 'msg';
  if (error) {
    classes += ' error';
  }
  var $message = $('<div class="' + classes + '" style="display: none;">' +
    message + '</div>');
  $('#message-popup').append($message);
  $message.show(200);
  setTimeout(function() {
    $message.hide(200, function() {
      $(this).remove();
    });
  }, 8000);
}

// Fail functions
//
// Transaction error callback
function _errorHandler(err, errId) {
  $.mobile.loading('hide');
  _messagePopup('ID: ' + errId + ', ERROR:' + JSON.stringify(err), true);
}

function _getHtml(idx, dt, options) {
  var options = (typeof options === "undefined") ? {} : options;
  var output = '',
    opt = {
      'selfUID': (typeof options.selfUID === "undefined") ? null : options.selfUID,
      'isNew': (typeof options.isNew === "undefined") ? null : options.isNew,
      'articleLinked': (typeof options.articleLinked === "undefined") ?
        null : options.articleLinked,
      'pagerName': (typeof options.pagerName === "undefined") ?
        null : options.pagerName
    };
  switch (idx) {
    case 'header':
      output += '<header class="header" data-role="header" data-id="header" ' +
        'data-position="fixed" data-tap-toggle="false">';
      output += '<h1 class="logo">Promise Tracker</h1>';
      output += '<a href="#" class="main-menu-btn ui-btn-right">Menu</a>';
      output += '</header>';
      break;
    case 'iscroll':
      output += '<div class="iscroll-pulldown">';
      output += '<span class="iscroll-pull-icon"></span><span class="iscroll-pull-label"></span>';
      output += '</div>';
      break;
    case 'article':
      if (opt.articleLinked !== null) {
        output += '<article class="child item" data-age="' + dt.age + '">';
        output += '<a href="#children-' + dt.cid + '" data-transition="slide" ' +
          'title="' + dt.first_name + '">';
      } else {
        output += '<article class="child item inner" data-age="' + dt.age + '">';
      }
      output += '<img src="' + dt.image_path + '" alt="" />';
      output += '<span class="image-horizontal-gradient-overlay"></span>';
      output += '<span class="title">' + dt.first_name + '</span>';
      if (opt.articleLinked !== null) {
        output += '</a>';
      }
      output += '<a class="edit-child" href="#edit-child" data-transition="slide"><span>Edit child</span></a>';
      output += '</article>';
      break;
    case 'myChildren':
      var relationships = apApp.settings.relationships;
      if (dt.relationship != undefined) {
        relationships = apApp.settings.relationships.replace('value="' +
          dt.relationship + '"', 'value="' + dt.relationship +
          '" selected="selected"');
      }
      output += '<li>';
      output += '<a href="#children-' + dt.cid + '" data-transition="slide">';
      output += '<span>' + dt.first_name + ':</span>';
      output += '<span class="rounded"><span class="rounded-inner">';
      output += '<img src="' + dt.image_path + '" alt="" />';
      output += '</span></span>';
      output += '</a>';
      output += '<select name="assign-children-' + dt.cid + '" ' +
        'id="assign-children-' + dt.cid + '" data-cid="' + dt.cid + '">';
      output += '<option value="">Relationship</option>';
      output += relationships;
      output += '</select>';
      output += '</li>';
      break;
    case 'assignProfile':
      var relationships = apApp.settings.relationships;
      if (dt.relationship != undefined) {
        relationships = apApp.settings.relationships.replace('value="' +
          dt.relationship + '"', 'value="' + dt.relationship +
          '" selected="selected"');
      }
      var classes = 'hidden';
      if (dt.uid == apApp.settings.profileUID) {
        classes = 'visible static';
      }
      output += '<li class="' + classes + '" data-uid="' + dt.uid + '">';
      output += '<a href="#" data-transition="slide">';
      output += '<span>' + dt.name + ':</span>';
      output += '<span class="rounded"><span class="rounded-inner">';
      output += '<img src="' + dt.image_path + '" alt="" />';
      output += '</span></span>';
      output += '</a>';
      output += '<select required="required" name="assign-profile-' +
        dt.uid + '" id="assign-profile-' + dt.uid + '" data-uid="' +
        dt.uid + '">';
      output += '<option value="">Relationship</option>';
      output += relationships;
      output += '</select>';
      output += '</li>';
      break;
    case 'childPage':
      output += '<div data-role="page" data-title="' + dt.first_name + '" ' +
        'id="children-' + dt.cid + '" class="white" ' +
        'data-add-back-btn="true" data-cid="' + dt.cid + '">';
      output += _getHtml('header', dt);
      output += '<section class="main" data-role="content" data-iscroll="">';
      output += _getHtml('iscroll', dt);
      output += _getHtml('article', dt);
      if (apApp.settings.tips[dt.age] != undefined) {
        var topicTidsSize = Object.keys(apApp.settings.topicTids).length,
          topicTidsId = apApp.settings.topicTids[Math.floor(Math.random() * topicTidsSize)];
        if (apApp.settings.tips[dt.age][topicTidsId] != undefined) {
          var tipsItems = apApp.settings.tips[dt.age][topicTidsId],
            tipsLength = tipsItems.length,
            tipsItem = tipsItems[Math.floor(Math.random() * tipsLength)];
          output += '<div class="helpful-info">';
          output += '<h2>' + tipsItem.title + '</h2>';
          output += '<p>' + tipsItem.body + '</p>';
          output += '</div>';
        }
      }
      output += '<ul class="check-listview" data-role="listview">';
      output += '<li class="add" data-icon="plus"><a href="#add-goal-' +
        dt.cid + '" data-transition="slide">My Goals for ' +
        dt.first_name + '</a></li>';

      if (dt.goals != undefined && dt.goals.length != 0 && opt.isNew === null) {
        var goal = dt.goals;
        $.each(goal, function(idx, val) {
          // if (val.uid == apApp.settings.profileUID) {
            var data = {
              'gid': val.gid,
              'cid': dt.cid,
              'completed': val.completed,
              'title': val.title
            };
            output += _getHtml('goalItemChecked', data);
          // }
        });
      }
      output += '</ul>';
      output += '</section>';
      output += '</div>';
      break;
    case 'goalsSearchPage':
      output += '<div data-role="page" data-title="Search Goals" ' +
        'id="search-goals-' + dt.cid + '" data-cid="' + dt.cid + '" ' +
        'data-add-back-btn="true">';
      output += _getHtml('header', dt);
      output += '<section class="main" data-role="content" data-iscroll="">';
      output += _getHtml('iscroll', dt);
      output += '<div id="search-listing-' + dt.cid + '">';
      output += _getHtml('article', dt);
      output += '<div class="listview-filter">';
      output += '<ul data-role="listview" data-filter="true" ' +
        'data-input="#search-goals-input-' + dt.cid + '" ' +
        'class="first-bordered">';
      if (dt.goals != undefined && dt.goals.length != 0) {
        var goals = dt.goals;
        $.each(goals, function(gid, val) {
          var data = {};
          data.cid = dt.cid;
          data.gid = val.gid;
          data.title = val.title;
          output += _getHtml('goalItem', data);
        });
      }
      output += '</ul>';
      output += '</div>';
      output += '</div>';
      output += '</section>';
      output += '</div>';
      break;
    case 'addGoalPage':
      output += '<div data-role="page" data-title="Add Goal" id="add-goal-' +
        dt.cid + '" data-add-back-btn="true" data-cid="' + dt.cid +
        '">';
      output += _getHtml('header', dt);
      output += '<section class="main" data-role="content" data-iscroll="">';
      output += _getHtml('iscroll', dt);
      output += _getHtml('article', dt);
      output += '<form action="#" method="post" accept-charset="utf-8">';
      output += '<div class="ui-field-contain">';
      output += '<label for="in-topic-' + dt.cid + '" class="select">' +
        'I\'m looking for goals in</label>';
      output += '<select name="in-topic-' + dt.cid + '" class="in-topic">';
      output += '<option value="">Choose a topic</option>';
      output += '</select>';
      output += '</div>';
      output += '<div class="ui-field-contain">';
      output += '<label for="select-topic-' + dt.cid + '">' +
        'Actually, I want to add my own</label>';
      output += '<select name="select-topic-' + dt.cid + '" ' +
        'class="select-topic">';
      output += '<option value="">Choose a topic</option>';
      output += '</select>';
      output += '</div>';
      output += '<div class="ui-field-contain input-goal">';
      output += '<label for="goal-' + dt.cid + '" ' +
        'class="ui-hidden-accessible">Goal</label>';
      output += '<input type="text" name="goal-' + dt.cid + '" class="goal" ' +
        'value="" />';
      output += '</div>';
      output += '<div class="ui-field-contain">';
      output += '<div class="inline-form">';
      output += '<div class="wrapper">';
      output += '<div class="content">';
      output += '<label for="public-goal-' + dt.cid + '">';
      output += '<input type="checkbox" name="public-goal-' + dt.cid +
        '" checked="checked" class="public-goal" />';
      output += 'Public <span>(others can use this goal)</span>';
      output += '</label>';
      output += '</div>';
      output += '</div>';
      output += '<div class="right">';
      output += '<label for="submit-goal-' + dt.cid + '" ' +
        'class="ui-hidden-accessible">Add:</label>';
      output += '<button type="submit" id="submit-goal-' + dt.cid + '" ' +
        'class="ui-btn submit-goal" data-age="' + dt.age +
        '" data-first-name="' + dt.first_name + '" data-image-path="' +
        dt.image_path + '">Add</button>';
      output += '</div>';
      output += '<div class="clear"></div>';
      output += '</div>';
      output += '</div>';
      output += '</form>';
      output += '</section>';
      output += '</div>';
      break;
    case 'addTopicPage':
      var featuredGoals = '';
      if (dt.goals != undefined && dt.goals.length != 0) {
        var goals = dt.goals;
        $.each(goals, function(gid, val) {
          if (val.featured === 1) {
            featuredGoals += '<div class="item" data-gid="' + val.gid + '" data-cid="' + dt.cid + '"><a href="#" class="ui-btn ' +
              'ui-btn-icon-right">' + val.title + '</a></div>';
          }
        });
      }
      output += '<div data-role="page" data-title="Add Topic" ' +
        'id="add-topic-' + dt.topicID + '-cid-' + dt.cid + '" ' +
        'data-add-back-btn="true" data-cid="' + dt.cid + '">';
      output += _getHtml('header', dt);
      output += '<section class="main" data-role="content" data-iscroll="">';
      output += _getHtml('iscroll', dt);
      output += _getHtml('article', dt);
      output += '<h2 id="topic-name" class="page-title">' + dt.topicName +
        '</h2>';
      if (apApp.settings.tips[dt.age] != undefined) {
        if (apApp.settings.tips[dt.age][dt.topicID] != undefined) {
          var tipsItems = apApp.settings.tips[dt.age][dt.topicID],
            tipsLength = tipsItems.length,
            tipsItem = tipsItems[Math.floor(Math.random() * tipsLength)];
          output += '<div class="helpful-info">';
          output += '<h2>' + tipsItem.title + '</h2>';
          output += '<p>' + tipsItem.body + '</p>';
          output += '</div>';
        }
      }
      output += '<div class="theme-b">';
      if (featuredGoals) {
        output += '<h3 class="label white">Featured goals</h3>';
        output += '<div class="featured-goals">' + featuredGoals;
        output += '<ul class="list-pagerer"></ul></div>'
      }
      output += '</div>';
      output += '<h3 id="topic-goals-list" class="label white">From the ' +
        '<span>' + dt.topicName + '</span></h3>';
      output += '<div class="listview-filter">';
      output += '<ul data-role="listview" class="first-bordered">';
      if (dt.goals != undefined && dt.goals.length != 0) {
        var goals = dt.goals;
        $.each(goals, function(gid, val) {
          var data = {};
          data.cid = dt.cid;
          data.gid = val.gid;
          data.title = val.title;
          output += _getHtml('goalItem', data);
        });
      }
      output += '</ul>';
      output += '</div>';
      output += '</section>';
      output += '</div>';
      break;
    case 'goalItem':
      output += '<li data-cid="' + dt.cid + '" data-icon="plus" ' +
        'data-gid="' + dt.gid +
        '" class="checked-goal-plus ui-btn-icon-left">' +
        '<a href="#" data-transition="slide">' + dt.title +
        '</a></li>';
      break;
    case 'goalItemChecked':
      var goalClass = '';
      if (dt.completed == 1) {
        goalClass = ' checked';
      }
      output += '<li data-gid="' + dt.gid + '" data-cid="' + dt.cid + '" ' +
        'class="check checked-goal' + goalClass + '">' +
        '<span class="edit">Edit</span>' +
        '<span class="delete">Delete</span>' +
        '<a href="#" data-icon="check" ' +
        'data-transition="slide">' + dt.title + '</a></li>';
      break;
    case 'myGoalItem':
      var goalClass = '';
      if (dt.completed == 1) {
        goalClass = ' checked';
      }
      output += '<li class="check' + goalClass + '" data-gid="' + dt.gid +
        '"><a href="#" ' +
        'data-icon="check" data-transition="slide">' +
        '<span class="rounded small"><span class="rounded-inner"><img src="' + dt.image_path +
        '" alt="" /></span></span>' + dt.title +
        '</a></li>';
      break;
    case 'villageGoalItem':
      var goalClass = '';
      output += '<li class="double-icons active" data-gid="' + dt.gid + '" data-uid="' + dt.uid + '">' +
        '<a href="#" data-transition="slide"><span class="rounded small"><span class="rounded-inner">' +
        '<img src="' + dt.image_path + '" alt="" /></span></span>' +
        '<span class="rounded small"><span class="rounded-inner"><img src="' + dt.user_image_path +
        '" alt="" /></span></span>' + dt.title + '</a></li>';
      break;
    case 'myGoals':
      if (dt.goals.length != 0) {
        var goal = dt.goals;
        $.each(goal, function(index, val) {
          var data = {
            'completed': val.completed,
            'gid': val.gid,
            'image_path': dt.image_path,
            'first_name': dt.first_name,
            'title': val.title
          };
          output += _getHtml('myGoalItem', data);
        });
      }
      break;
    case 'myChildLinkInMenu':
      output += '<li><a class="is-ico" href="#children-' + dt.cid + '" ' +
        'data-transition="slide" data-direction="reverse">' + dt.first_name +
        '<span class="rounded"><span class="rounded-inner"><img src="' + dt.image_path + '" ' +
        'alt="" /></span></span></a></li>';
      break;
    case 'pagerItem':
      if (opt.pagerName !== null) {
        if (dt.topicID != undefined) {
          opt.pagerName = opt.pagerName + dt.topicID + '-cid-'
        }
        output += '<li><a href="#' + opt.pagerName + dt.cid + '" ' +
          'data-transition="slide" title="' + dt.first_name + '">' +
          dt.first_name + '</a></li>';
      }
      break;
    case 'inlinePerson':
      output += '<li data-uid="' + dt.uid + '" class="active"><a href="#">';
      output += '<span class="rounded medium"><span class="rounded-inner">';
      output += '<img src="' + dt.image_path + '" alt="" />';
      output += '</span></span>';
      output += dt.name;
      output += '</a></li>';
      break;
    case 'invitePopup':
      output += '<div data-register="' + dt.register + '" id="invite-popup-' + dt.uid + '" data-uid-origin="' + dt.uid + '" data-role="popup">';
      output += '  <div class="popup-holder">';
      output += '    <h3>' + dt.name + ' has invited you to join their village.</h3>';
      output += '    <p>Do you accept?</p>';
      output += '  </div>';
      output += '  <div class="popup-buttons">';
      output += '    <a href="#" class="cancel invite-button" data-accepted="no">No</a>';
      output += '    <a href="#" class="invite-button" data-accepted="yes">Yes</a>';
      output += '  </div>';
      output += '</div>';
      break;
    case 'invitePopupSuccess':
      output += '<div id="invite-popup-success" data-role="popup">';
      output += '  <div class="popup-holder">';
      if (dt.accepted == 1) {
        output += '    <h3>Congratulations your invite was accepted by ' + dt.email + '</h3>';
      } else {
        output += '    <h3>Sorry your invite was not accepted by ' + dt.email + '</h3>';
      }
      output += '  </div>';
      output += '  <div class="popup-buttons">';
      output += '    <a href="#" class="single close" data-accepted="no">Ok</a>';
      output += '  </div>';
      output += '</div>';
      break;
    case 'PopupConnection':
      output += '<div id="popup-connection" data-role="popup">';
      output += '  <div class="popup-holder">';
      output += '    <h3>The connection to the server has failed. Please try again later ...</h3>';
      output += '  </div>';
      output += '  <div class="popup-buttons">';
      output += '    <a href="#" class="single close" data-accepted="no">Ok</a>';
      output += '  </div>';
      output += '</div>';
      break;
  }
  return output;
}

function _getAge(birthDate) {
  var childAge = 0;

  if (birthDate) {
    var now = new Date();
    var dob = new Date(birthDate.substring(0, 4),
      birthDate.substring(5, 7) - 1,
      birthDate.substring(8, 10));
    var yearNow = now.getYear();
    var yearDob = dob.getYear();
    var yearAge = yearNow - yearDob;
    if (yearAge > 0) {
      childAge = yearAge;
    }
  }
  return childAge;
}

function _getStarted() {
  $.mobile.loading('show');
  if (apApp.settings.createNewChild) {
    var child = {
      'first_name': $('#create-child-first-name').val(),
      'last_name': $('#create-child-last-name').val(),
      'birth_date': $('#create-child-birth-date').val(),
      'image_path': $('#create-child-photo-img').attr('src'),
      'relationship': $('#create-child-relationship').val()
    },
   ts = apApp.settings.timestamp;
    child.age = _getAge(child.birth_date);
    // Create users
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      // Create childs
      tx.executeSql('INSERT INTO childs (cid_origin, uid, first_name, ' +
        'last_name, birth_date, image_path, age, updated, created, status, update_photo) ' +
        'VALUES (0, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)', [apApp.settings.profileUID, child.first_name, child.last_name, child.birth_date, child.image_path, child.age, ts, ts],
        function(tx, results) {
          tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
            'VALUES (?, ?, ?)', [results.insertId, apApp.settings.profileUID, child.relationship],
            function(tx, results) {
              _dbSuccessHandler(tx);
            }, function(err) {
              _errorHandler(err, 2154);
            });
        });
    }, function(err) {
      _errorHandler(err, 2156);
    });
  } else {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      _dbSuccessHandler(tx);
    });
  }
}

function _removeLoginPages() {
  $('div[data-role="page"][id*="registration-"]').remove();
}

function _uploadContent() {
  var time = apApp.settings.cron;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT * FROM users WHERE uid = 1', [], _selectUploadUsers, function(err) {
      _errorHandler(err, 2167);
    });
  });
}

function _selectUploadUsers(tx, results) {
  var len = results.rows.length;
  var user = {};
  if (len) {
    for (var i = 0; i < len; i++) {
      var user_data = results.rows.item(i);
      $.each(user_data, function(key, value) {
        user[key] = value;
      });
      apApp.settings.userProfile = user;
      //
      if (user.updated > apApp.settings.cron) {
        _uploadUserToSite(user);
      } else {
        _uploadUserChilds(user);
        _uploadUserGoals(user);
      }
    }
  }
}

function _uploadUserPictureToSite(user) {
  if (apApp.settings.mode != 'dev') {
    if (user.image_path) {
      var imageURI = user.image_path,
        options = new FileUploadOptions(),
        ft = new FileTransfer();
      options.fileKey = "file";
      options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
      options.mimeType = "image/jpg";
      ft.upload(imageURI, encodeURI(apApp.settings.restUrl + 'import/user/picture?user_ID=' + apApp.settings.userProfile.uid_origin + '&user-photo=' + options.fileName), _uploadPhotoSuccessCallback, _uploadPhotoFailCallback, options);
    }
  }
}

function _uploadChildPictureToSite(child) {
  if (apApp.settings.mode != 'dev') {
    var imageURI = child.image_path,
      options = new FileUploadOptions(),
      ft = new FileTransfer();
    options.fileKey = "file";
    options.fileName = imageURI.substr(imageURI.lastIndexOf('/') + 1);
    options.mimeType = "image/jpg";
    ft.upload(imageURI, encodeURI(apApp.settings.restUrl + 'import/child/picture?child_ID=' + child.cid_origin + '&child-photo=' + options.fileName), _uploadPhotoSuccessCallback, _uploadPhotoFailCallback, options);
  }
}

function _uploadPhotoSuccessCallback(r) {
  var response = jQuery.parseJSON(r.response);
  if (response.uid != undefined) {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('UPDATE users SET update_photo=? WHERE uid_origin=?', [0, response.uid]);
    });
    var user = {
      'uid_origin' : response.uid,
      'photo_url' : response.photo_url,
      'photo' : response.photo,
      'reupload' : 1,
    };
    _downloadUserPhoto(user);
    _messagePopup("Successfully uploading User image", false);
  }
  if (response.cid != undefined) {
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('UPDATE childs SET update_photo=? WHERE cid_origin=?', [0, response.cid]);
    });
    var child = {
      'cid_origin' : response.cid,
      'photo_url' : response.photo_url,
      'photo' : response.photo,
      'reupload' : 1,
    };
    _downloadChildPhoto(child);
    _messagePopup("Successfully uploading Child image", false);
  }

}

function _uploadPhotoFailCallback(error) {
  _messagePopup('There was an error uploading image.', true);
  _messagePopup('Error code: ' + error.code, true);
  _messagePopup('Error source: ' + error.source, true);
}

function _uploadUserToSite(user) {
  _messagePopup('Profile upload to site',false);
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/user",
    cache: false,
    data: user,
    crossDomain: true,
    success: function(response) {
      if (user.uid_origin == 0) {
        user.uid_origin = parseInt(response.uid);
        apApp.settings.userProfile.uid_origin = parseInt(response.uid);
        _succsesUserUpload(user);
      } else {
        if (user.update_photo == 1) {
          _uploadUserPictureToSite(user);
        }
        _uploadUserChilds(user);
        _uploadUserGoals(user);
      }
    }
  });
}

function _succsesUserUpload(user) {
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('UPDATE users SET uid_origin=? WHERE uid=?', [user.uid_origin, user.uid], function() {
      _uploadUserPictureToSite(user);
      _uploadUserChilds(user);
      _uploadUserGoals(user);
    });
  });
}

function _uploadUserChilds(user) {
  var time = apApp.settings.cron;
  if (apApp.settings.registation) time = time - 1;
  apApp.settings.uploadQueryExclude.child = false;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT c.*, ci.relationship, ur.uid_origin AS ruid_origin, r.title, u.uid_origin FROM childs AS c ' +
      'LEFT JOIN users AS u ON u.uid = c.uid ' +
      'LEFT JOIN child_index AS ci ON ci.cid = c.cid ' +
      'LEFT JOIN relationships AS r ON r.rid = ci.relationship ' +
      'LEFT JOIN users AS ur ON ci.uid = ur.uid ' +
      'WHERE c.updated > ?', [time], _selectUploadChilds, function(err) {
        _errorHandler(err, 2278);
      });
  });
}

function _selectUploadChilds(tx, results) {
  var len = results.rows.length;
  var childs = {
    'children': []
  };
  var children = {};
  apApp.settings.uploadQueryExclude.childNids = 0;
  apApp.settings.uploadQueryExclude.childPictures = 0;
  if (len) {
    for (var i = 0; i < len; i++) {
      var item = results.rows.item(i),
        cid = item.cid;
      if (children[cid] == undefined) {
        children[cid] = {
          'cid': cid,
          'cid_origin': item.cid_origin,
          'uid': item.uid,
          'first_name': item.first_name,
          'last_name': item.last_name,
          'birth_date': item.birth_date,
          'image_path': item.image_path,
          'age': item.age,
          'updated': item.updated,
          'created': item.created,
          'status': item.status,
          'update_photo': item.update_photo,
          'uid_origin': item.uid_origin,
          'relationship': [],
        };
        if (children[cid].cid_origin == 0) apApp.settings.uploadQueryExclude.childNids++;
        if (children[cid].cid_origin != 0 && children[cid].update_photo == 1) apApp.settings.uploadQueryExclude.childPictures++;
      }
      if (item.relationship != undefined) {
        children[cid].relationship.push({
          'relationship': item.relationship,
          'relationship_title': item.title,
          'uid_origin': item.ruid_origin,
        });
      }

    }
    childs['children'] = children;
    _uploadChildToSite(childs);
  } else {
    apApp.settings.uploadQueryExclude.child = true;
    _uploadQueryExclude();
  }
}

function _uploadChildToSite(childs) {
  _messagePopup('Upload Child to site',false);
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/child",
    cache: false,
    data: childs,
    crossDomain: true,
    success: function(response) {
      if (apApp.settings.uploadQueryExclude.childNids > 0) {
        _succsesChildUpload(childs, response);
      } else {
        if (apApp.settings.uploadQueryExclude.childPictures > 0) {
          _succsesChildPictureUpload(childs, response);
        }
        apApp.settings.uploadQueryExclude.child = true;
        _uploadQueryExclude();
      }
    }
  });
}

function _succsesChildPictureUpload(childs, response) {
  var data = {};
  $.each(childs['children'], function(i, child) {
    if (child.update_photo == 1) {
      data.image_path = child.image_path;
      data.cid_origin = response[child.cid];
      _uploadChildPictureToSite(data);
    }
  });
}

function _succsesChildUpload(childs, response) {
  var j = 0;
  var data = {};
  $.each(childs['children'], function(i, child) {
    if (child.cid_origin == 0) {
      data.image_path = child.image_path;
      data.cid_origin = response[child.cid];
      _uploadChildPictureToSite(data);
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('UPDATE childs SET cid_origin=? WHERE cid=?', [response[child.cid], child.cid], function() {
          j++;
          if (j == apApp.settings.uploadQueryExclude.childNids) {
            apApp.settings.uploadQueryExclude.child = true;
            _uploadQueryExclude();
          }
        });
      });
    }
  });
}

function _uploadUserGoals(user) {
  var time = apApp.settings.cron;
  apApp.settings.uploadQueryExclude.goals = false;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT g.*, u.uid_origin as author_id, a.age, a.delta AS age_delta, t.topic, t.delta AS topic_delta FROM goals AS g ' +
      'LEFT JOIN users AS u ON u.uid = g.uid ' +
      'LEFT JOIN age AS a ON a.entity_id = g.gid ' +
      'LEFT JOIN topic AS t ON t.entity_id = g.gid ' +
      'WHERE a.type="goal" AND t.type="goal" AND g.updated > ? AND g.uid = ?', [time, user.uid], _selectUploadGoals, function(err) {
        _errorHandler(err, 2394);
      });
  });
}

function _selectUploadGoals(tx, results) {
  var len = results.rows.length;
  var goals = {};
  apApp.settings.uploadQueryExclude.goalNids = 0;
  var items = {
    'goals': []
  };
  if (len) {
    for (var i = 0; i < len; i++) {
      var item = results.rows.item(i);
      if (goals[item.gid] == undefined) {
        goals[item.gid] = {
          'gid': item.gid,
          'title': item.title,
          'created': item.created,
          'uid_origin': item.author_id,
          'featured': item.featured,
          'gid_origin': item.gid_origin,
          'status': item.status,
          'age': [],
          'topic': []
        };

        if (item.gid_origin == 0) apApp.settings.uploadQueryExclude.goalNids++;
      }
      goals[item.gid].age[item.age_delta] = item.age;
      goals[item.gid].topic[item.topic_delta] = item.topic;
    }
    items.goals = goals;
    _uploadGoalsToSite(items);
  } else {
    apApp.settings.uploadQueryExclude.goals = true;
    _uploadQueryExclude();
  }
}

function _uploadGoalsToSite(goals) {
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/goals",
    cache: false,
    data: goals,
    crossDomain: true,
    success: function(response) {
      if (apApp.settings.uploadQueryExclude.goalNids > 0) {
        _succsesGoalsUpload(goals, response);
      } else {
        apApp.settings.uploadQueryExclude.goals = true;
        _uploadQueryExclude();
      }

    }
  });
}

function _succsesGoalsUpload(goals, response) {
  var j = 0;
  $.each(goals['goals'], function(i, goal) {
    if (goal.gid_origin == 0) {
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('UPDATE goals SET gid_origin=? WHERE gid=?', [response[goal.gid], goal.gid],
          function() {
            j++;
            if (j == apApp.settings.uploadQueryExclude.childNids) {
              apApp.settings.uploadQueryExclude.goals = true;
              _uploadQueryExclude();
            }
          });
      });
    }
  });
}

function _uploadQueryExclude() {
  if (apApp.settings.uploadQueryExclude.goals === true &&
    apApp.settings.uploadQueryExclude.child === true) {
    _uploadGoalsofChildren();
    if (!apApp.settings.registation) {
      _getContent('_dbQuery');
    } else {
      _queryExclude('_dbQuery');
    }
  }
}

function _uploadGoalsofChildren() {
  var time = apApp.settings.cron;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT gi.gid, gi.completed, g.gid_origin, c.cid_origin, u.uid_origin FROM goal_index AS gi ' +
      'LEFT JOIN goals AS g ON g.gid = gi.gid ' +
      'LEFT JOIN childs AS c ON c.cid = gi.cid ' +
      'LEFT JOIN users AS u ON u.uid = gi.uid ' +
      'WHERE gi.updated > ?', [time], _selectUploadGoalsofChildren, function(err) {
        _errorHandler(err, 2488);
      });
  });
}

function _selectUploadGoalsofChildren(tx, results) {
  var len = results.rows.length;
  var goals = {}, items = {
      'goals': []
    };;
  if (len) {
    for (var i = 0; i < len; i++) {
      var item = results.rows.item(i);
      if (goals[item.gid] == undefined){
        goals[item.gid] = {
          completed: item.completed,
          gid_origin: item.gid_origin,
          cid_origin: item.cid_origin,
          uids: [],
        };
      }
      goals[item.gid].uids.push(item.uid_origin);
    }
    items.goals = goals;
    _uploadGoalsofChildrenToSite(items);
  } else {
    _uploadRemindersofGoals();
  }
}

function _uploadGoalsofChildrenToSite(goals) {
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/children-goals",
    cache: false,
    data: goals,
    crossDomain: true,
    success: function(response) {
      _uploadRemindersofGoals();
    }
  });
}

function _uploadRemindersofGoals(){
  var time = apApp.settings.cron;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT ri.gid, r.*, g.gid_origin, c.cid_origin, u.uid_origin FROM reminder_index AS ri ' +
      'LEFT JOIN reminder AS r ON r.rid = ri.rid ' +
      'LEFT JOIN goals AS g ON g.gid = ri.gid ' +
      'LEFT JOIN childs AS c ON c.cid = ri.cid ' +
      'LEFT JOIN users AS u ON u.uid = ri.uid ' +
      'WHERE ri.updated > ?', [time], _selectUploadRemindersofGoals, function(err) {
        _errorHandler(err, 3089);
      });
  });
}

function _selectUploadRemindersofGoals(tx, results){
  var len = results.rows.length;
  var reminders = {};
  var import_reminder = [];
  var items = {
    'reminders': [],
    'import_reminder' : [],
  };
  if (len) {
    for (var i = 0; i < len; i++) {
      var item = results.rows.item(i);
      if (reminders[item.rid] == undefined) {
        reminders[item.rid] = {
          'rid': item.rid,
          'time': item.time,
          'gid_origin' : item.gid_origin,
          'repeat': item.repeat,
          'interval': item.interval,
          'rid_origin': item.rid_origin,
          'start_date': item.start_date,
          'end_date': item.end_date,
          'cid_origin': item.cid_origin,
          'uids': [],
        };
        if (item.rid_origin == 0) import_reminder.push(item.rid);
      }

      reminders[item.rid].uids.push(item.uid_origin);
    }
    items.reminders = reminders;
    items.import_reminder = import_reminder;
    _uploadRemindersofGoalsToSite(items);
  }
}


function _uploadRemindersofGoalsToSite(reminders){
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/reminder-goals",
    cache: false,
    data: reminders,
    crossDomain: true,
    success: function(response) {
      if (reminders.import_reminder.length) {
        _updateRemindersofApp(reminders.import_reminder,response);
      }
    }
  });
}

function _updateRemindersofApp(reminder,response){
  $.each(reminder,function(i,rid){
    apApp.settings.dbPromiseTracker.transaction(function(tx) {
      tx.executeSql('UPDATE reminder SET rid_origin = ? WHERE rid = ?', [response[rid],rid]);
    });
  });
}

function _sendInvitation() {
  var data = {
    'fname': $('#add-to-village-firstname').val(),
    'lname': $('#add-to-village-lastname').val(),
    'email': $('#add-to-village-email').val(),
    'message': $('#add-to-village-message').val(),
    'uid_origin': apApp.settings.userProfile.uid_origin
  }
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/invite",
    cache: false,
    data: data,
    crossDomain: true,
    success: function(response) {
      if (response.send_invite == true) {
        $('#add-to-village-success-popup').popup();
        $('#add-to-village-success-popup').popup('enable');
        $('#add-to-village-success-popup').popup('open');
      }
    }
  });
}

function _getInvitation() {
  apApp.settings.queryExclude.invite = false;
  var data = {
    'email': apApp.settings.userProfile.email
  }
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "export/invite",
    cache: false,
    data: data,
    crossDomain: true,
    success: function(response) {
      if (response.results != undefined) {
        $.each(response.results, function(i, invite) {
          invite.register = 0;
          var popup = _getHtml('invitePopup', invite);
          var pageId = $.mobile.activePage.attr('id');
          $.mobile.loading('hide');
          $('#' + pageId).append(popup);
          $('#invite-popup-' + invite.uid).popup();
          $('#invite-popup-' + invite.uid).popup('enable');
          $('#invite-popup-' + invite.uid).popup('open');
        });
      } else {
        apApp.settings.queryExclude.invite = true;
        _queryExclude('_dbCronHandler');
      }
    }
  });
}

function _getYourInvitation() {
  apApp.settings.queryExclude.YourInvite = false;
  var data = {
    'uid_origin': apApp.settings.userProfile.uid_origin
  }
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "process/invite/user",
    cache: false,
    data: data,
    crossDomain: true,
    success: function(response) {
      if (response.invite != undefined) {
        var popup = _getHtml('invitePopupSuccess', response.invite);
        var pageId = $.mobile.activePage.attr('id');
        $('#' + pageId).append(popup);
        $('#invite-popup-success').popup();
        $('#invite-popup-success').popup('enable');
        $('#invite-popup-success').popup('open');
      }

      if (response.goals != undefined) {
        _getGoalsIds(response, 'YourInvite');
      } else if (response.users != undefined) {
        _importUsersToApp(response.users, 'YourInvite');
      } else {
        apApp.settings.queryExclude.YourInvite = true;
        _queryExclude('_dbCronHandler');
      }

    }
  });
}


function _handlerInvitation(invite_uid, accepted) {
  $.mobile.loading('show');
  var data = {
    'invite_uid': invite_uid,
    'accepted': accepted,
    'uid_origin': apApp.settings.userProfile.uid_origin
  }
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "process/invite",
    cache: false,
    data: data,
    crossDomain: true,
    success: function(response) {
      if (response.goals != undefined) {
        _getGoalsIds(response, 'invite');
      } else if (response.users != undefined) {
        _importUsersToApp(response.users, 'invite');
      } else {
        apApp.settings.queryExclude.invite = true;
        _queryExclude('_dbQuery');
      }

    }
  });

}

function _getGoalsIds(response, key) {
  goals = response.goals;
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT gid, gid_origin FROM goals WHERE gid_origin IN (' + goals.join() + ')', [],
      function(tx, results) {
        var len = results.rows.length;
        if (len) {
          for (var i = 0; i < len; i++) {
            var item = results.rows.item(i);
            apApp.settings.goalsInvite[item.gid_origin] = item.gid;
          }
        }
        _importUsersToApp(response.users, key);

      }, function(err) {
        _errorHandler(err, 2655);
      });
  });

}

function _downloadUserPhoto(user) {
  if (apApp.settings.mode != 'dev') {
    var imagePath = apApp.settings.FullPath + '/' + user.photo; //full file path
    var url = encodeURI(user.photo_url);
    var ft = new FileTransfer();
    ft.download(url, imagePath, function(file) {
      if (user.reupload != 1) {
        _messagePopup('Downloading User photo successfully', false);
      }
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('UPDATE  users SET image_path = ?  WHERE uid_origin = ?', [file.fullPath, user.uid_origin]);
      });
    }, function(error) {
      _messagePopup('There was an error downloading image', true);
    });
  }
}

function _downloadChildPhoto(child) {
  if (apApp.settings.mode != 'dev') {
    var imagePath = apApp.settings.FullPath + '/' + child.photo; //full file path
    var url = encodeURI(child.photo_url);
    var ft = new FileTransfer();
    ft.download(url, imagePath, function(file) {
      if (child.reupload != 1) {
        _messagePopup('Downloading Child photo successfully', false);
      }
      apApp.settings.dbPromiseTracker.transaction(function(tx) {
        tx.executeSql('UPDATE childs SET image_path = ?  WHERE cid_origin = ?', [file.fullPath, child.cid_origin]);
      });
    }, function(error) {
      _messagePopup('There was an error downloading image', true);
    });
  }
}

function onFileSystemSuccess(fileSystem) {
  apApp.settings.FullPath = fileSystem.root.fullPath;
}

function _onFail(evt) {
  _messagePopup('Error code ' + evt.target.error.code, true);

}

function _importUsersToApp(users, key) {
  var userInvite = [];
  var children = [];
  var size_children = 0;
  var size_users = Object.keys(users).length;
  var j = 0;
  var ts = parseInt(new Date().getTime() / 1000);
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    $.each(users, function(uid_origin, user) {
      tx.executeSql('INSERT INTO users (image_path, uid_origin, name, last_name, ' +
        'email, updated, created, status) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, 1)', ['', user.uid_origin, user.name, user.last_name, user.email, ts, ts],
        function(tx, results) {
          // set user profile UID
          var uid = results.insertId;
          userInvite[uid_origin] = uid;
          if (user.photo != undefined) _downloadUserPhoto(user);
          _messagePopup('User ' + user.name + ' was created');
          //if (user.children == undefined) _queryExcludeInvite(key);
          if (user.children != undefined) {
            $.each(user.children, function(i, child){
              size_children++;
              children.push(child);
            });
          }
          j++;
          if (j == size_users) {
            if (size_children > 0) {
              _importChildrenToApp(tx,children,size_children,userInvite,apApp.settings.goalsInvite,key);
            } else {
              _queryExcludeInvite(key);
            }
          }
        });
    });
  });
}

function _importChildrenToApp(tx,children,size_children,users,goals,key){
  var j = 0;
  $.each(children, function(i, child) {
      // Create childs
      var uid = users[child.uid_origin];
      tx.executeSql('INSERT INTO childs (cid_origin, uid, first_name, ' +
        'last_name, birth_date, age, updated, created, status) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [child.cid_origin, uid, child.first_name, child.last_name, child.birth_date, child.age, child.updated, child.created, child.status],
        function(tx, results) {
          _messagePopup('Child ' + child.first_name + ' was created');
          var cid = results.insertId;
          if (child.photo != undefined) _downloadChildPhoto(child);
          if (child.child_index != undefined) {
            //create child_index
            $.each(child.child_index, function(i, relationship) {
              if (users[relationship.uid] != undefined) {
                tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
                  'VALUES (?, ?, ?)', [cid, users[relationship.uid], relationship.relationship],
                  function(tx, results) {}, function(err) {
                    _errorHandler(err, 2730);
                  });
              }
            });
          }
          if (child.reminders != undefined) {
            _updateReminderGoalIndex(tx, child, users, goals);
          }
          if (child.goal_index != undefined) {
            //create child_index
            $.each(child.goal_index, function(i, goal) {
              if (goals[goal.gid_origin] != undefined &&
                users[goal.uid_origin] != undefined) {
                tx.executeSql('INSERT INTO goal_index (gid, cid, uid, completed, updated) ' +
                  'VALUES (?, ?, ?, ?, ?)', [goals[goal.gid_origin], cid, users[goal.uid_origin], goal.completed, child.updated],
                  function(tx, results) {}, function(err) {
                    _errorHandler(err, 2741);
                  });
              }
            });
          }
          j++;
          if (j == size_children) _queryExcludeInvite(key);
        }, function(err) {
          _errorHandler(err, 2745);
        });
  });
}

function _queryExcludeInvite(key) {
  setTimeout(function() {
    if (key == 'inviteRegister') {
      _registrationSecondStep();
    } else {
      apApp.settings.queryExclude[key] = true;
      _queryExclude('_dbCronHandler');
    }
  }, 1000 * 4);
}

function _createUserProfile() {
  $.mobile.loading('show');
  var profile = {
    'name': $('#create-profile-name').val(),
    'last_name': $('#create-profile-last-name').val(),
    'password': $('#create-profile-password').val(),
    'email': $('#create-profile-email').val(),
    'image_path': $('#create-profile-photo-img').attr('src')
  },
  ts = apApp.settings.timestamp;;
  // Create user
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('INSERT INTO users (uid_origin, password, name, last_name, ' +
      'email, image_path, updated, created, status, update_photo) ' +
      'VALUES (0, ?, ?, ?, ?, ?, ?, ?, 1, 1)', [profile.password, profile.name, profile.last_name, profile.email, profile.image_path, ts, ts],
      function(tx, results) {
        // set user profile UID
        apApp.settings.profileUID = results.insertId;
        profile.uid = apApp.settings.profileUID;
        profile.created = ts;
        profile.updated = ts;
        profile.uid_origin = 0;
        profile.update_photo = 1;
        apApp.settings.userProfile = profile;
        _messagePopup('Profile was created');
        _firstUploadUser(profile);
      }, function(err) {
        _errorHandler(err, 2914);
      });
  }, function(err) {
    _errorHandler(err, 2917);
  });
}

function _firstUploadUser(user) {
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "import/user",
    cache: false,
    data: user,
    crossDomain: true,
    success: function(response) {
      if (user.uid_origin == 0) {
        user.uid_origin = parseInt(response.uid);
        apApp.settings.userProfile.uid_origin = parseInt(response.uid);
        apApp.settings.dbPromiseTracker.transaction(function(tx) {
          tx.executeSql('UPDATE users SET uid_origin=? WHERE uid=?', [user.uid_origin, user.uid], function() {
            _uploadUserPictureToSite(user);
            _getInvitationRegister();
            _messagePopup('Profile upload to site');
          });
        });
      }
    }
  });
}

function _getInvitationRegister() {
  var data = {
    'email': apApp.settings.userProfile.email
  }
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "export/invite",
    cache: false,
    data: data,
    crossDomain: true,
    success: function(response) {
      if (response.results != undefined) {
        $.each(response.results, function(i, invite) {
          invite.register = 1;
          var popup = _getHtml('invitePopup', invite);
          var pageId = $.mobile.activePage.attr('id');
          $.mobile.loading('hide');
          $('#' + pageId).append(popup);
          $('#invite-popup-' + invite.uid).popup();
          $('#invite-popup-' + invite.uid).popup('enable');
          $('#invite-popup-' + invite.uid).popup('open');
        });
      } else {
        _registrationSecondStep();
      }
    }
  });
}

function _handlerInvitationRegister(invite_uid, accepted) {
  $.mobile.loading('show');
  var data = {
    'invite_uid': invite_uid,
    'accepted': accepted,
    'uid_origin': apApp.settings.userProfile.uid_origin
  }
  $.ajax({
    type: 'post',
    url: apApp.settings.restUrl + "process/invite",
    cache: false,
    data: data,
    crossDomain: true,
    success: function(response) {
      if (response.goals != undefined) {
        _getGoalsIds(response, 'inviteRegister');
      } else if (response.users != undefined) {
        _importUsersToApp(response.users, 'inviteRegister');
      } else {
        _registrationSecondStep();
      }
    }
  });
}

function _registrationSecondStep() {
  $.mobile.loading('hide');
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('SELECT c.*' +
      'FROM childs AS c ' +
      'ORDER BY c.cid DESC', [], function(tx, results) {
        var len = results.rows.length;
        var children = [];
        if (len) {
          for (i = 0; i < len; i++) {
            var item = results.rows.item(i);
            children.push(item);
          }
          $.each(children, function(i, child) {
            var myChildren = _getHtml('myChildren', child);
            $('#my-childrens-village li:last').after(myChildren);
          });
          $('#registration-second-step div.create-child').hide();
          $('#registration-second-step div.village-children').show();
          _changePageSecondStep();
        } else {
          _changePageSecondStep();
        }
      }, function(err) {
        _errorHandler(err, 3035);
      });
  });
}

function _insertRelationship(data) {
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('INSERT INTO child_index (cid, uid, relationship) ' +
      'VALUES (?, ?, ?)', [data.cid, data.uid, data.relationship],
      function(tx, results) {

      },
      function(err) {
        _errorHandler(err, 3253)
      });
  });
}

function _updateChildTime(data) {
  var ts = parseInt(new Date().getTime() / 1000); // timestamp
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('UPDATE childs SET updated = ? WHERE cid = ?', [ts, data.cid],
      function(tx, results) {

      },
      function(err) {
        _errorHandler(err, 3265)
      });
  });
}

function _changePageSecondStep() {
  $.mobile.changePage('#registration-second-step', {
    transition: "slide"
  });
}

function _getFirstContent(key) {
  _messagePopup('Get content from server', false);
  apApp.settings.cron = 0;
  $.getJSON(apApp.settings.restUrl + "nodes?jsoncallback=?&timestamp=" +
    apApp.settings.cron,
    function(response) {
      if (response.topics != undefined) {
        apApp.settings.queryExclude.topics = false;
        _addTopics(response.topics, key);
      }
      if (response.tips != undefined) {
        apApp.settings.queryExclude.tips = false;
        _addTips(response.tips, key);
      }
      if (response.goals != undefined) {
        apApp.settings.queryExclude.goals = false;
        _addGoals(response.goals, key);
      }
      _queryExclude(key);
    });
  apApp.settings.dbPromiseTracker.transaction(function(tx) {
    tx.executeSql('INSERT INTO variable (name, timestamp) ' +
      'VALUES ("cron", ?)', [apApp.settings.timestamp]);
  });
}

function _registerUser() {
  $.mobile.loading('hide');
  $.mobile.changePage('#registration-first-step', {
    transition: "fade"
  });
}

function _getEthernetConntent(){
  var popup = _getHtml('PopupConnection');
  $.mobile.loading('hide');
  $.mobile.changePage('#home', {
    transition: "fade"
  });
  $('#home').append(popup);
  $('#popup-connection').popup();
  $('#popup-connection').popup('enable');
  $('#popup-connection').popup('open');
}

function _loginToApp(data){
  $.mobile.loading('show');
  $.getJSON(apApp.settings.restUrl + "login?jsoncallback=?&login=" +
    data.email + '&pass=' + data.password,
    function(response) {
      if (response.login == 0) {
        _messagePopup('Sorry, unrecognized username or password.',true);
        $('#submit-sign-in').attr('data-disabled','false');
        $.mobile.loading('hide');
      } else if (response.login == 1) {
        if (response.results.goals != undefined) {
          _getGoalsIds(response.results, 'loginRegister');
        } else if (response.results.users != undefined) {
          _importUsersToApp(response.results.users, 'loginRegister');
        }
      }
    });
}

})(jQuery);
