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

document.body.appendChild(results);

document.getElementById("ascpowersearch_close").addEventListener(
  "click", 
  function()
    {
    results.setAttribute('class', 'ascpowersearch_out');
    });

var topPos = null;
var initialized = false;

function replyToMessage(aMessageEvent) 
  {
  if(aMessageEvent.name === "search") 
    {
    ASCPowerSearch(aMessageEvent.message);
    }
  }

function ASCPowerSearch(query)
  {
  var url =
    'https://discussions.apple.com/api/core/v3/search/contents'
      + '?filter=search(' + encodeURI(query) + ')&sort=updatedDesc';

  doSearch(url);
  }

function doSearch(url)
  {
  var xhr = new XMLHttpRequest();

  xhr.open('GET', url);

  xhr.onload = 
    function() 
      {
      if(xhr.status === 200) 
        {
        results.setAttribute('class', 'ascpowersearch_in');

        var json = xhr.responseText.substring(44);

        var data = JSON.parse(json);
        var list = data['list'];

        var next = data['links']['next'];
        var prev = data['links']['previous'];

        var startIndex = data['startIndex'];
        var itemsPerPage = data['itemsPerPage'];

        var scrolldiv = document.querySelector("#ascpowersearch_results div.ascpowersearch_scrolldiv");
        var table = document.querySelector("#ascpowersearch_results table");
        var tbody = document.querySelector("#ascpowersearch_results table tbody");

        if(tbody != null)
          while(tbody.firstChild) 
            tbody.removeChild(tbody.firstChild);

        for(var i = 0; i < list.length; ++i)
          {
          var item = list[i];

          var row = document.createElement('tr');

          var post = 
            '<a href="' + item['parentPlace']['html'] + '" target="_blank">'
              + '<strong>' + item['parentPlace']['name'] + '</strong>'
              + '</a> &gt; '
              + '<a href="' + item['resources']['html']['ref'] + '" target="_blank">'
              + '<strong>' + item['highlightSubject'] + '</strong>'
              + '<br>' + item['highlightBody']
              + '</a>';

          var author = 
            '<a href="' + item['author']['resources']['html']['ref'] + '" target="_blank">'
              + item['author']['displayName']
              + '</a>';

          var date = 
            item['published'].substring(0, 10) 
              + ' ' 
              + item['published'].substring(11, 19)
          
          row.innerHTML = 
            '<td class="ascpowersearch_post">' + post + '</td>'
            + '<td class="ascpowersearch_author">' + author + '</td>'
            + '<td class="ascpowersearch_date">' + date + '</td>';

          tbody.appendChild(row);
          }

        var row = document.createElement('tr');

        var prevlink = null;
        var nextlink = null;

        if(prev == null)
          prevlink = document.createElement('span');
        else
          {
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
          nextlink = document.createElement('span');
        else
          {
          nextlink = document.createElement('a');
          nextlink.setAttribute("ref", "#");

          nextlink.addEventListener(
            'click',
            function()
              {
              doSearch(next);
              });
          }

        prevlink.innerHTML = 'Prev';
        nextlink.innerHTML = 'Next';

        var post = document.createElement('td');
        var author = document.createElement('td');
        var date = document.createElement('td');

        post.setAttribute("class", "ascpowersearch_post");
        author.setAttribute("class", "ascpowersearch_author");
        date.setAttribute("class", "ascpowersearch_date");

        post.innerHTML = "Page: " + ((startIndex / itemsPerPage) + 1);

        author.appendChild(prevlink);
        date.appendChild(nextlink);

        row.appendChild(post);
        row.appendChild(author);
        row.appendChild(date);

        tbody.appendChild(row);

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
