//loading required modules;
console.log('Loading function');

var AWS = require('aws-sdk');
var geoHash = require('geo-hash');
var mysql= require('mysql');
var sns = new AWS.SNS();

//This handler will invok after receiving the event with weather data
exports.handler = (event, context, callback) => {
	console.log(process.env.SQL_DATABASE_HOST);
	event.Records.forEach((record) => {
        // Kinesis data is base64 encoded so decode here
        const data = JSON.parse(new Buffer(record.kinesis.data, 'base64').toString('ascii'));		
        console.log('Decoded payload:', data);
        console.log(data.latitude);
        console.log(data.longitude);
        console.log(data.city);
        console.log(data.timestamp);
        console.log(data.temperature);
        console.log(data.CO2);
        console.log(data.CO);

		var locationId = geoHash.encode(data.latitude, data.longitude); 		

        getLocationInfoIfPresent(data.latitude, data.longitude, function(err, locationInfo)   {
            if(err) {
                callback(err);
                return;
            }
            if(!locationInfo)  { //If error I assume location is not present and I insert the location...
                insert2CityLocationsTable(locationId, data, function(err, resp) {
                    if(err) {
                        callback(err);
                    }
                    //continue with inserting record into seconds,   and hourly...  
                    insertAndAggreegate(locationId, data, callback);
                });
            }else   { //If location is present then first I insert into seconds table and start aggregating the data further into minutes and hours
                //continue with inserting record into seconds, minutes and hourly...
                insertAndAggreegate(locationInfo.LocationID, data, callback);
            }
        });
    });
};

function getLocationInfoIfPresent(latitude, longitude, callback)    {
    console.log("****getLocationInfoIfPresent****");

	var dynamodb = new AWS.DynamoDB.DocumentClient();

    dynamodb.get({       
		"TableName":"CityLocations",
		"Key":{
			"Latitude":latitude,
			"Longitude":longitude
		},
		"AttributesToGet": ["LocationID", "Name"]
	},	
	function(err, data){
		if (err) {
			console.log(err); // an error occurred
			callback(err);
		} else {
			console.log(data);
			callback(err, data.Item);
		}			
	});
}

function insert2CityLocationsTable(locationId, data, callback)	{
    
    console.log("****Inserting data into City Locations Table****");
    console.log(locationId);
    console.log(data);

	var dynamodb = new AWS.DynamoDB.DocumentClient();

	dynamodb.put({       
		"TableName":"CityLocations",
		"Item":{
			"Latitude":data.latitude,
			"Longitude":data.longitude,
			"LocationID":locationId,
			"Name": data.city
		}
	},	
	function(err, data){
		if (err) {
			console.log(err); // an error occurred
			callback(err);
		} else {
			console.log(data);
			console.log("Record Inserted");	        	      
			callback(null);
		}			
	});	
}

