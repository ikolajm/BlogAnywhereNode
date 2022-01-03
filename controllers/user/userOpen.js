const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../db').User;
const Post = require('../../db').Post;
const Comment = require('../../db').Comment;
const PostLikes = require('../../db').PostLike;
const CommentLikes = require('../../db').CommentLike;
const { Op } = require("sequelize");
const moment = require('moment');

// Create user (SIGN UP)
router.post('/create', async (req, res) => {
    let body = req.body;
    let { name, username, email, password, confirmPassword } = body

    // Ensure essential fields filled in
    if (username.trim() === ''  || username.trim() === '' || email.trim() === '' || password.trim() === '' || confirmPassword === '') {
        return res.json({
            status: "ERROR",
            message: "Cannot create user with missing fields"
        })
    }

    // Ensure passwords match
    if (password.trim() !== confirmPassword.trim()) {
        return res.json({
            status: "ERROR",
            message: "Please ensure passwords match"
        })
    }

    // Check if an account is already using that email
    let accountSearch = await User.findOne({
        where: {
            email: email
        }
    })
    if (accountSearch !== null) {
        return res.json({
            status: "ERROR",
            message: "An account is already using that email"
        })
    }

    let bio = ""
    let avatar = "https://jmi-bloganywhere.s3.us-east-2.amazonaws.com/images/avatar.png"
    password = await bcrypt.hashSync(password, 10)
    let userToCreate = {
        uuid: await uuidv4(),
        name,
        username,
        email,
        bio,
        avatar,
        password
    }
    let createdUser = await User.create(userToCreate);
    let token = jwt.sign( { uuid: createdUser.uuid }, process.env.JWT_SECRET, { expiresIn: 60*60*24 });

    if (!createdUser.uuid) {
        return res.json({
            status: "ERROR",
            message: "Failure to create user account, please try again later"
        })
    }

    res.json({
        status: "SUCCESS",
        sessionToken: token,
        user: createdUser
    })
})

// Retrieve user (LOGIN)
router.post('/login', async (req, res) => {
    let body = req.body;
    let { email, password } = body;

    // IF forms are not filled  in
    if (email.trim() === '' || password.trim() === '') {
        return res.json({
            status: "ERROR",
            message: "Cannot create account with null fields"
        })
    }
    // If the email is not found
    let userSearch = await User.findOne({
        where: {
            email: email
        }
    })
    if (userSearch === null) {
        return res.json({
            status: "ERROR",
            message: "Account not found with that email"
        })
    }

    // If a user is found, tap into the given user information
    const user = userSearch.dataValues;

    // Compare the encrypted user password to the given password
    bcrypt.compare(password, user.password, async (err, match) => {
        if (err) {
            return res.json({
                status: "ERROR",
                message: `${err.message}`
            })
        }

        // If passwords do not match
        if (match === false) {
            return res.json({
                status: "ERROR",
                message: "Password does not match the provided email"
            })
        }

        // If match, assign token and return user
        let token = await jwt.sign( { uuid: user.uuid }, process.env.JWT_SECRET, { expiresIn: 60*60*24 });
        res.json({
            status: "SUCCESS",
            sessionToken: token,
            user
        })
    })
})

// Check the given token and see if the user has access to a quick load
router.post("/authenticate", (req, res) => {
    let sessionToken = req.body.token;
    jwt.verify(sessionToken, process.env.JWT_SECRET, async (err, decodedToken) => {
        if (err) {
            return res.json({
                status: "ERROR",
                message: "Valid user session not found with current token"
            })
        }

        if (decodedToken === undefined) {
            return res.json({
                status: "ERROR",
                message: "Valid user session not found with current token"
            })
        }

        let user = await User.findOne({ where: { uuid: decodedToken.uuid } })
        
        res.json({
            status: "SUCCESS",
            user
        })
    })
})

