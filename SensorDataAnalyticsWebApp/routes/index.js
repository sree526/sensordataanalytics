
/*
 * GET home page.
 */

exports.index = function(req, res){
    if(req.session.username){
        res.redirect('/homepage');
    }
    else {
        res.render('index', {title: 'Express'});
    }
};