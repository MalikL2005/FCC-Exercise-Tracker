const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
require('dotenv').config()
const ObjectId = require('bson').ObjectId;

app.use(bodyParser.urlencoded({extended: true}))
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

//connect to DB
const MONGO_URI = process.env.MONGO_URI
const PORT = process.env.PORT || 3001
mongoose.connect(MONGO_URI).then(()=>{
  console.log('Connected to DB.')
  app.listen(PORT, ()=>{
    console.log(`Running on Port ${PORT}`)
  })
}).catch((error)=>{console.error(error)})
const db = mongoose.connection
const collection = db.collection('Exercise_Tracker') 

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true
  }},
  { versionKey: false }
)
const User = mongoose.model('User', userSchema)


app.post('/api/users', async (req, res) => {
  const username = req.body.username 
  var user_in_db = await collection.findOne({username: username}) 
  if(user_in_db){
    res.send({username: user_in_db.username, _id: user_in_db._id.toString()})
  } else{
      var user = await collection.insertOne({username: username, log: []})
      res.send({username: username, _id: user.insertedId.toString()})
    }
})

app.post('/api/users/:_id/exercises', async (req, res)=>{
  var id = req.params._id
  if(req.body.date){var date = new Date(req.body.date)}
  else {var date = new Date()}
  const exercise = {'description': req.body.description, 'duration': parseInt(req.body.duration), 'date': date.toDateString()}
  collection.updateOne({'_id': new ObjectId(id)}, { $push : {"log": exercise}})
  var user = await collection.findOne({'_id': new ObjectId(id)})
  if (user != null){
    res.send({
      username: user.username,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: date.toDateString(),
      _id: id.toString()
    })
  }else{res.send('Id is invalid')}
})

app.get('/api/users', async (req, res)=> {
  var user_array = []
  var users = (await collection.find({}).toArray()).forEach((obj)=>{user_array.push({username: obj.username, _id: obj._id.toString()})})
  res.send(user_array)
})


app.get('/api/users/:_id/logs', async (req, res) =>{
  var user = await collection.findOne({_id: new ObjectId(req.params._id)})
  const { from, to, limit } = req.query
  const matching_dates = []
  user.log.forEach((exercise)=>{
    const date = new Date(exercise.date)
    var matches = true
    if (from){
      if (date < new Date(from).getTime()){
        matches = false
      }
    } 
    if (to){
      if (date > new Date(to).getTime()){
        matches = false
      }
    }
    if (matches){
      matching_dates.push(exercise)
    }
  })

  if(limit) {matching_dates.length = limit}
  res.json({
    username: user.username,
    count: user.log.length,
    _id: user._id.toString(),
    log: matching_dates
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
