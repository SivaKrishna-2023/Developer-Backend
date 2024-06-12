const express = require('express');
const mongoose = require('mongoose');
const devuser = require('./devusermodel');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const middleware = require('./middleware');
const reviewmodel = require('./reviewmodel')
const bcrypt = require('bcrypt');
const cors = require("cors")
const app = express();

app.use(bodyParser.json());


app.use(express.json());
app.use(cors({origin: '*'}))

mongoose.connect('mongodb+srv://Siva-Krishna:siva2001@cluster0.xeaxejw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log("DB connected..."))
  .catch(err => console.error("DB connection error:", err));

app.post('/register', async (req, res) => {
  try {
    console.log('Received body:', req.body);

    const { fullname, email, mobile, skill, password, confirmpassword } = req.body;
    console.log('Parsed body:', JSON.stringify({ fullname, email, mobile, skill, password, confirmpassword }));

    // Check if all required fields are provided
    if (!fullname || !email || !mobile || !skill || !password || !confirmpassword) {
      return res.status(400).send('All fields are required');
    }

    const exist = await devuser.findOne({ email });

    if (exist) {
      return res.status(400).send('User Already Registered');
    }

    if (password !== confirmpassword) {
      return res.status(403).send('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let newUser = new devuser({
      fullname,
      email,
      mobile,
      skill,
      password: hashedPassword,
      confirmpassword: hashedPassword
    });

    await newUser.save();
    return res.status(200).send('User Registered');

  } catch (err) {
    console.log(err);
    return res.status(500).send('Server Error');
  }
});

app.post('/login', async(req,res) =>{
    try{
        const {email, password} = req.body;
        const exist = await devuser.findOne({email});
        if(!exist){
            return res.status(400).send('Invalid Email or Password');
        }
        const isMatch = await bcrypt.compare(password, exist.password);
        if(!isMatch){
            return res.status(400).send('Invalid Email or Password');
        }

        let payload = {
            user:{
                id: exist.id
            }
        }
        jwt.sign(payload,"jwtPassword", {expiresIn: 360000}, (err, token) => {
            if(err) throw err;
            return res.json({ token });
        });

    }
    catch(err){
        console.log(err);
        return res.status(500).send('Server Error')
    }
});

app.get('/allprofiles',middleware,async(req,res) =>{
  try{
    let allprofiles = await devuser.find();
    return res.json(allprofiles)
  }
  catch(err){
    console.log(err)
    return res.status(500).send("Server Error")
  } 
})

app.get('/myprofile',middleware,async(req,res)=>{
  try{
    let user = await devuser.findById(req.user.id);
    return res.json(user);
  }
  catch(err){
    console.log(err)
    return res.status(500).send('Server Error')
  }
})

app.post('/addreview', middleware, async (req, res) => {
  try {
    const { taskworker, rating } = req.body;
    // Validate request body
    if (!taskworker || !rating) {
      return res.status(400).json({ error: 'taskworker and rating are required' });
    }

    // Find the user
    const exist = await devuser.findById(req.user.id);
    if (!exist) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a new review
    const newReview = new reviewmodel({
      taskprovider: exist.fullname,
      taskworker,
      rating,
    });

    // Save the review to the database
    await newReview.save();

    // Send success response
    return res.status(200).json({ message: 'Review updated successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server Error' });
  }
});

app.get('/myreview', middleware, async(req, res) =>{
  try{
    let allreviews = await reviewmodel.find();
    let myreviews = allreviews.filter(review => review.taskworker.toString() === req.user.id.toString())
    return res.status(200).json(myreviews);
  }
  catch(err){
    console.log(err)
    return res.status(500).send('Server Error')
  }
})

app.listen(5002, () => console.log("Server running on port 5002..."));