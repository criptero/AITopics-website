
var Authcache = {
  'isEnabled' : true,   // Make sure page is really cached
  'isDebug'   : false,  // Debug mode
  'json' : { },         // Holds all responses from ajaxRequest
  'ajax' : { },         // Will be extended with authcacheFooter data
  'info' : { },         // Will be extended with authcacheFooter data
  'ajax_count' : 0,     // Ajax request count
  'timeStart' : new Date().getTime() // JS Benchmark
};

/**
 * Preprocess page and do Ajax request if needed.
 * Called after all other scripts have been loaded.
 */
Authcache.init = function() {

  Authcache.init.preprocess(); // see below

  // Should Ajax request be sent?  Ignore if only 'q' key exists
  authcacheLength = 0;
  for (i in Authcache.ajax) {
    authcacheLength++;
  }
  // Will also need to send request if Authcache was disabled in mid-render of HTML ("q" key won't exist since there is no authcacheFooter)
  if (authcacheLength > 1 || (!Authcache.isEnabled && authcacheLength > 0)) {
    Authcache.ajaxRequest(Authcache.ajax);
  }
  else if(Authcache.isDebug) {
    jQuery("#authcachedebug").append("Ajax request not sent.<br>");
    Authcache.debugTimer();
  }
}

/**
 * Look over HTML DOM
 */
Authcache.init.preprocess = function() {

  // Display logged-in username
  jQuery(".authcache-user").html(jQuery.cookie("drupal_user"));

  // Display username linked to profile
  // Example usage: <a href="" class="authcache-user-link">Welcome, !username</a>
  jQuery("a.authcache-user-link").each(function() {
    $this = jQuery(this);
    $this.html($this.html().replace('!username', jQuery.cookie("drupal_user")))
         .attr("href", Drupal.settings.basePath + 'user');
  });

  // Find forms that need tokens
  jQuery("form input[name='form_token_id']").each(function() {
    if (Authcache.ajax["form_token_id[]"] == null) Authcache.ajax["form_token_id[]"] = new Array();
    Authcache.ajax["form_token_id[]"].push(this.form.form_token_id.value);

    // Bind submit button events to pass button name/value if needed on late submit.
    $form = jQuery(this.form);
    jQuery("input:submit", $form).bind("click keypress", function () {
      jQuery(this.form).data("button", [ this.name, this.value ]);
    });

  });

  // On form submit, check if token has been set
  jQuery("form").submit(function() {
    if (typeof this.form_token_id != "undefined" && !this.form_token.value) {
      // Send another Ajax request to retrieve form token
      this.form_token.className = "authcache-must-submit";
      Authcache.ajaxRequest( {"form_token_id[]" : this.form_token_id.value} );
      return false;
    }
  });

  // Set Drupal core link to user profile instead of using cached link
  jQuery("a:contains('My account')").attr("href",Drupal.settings.basePath+"user");

  if (Authcache.isEnabled) {

    // Dynmically theme local task tab items for logged-in users (nodes, etc)
    if (jQuery.cookie("drupal_user") && Authcache.info.cache_uid != jQuery.cookie("drupal_uid") && jQuery("#authcache-tabs").length) {
      ajaxJson = {
        'q' : Authcache.ajax.q,
        'menu_local_tasks' : 1,
        'max_age' : 86400
      };
      Authcache.ajaxRequest(ajaxJson);
    }

    // Forums "new" markers
    if (Authcache.info.cache_uid && Authcache.ajax.q.substring(0,5) == "forum") {

      // Check for new topics
      jQuery(".authcache-topic-new").each(function(i, elSpan) {
        if (Authcache.ajax["forum_topic_new[]"] == null) Authcache.ajax["forum_topic_new[]"] = new Array();
        id = elSpan.getAttribute("data-forum-id");
        Authcache.ajax["forum_topic_new[]"].push(id);
      });

      // Get number of new comments or if topic node is unread
      jQuery(".authcache-topic-info").each(function(i, elSpan) {
        timestamp = elSpan.getAttribute("data-timestamp");
        nid = elSpan.getAttribute("data-nid");

        Authcache.ajax["forum_topic_info["+nid+"]"] = new Array(timestamp);
      });
    }

    // Show "edit" comment links for user
    if (Authcache.info.comment_usertime != null) {
      jQuery(".authcache-comment-edit[data-comment-uid=" + jQuery.cookie("drupal_uid") + "]").each(function(i, elSpan) {
        cid = elSpan.getAttribute("data-comment-id");

        jQuery(this).parent().find(".links")
          .find(".first")
          .removeClass("first")
          .parent()
          .prepend('<li class="comment_edit first"><a href="' + Drupal.settings.basePath + 'comment/edit/' + cid + '">' + Authcache.info.t.edit + '</a></li>');
      });
    }
  }

  // Authcache blocks
  jQuery(".authcache-block").each(function(i, el) {
    maxAge = el.getAttribute("data-block-cache");
    cid    = el.getAttribute("data-block-cid");
    id     = el.id.replace("authcache-block-", "");

    if (maxAge) {
      // Separate Ajax request for local caching
      ajax = {}
      ajax["blocks[" + id + "]"] = cid;
      ajax["max_age"] = maxAge
      Authcache.ajaxRequest(ajax);
    }
    else {
      Authcache.ajax["blocks[" + id + "]"] = cid;
    }
  });

  // Get poll results/form
  if (jQuery("#block-poll-0").length || jQuery("#poll-view-voting").length) {
    jQuery(".poll").each(function(i, el) {
      elNid = jQuery(el).find(".authcache-poll");
      nid = elNid.get(0).getAttribute("data-nid");

      ajaxJson = {
        'poll[nid]' : nid,
        'poll[block]' : jQuery(el).parents(".block-inner").length,
        'time' : jQuery.cookie('nid' + nid),
        'max_age' : 600
      };

      Authcache.ajaxRequest(ajaxJson);
    });
  }

};


