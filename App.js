require("dotenv").config();// help to connect to .env file
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
// requires for sessions
const session = require("express-session");//a
const passport = require("passport");//b
const passportLocalMongoose = require("passport-local-mongoose");//c
// require for profile_images
const fs = require("fs");
const path = require("path");
const multer = require("multer");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
// console.log(process.env);
app.use(session({secret: process.env.SECRET,resave: false,saveUninitialized: false}));//d
app.use(passport.initialize());//e
app.use(passport.session());//f

mongoose.connect(process.env.DB_URI,{useNewUrlParser:true, useUnifiedTopology: true,useCreateIndex:true });
// useFindAndModify is not letting findOneAndUpdate to work untill set to false

// making schema and models

const commentschema = new mongoose.Schema({comment:String,username:String});
const Comment = new mongoose.model("Comment",commentschema);

const feedschema = new mongoose.Schema({
  postext:String,
  postdata: Buffer,
  like:{type: Number,default:0},
  // comments: [commentschema]
   // cant find it
});

const Feed = new mongoose.model("Feed",feedschema);


// main schema (user schema and model)
const userschema = new mongoose.Schema({
  // profile_image :img,
  username :{
    type: String,
    required: true,
    unique: true,
    trim:true,
    minlength:3
  },
  email: {type: String,required: true,},
  // password: {type: String,required: true,minlength:3},
  age :Number,
  // college :{type: String,default: "Add your Institution/University"},
  college:String,
  school :{type: String,default: "Add School Info "},
  company :String,
  address :String,
  skills :{type: Array,default: []},
  abouts :{type: String,default: ".... "},
  experiences :{type: Array,default: []},
  projects :{type: Array,default: []},
  data: {type:Buffer,default: fs.readFileSync(path.join(__dirname+"/uploads/image-1610635661098"))},//storing path here of profile picture
  // everyone is having same default image and   that image is at address(C:\Users\HP\Desktop\LinkUp-Project\uploads\image-1610635661098);
  feeds: [feedschema],
  subscribers: {type: Array,default: ["SANCHIT GARG"]},
  comments: Array,
  plus:{type:Number,default:0}//likes
});


userschema.plugin(passportLocalMongoose);//g
const User = new mongoose.model("User",userschema);

passport.use(User.createStrategy());//h
passport.serializeUser(User.serializeUser());//i
passport.deserializeUser(User.deserializeUser());//j

// defining destination and name of file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {cb(null, 'uploads')},
    filename: (req, file, cb) => {cb(null, file.fieldname + '-' + Date.now())}
});
// uplaod constant
const upload = multer({ storage: storage });

// all get
// app.get("/",function(req,res){ //render a page showing login and register options
//   res.render("home");//remove this later so that no one can enter directly
// });


// get and post for register page
app.get("/register",function(req,res){
  res.render("register");
});
app.post("/register",function(req,res){
  // User.register({username: req.body.username,email: req.body.email,password:req.body.password},req.body.password,function(err,user){
  User.register({username: req.body.username,email: req.body.email},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home");
      });
    }});
});
// get and post for login page
app.get("/login",function(req,res){
  res.render("login");
});
app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user,function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    }else{
      passport.authenticate("local", { failureRedirect:"/register"})(req,res,function(err){//if not registered than redirect to register page
           res.redirect("/home");
      });
    }});
});
// get and post for updating more(about -> multiple sections )
app.get("/more",function(req,res){
  if(req.isAuthenticated()){
    const user = req.user.username;
    User.findOne({username:user},function(err,founduser){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        res.render("more",{userskills: founduser.skills,userexperience: founduser.experiences,});
      }
    });
  }
  else   res.redirect("/login");
});
app.post("/addmore/:infotype",function(req,res){//add info
  const infotype = req.params.infotype;
  const infotoadd = req.body.infotoadd;
  const user = req.user.username;
  console.log(infotype);
  if(infotoadd!=""){
    User.findOne({username:user},function(err,founduser){
      if(infotype==="skills")founduser.skills.push(infotoadd);
      else founduser.experiences.push(infotoadd);

        founduser.save(function(){//i think yha par bracket mai err ayega
          res.redirect("/more");
      });
    });}
  else res.redirect("/more");
});
app.post("/deletemore/:infotype",function(req,res){
  const infotype = req.params.infotype;
  const infotodelete = req.body.infotodelete;
  const user = req.user.username;
  if(infotype==="skills"){
  console.log(infotodelete+" "+user);
  User.findOneAndUpdate(
    {username:user},{$pull:{skills:infotodelete}},
    function(err,foundUser){
      if(!err)  res.redirect("/more");
      else { res.redirect("/more");  console.log(err); }
    });}else{
  User.findOneAndUpdate(
    {username:user},{$pull:{experiences:infotodelete}},
    function(err,foundUser){
      if(!err)  res.redirect("/more");
      else { res.redirect("/more");  console.log(err); }
    });
  }
});
app.get("/info",function(req,res){
  if(req.isAuthenticated()){
    const user = req.user.username;
    User.findOne({username:user},function(err,founduser){
      if(err){
        console.log(err);
        res.redirect("/info");
      }else{
        // console.log(founduser);
        res.render("info",{user:founduser});
      }
    });
  }
  else   res.redirect("/login");
});
app.post("/info",function(req,res){
  const user = req.user.username;
  // console.log(req.body.email);
  User.updateOne(
    {username:user},
    {$set:req.body},
    function(err){
      if(err)res.render("info");
      else res.redirect("/home");
    }
  );
});


