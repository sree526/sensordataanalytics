
/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , newuser=require('./routes/newuser')
    , login=require('./routes/login')
    , http = require('http')
    , path = require('path')
    , session = require('client-sessions');

var app = express();

app.use(session({

    cookieName: 'session',
    secret: 'cmpe273_test_string',
    duration: 30 * 60 * 1000,    //setting the time for active session
    activeDuration: 5 * 60 * 1000,  }));
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}


app.get('/', routes.index);
app.get('/users', user.list);
app.post('/login',newuser.login);
app.get('/homepage',login.home);
app.post('/signup',user.signup);
app.get('/logout',user.logout);

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

var consumerSocket;


var io = require('socket.io')(server);
var sockets = [];
var aggregationData = [];
var anomalyData = [];
io.on('connection', function (socket) {

    sockets.push(socket);
    console.log("Client connected : "+socket);

    socket.on('data', function(data)	{
        //console.log("Data received at server : "+data);

        if(consumerSocket == null){
            console.log("Setting the consumer socket"+socket);
            consumerSocket = socket;
        }

        var record = isJson(data);
        //console.log("Current record: "+record);
        if(record != null){
            if(record.detectedAnomaly == "noanamoly"){
                //anomalyData.push(data);
                transmitData(record, false);
            } else {
//                aggregationData.push(data);
                transmitData(record, true);
            }
        }

    });

    socket.emit('clientChannel', new Date() + 'Connection established');
});

function transmitData(currentData, isAnamoly) {

    if(!isAnamoly){
        console.log("Sending aggregation data: " + currentData.data.timestamp + " series: " + currentData.series);
    }

    if(isAnamoly){
        console.log("Sending anamoly data: " + currentData.data.timestamp + " city: " + currentData.data.city);
    }

    for (var i = 0; i < sockets.length && consumerSocket != null; i++) {
        if(sockets[i] != consumerSocket){

            if(!isAnamoly){
                sockets[i].emit('aggregationData', currentData);
            }

            if(isAnamoly){
                sockets[i].emit('anomalyData', currentData);
            }
        }
    }
}

function isJson(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}
