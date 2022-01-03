const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Post = require('../../db').Post;
const Comment = require('../../db').Comment;
const PostLikes = require('../../db').PostLike;
const CommentLikes = require('../../db').CommentLike;
const User = require('../../db').User;

// Create a comment
router.post('/create', async (req, res) => {
    let body = req.body;
    let user = req.user;
    let { content, postId } = body

    // Ensure essential fields filled in
    if (content.trim() === '') {
        return res.json({
            status: "ERROR",
            message: "Cannot create comment with missing content"
        })
    }

    let edited = false
    let commentToCreate = {
        uuid: await uuidv4(),
        edited,
        content,
        postId,
        userId: user.id
    }
    let createdComment = await Comment.create(commentToCreate);
    createdComment.user = req.user

    if (!createdComment.id) {
        return res.json({
            status: "ERROR",
            message: "Failure to create comment, please try again later"
        })
    }

    res.json({
        status: "SUCCESS",
        comment: createdComment
    })
})

// Edit a comment
// Get comment to be edited
// Get post for edit
router.get('/view/edit/:id', async (req, res) => {
    let comment = await Comment.findOne({
        where: { id: req.params.id },
        include: [
            // Author
            {
                model: User
            },
            // Likes
            {
                model: CommentLikes
            }
        ]
    })

    comment = comment.dataValues
    if (comment.id) {
        res.json({
            status: "SUCCESS",
            comment
        })
    }
})

// Handle submit of comment modification
router.put('/edit/:id', async (req, res) => {
    let commentToUpdate = await Comment.findOne({
        where: {id: req.params.id}
    })

    if (commentToUpdate.userId !== req.user.id) {
        return res.json({
            status: "ERROR",
            message: "Not authorized to edit this comment"
        })
    }

    let edited = true
    let {content} = req.body
    let commentObj = {
        content,
        edited
    }

    let updatedComment = await Comment.update(
        commentObj,
        { 
            where: { id: req.params.id },
            returning: true,
            plain: true
        }
    )

    if (updatedComment) {
        res.json({
            status: "SUCCESS",
            comment: updatedComment
        })
    }
})

// Get comment to delete
router.get('/view/delete/:id', async (req, res) => {
    let comment = await Comment.findOne({
        where: { id: req.params.id },
        include: [
            // Author
            {
                model: User
            },
            // Likes
            {
                model: CommentLikes
            }
        ]
    })

    comment = comment.dataValues

    let tempUserLikes = []
    comment.commentlikes.forEach(like => {
        tempUserLikes.push(like.userId)
    })
    comment.commentlikeIds = tempUserLikes

    if (comment.id) {
        res.json({
            status: "SUCCESS",
            comment
        })
    }
})

// Delete a comment
router.delete('/delete/:id', async (req, res) => {
    let user = req.user;

    let commentToDelete = await Comment.findOne({
        where: {id: req.params.id}
    })

    if (commentToDelete.userId !== user.id) {
        return res.json({
            status: "ERROR",
            message: "Not authorized to delete this comment"
        })
    }

    Comment.destroy({
        where: { userId: req.user.id, id: req.params.id }
    })
    .then(deleted => res.json({
         status: "SUCCESS" ,
         message: "Successfully deleted comment"
    }))
    .catch(err => res.json({ status: "ERROR", err: err.message }))
})

// Like a comment
router.post('/like/:id', async (req, res) => {
    let user = req.user;

    let uuid = await uuidv4();
    let commentLike = await CommentLikes.create({uuid, userId: user.id, commentId: req.params.id})
    let commentToLike = await Comment.findOne({
        where: {id: req.params.id},
        include: [
            // Likes
            {
                model: CommentLikes
            }
        ]
    })

    if (commentLike.id) {
        res.json({
            status: "SUCCESS",
            likedComment: commentToLike
        })
    }
})

// Unlike a comment
router.delete('/unlike/:id', async (req, res) => {
    let user = req.user;

    let commentLikeDestroy = await CommentLikes.destroy({
        where: { userId: user.id, commentId: req.params.id }
    })
        .then(async destroyed => {
            let unlikedComment = await Comment.findOne({
                where: {id: req.params.id},
                include: [
                    // Likes
                    {
                        model: CommentLikes
                    }
                ]
            })
            res.json({
                status: "SUCCESS",
                unlikedComment
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