// Get profile with posts, activity data, and full user
router.get('/:userId', async (req, res) => {
    // Get user
    let user = await User.findOne({
        where: { id: req.params.userId}
    })

    // Get Posts
    let query =  req.query.search ? req.query.search : ''
    let posts = await Post.findAll({
        where: { content: { [Op.iLike]: '%' + query + '%' } , userId: req.params.userId },
        order: [['updatedAt', 'DESC']],
        include: [
            // Author
            {
                model: User
            },
            // Likes
            {
                model: PostLikes
            },
            // Comments
            {
                model: Comment,
                include: [{
                    model: User
                }]
            }
        ]
    })
    // Form post objects for react render
    posts.forEach(post => {
        post = post.dataValues
        post.participants = [];
        post.currentParticipantsId = [];
        post.comments.forEach(comment => {
            if (!post.currentParticipantsId.includes(comment.user.id)) {
                post.currentParticipantsId.push(comment.user.id)
                post.participants.push(comment.user)
            }
        })

        // Liked by user
        // post.liked = false
        let tempUserLikes = []
        post.postlikes.forEach(like => {
            tempUserLikes.push(like.userId)
        })
        post.postlikeIds = tempUserLikes
    })

    // Form activity data
    // Get activity object info
    let activityItems = []

    // Recent posts
    let recentposts = await Post.findAll({
        limit: 3,
        where: { userId: user.id },
        order: [['updatedAt', 'DESC']],
        include: [
            // Author
            {
                model: User,
            },
            // Likes
            {
                model: PostLikes,
            },
            // Comments
            {
                model: Comment,
                include: [{
                    model: User,
                }]
            }
        ]
    })
    // Process recentposts
    recentposts.forEach((p,index) => {
        let post = p.dataValues
        post.type = 'post'
        // Post participant data
        post.participants = [];
        post.currentParticipantsId = [];
        post.comments.forEach(comment => {
            if (!post.currentParticipantsId.includes(comment.user.id)) {
                post.currentParticipantsId.push(comment.user.id)
                post.participants.push(comment.user)
            }
        })
        // Liked by user
        let tempUserLikes = []
        post.postlikes.forEach(like => {
            tempUserLikes.push(like.userId)
        })
        post.postlikeIds = tempUserLikes
        activityItems.push(post)

        // if (index === 0) {
        //     console.log(post, post.currentParticipantsId)
        // }
    })

    // Get all recent comments
    let recentcomments = await Comment.findAll({
        limit: 3,
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
        include: [
            // Author
            {
                model: User
            },
            // Likes
            {
                model: CommentLikes
            },
            {
                model: Post,
                include: [
                    {
                        model: Comment,
                        include: [
                            {
                                model: User
                            }
                        ]
                    }
                ]
            }
        ]
    })
    // Process recentcomments (isLiked, likes)
    recentcomments.forEach((c, index) => {
        let comment = c.dataValues
        if (index === 0) {
            // console.log(141, comment)
        }
        comment.type = 'comment'
        // Liked by user
        let tempUserLikes = []
        comment.commentlikes.forEach((l, index) => {
            let like = l.dataValues
            if (index === 0) {
                // console.log(149, like)
            }
            tempUserLikes.push(like.userId)
        })
        comment.commentlikeIds = tempUserLikes
        
        // Post participant data
        let p = comment.post
        let post = p.dataValues
        post.participants = []
        post.currentParticipantsId = []
        let postComments = post.comments
        postComments.forEach(comment => {
            comment = comment.dataValues
            if (!post.currentParticipantsId.includes(comment.userId)) {
                post.currentParticipantsId.push(comment.userId)
                post.participants.push(comment.user)
            }
        })
        activityItems.push(comment)
    })


    // Get all recent postlikes
    let postlikes = await PostLikes.findAll({
        limit: 3,
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
        include: [
            // Author
            {
                model: User
            },
            // Post
            {
                model: Post,
                include: [
                    {
                        model: PostLikes
                    }
                ]
            }
        ]
    })
    // Process postlike info
    postlikes.forEach(l => {
        let like = l.dataValues
        like.type = 'postlike'
        let post = like.post.dataValues

        // See if there is a current user, and if so see if the user has already liked the liked post
        let tempUserLikes = []
        post.postlikes.forEach(pl => {
            let postlike = pl.dataValues
            tempUserLikes.push(postlike.userId)
        })
        post.postlikeIds = tempUserLikes
        activityItems.push(like)
    })

    // Get all recent commentlikes
    let commentlikes = await CommentLikes.findAll({
        limit: 3,
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
        include: [
            // Author
            {
                model: User
            },
            // Comment
            {
                model: Comment,
                include: [
                    {
                        model: CommentLikes
                    }
                ]
            }
        ]
    })
    commentlikes.forEach((l, index) => {
        let like = l.dataValues
        like.type = 'commentlike'
        let c = like.comment
        let comment = c.dataValues
        // console.log(231, comment)

        let tempUserLikes = []
        comment.commentlikes.forEach(cl => {
            let commentlike = cl.dataValues
            tempUserLikes.push(commentlike.userId)
        })
        comment.commentlikeIds = tempUserLikes
        activityItems.push(like)
    })

    // Sort activities by most recent
    activityItems = activityItems.sort((a, b) => moment(a.createdAt).format("X") - moment(b.createdAt).format("X"))
    activityItems.reverse()
    // activityItems = activityItems.slice(0, 3)
    
    if (user && posts) {
        res.json({
            status: "SUCCESS",
            user, 
            posts,
            activity: activityItems
        })
    }
})

module.exports = router;