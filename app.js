var express = require('express');
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors')

// Init app
var app = express();

// Connect with Mongo DB
var mongoUri =  process.env.MONGODB_URI || 'mongodb://localhost/Mindfilled';
mongoose.connect(mongoUri);

//Init the middle-ware
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//MIDDLEWARE FOR TROUBLESHOOTING
app.use(function(req,res,next){ //console logs url calls
  console.log(req.method + " " + req.url);
  next();
});

//View Engine
app.set( 'views', path.join(__dirname, 'views'));
app.set( 'view engine', 'jade');

//User model and database
var Activity = require('./model/activity');

app.options('/history', cors());
app.post('/history', function (req, res, done) {
  console.log('hit the history post')
  var dataReturn = {}
  var endTime = undefined
  //first find the latest activity to have ended
  //THIS SORT WITH FINDONE MAY NOT WORK
  Activity.findOne({
      'userID': req.body.userID,
    })
  .sort({'ended': 'desc'})
  .exec(function(err, activity){
    console.log('activity found: ', activity)
    if(err){ return done(err); }
    if (!activity){
      endTime = new Date()
    } else{
      endTime = activity.ended
      endTime.setDate(endTime.getDate()-7)
    }
    console.log('endTime is: ', endTime)
  // })

  //Now find all activies started before the cutoff
  Activity.find({
      //'userID': req.body.userID
      'started': {$gte : endTime}
    })
  .sort({'ended': 'desc'})
  .exec(function(err, activities){
    console.log('endTime is: ', endTime)
    if(err){ return done(err); }
    dataReturn = activities
    console.log('data to be sent: ', dataReturn)
    res.send(dataReturn);
  });
    })
});

app.options('/', cors());
app.post('/', function (req, res, done) {
  console.log('hit the post')
  Activity.find({
      'userID': req.body.userID,
      'type': req.body.type
    })
  .sort({'started': 'desc'})
  .exec(function(err, activities){

  if(err){ return done(err); }
  console.log('now at activities: ', activities)
    var activity = undefined
    // if no activity found, create new
      if (activities.length == 0){
        console.log('no activity found')
        activity = new Activity({
          'userID': req.body.userID,
          'type': req.body.type,
          'started': req.body.time
        });
      }
      // if activity found and has already ended, create a new activity
      else if(activities[0].ended != undefined){
        activity = new Activity({
          'userID': req.body.userID,
          'type': req.body.type,
          'started': req.body.time
        });
      }
      // if activity found and has not ended, add end time and length
      else if (activities[0].ended == undefined){
        activity = activities[0]
        activity.ended = req.body.time
        //Number of minutes elapsed
        activity.length = (activity.ended - activity.started) / (1000 * 60)
      }
      //save changes made to activity
      activity.save(function(err){
          if(err) console.log('error saving activity' + err);
          return done(err, activity);
        });
  });
  res.send('done')
});

// listen
app.listen(process.env.PORT || 3000 )

console.log('listening on port 3000')