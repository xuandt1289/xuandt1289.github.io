/*************************************************
 *  Academic: the personal website framework for Hugo.
 *  https://github.com/gcushen/hugo-academic
 **************************************************/
/**
 * Handles opening of and synchronization with the reveal.js
 * notes window.
 *
 * Handshake process:
 * 1. This window posts 'connect' to notes window
 *    - Includes URL of presentation to show
 * 2. Notes window responds with 'connected' when it is available
 * 3. This window proceeds to send the current presentation state
 *    to the notes window
 */
var RevealNotes = (function() {

  var notesPopup = null;

  function openNotes( notesFilePath ) {

    if (notesPopup && !notesPopup.closed) {
      notesPopup.focus();
      return;
    }

    if( !notesFilePath ) {
      var jsFileLocation = document.querySelector('script[src$="notes.js"]').src;  // this js file path
      jsFileLocation = jsFileLocation.replace(/notes\.js(\?.*)?$/, '');   // the js folder path
      notesFilePath = jsFileLocation + 'notes.html';
    }

    notesPopup = window.open( notesFilePath, 'reveal.js - Notes', 'width=1100,height=700' );

    if( !notesPopup ) {
      alert( 'Speaker view popup failed to open. Please make sure popups are allowed and reopen the speaker view.' );
      return;
    }

    /**
     * Connect to the notes window through a postmessage handshake.
     * Using postmessage enables us to work in situations where the
     * origins differ, such as a presentation being opened from the
     * file system.
     */
    function connect() {
      // Keep trying to connect until we get a 'connected' message back
      var connectInterval = setInterval( function() {
        notesPopup.postMessage( JSON.stringify( {
          namespace: 'reveal-notes',
          type: 'connect',
          url: window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search,
          state: Reveal.getState()
        } ), '*' );
      }, 500 );

      window.addEventListener( 'message', function( event ) {
        var data = JSON.parse( event.data );
        if( data && data.namespace === 'reveal-notes' && data.type === 'connected' ) {
          clearInterval( connectInterval );
          onConnected();
        }
        if( data && data.namespace === 'reveal-notes' && data.type === 'call' ) {
          callRevealApi( data.methodName, data.arguments, data.callId );
        }
      } );
    }

    /**
     * Calls the specified Reveal.js method with the provided argument
     * and then pushes the result to the notes frame.
     */
    function callRevealApi( methodName, methodArguments, callId ) {

      var result = Reveal[methodName].apply( Reveal, methodArguments );
      notesPopup.postMessage( JSON.stringify( {
        namespace: 'reveal-notes',
        type: 'return',
        result: result,
        callId: callId
      } ), '*' );

    }

    /**
     * Posts the current slide data to the notes window
     */
    function post( event ) {

      var slideElement = Reveal.getCurrentSlide(),
        notesElement = slideElement.querySelector( 'aside.notes' ),
        fragmentElement = slideElement.querySelector( '.current-fragment' );

      var messageData = {
        namespace: 'reveal-notes',
        type: 'state',
        notes: '',
        markdown: false,
        whitespace: 'normal',
        state: Reveal.getState()
      };

      // Look for notes defined in a slide attribute
      if( slideElement.hasAttribute( 'data-notes' ) ) {
        messageData.notes = slideElement.getAttribute( 'data-notes' );
        messageData.whitespace = 'pre-wrap';
      }

      // Look for notes defined in a fragment
      if( fragmentElement ) {
        var fragmentNotes = fragmentElement.querySelector( 'aside.notes' );
        if( fragmentNotes ) {
          notesElement = fragmentNotes;
        }
        else if( fragmentElement.hasAttribute( 'data-notes' ) ) {
          messageData.notes = fragmentElement.getAttribute( 'data-notes' );
          messageData.whitespace = 'pre-wrap';

          // In case there are slide notes
          notesElement = null;
        }
      }

      // Look for notes defined in an aside element
      if( notesElement ) {
        messageData.notes = notesElement.innerHTML;
        messageData.markdown = typeof notesElement.getAttribute( 'data-markdown' ) === 'string';
      }

      notesPopup.postMessage( JSON.stringify( messageData ), '*' );

    }

    /**
     * Called once we have established a connection to the notes
     * window.
     */
    function onConnected() {

      // Monitor events that trigger a change in state
      Reveal.addEventListener( 'slidechanged', post );
      Reveal.addEventListener( 'fragmentshown', post );
      Reveal.addEventListener( 'fragmenthidden', post );
      Reveal.addEventListener( 'overviewhidden', post );
      Reveal.addEventListener( 'overviewshown', post );
      Reveal.addEventListener( 'paused', post );
      Reveal.addEventListener( 'resumed', post );

      // Post the initial state
      post();

    }

    connect();

  }

  return {
    init: function() {

      if( !/receiver/i.test( window.location.search ) ) {

        // If the there's a 'notes' query set, open directly
        if( window.location.search.match( /(\?|\&)notes/gi ) !== null ) {
          openNotes();
        }

        // Open the notes when the 's' key is hit
        Reveal.addKeyBinding({keyCode: 83, key: 'S', description: 'Speaker notes view'}, function() {
          openNotes();
        } );

      }

    },

    open: openNotes
  };

})();

Reveal.registerPlugin( 'notes', RevealNotes );

$(".more").toggle(function(){
    $(this).text("less..").siblings(".complete").show();    
}, function(){
    $(this).text("more..").siblings(".complete").hide();    
});

