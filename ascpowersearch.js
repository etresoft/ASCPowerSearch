var results = document.createElement('div');

results.setAttribute('id', 'ascpowersearch_results');
results.setAttribute('class', 'ascpowersearch_out');

results.innerHTML = 
  '<div class="ascpowersearch_scrolldiv">'
  + '<table><thead>'
  + '<tr>'
  + '<th class="ascpowersearch_post">Post</th>'
  + '<th class="ascpowersearch_author">Author</th>'
  + '<th class="ascpowersearch_date">Date<a id="ascpowersearch_close">X</a></th>'
  + '</tr>'
  + '</thead><tbody></tbody></table>'
  + '</div>';

// Add the pop-up window into the DOM.
document.body.appendChild(results);

// Setup the close button.
document.getElementById("ascpowersearch_close").addEventListener(
  "click", 
  function()
    {
    // Fade out the results.
    results.setAttribute('class', 'ascpowersearch_out');
    });

// Handle a message from the search bar.
function replyToMessage(aMessageEvent) 
  {
  if(aMessageEvent.name === "search") 
    {
    // The message is coming via a JSON object.
    var parameters = JSON.parse(aMessageEvent.message);

    ASCPowerSearch(
      parameters['query'], 
      parameters['author'], 
      parameters['order'],
      parameters['from'],
      parameters['to']);
    }
  }

// Perform the search.
function ASCPowerSearch(query, author, order, from, to)
  {
  // This is the base URL.
  var url =
    'https://discussions.apple.com/api/core/v3/search/contents'
      + '?filter=search(' + encodeURI(query) + ')&sort=' + order;

  if(from.length > 0)
    {
    if(from.length == 4)
      from = from + '-01-01';
    else if(from.length == 6)
      from = from + '-01';

    url = url + '&filter=after(' + from + ')';
    }

  if(to.length > 0)
    {     
    if(to.length == 4)
      to = to + '-12-31';
    else if(to.length == 7)
      to = to + '-31';

    var year = parseInt(to.substring(0, 4));
    var month = parseInt(to.substring(5, 7));
    var day = parseInt(to.substring(8, 10));

    if((month == 4) || (month == 6) || (month == 9) || (month == 11))
      if(day > 30)
        {
        day = 30;

        to = to.substring(0, 8) + day.toString();
        }

    if(month == 2)
      {
      var max = 28;

      if((year % 4 === 0) && (year % 100 != 0))
        max = 29;
      else if (year % 400 === 0)
        max = 29;

      if(day > max)
        {
        day = max;

        to = to.substring(0, 8) + day.toString();
        }
      }

    to = to + 'T23:59:59.999+0000';

    console.log(to);

    url = url + '&filter=before(' + to + ')';
    }

  // If I have an author, restrict to an author search.
  if(author.length > 0)
    doAuthorSearch(url, author);
  
  // Otherwise, just search all authors.
  else
    doSearch(url);
  }

// Perform an author search.
function doAuthorSearch(url, author)
  {
  // First, lookup the user.
  var xhr = new XMLHttpRequest();

  xhr.open(
    'GET', 
    'https://discussions.apple.com/api/core/v3/people/username/' 
      + encodeURI(author));

  xhr.onload = 
    function() 
      {
      if(xhr.status === 200) 
        {
        var json = xhr.responseText.substring(44);

        var data = JSON.parse(json);

        // Get the user ID.
        var id = data['id'];

        // Filter the URL by user ID.
        url = url + '&filter=author(/people/' + id + ')';

        // Now do the search.
        doSearch(url);
        }
      else 
        {
        alert("User '" + author + "' not found");
        }
      };

  xhr.send();
  }