function insertAndAggreegate(locationId, data, lambdaCallback)  {

    console.log("****insertAndAggreegate****");
        console.log(data.timestamp);
        console.log(data.temperature);
        console.log(data.CO2);
        console.log(data.CO);
        
	var conn = mysql.createConnection({
	    host      :  process.env.SQL_DATABASE_HOST,  // give your RDS endpoint  here
	    port      :  process.env.SQL_DATABASE_PORT,
	    user      :  process.env.SQL_USER,  // Enter your  MySQL username
	    ssl		  :  process.env.SQL_SSL, 
	    password  :  process.env.SQL_DATABASE_PASSWORD ,  // Enter your  MySQL password 
	    database  :  process.env.SQL_DATABASE    // Enter your  MySQL database name.
	});
	
	conn.connect(function(err) {    //connecting to database
	    if (err) {
		    console.error('error connecting: ' + err.stack);
		    lambdaCallback(err);
		    return;
		}
		console.log('connected as id ' + conn.threadId);	 //console.log(conn);
	});
	
	var sql='INSERT INTO ' + process.env.SECONDS_TABLENAME + ' (timeStamp,temperature,humidity,precipitation,carbonDiOxide,carbonMonOxide,nitrousOxide,ozone,windSpeed,windDirection,locationId)' + 
	'VALUES("'+data.timestamp+'","'+data.temperature+'","'+data.humidity+'","'+data.precipitation+'","'+data.CO2+'","'+data.CO+'","'+data.NO+'","'+data.O3+'","'+data.windSpeed+'","'+data.windDirection+'","'+locationId+'")';
	
	var result = conn.query ( sql, function(error, res) {  // querying the database
	    if (error) {
	        console.log(error.message);
	        conn.end();
	        lambdaCallback();
	        return;
	    } 

        console.log("Record ID");
        console.log("***Publishing to seconds table***");
        publish2SNS(res.insertId, locationId, process.env.SECONDS_TABLENAME);
        
        console.log("****Checking the size of seconds table for a given location key****");

	   /*1. Find the count of records in seconds table 
	    2. Calculate the remainder of count with sec_to_minutes, on zero aggregate seconds data to minutes
	    Currently aggregation is happening within lambda, in case of timeout seconds aggregation to minutes and hours \
	    should be moved to other lambda function using SNS */
	    
	    sql = 'SELECT COUNT(timeStamp) As COUNT FROM ' + process.env.SECONDS_TABLENAME + ' WHERE locationId=' + "'" + locationId + "'";
	    conn.query ( sql , function(err, res)   {
	       if(err)  {
	           conn.end();
	           lambdaCallback(err);
	           return;
	       }
	       console.log("**Number of rows***");
	       console.log(res[0].COUNT);
	       if(res[0].COUNT % process.env.SEC_TO_MIN_CONV_FACTOR === 0)    {
	           aggregateSeconds2Minutes(conn, locationId, lambdaCallback);
	           return;
	       }
	       conn.end();
	       lambdaCallback(null);
	    });
	});
}

function ISODateString(d)   {
    function pad(n) {
        return n<10 ? '0'+n : n
    }
        
    return d.getUTCFullYear()+'-'
     + pad(d.getUTCMonth()+1)+'-'
     + pad(d.getUTCDate()) +' '
     + pad(d.getUTCHours())+':'
     + pad(d.getUTCMinutes())+':'
     + pad(d.getUTCSeconds())
}

function aggregateSeconds2Minutes(conn, locationId, lambdaCallback) {
    
    var sql = 'SELECT timeStamp, AVG(temperature) AS temp, AVG(humidity) AS hum, AVG(precipitation) AS prec, AVG(carbonDiOxide) AS CO2,' +
	      'AVG(carbonMonOxide) AS CO, AVG(nitrousOxide) AS NO, AVG(ozone) O3, AVG(windSpeed) AS windSpeed, AVG(windDirection) AS windDirection FROM'  +
	       '( SELECT * FROM ' + process.env.SECONDS_TABLENAME + ' WHERE locationId=' + "'" + locationId + "'" + 'ORDER BY timeStamp DESC LIMIT ' + process.env.SEC_TO_MIN_CONV_FACTOR + ' ) AS T';
	           
	console.log(sql);
	
	conn.query ( sql , function(err, res)    {
	    if(err) {
	        console.log(err);
	        conn.end();
	        lambdaCallback(null);
	        return;
	    }
	    
	    console.log(res);
	    
	    var timestamp = ISODateString(res[0].timeStamp);
	    var temp = res[0].temp;
	    var hum = res[0].hum;
	    var prec = res[0].prec;
	    var CO2 = res[0].CO2;
	    var CO = res[0].CO;
	    var NO = res[0].NO;
	    var O3 = res[0].O3;
	    var windSpeed = res[0].windSpeed;
	    var windDirection = res[0].windDirection;
	    
    	sql='INSERT INTO ' + process.env.MINUTES_TABLENAME + ' (timeStamp,temperature,humidity,precipitation,carbonDiOxide,carbonMonOxide,nitrousOxide,ozone,windSpeed,windDirection,locationId)' + 
    	'VALUES("'+timestamp+'","'+temp+'","'+hum+'","'+prec+'","'+CO2+'","'+CO+'","'+NO+'","'+O3+'","'+windSpeed+'","'+windDirection+'","'+locationId+'")';
    	
        console.log("****Inserting aggregated data into minutes table****");
            
        conn.query( sql, function(err, resp)    {
            if(err) {
                conn.end();
                lambdaCallback(err);
                return;
            }
            
            console.log("***Data is inserted into minutes table***");
            console.log("***Publishing minutes data insertion to SNS***");
            publish2SNS(resp.insertId, locationId, process.env.MINUTES_TABLENAME);
            aggregateMinutes2Hours(conn, locationId, lambdaCallback);
    	});
	});
}

