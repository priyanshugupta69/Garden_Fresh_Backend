const express = require('express');
const passport = require("passport")
const app = express();
const mongoose = require('mongoose');
const bodyParser = require("body-parser");
const session = require('express-session');
const findOrCreate = require('mongoose-findorcreate')
const crypto = require('crypto')
const dotenv = require('dotenv');
dotenv.config();

var GoogleStrategy = require('passport-google-oauth20').Strategy;
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use(bodyParser.urlencoded({ limit:'50mb' ,extended: true }));
app.use(bodyParser.json({ limit: '50mb'}));

const cors = require('cors');
const store = require('store');
const { name } = require('store/storages/cookieStorage');
const password = encodeURIComponent(process.env.password);

(async () => {
  try{
    await  mongoose.connect(`mongodb+srv://priyanshugupta:${password}@gardenfreshcluster.q0wiwfp.mongodb.net/?retryWrites=true&w=majority`, {
      useNewUrlParser: true,
      useUnifiedTopology: true 
    });
    console.log("connected to database")

  }catch(err){
    console.log(err);
  }
 
  
})();
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
})
const productSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: Number,
  description: String,
  type: String,
  image: String
})
userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);
const Product = new mongoose.model("Product", productSchema);

app.use(session({
  secret: '7861',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    maxAge: 3000000 *60
  }
}));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
app.post("/upload", cors(), async (req, res) => {

  console.log(req.body)
  const test = req.body
  const product = new Product(
    test
  
  )
  product.save()
  res.send("Uploaded Successfully")
})
app.post("/update", cors(), async (req, res) => {
  
    console.log(req.body)
    try{
      const data = await Product.find({ name: req.body.ProductName });
      if(data){
        console.log(data)
        res.send(data)
  
      }
      else{
        console.log("user not found")
        res.send("user not found")
      }
    }
    catch (error) {
      console.log(error);
      res.send(error)
      
    }
    
    
      
  
    
})
app.patch("/update/:id", cors(), async (req, res) => {
  try{
    const dataId = req.params.id
    const update = req.body
    const response = await Product.findByIdAndUpdate(dataId,update , {new:true})
    console.log(response);
    res.send("updated successfully")
  }catch(err){
    console.log(err);
    res.send(err)
  }
})
app.delete("/admin/delete/:id", cors(), async (req, res) => {
  try{
    const dataId = req.params.id
    console.log(dataId);
    const response = await Product.findByIdAndDelete(dataId)
    console.log(response);
    res.send("deleted successfully")
  }catch(err){
    console.log(err);
    res.send(err);
  }
})
app.post("/login", cors(), async (req, res) => {
  const test = req.body
  console.log(test)
  test.password = await sha256(test.password);
  try{
    const data = await User.findOne({ 'email': test.email });
    console.log("data",data)
    if(data){
      if(data.password === test.password){
        res.send({message:"success",email:data.email})
      }
      else{
        res.send("wrong password")
      }
    }
    else{
      console.log("user not found")
      res.redirect("http://localhost:3000/signup")
    }
  }
  catch (error) {
    console.log(error);
  }
 

})
app.get("/products" , cors() , async (req , res) => {
  try{
    const products = await Product.find({})
    res.send(products)

  }
  catch (error) {
    res.send(error)
  }
  
})



passport.use(new GoogleStrategy({
  clientID: "525994195892-ujh7g873ot9o2ehit0qu0d3ibs39j8ld.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "http://localhost:3001/auth/google/home",
  passReqToCallback: true
},
async function(req ,accessToken, refreshToken, profile, cb) {
  const test = {
    email : '',
    password: "",
    googleId: profile.id

  }
  try{
    const data = await User.findOne({ 'googleId': profile.id });
    if(data){
     return cb(null, data)

    }
    else{
      const user = new User(
        test
      )
      user.save()
      return cb(null, user)
      
    }

  }
  catch (error) {
    console.log(error);
  }
  
}
 
));

async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message);                    

  // hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string                  
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

app.post("/signup", cors(), async (req, res) => {
  
  const test = req.body;
  // console.log("hash = ",await sha256(test.password));
  test.password = await sha256(test.password);
  try{
    const data = await User.findOne({ 'email': test.email });
    if(data){
      res.send("User already exits")

    }
    else{
      const user = new User(
        test
      )
      user.save()
      res.send("signup succesfull")  
    }
  }
  catch (error) {
    console.log(error);
  }
  
})
app.get("/auth/google", 
passport.authenticate('google', { scope: ['profile'] }), 
);

app.get('/auth/google/home', 
  passport.authenticate('google' , { failureRedirect: 'http://localhost:3000/login' , 
  failureMessage: "Cannot login to Google, please try again later!" }),
  (req, res) => {
    console.log(req.user.googleId);
    res.redirect("http://localhost:3000?googleId="+req.user.googleId);
  }
  );
app.listen(3001, () => {
  console.log('Example app listening on port 3001!')
})