/**
 * Perform ajax request and callback functions
 */
Authcache.ajaxRequest = function(jsonData) {

  //alert(typeof Drupal.settings.Authcache)

  $.ajax({
    url: Drupal.settings.basePath, // index.php
    type: ((Drupal.settings.Authcache && Drupal.settings.Authcache.post) || jQuery.param(jsonData).length > 2000) ? "POST" : "GET",
    dataType: "json",
    data: jsonData,

    // If response is to be cached (max_age), then a syncronous request
    // will lock the browser & prevent jumpiness on HTML DOM updates
    async: (jsonData.max_age != null) ? false : true,

    success: function(data) {
      Authcache.json = jQuery.extend(true, Authcache.json, data);

      // Callback functions
      for (key in data) {
        funcName = "_authcache_" + key;
        try {
          eval(funcName + "(data[key])");
        } catch(e) { }
      }

      if (Authcache.isDebug) {
        Authcache.debug({'sent':jsonData,'received':data});
      }
    },

    // Custom header to help prevent cross-site forgery requests
    // and to flag caching bootstrap that Ajax request is being made
    beforeSend: function(xhr) {
      xhr.setRequestHeader("Authcache","1");
    },

    error: Authcache.ajaxError
  });

}

/**
 * AjaxRequest error callback
 */
Authcache.ajaxError = function(XMLHttpRequest, textStatus, errorThrown) {
  if (Authcache.isDebug) {
    jQuery("#authcachedebug").append(Authcache.debugFieldset("Ajax Response Error ("+textStatus+")", {"ERROR":XMLHttpRequest.responseText.replace(/\n/g,"") }));
  }
}

/**
 * Return value embedded in class string.
 * DEPRECATED... use el.getAttribute("data-name") instead
 */
Authcache.getValue = function(needle, str) {
  matches = str.match(eval("/" + needle + "(.[^\\s]*)/"));
  return (matches == null) ? false : matches[1];
}


// Check if page is really cached
jQuery(function() {

  // Page not cached for whatever reason (such as a late status message)
  if (typeof authcacheFooter == "undefined") {
    Authcache.isEnabled = false;
  }
  // Add "ajax" and "info" keys
  else {
    Authcache = jQuery.extend(true, Authcache, authcacheFooter);
  }
});


//
// Ajax callback functions
//

/**
 * Set form token
 * @see form.inc
 */
function _authcache_form_token_id(vars) {
  for (key in vars) {
    jQuery("form input[name='form_token_id'][value='"+key+"']").each(function() {
      $form = jQuery(this.form);
      oInputToken = $form.find("input[name='form_token']");
      oInputToken.val(vars[key]);
      // Late retierval of token (user tried to submit but no token)
      if (oInputToken.hasClass("authcache-must-submit")) {
        button = $form.data("button");
        $form.append('<input type="hidden" name="' + button[0] + '" value="' + button[1] + '" />');
        this.form.submit();
      }
    });
  }
}

