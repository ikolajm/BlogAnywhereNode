require("dotenv").config();
const express = require('express')
const app = express();
const port = process.env.PORT || 5000;

// Body parser replacement
app.use(express.json());

// Init sequelize ORM
const sequelize = require('./db').sequelize;
sequelize.sync();

// Headers
app.use(require("./middleware/headers"));

app.get('/', (req, res) => {
    res.json({
        message: "Base endpoint reached successfully!"
    })
})

const UserOpen = require("./controllers/user/userOpen");
app.use('/user', UserOpen);
const PostOpen = require('./controllers/post/postOpen');
app.use('/post', PostOpen)

// Closed Routes
app.use(require("./middleware/validate-session"));
const UserClosed = require('./controllers/user/userClosed');
app.use('/user', UserClosed)
const PostClosed = require('./controllers/post/postClosed');
app.use('/post', PostClosed)
const CommentClosed = require('./controllers/comment/commentClosed')
app.use('/comment', CommentClosed)

app.listen(port, () => console.log(`App is listening on port ${port}`));