app.get("/me",function(req,res){
  //instead of anyname , use -> (me) . and in every page of user send username using name,value pair
  //send username through register.ejs and login.ejs to header.ejs and then to all pages

  if(req.isAuthenticated()){
    const username = req.user.username;
    // console.log(username);
    User.findOne({username:username},function(err,founduser){
      if(!err){
          res.render("me",{user:founduser});
      }else{
        console.log(err);
        res.render("register");
      }});
  }else{
    res.redirect("login");
  }});
app.get("/home",function(req,res){
  if(req.isAuthenticated())  {
    const user = req.user.username;
    // User.findOne({username:user},function(err,founduser){
    //   if(!err){
    //     // console.log(founduser);
    //     Feed.find({},function(err2,foundfeeds){
    //       if(!err2){
    //         // console.log(foundfeeds);
    //         res.render("home",{user:founduser,feeds:foundfeeds});
    //       }else{
    //         res.redirect("/home");
    //       }
    //     });// res.render("home",{user:founduser});
    //   }else{
    //     console.log(err);
    //   }
    // });
    User.findOne({username:user},function(err,founduser){
      if(!err){
        User.find({$or:[{username:founduser.subscribers},{username:founduser.user}]},function(err2,foundsubscribers){
          if(!err2){
            res.render("home",{user:founduser,subscribers:foundsubscribers});
          }else res.redirect("login");
        });
      }else res.redirect("login");
    });
  }
  else   res.redirect("/login");
});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});

// app.patch("/:anyname",function(req,res){
//
// })



app.get("/images",function(req,res){
  if(req.isAuthenticated()){
    const user = req.user.username;
    User.findOne({username:user},function(err,founduser){
      if(!err){
        console.log(founduser);
        res.render("images",{user:founduser});
      }else{
        console.log(err);
        res.render("login");
      }
    });
  }else{
    res.render("login");
  }
});
app.post("/images",upload.single("image"),function(req,res){
  const user = req.user.username;
  User.updateOne(
    {username:user},
    {$set:{data:  fs.readFileSync(path.join(__dirname+"/uploads/"+req.file.filename))}},
    function(err){
      // console.log(fs.readFileSync(path.join(__dirname+"/uploads/"+req.file.filename)));
      if(err)res.render("home");
      else {res.redirect("/images");console.log(err);}
    });
});

