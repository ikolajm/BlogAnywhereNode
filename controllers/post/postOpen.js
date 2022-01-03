const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Post = require('../../db').Post;
const User = require('../../db').User;
const Comment = require('../../db').Comment;
const PostLikes = require('../../db').PostLike;
const CommentLikes = require('../../db').CommentLike;
const { Op } = require("sequelize");
const moment = require('moment');

// Get all posts
router.get('/all', async (req, res) => {
    let query =  req.query.q ? req. query.q : ''

    let posts = await Post.findAll({
        where: { 'content': { [Op.iLike]: '%' + query + '%' } },
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
    
    // Iterate over each post and addnecessary values
    posts.forEach(post => {
        post = post.dataValues
        postAuthor = post.user
        // Post participant data
        post.participants = []
        post.currentParticipantsId = []
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

    // Get activity object info
    let activityItems = []

    // Recent posts
    let recentposts = await Post.findAll({
        limit: 3,
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
    recentposts.forEach(post => {
        post = post.dataValues
        post.type = 'post'
        // Post participant data
        post.participants = []
        post.currentParticipantsId = []
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
    })

    // Get all recent comments
    let recentcomments = await Comment.findAll({
        limit: 3,
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
        // if (index === 0) {
        //     console.log(168, comment)
        // }
        activityItems.push(comment)
    })


    // Get all recent postlikes
    let postlikes = await PostLikes.findAll({
        limit: 3,
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

    if (posts) {
        res.json({
            status: "SUCCESS",
            posts,
            activity: activityItems
        })
    } 
})

router.get('/view/:id', async (req, res) => {
    let post = await Post.findOne({
        where: { id: req.params.id },
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
                order: [['createdAt', 'DESC']],
                include: [
                    {
                        model: User,
                    },
                    {
                        model: CommentLikes,
                    }
                ]
            }
        ]
    })
    
    // Iterate over each post and addnecessary values
    post = post.dataValues
    postAuthor = post.user
    // Post participant data
    post.participants = []
    let presentParticipantID = []
    post.comments.forEach(comment => {
        comment = comment.dataValues
        if (!presentParticipantID.includes(comment.user.id)) {
            presentParticipantID.push(comment.user.id)
            post.participants.push(comment.user)
        }
        let tempUserLikes = []
        comment.commentlikes.forEach(like => {
            tempUserLikes.push(like.userId)
        })
        comment.commentlikeIds = tempUserLikes
    })

    // Liked by user
    // post.liked = false
    let tempUserLikes = []
    post.postlikes.forEach(like => {
        tempUserLikes.push(like.userId)
    })
    post.postlikeIds = tempUserLikes

    // Commented by user
    post.commented = false

    if (post) {
        res.json({
            status: "SUCCESS",
            post
        })
    } 
})

module.exports = router;