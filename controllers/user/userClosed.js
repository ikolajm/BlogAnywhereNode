const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../db').User;
const Post = require('../../db').Post;
const Comment = require('../../db').Comment;
const PostLikes = require('../../db').PostLike;
const { Op } = require("sequelize");
// Photo uploads
const multer  = require('multer');
const { uploadFile, getFileStream } = require('../../s3');
const upload = multer({ dest: 'images/' })

// Get User for edit
router.get('/view/edit/:id', async (req, res) => {
    let user = await User.findOne({
        where: { id: req.params.id }
    })

    if (user.id) {
        res.json({
            status: "SUCCESS",
            user
        })
    }
})

// Edit user
router.put('/update/:id', upload.single('avatar'), async (req, res) => {
    let file = req.file
    // Path, filename
    let body = req.body;
    let user = req.user;
    let { name, email, username, bio } = body

    let userToUpdate = await User.findOne({
        where: {id: req.params.id}
    })

    if (userToUpdate.id !== user.id) {
        return res.json({
            status: "ERROR",
            message: "Not authorized to edit this user"
        })
    }

    let userObj = {
        name, email, username, bio
    }

    let avatarUpload = await uploadFile(file);
    userObj.avatar = avatarUpload.Location

    let updatedUser = await User.update(
        userObj,
        { 
            where: { id: req.params.id },
            returning: true,
            plain: true
        }
    )

    if (updatedUser) {
        res.json({
            status: "SUCCESS",
            user: updatedUser[1]
        })
    }
})

module.exports = router;