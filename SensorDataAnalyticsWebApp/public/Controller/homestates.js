var homeapp = angular.module('homeApp',['ui.router','ngStorage']);

homeapp.config(function($stateProvider, $urlRouterProvider) {
    
    $urlRouterProvider.otherwise('/');
    
    $stateProvider
        
        // HOME STATES AND NESTED VIEWS ========================================
        .state('aggregation', {
            url: '/aggregation',
            templateUrl: 'ejs/home/aggregation.ejs'
        })
    	.state('anamoly',{
    		url:'/anamoly',
    		templateUrl:'ejs/home/anamoly.ejs'
    	})
    .state('home',{
    	url:'/',
    	templateUrl:'ejs/home/home.ejs'
    })
});
homeapp.factory('socket', ['$rootScope', function($rootScope) {
	  var socket = io.connect();

	  return {
	    on: function(eventName, callback){
	      socket.on(eventName, callback);
	    },
	    emit: function(eventName, data) {
	      socket.emit(eventName, data);
	    }
	  };
	}]);