app.post("/feedpost",upload.single("image"),function(req,res){
  const user = req.user.username;
  // User.findOne({username:user},function(err,founduser){
  //   if(!err){// console.log(founduser);
  //     const newfeed = {
  //       username:user,userimgdata:founduser.data,usercollege:founduser.college,
  //       postext:req.body.comments,
  //       postdata:  fs.readFileSync(path.join(__dirname+"/uploads/"+req.file.filename))};
  //
  //     User.feeds.create(newfeed,function(err2,foundfeed){
  //         if(err2){console.log(err2);res.render("images");}
  //         else {
  //           foundfeed.save();
  //           // res.render("images",{user:founduser,})
  //           res.redirect("/images");
  //         }
  //       }
  //     );
  //     // res.render("images",{user:founduser});
  //   }else{
  //     console.log(err);
  //     res.render("login");
  //   }
  // });

  //working fine
  User.findOne({username:user},function(err,founduser){
    const newfeed = new Feed({
      postext:req.body.postext,
      postdata:  fs.readFileSync(path.join(__dirname+"/uploads/"+req.file.filename))
    });
    founduser.feeds.push(newfeed);
    founduser.save();
    res.redirect("/home");
  });
});

app.post("/comment",function(req,res){
   const user = req.user.username;
   // console.log(req.body);
   // if(item!=""){
   //   List.findOne({name:req.body.list},function(err,foundlist){
   //     const newitemtobeinserted = new Item({name:item});
   //     foundlist.items.push(newitemtobeinserted);
   //     foundlist.save();
   //   });}
   // console.log(req.body.feedid);


// currently error is that message is being sending to subscribers all feeds
   //   if(req.body.comments!=""){
   //   User.feeds.findOne({_id:req.body.feedid},function(err,foundfeed){
   //     const newcomment = new Comment({comment:req.body.comments,username:user});
   //     console.log(foundfeed);
   //     foundfeed.comments.push(newcomment);
   //     foundfeed.save();
   //     res.redirect("/home");
   //   });
   // }else{
   //    res.redirect("/home");
   // }

   if(req.body.comments!=""){
   User.findOne({_id:req.body.subscriber},function(err,founduser){
     const newcomment = new Comment({comment:req.body.comments,username:user});
     // console.log(founduser);
     founduser.comments.push(newcomment);
     founduser.save();
     res.redirect("/home");
   });
 }else{
    res.redirect("/home");
 }
});

app.post("/likes",function(req,res){
   const user = req.user.username;
   if(req.body.comments!=""){
   User.findOne({_id:req.body.subscriber},function(err,founduser){
     // console.log(founduser);
     founduser.plus+=1;
     founduser.save();
     res.redirect("/home");
   });
  }else{
    res.redirect("/home");
  }
});


app.get("/network",function(req,res){
  if(req.isAuthenticated()){
    const user = req.user.username;
    User.findOne({username:user},function(err,founduser){//login user
      User.find({username:founduser.subscribers},function(err2,foundsubscribers){//his subcribers
        User.find({username:{$nin:founduser.subscribers}},function(err3,foundunsubscribers){
          //basically now i am sending photos of not subscribed users ,(nin is used to compar single username with complete array)
          // console.log(foundunsubscribers);
          res.render("network",{subscribers:foundsubscribers,unsubscribers:foundunsubscribers,count:"true"});
        });
      });
    });
  }else{
    res.render("login");
  }
});

app.get("/friends/:username",function(req,res){
  if(req.isAuthenticated()){
    const friend = req.params.username;
    const user = req.user.username;
    User.findOne({username:user},function(err,founduser){
      User.findOne({username:friend},function(err2,foundfriend){
        var a=0;
      for(var i=0;i<founduser.subscribers.length;i++){
        if(founduser.subscribers[i]===friend){
          console.log("yes");
          res.render("friends",{user:foundfriend,isfriend:"yes"});
          a=1;break;//my mistake , because otherwise it will re-render many times
        }
      }
      if(a==0){
          console.log("friend");
          res.render("friends",{user:foundfriend,isfriend:"no"});
        }
      });
    });
  }else{
    res.render("login");
  }
});

app.post("/friends/:username",function(req,res){
  const friend = req.params.username;
  const user = req.user.username;
  User.findOne({username:user},function(err,founduser){
    founduser.subscribers.push(friend);
    founduser.save();//my mistake
    console.log(founduser);
    // res.redirect("/friends/"+friend);
    res.redirect("/network");
  });
});




app.listen(3006 || process.env.PORT ,function(req,res){
  console.log("Yuhu");
});
