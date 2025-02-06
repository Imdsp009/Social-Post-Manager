const express=require('express');
const app=express();
const userModel=require("./models/user");
const postModel=require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt=require('bcrypt');
const jwt= require('jsonwebtoken');
const post = require('./models/post');
app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser())


app.get('/',(req,res)=>{
    res.render('index')
})

app.post('/register',async (req,res)=>{
  let {email, password , username , name , age}= req.body
   let user= await userModel.findOne({email})
   if(user) return res.status(500).send("User already Registered");
   bcrypt.genSalt(10,(err,salt)=>{
    bcrypt.hash(password,salt,async(err,hash)=>{
      let user= await userModel.create({
          username,
          email,
          age,
          name,
          password:hash
      });
      let token= jwt.sign({email:email, userid: user._id},"shhhh");
      res.cookie("token",token);
      res.send("registered")
    })
   })

})
app.get('/profile',isLoggedIn,async(req,res)=>{
  let user=await userModel.findOne({email:req.user.email}).populate("posts");

  res.render('profile', { user });
})
app.get('/like/:id', isLoggedIn, async (req, res) => {
  // Use findById to query by post's _id
  let post = await postModel.findById(req.params.id).populate("user");

  if (!post) return res.status(404).send("Post not found");

  // Check if the user has already liked the post
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);  // Add like if not already liked
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);  // Remove like if already liked
  }

  // Save the updated post
  await post.save();
  res.redirect("/profile");
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
  // Use findById to query by post's _id
  let post = await postModel.findById(req.params.id).populate("user");

  // Check if the post exists
  if (!post) return res.status(404).send("Post not found");

  res.render("edit", { post });
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
  // Use findByIdAndUpdate for updating the post by its _id
  let post = await postModel.findByIdAndUpdate(req.params.id, { content: req.body.content }, { new: true });

  if (!post) return res.status(404).send("Post not found");

  res.redirect("/profile");
});


app.post('/post',isLoggedIn,async(req,res)=>{
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;
  let post = await postModel.create({
    user: user._id,
    content
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
})

app.post('/login',async (req,res)=>{
  let {email, password }= req.body
   let user= await userModel.findOne({email})
   if(!user) return res.status(500).send("Something Went Wrong");
   bcrypt.compare(password,user.password,function(err,result){
    if(result){
      let token= jwt.sign({email:email, userid: user._id},"shhhh");
      res.cookie("token",token);
      res.status(200).redirect("/profile")

    }
    else res.redirect("/login");
   });


})
app.get('/login',(req,res)=>{
  res.render('login')
})
app.get('/logout',(req,res)=>{
  res.cookie("token","");
  res.redirect("/login")
})

function isLoggedIn(req,res,next){
  if(req.cookies.token==="") res.send("You must be logged in");
  else{
    let data= jwt.verify(req.cookies.token,"shhhh");
    req.user=data;
    next();
  }
  
}

app.listen(3000);