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

appURL = "https://huxley-11.apphb.com"
accessToken = "4b1741f4-a446-4337-bbf3-3d5ac58dc331";
filterType = "to";
numRows = 10;
expand = true;
// url = `${appURL}${board}/${crs}/${filterType}/filterStationName/
// ${numRows}?accessToken=${accessToken}&expand=${expand}`;
var url_opts = `?accessToken=${accessToken}&expand=${expand}`

var cheeseBoard = angular.module('cheeseBoard', []);

cheeseBoard.controller('cheeseBoardController',
  function cheeseBoardController($scope, $interval) {
  $scope.resp = [];

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

    // console.log(updateSet, addSet, removeSet);
    for (let val of updateSet) {
      var old_index = oldListHash.indexOf(val);
      var new_index = newListHash.indexOf(val);

      if (oldList[old_index].etd !== newList[new_index].etd) {
        oldList[old_index].etd = newList[new_index].etd;
      }

      if (oldList[old_index].platform !== newList[new_index].platform) {
        oldList[old_index].platform = newList[new_index].platform;
      }
    }

    for (let val of removeSet) {
      var index = oldListHash.indexOf(val);
      if (index > -1) {
        oldListHash.splice(index, 1);
        oldList.splice(index, 1);
      }
    }

    for (let val of addSet) {
      var index = newListHash.indexOf(val);
      if (index > -1) {
        oldList.push(newList[index]);
      }
    }
  }

  $scope.minutesFromNow = function (time) {
    time = time.split(":");
    var d  = new Date();
    d.setMinutes(time[1]);
    d.setHours(time[0]);

    var now = new Date();
    var time_diff = d - now;

    if (time_diff < -2*60*60*1000)
      time_diff += 24*60*60*1000;

    return "(in " + time_diff/1000/60 + " min)";
  }

  function page_refresh() {
    var new_resp = [];
    console.log("refresh");
    var result_count = 0;

    var filterStationName = angular.copy($scope.settings.destFilters);

    if (filterStationName === undefined || filterStationName.length === 0) {
      filterStationName.push('')
    }

    for (var i in filterStationName) {
      var new_url = [appURL, $scope.settings.board,
                     $scope.settings.from.slice(-4,-1)]
      if (filterStationName[i] !== '') {
        new_url.push(filterType, filterStationName[i].slice(-4,-1));
      }
      // new_url.push(numRows);

      new_url = new_url.join("/") + url_opts;
      $.get(new_url, function( data ) {
        if (data.trainServices != null) {
          new_resp = new_resp.concat(data.trainServices);
        }
        result_count++;

        if (result_count === filterStationName.length) {
          for (var i in new_resp) {
            var service = new_resp[i];
            service.arrivalTime = service
                                  .subsequentCallingPoints[0]
                                  .callingPoint[service
                                                  .subsequentCallingPoints[0]
                                                  .callingPoint
                                                  .length-1].st;
            service.destName = service.destination[0].locationName;
          }

          diffServices(new_resp);
          $scope.$apply();
        }
      });
    }
  }

  // diffServices(sample_response.trainServices);
  // diffServices(sample_response_next.trainServices);
  // console.log($scope.resp);

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

  $scope.active_page = 0;
  $scope.active_page_inc = function() {
    $scope.active_page += 1;
    $scope.active_page %= $scope.num_pages;
  }

  $scope.active_page_dec = function() {
    if ($scope.active_page > 0)
    {
      $scope.active_page -= 1;
    }
  }

  $interval($scope.active_page_inc, 5000);

  $scope.num_pages = 1;
  $scope.getNumber = function(num) {
    return new Array(num);
  }

  $scope.stationNameValid = function(stationName) {
    return $scope.stationNames.indexOf(stationName) >= 0;
  }

  $scope.$watch("resp.length", function () {
    $scope.num_pages = Math.ceil($scope.resp.length/$scope.settings.rowPerPage);
  });

  $scope.showService = function (index) {
    return Math.floor(index/$scope.settings.rowPerPage) === $scope.active_page;
  }

  var refreshPromise = undefined;
  function startRefresh() {
    if (refreshPromise === undefined) {
      page_refresh();
      refreshPromise = $interval(page_refresh, 10000);
    }
  }

  $scope.save_settings = function (settings) {
    console.log("set", settings);

    if($scope.settings.rowPerPage === null) {
      $scope.settings.rowPerPage = 4;
    }

    console.log(settings);
    localStorage.setItem('settings', JSON.stringify(settings));
    $('#myModal').modal('hide');

    $scope.active_page = 0;
    startRefresh();
  }

  $scope.initTypeAhead = function () {
    $('.typeahead').typeahead({
      source: $scope.stationNames
    });
  }

  $scope.stationNames = [];
  $.get(appURL+"/"+"crs", function( data ) {
    for(var i in data){
      $scope.stationNames[i] = data[i].stationName +
                               " (" + data[i].crsCode + ")";
    }
    $scope.initTypeAhead();
  });

  // localStorage.clear();

  if (localStorage.settings != undefined){
    $scope.settings = JSON.parse(localStorage.settings);
    startRefresh();
  }
  else{
    $scope.settings = {};
    $scope.settings.board = "departures";
    $scope.settings.rowPerPage = 4;
    $scope.settings.destFilters = [];
    $('#myModal').modal('show');
  }

});

cheeseBoard.directive('crs', function() {
  return {
    require: 'ngModel',
    scope: false,
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.crs = function(modelValue, viewValue) {
        console.log(modelValue, viewValue, ctrl.$isEmpty(modelValue),
            scope.stationNameValid(modelValue));
        return ctrl.$isEmpty(modelValue) || scope.stationNameValid(modelValue);
      };
    }
  };
});

});