/**
 * Set default contact form values
 * @see contact.module
 */
function _authcache_contact(vars) {
  jQuery("#contact-mail-page input[name='name']").val(vars.name);
  jQuery("#contact-mail-page input[name='mail']").val(vars.mail);
}


/**
 * Display "new" marker next to comment
 * @see comment.module, node.module
 */
function _authcache_node_history(historyTimestamp) {
  if (Authcache.info.comment_usertime != null) {
    jQuery(".authcache-comment-new").each(function(i, elSpan) {
      timestamp = elSpan.getAttribute("data-timestamp");

      if (
        timestamp >= historyTimestamp ||
        // Also give buffer for user who accesses first cached page request
        (timestamp >= Authcache.info.comment_usertime && Authcache.info.cache_time >= historyTimestamp - 2 && Authcache.info.cache_uid == jQuery.cookie("drupal_uid"))
        ) {

        jQuery(elSpan).hide().html(Authcache.info.t["new"]).fadeIn();
      }
    })
  }
}

/**
 * Display "new" marker next to new topics
 * @see forum.module
 */
function _authcache_forum_topic_new(vars) {
  for (id in vars) {
    jQuery(".authcache-topic-new[data-forum-id=" + id + "]").before("<br />").hide().html("" + vars[id]).fadeIn();
  }
}

/**
 * Display "new" marker next to new replies/comments
 * and update icon if unread or new replies
 * @see forum.module, comment.module
 */
function _authcache_forum_topic_info(vars) {
  for (id in vars) {
    jQuery(".authcache-topic-replies[data-nid=" + id + "]").before("<br />").hide().html("" + vars[id]).fadeIn();
    oIcon = jQuery(".authcache-topic-icon[data-nid=" + id + "]");
    oIcon.html(oIcon.html().replace(/default/g, "new"));
    oIcon.html(oIcon.html().replace(/-hot/g, "-hot-new"));
  }
}

/**
 * Show poll results
 * @see poll.module
 */
function _authcache_poll(vars) {
  if (vars.block == 1) {
    jQuery("#block-poll-0 .poll").html(vars.html);
  }
  else {
    jQuery("#node-" + vars.nid + " .poll").html(vars.html);
  }
}

/**
 * Show rendered block output
 */
function _authcache_blocks(vars) {
  for (id in vars) {
    jQuery("#authcache-block-subj-" + id).html(vars[id]['subject']);
    jQuery("#authcache-block-" + id).html(vars[id]['content']);
  }
}

/**
 * Render local task tab links
 * @see menu.inc
 */
function _authcache_menu_local_tasks(vars) {
  jQuery("#authcache-tabs").html(vars);
}


/**
 * jQuery cookie plugin (remove in Drupal 7)
 * http://plugins.jquery.com/project/Cookie
 */
jQuery.cookie=function(name,value,options){if(typeof value!='undefined'){options=options||{};if(value===null){value='';options.expires=-1;}; var expires='';if(options.expires&&(typeof options.expires=='number'||options.expires.toUTCString)){var date;if(typeof options.expires=='number'){date=new Date();date.setTime(date.getTime()+(options.expires*24*60*60*1000));}else{date=options.expires;}; expires='; expires='+date.toUTCString();}; var path=options.path?'; path='+(options.path):'';var domain=options.domain?'; domain='+(options.domain):'';var secure=options.secure?'; secure':'';document.cookie=[name,'=',encodeURIComponent(value),expires,path,domain,secure].join('');}else{var cookieValue=null;if(document.cookie&&document.cookie!=''){var cookies=document.cookie.split(';');for(var i=0;i<cookies.length;i++){var cookie=jQuery.trim(cookies[i]);if(cookie.substring(0,name.length+1)==(name+'=')){cookieValue=decodeURIComponent(cookie.substring(name.length+1));break;}}}; return cookieValue;}};

// Prepare Authcache
jQuery(function() {
  // Is debug mode enabled?
/*
  if (typeof Authcache.debug != "undefined") {
    if (!Authcache.info.debug_users || jQuery.inArray(jQuery.cookie('drupal_user'), Authcache.info.debug_users) != -1) {
      Authcache.isDebug = true;
      Authcache.debug(false);
      jQuery.cookie('authcache_debug', 1); // Make sure cookie is set for benchmarks
    }
  }
*/
})
