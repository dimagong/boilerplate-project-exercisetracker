const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

//base config
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

//connect to DB and create Schema
const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect(process.env.DB_ET, { useNewUrlParser: true, useUnifiedTopology: true });
const userData = new Schema({
  _id: String,
  username: String,
  exercises: [
    {
      date: Date,
      duration: Number,
      description: String,
    }
  ]

})
let UserDB = mongoose.model('UserDB', userData)

//function find document and return request res.json()  
function sendJsonData(name, res) {
  UserDB.find({ username: name }, function(err, docs) {
    //console.log('User was found in DB :', docs)
    //console.log('exercise', docs[0].exercises)
    if (docs[0]) res.json({ username: docs[0].username, _id: docs[0]._id })
  })
}


//function for formattind date
function formatetDate(date) {
  let upDate = date.toString().substring(0, 15)
  return upDate
}



//set up parser for request body and get data from the form 
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(bodyParser.urlencoded({ extended: true }));

//create new user
app.post('/api/users', (req, res) => {
  UserDB.findOne({ username: req.body.username }, function(err, user) {
    if (err) {
      return res.json({
        error: "No search results"
      });
    }
    if (user) {
      return res.json(
        "The document already exists"
      )
    } else {
      const user = req.body.username;
      const upDoc = new UserDB({
        username: user,
        _id: new mongoose.Types.ObjectId().toHexString(),
        exercises: []
        });
        upDoc.save(function(err, data) {
        if (err) return (err);
        sendJsonData(user, res)
      });
      
    }
  })
})

//get all users from DB
app.get('/api/users', (req, res) => {
  UserDB.find({}, function(err, count) {
    if (err) {
      return res.json({
        error: "No documents found"
      });
    } else if (count) {
      res.json(count)
    }
  })
})

//add new exercise
app.post('/api/users/:_id/exercises', urlencodedParser, (req, res) => {
  const isId = req.body[':_id'] || req.params['_id']
  
  if (!isId) {
    console.log('Not found req.body[:_id]', isId)
    req.body[':_id'] = 'Not_found'
    res.json('Not found')
    return
  }

//60c8ad1a9b71d70568a2cbd0
  if (!req.body.description) {
    res.json('Path `description` is required.')
    return
  }else if(req.body.description == ''){
    res.json('Path `description` is too short.')
    return
  }

  if (!req.body.duration) {
    res.json('Path `duration` is required.')
    return
  }else if(isNaN(req.body.duration)){
    res.json('Duration no number')
  }

  let isDate = req.body.date;
  if (!isDate) { 
    isDate = new Date();
  }else if(isNaN(Date.parse(isDate)) === true) {
    res.json(`Cast to date failed for value ${isDate} at path "date" `);
    return;
  } else {
    isDate = new Date(isDate); 
  }



  UserDB.findOne({ _id: isId }, function(err, doc) {
    console.log('findOneAndUpdate doc', doc)

    if (err) {
      console.log('Error isId', err)
      return res.json({
        error: "No documents found"
      });
    }

    const upEsercise = { date: isDate, duration: +req.body.duration, description: req.body.description }

    doc.exercises.push(upEsercise)

    doc.save(function(err, data) {
      if (err) return (err);
      //console.log('Added new exercise:', data)
    });

    const dataInfo = {
      _id: doc._id,
      username: doc.username,
      date: formatetDate(isDate),
      duration: +req.body.duration,
      description: req.body.description
    }

    res.json(dataInfo)
  })
})

//get user and specific exercises by options
app.get('/api/users/:_id/logs', urlencodedParser, (req, res) => {
  const logId = req.body[':_id'] || req.params['_id']
  
  //https://boilerplate-project-exercisetracker.dmitrygongalsky.repl.co/api/users/1/logs?limit=1&from=2
  let isFrom = req.query.from
  let isTo = req.query.to
  let isLimit = +req.query.limit

   UserDB.findOne({ _id: logId }, function(err, doc) {

    if (err) {
      console.log('Error logId', err)
      return res.json({
        error: "No documents found"
      });
    }

    let isExercises = doc.exercises.map(el =>{ 
      let isExercise = {
        date: el.date, 
        duration: el.duration,
        description: el.description
        }

        return isExercise
      }) 
    
//restrict by start date
if(isFrom && isNaN(Date.parse(isFrom)) !== true){
    console.log('Date.parse(from)', Date.parse(isFrom))
    isFrom = new Date(isFrom)
    console.log('isFrom', isFrom)
    console.log(' Date.parse(isFrom)',  Date.parse(isFrom))
    isExercises = isExercises.filter( el => Date.parse(el.date) >= Date.parse(isFrom))
  }
  //restrict by end date
  if(isTo && isNaN(Date.parse(isTo)) !== true){
    isTo = new Date(isTo)
    isExercises = isExercises.filter( el => Date.parse(el.date) <= Date.parse(isTo))
  }

 //limit the amount of exercise
    if(Number.isInteger(isLimit)){
      if (isLimit > isExercises.length) isLimit = isExercises.length 
      isExercises.length = isLimit
    }
    
    let isUserExercises = {_id: doc._id,
      username: doc.username,
      count: isExercises.length,
      log: isExercises}

     res.json(isUserExercises)
  })

  // startDate:{"$lt":curDate},
  //  endDate:{"$gt":curDate}
  // if(from && to && limit){
  //   UserDB.find({favoriteFoods: foodToSearch})
  // .sort({name: 1})
  // .limit(limit)
  // .select('-age')
  // .exec(function(err, data){ 
  //   if (err) return done(err);
  // done(null, data)
  // })
  // }
  

})