function aggregateMinutes2Hours(conn, locationId, lambdaCallback)   {
    
    /*1. Find the count of records in seconds table 
	   2. Calculate the remainder of count with sec_to_minutes, on zero aggregate seconds data to minutes
	   Currently aggregation is happening within lambda, in case of timeout seconds aggregation to minutes and hours \
	   should be moved to other lambda function using SNS */
	   
	var sql = 'SELECT COUNT(timeStamp) As COUNT FROM ' + process.env.MINUTES_TABLENAME + ' WHERE locationId=' + "'" + locationId + "'";
	    
	conn.query ( sql, function(err, res)    {
	    if(err)  {
            conn.end();
            lambdaCallback(err);
            return;
	    }
	    
	    console.log("Number of rows in minutes table");
	    
	    console.log(res[0].COUNT);
	    
	    if(res[0].COUNT % process.env.MIN_TO_HOUR_CONV_FACTOR === 0)    {
	        
            sql = 'SELECT timeStamp, AVG(temperature) AS temp, AVG(humidity) AS hum, AVG(precipitation) AS prec, AVG(carbonDiOxide) AS CO2,' +
	          'AVG(carbonMonOxide) AS CO, AVG(nitrousOxide) AS NO, AVG(ozone) O3, AVG(windSpeed) AS windSpeed, AVG(windDirection) AS windDirection FROM'  +
	        '( SELECT * FROM ' + process.env.MINUTES_TABLENAME + ' WHERE locationId=' + "'" + locationId + "'" + 'ORDER BY timeStamp DESC LIMIT ' + process.env.MIN_TO_HOUR_CONV_FACTOR + ' ) AS T';
            
            console.log(sql);
            
            conn.query( sql , function(err, resp)   {
                if(err) {
        	        console.log(err);
        	        conn.end();
        	        lambdaCallback(null);
        	        return;
        	    }
	    
        	    console.log(resp);
        	    
        	    var timestamp = ISODateString(resp[0].timeStamp);
        	    var temp = resp[0].temp;
        	    var hum = resp[0].hum;
        	    var prec = resp[0].prec;
        	    var CO2 = resp[0].CO2;
        	    var CO = resp[0].CO;
        	    var NO = resp[0].NO;
        	    var O3 = resp[0].O3;
        	    var windSpeed = resp[0].windSpeed;
        	    var windDirection = resp[0].windDirection;
        	    
            	sql='INSERT INTO ' + process.env.HOURS_TABLENAME + ' (timeStamp,temperature,humidity,precipitation,carbonDiOxide,carbonMonOxide,nitrousOxide,ozone,windSpeed,windDirection,locationId)' + 
            	'VALUES("'+timestamp+'","'+temp+'","'+hum+'","'+prec+'","'+CO2+'","'+CO+'","'+NO+'","'+O3+'","'+windSpeed+'","'+windDirection+'","'+locationId+'")';
            	
                console.log("****Inserting aggregated data into hours table****");
                    
                conn.query( sql, function(err, resp)    {
                    if(err) {
                        conn.end();
                        lambdaCallback(err);
                        return;
                    }
                    conn.end();
                    console.log("***Data is inserted into hours table***");                    
                    console.log("***Publishing hours data insertion to SNS***");
                    publish2SNS(resp.insertId, locationId, process.env.HOURS_TABLENAME);
	                lambdaCallback(null);
            	});                
            });
	        return;
	    }
	    conn.end();
	    lambdaCallback(null);
	});
}

function publish2SNS(recordId, locationId, tableName)   {
    
    var recordIdStr = recordId + "";
    
    var params = {
        "TargetArn" : process.env.SNS_TOPIC_NAME,
        "Message": "RecordInserted",
        "MessageAttributes": {
          "recordId": {
            "DataType":"String",
            "StringValue":recordIdStr
          },
          "locationId": {
            "DataType":"String",
            "StringValue":locationId
          },
          "tableName":{
            "DataType":"String",
            "StringValue":tableName
          }
        }
    };

    sns.publish(params, function(err, data) {
        if (err) {
            console.log("SNS publishing error occured");
            console.log(err.stack);
            return;
        }
        console.log('push sent for table ' + tableName);
        console.log(data);
    });
}