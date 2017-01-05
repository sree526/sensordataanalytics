/*
 * GET users listing.
 */
var mysql = require('mysql');
var geoHash = require('geo-hash');
exports.list = function(req, res){
    res.send("respond with a resource");
};
exports.signup=function(req,res){
    var con = mysql.createConnection({
        host     : 'mysql2.cf0nl4bnjdro.us-west-2.rds.amazonaws.com',
        user     : 'root',
        password : 'sreekar26',
        port     : '3306',
        database : 'cmpe281'
    });
    con.connect();
    var locationId;
    var Newyork={"latitude": 40.712784,"longitude":-74.005941},
        SanFransisco={"latitude":37.809085,"longitude":-122.41204},
        Arizona={"latitude":32.752949,"longitude":-111.671257};

    if(req.body.location=="Newyork"){
        locationId = geoHash.encode(Newyork.latitude, Newyork.longitude);
    }
    else if(req.body.location=="SanFransisco"){
        locationId=geoHash.encode(SanFransisco.latitude, SanFransisco.longitude);
    }
    else
    {
        locationId=geoHash.encode(Arizona.latitude, Arizona.longitude);
    }
    console.log(req.body);
    var user={
        "firstname":req.body.firstname,
        "lastname":req.body.lastname,
        "location":locationId,
        "password":req.body.password,
        "status":"offline"
    };
    con.query('INSERT INTO user SET ?', user, function(err,result) {
        if (!err){
            res.send("success");
        }
        else{
            res.send("not found");
        }
    });
    con.end();
};

exports.logout=function(req,res){

    var con = mysql.createConnection({
        host     : 'mysql2.cf0nl4bnjdro.us-west-2.rds.amazonaws.com',
        user     : 'root',
        password : 'sreekar26',
        port     : '3306',
        database : 'cmpe281'
    });
    con.connect();
    var user=req.session.user;
    var sql="update user set status=? where firstname=?";
    var variables=['offline',req.session.username];
    sql=mysql.format(sql,variables);
    console.log(sql);
    con.query(sql,function(err,rows,fields){
        console.log("hello");
        if(!err){
            console.log('success');
            req.session.destroy();
            res.send("success");
        }
        else{
            res.send("error updating status");
        }

    });
};