// Do the search.
function doSearch(url)
  {
  var xhr = new XMLHttpRequest();

  xhr.open('GET', url);

  xhr.onload = 
    function() 
      {
      if(xhr.status === 200) 
        {
        // Star the fade in.
        results.setAttribute('class', 'ascpowersearch_in');

        var json = xhr.responseText.substring(44);

        var data = JSON.parse(json);

        // Get the list.
        var list = data['list'];

        // Get the next and previous links.
        var next = data['links']['next'];
        var prev = data['links']['previous'];

        // Use these values to figure out what page I'm on.
        var startIndex = data['startIndex'];
        var itemsPerPage = data['itemsPerPage'];

        // Get the scrolling wrapper div so I can scroll back up to the top
        // on next and prev.
        var scrolldiv = 
          document.querySelector(
            "#ascpowersearch_results div.ascpowersearch_scrolldiv");
        
        // I'll need the table.
        var table = 
          document.querySelector("#ascpowersearch_results table");
        
        // I'll be adding and removing elements form the table body.
        var tbody = 
          document.querySelector("#ascpowersearch_results table tbody");

        // Remove any existing rows.
        // Note that I've already put the headers into a thead element for
        // convenience.
        if(tbody != null)
          while(tbody.firstChild) 
            tbody.removeChild(tbody.firstChild);

        // Go through the results.
        for(var i = 0; i < list.length; ++i)
          {
          var item = list[i];

          // Create a row for each item.
          var row = document.createElement('tr');

          // Community > subject
          // Snippet
          // All are links to their respective targets.
          var post = 
            '<a href="' + item['parentPlace']['html'] + '" target="_blank">'
              + '<strong>' + item['parentPlace']['name'] + '</strong>'
              + '</a> &gt; '
              + '<a href="' 
              + item['resources']['html']['ref'] + '" target="_blank">'
              + '<strong>' + item['highlightSubject'] + '</strong>'
              + '<br>' + item['highlightBody']
              + '</a>';

          // Add an author link.
          var author = 
            '<a href="' 
              + item['author']['resources']['html']['ref'] 
              + '" target="_blank">'
              + item['author']['displayName']
              + '</a>';

          // Format the date nicely.
          var date = 
            item['updated'].substring(0, 10) 
              + ' ' 
              + item['updated'].substring(11, 19)
          
          // Compose the row.
          row.innerHTML = 
            '<td class="ascpowersearch_post">' + post + '</td>'
            + '<td class="ascpowersearch_author">' + author + '</td>'
            + '<td class="ascpowersearch_date">' + date + '</td>';

          // Add the row.
          tbody.appendChild(row);
          }

        // Now add the page number, prev, and next links.
        var row = document.createElement('tr');

        var prevlink = null;
        var nextlink = null;

        // I would like to do these as true buttons, but Jive seems to be
        // preventing that. Just use links instead.
        if(prev == null)
          // If there is no previous link, just use static text.
          prevlink = document.createElement('span');
        
        else
          {
          // Create a link to the previous set of data.
          prevlink = document.createElement('a');
          prevlink.setAttribute("ref", "#");

          prevlink.addEventListener(
            'click',
            function()
              {
              doSearch(prev);
              });
          }

        if(next == null)
          // If there is no next link, just use static text.
          nextlink = document.createElement('span');
        else
          {
          // Create a link to the next set of data.
          nextlink = document.createElement('a');
          nextlink.setAttribute("ref", "#");

          nextlink.addEventListener(
            'click',
            function()
              {
              doSearch(next);
              });
          }

        // Add the text.
        prevlink.innerHTML = 'Prev';
        nextlink.innerHTML = 'Next';

        // Create the cells.
        var post = document.createElement('td');
        var author = document.createElement('td');
        var date = document.createElement('td');

        // I'm using a fixed table layout, so add the classes.
        post.setAttribute("class", "ascpowersearch_post");
        author.setAttribute("class", "ascpowersearch_author");
        date.setAttribute("class", "ascpowersearch_date");

        // Calculate the page number.
        post.innerHTML = "Page: " + ((startIndex / itemsPerPage) + 1);

        // Add the data.
        author.appendChild(prevlink);
        date.appendChild(nextlink);

        // Add the cells.
        row.appendChild(post);
        row.appendChild(author);
        row.appendChild(date);

        // Add the row.
        tbody.appendChild(row);

        // Scroll back to the top.
        scrolldiv.scrollTop = table.offsetTop;
        }
      else 
        {
        alert('Request failed. Returned status of ' + xhr.status);
        }
      };

  xhr.send();
  }

// Register for message events
safari.self.addEventListener("message", replyToMessage, false);
