$(function() {

Set.prototype.intersection = function(setB) {
  var intersection = new Set();
  for (var elem of setB) {
      if (this.has(elem)) {
          intersection.add(elem);
      }
  }
  return intersection;
}

Set.prototype.difference = function(setB) {
  var difference = new Set(this);
  for (var elem of setB) {
      difference.delete(elem);
  }
  return difference;
}

appURL = "https://huxley-11.apphb.com/"
accessToken = "4b1741f4-a446-4337-bbf3-3d5ac58dc331";
board = "departure";
crs = "CBG";
filterType = "to";
filterStationName = ["KGX","LST"];
numRows = 10;
expand = true;
url = `${appURL}${board}/${crs}/${filterType}/filterStationName/${numRows}?accessToken=${accessToken}&expand=${expand}`;

var options = {
  width: 5,             // number of digits
  format: null,         // options for jquery.numberformatter, if loaded
  align: 'right',       // aligns values to the left or right of display
  padding: '&nbsp;',    // value to use for padding
  chars_preset: 'alphanum',  // 'num', 'hexnum', 'alpha' or 'alphanum'
  timing: 250,          // the maximum timing for digit animation
  min_timing: 10,       // the minimum timing for digit animation
  threshhold: 100,      // the point at which Flapper will switch from
                        // simple to detailed animations
  transform: true,      // Flapper automatically detects the jquery.transform
                        // plugin. Set this to false if you want to force
                        // transform to off
  on_anim_start: null,  // Callback for start of animation
  on_anim_end: null     // Callback for end of animation
}

var cheeseBoard = angular.module('cheeseBoard', []);

cheeseBoard.controller('cheeseBoardController',
  function cheeseBoardController($scope, $interval) {

  $scope.resp = [];
  console.log(url);

  function arrayUnique(array) {
      var a = array.concat();
      for(var i=0; i<a.length; ++i) {
          for(var j=i+1; j<a.length; ++j) {
              if(a[i].std === a[j].std)
                  a.splice(i--, 1);
          }
      }

      return a;
  }

  function diffServices(newList) {
    var oldList = $scope.resp;

    function getStd(x) {return x.std;}
    var oldListHash = oldList.map(getStd);
    var newListHash = newList.map(getStd);

    var oldListHashSet = new Set(oldListHash);
    var newListHashSet = new Set(newListHash)

    var updateSet = oldListHashSet.intersection(newListHashSet);
    var addSet = newListHashSet.difference(oldListHashSet);
    var removeSet = oldListHashSet.difference(newListHashSet);

    for (const val of updateSet) {
      var old_index = oldListHash.indexOf(val);
      var new_index = newListHash.indexOf(val);

      if (oldList[old_index].etd === newList[new_index].etd) {
        oldList[old_index].etd = newList[new_index].etd;
      }

      if (oldList[old_index].platform === newList[new_index].platform) {
        oldList[old_index].platform = newList[new_index].platform;
      }
    }

    for (const val of removeSet) {
      var index = oldListHash.indexOf(val);
      if (index > -1) {
        oldListHash.splice(index, 1);
        oldList.splice(index, 1);
      }
    }

    for (const val of addSet) {
      var index = newListHash.indexOf(val);
      if (index > -1) {
        oldList.push(newList[index]);
      }
    }

    console.log(oldList);
  }

  function page_refresh() {
    var new_resp = [];
    console.log("refresh");
    var result_count = 0;

    for (var i in filterStationName) {
      var new_url = url.replace("filterStationName", filterStationName[i])
      $.get(new_url, function( data ) {
        new_resp = new_resp.concat(data.trainServices);
        result_count++;

        if (result_count === filterStationName.length) {
          for (var i in new_resp) {
            var service = new_resp[i];
            console.log(service.std, service.destName);
            service.arrivalTime = service.subsequentCallingPoints[0].callingPoint[service.subsequentCallingPoints[0].callingPoint.length-1].st;
            service.destName = service.destination[0].locationName;
          }

          diffServices(new_resp);
          $scope.$apply();
        }
      });
    }
  }

  page_refresh();
  $interval(page_refresh, 10000);

  $scope.date = new Date();
  $interval(function() {
    $scope.date = new Date();
  }, 1000);

  $scope.processStnName = function(stnName) {
    var nameFilters = [
      ["liverpool", "lp"],
      ["cross", "x"],
      ["street", "st"],
      ["london", "ldn"]
    ];

    stnName = stnName.toUpperCase();

    for(var i in nameFilters) {
      stnName = stnName.replace(nameFilters[i][0].toUpperCase(),
                                nameFilters[i][1].toUpperCase());
    }

    return stnName;
  }

});

cheeseBoard.directive("trainService", function() {
  function link(scope, element, attrs) {
    options.width = attrs.width;
    scope.flapboard = angular.element(element[0]).flapper(options);
    scope.$watch(function() {
      return element[0].innerText;
    }, function(newValue, oldValue) {
      console.log('new', newValue, 'old', oldValue);
      scope.flapboard.val(element[0].innerText).change();
    });
  }

  return {
    scope: true,
    restrict : "E",
    link: link
  };
});

});
