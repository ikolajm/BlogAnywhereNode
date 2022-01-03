const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Post = require('../../db').Post;
const Comment = require('../../db').Comment;
const PostLikes = require('../../db').PostLike;
const User = require('../../db').User;

// Get post for edit
router.get('/view/edit/:id', async (req, res) => {
    let post = await Post.findOne({
        where: { id: req.params.id }
    })

    if (post.id) {
        res.json({
            status: "SUCCESS",
            post
        })
    }
})

// Get post for delete
router.get('/view/delete/:id', async (req, res) => {
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
                include: [{
                    model: User
                }]
            }
        ]
    })

    post = post.dataValues
    if (post.id) {
        postAuthor = post.user
        // Post participant data
        post.participants = []
        let presentParticipantID = []
        post.comments.forEach(comment => {
            if (!presentParticipantID.includes(comment.user.id)) {
                presentParticipantID.push(comment.user.id)
                post.participants.push(comment.user)
            }
        })
        // Liked by user
        post.liked = false
        // Commented by user
        post.commented = false

        res.json({
            status: "SUCCESS",
            post
        })
    }
})

// Create Post
router.post('/create', async (req, res) => {
    let body = req.body;
    let user = req.user;
    console.log(user)
    let { content } = body

    // Ensure essential fields filled in
    if (content.trim() === '') {
        return res.json({
            status: "ERROR",
            message: "Cannot create post with missing content"
        })
    }

    let edited = false
    let postToCreate = {
        uuid: await uuidv4(),
        edited,
        content,
        userId: user.id
    }
    let createdPost = await Post.create(postToCreate);

    if (!createdPost.id) {
        return res.json({
            status: "ERROR",
            message: "Failure to create post, please try again later"
        })
    }

    res.json({
        status: "SUCCESS",
        post: createdPost
    })
})

router.put('/update/:id', async (req, res) => {
    let body = req.body;
    let user = req.user;
    let { content } = body
    let edited = true

    let postToUpdate = await Post.findOne({
        where: {id: req.params.id}
    })

    if (postToUpdate.userId !== user.id) {
        return res.json({
            status: "ERROR",
            message: "Not authorized to edit this post"
        })
    }

    let postObj = {
        content,
        edited
    }

    let updatedPost = await Post.update(
        postObj,
        { 
            where: { id: req.params.id },
            returning: true,
            plain: true
        }
    )

    if (updatedPost) {
        res.json({
            status: "SUCCESS",
            post: updatedPost
        })
    }
})

router.delete('/delete/:id', async (req, res) => {
    let user = req.user;

    let postToDelete = await Post.findOne({
        where: {id: req.params.id}
    })

    if (postToDelete.userId !== user.id) {
        return res.json({
            status: "ERROR",
            message: "Not authorized to edit this post"
        })
    }

    Post.destroy({
        where: { userId: req.user.id, id: req.params.id }
    })
    .then(deleted => res.json({
         status: "SUCCESS" ,
         message: "Successfully deleted post"
    }))
    .catch(err => res.json({ status: "ERROR", err: err.message }))
})

router.post('/like/:id', async (req, res) => {
    let user = req.user;

    let uuid = await uuidv4();
    let postLike = await PostLikes.create({uuid, userId: user.id, postId: req.params.id})
    let postToLike = await Post.findOne({
        where: {id: req.params.id},
        include: [
            // Likes
            {
                model: PostLikes
            }
        ]
    })

    if (postLike.id) {
        res.json({
            status: "SUCCESS",
            likedPost: postToLike
        })
    }
})

router.delete('/unlike/:id', async (req, res) => {
    let user = req.user;

    let postLikeDestroy = await PostLikes.destroy({
        where: { userId: user.id, postId: req.params.id }
    })
        .then(async destroyed => {
            let unlikedPost = await Post.findOne({
                where: {id: req.params.id},
                include: [
                    // Likes
                    {
                        model: PostLikes
                    }
                ]
            })
            res.json({
                status: "SUCCESS",
                unlikedPost
            })
        })
        .catch(err => {
            res.json({
                status: "ERROR",
                err
            })
        })
})

module.exports = router;