(function($){

  /* ---------------------------------------------------------------------------
   * Responsive scrolling for URL hashes.
   * --------------------------------------------------------------------------- */

  // Dynamically get responsive navigation bar offset.
  let $navbar = $('.navbar-header');
  let navbar_offset = $navbar.innerHeight();

  /**
   * Responsive hash scrolling.
   * Check for a URL hash as an anchor.
   * If it exists on current page, scroll to it responsively.
   * If `target` argument omitted (e.g. after event), assume it's the window's hash.
   */
  function scrollToAnchor(target) {
    // If `target` is undefined or HashChangeEvent object, set it to window's hash.
    target = (typeof target === 'undefined' || typeof target === 'object') ? window.location.hash : target;
    // Escape colons from IDs, such as those found in Markdown footnote links.
    target = target.replace(/:/g, '\\:');

    // If target element exists, scroll to it taking into account fixed navigation bar offset.
    if($(target).length) {
      $('body').addClass('scrolling');
      $('html, body').animate({
        scrollTop: $(target).offset().top - navbar_offset
      }, 600, function () {
        $('body').removeClass('scrolling');
      });
    }
  }

  // Make Scrollspy responsive.
  function fixScrollspy() {
    let $body = $('body');
    let data = $body.data('bs.scrollspy');
    if (data) {
      data.options.offset = navbar_offset;
      $body.data('bs.scrollspy', data);
      $body.scrollspy('refresh');
    }
  }

  // Check for hash change event and fix responsive offset for hash links (e.g. Markdown footnotes).
  window.addEventListener("hashchange", scrollToAnchor);

  /* ---------------------------------------------------------------------------
   * Add smooth scrolling to all links inside the main navbar.
   * --------------------------------------------------------------------------- */

  $('#navbar-main li.nav-item a').on('click', function(event) {
    // Store requested URL hash.
    let hash = this.hash;

    // If we are on the homepage and the navigation bar link is to a homepage section.
    if ( hash && $(hash).length && ($("#homepage").length > 0)) {
      // Prevent default click behavior.
      event.preventDefault();

      // Use jQuery's animate() method for smooth page scrolling.
      // The numerical parameter specifies the time (ms) taken to scroll to the specified hash.
      $('html, body').animate({
        scrollTop: $(hash).offset().top - navbar_offset
      }, 800);
    }
  });

  /* ---------------------------------------------------------------------------
   * Smooth scrolling for Back To Top link.
   * --------------------------------------------------------------------------- */

  $('#back_to_top').on('click', function(event) {
    event.preventDefault();
    $('html, body').animate({
      'scrollTop': 0
    }, 800, function() {
      window.location.hash = "";
    });
  });

  /* ---------------------------------------------------------------------------
   * Hide mobile collapsable menu on clicking a link.
   * --------------------------------------------------------------------------- */

  $(document).on('click', '.navbar-collapse.in', function(e) {
    //get the <a> element that was clicked, even if the <span> element that is inside the <a> element is e.target
    let targetElement = $(e.target).is('a') ? $(e.target) : $(e.target).parent();

    if (targetElement.is('a') && targetElement.attr('class') != 'dropdown-toggle') {
      $(this).collapse('hide');
    }
  });

  /* ---------------------------------------------------------------------------
   * Filter projects.
   * --------------------------------------------------------------------------- */

  let $grid_projects = $('#container-projects');
  $grid_projects.imagesLoaded(function () {
    // Initialize Isotope after all images have loaded.
    $grid_projects.isotope({
      itemSelector: '.isotope-item',
      layoutMode: 'masonry'
    });

    // Filter items when filter link is clicked.
    $('#filters a').click(function () {
      let selector = $(this).attr('data-filter');
      $grid_projects.isotope({filter: selector});
      $(this).removeClass('active').addClass('active').siblings().removeClass('active all');
      return false;
    });
  });

  /* ---------------------------------------------------------------------------
   * Filter publications.
   * --------------------------------------------------------------------------- */

  let $grid_pubs = $('#container-publications');
  $grid_pubs.isotope({
    itemSelector: '.isotope-item',
    percentPosition: true,
    masonry: {
      // Use Bootstrap compatible grid layout.
      columnWidth: '.grid-sizer'
    }
  });

  // Bind publication filter on dropdown change.
  $('.pub-filters-select').on('change', function() {
    // Get filter value from option value.
    let filterValue = this.value;
    // Apply filter to Isotope.
    $grid_pubs.isotope({ filter: filterValue });

    // Set hash URL to current filter.
    let url = $(this).val();
    if (url.substr(0, 9) == '.pubtype-') {
      window.location.hash = url.substr(9);
    } else {
      window.location.hash = '';
    }
  });

  // Filter publications according to hash in URL.
  function filter_publications() {
    let urlHash = window.location.hash.replace('#','');
    let filterValue = '*';

    // Check if hash is numeric.
    if (urlHash != '' && !isNaN(urlHash)) {
      filterValue = '.pubtype-' + urlHash;
    }

    $('.pub-filters-select').val(filterValue);
    $grid_pubs.isotope({ filter: filterValue });
  }

  /* ---------------------------------------------------------------------------
   * On window load.
   * --------------------------------------------------------------------------- */

  $(window).on('load', function() {
    if (window.location.hash) {
      // When accessing homepage from another page and `#top` hash is set, show top of page (no hash).
      if (window.location.hash == "#top") {
        window.location.hash = ""
      } else {
        // If URL contains a hash, scroll to target ID taking into account responsive offset.
        scrollToAnchor();
      }
    }

    // Initialize Scrollspy.
    let $body = $('body');
    $body.scrollspy({offset: navbar_offset });

    // Call `fixScrollspy` when window is resized.
    let resizeTimer;
    $(window).resize(function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fixScrollspy, 200);
    });

    // Enable publication filter for publication index page.
    if ($('.pub-filters-select')) {
      filter_publications();
      // Useful for changing hash manually (e.g. in development):
      // window.addEventListener('hashchange', filter_publications, false);
    }

  });

})(jQuery);
