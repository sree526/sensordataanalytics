
app.controller('signup', function($scope, $http,$localStorage) {
	$scope.login = function () {
		console.log("hello");
		
		$http.post('/login',
				{
				"username":$scope.username,
				"password":$scope.password})
        .success(function(data) {
            $scope.formData = {}; // clear the form so our user is ready to enter another
//            $scope.todos = data;
           console.log(data);
            if(data==="not found")
                $scope.todos=data;
            else
            window.location.assign('/homepage');
            	console.log(data);
            	$localStorage.location=data;
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });
	
	};
	$scope.signup=function(){
		console.log("signup");
		$http.post('/signup',
				{
				"firstname":$scope.firstname,
				"password":$scope.password,
				"lastname":$scope.lastname,
				"location":$scope.location})
        .success(function(data) {
            $scope.formData = {}; // clear the form so our user is ready to enter another
//            $scope.todos = data;
           console.log(data);
            if(data==="success")
            $scope.todos="signup successful you can login now";
            else
            	$scope.todos=data;
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });
	};
	
});
