const Sequelize = require("sequelize");

// Initialize postgres/RDS connection
const sequelize = new Sequelize(`${process.env.RDS_DBNAME}`, `${process.env.RDS_USERNAME}`, `${process.env.RDS_PASSWORD}`, {
    host     : process.env.RDS_HOSTNAME,
    port     : process.env.RDS_PORT,
    dialect: "postgres",
    ssl: 'Amazon RDS'
});

// Authenticate postgres connection
sequelize.authenticate()
// COMMENT OUT PROMISE CODE WHEN JEST TESTING **
.then(() => console.log('Successful connection to postgres database...'))
.catch(err => console.log('POSTGRES CONNECTION FAILURE:', err));

// db Object init
const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.User = require("./models/User")(sequelize, Sequelize);
db.Post = require("./models/Post")(sequelize, Sequelize);
db.Comment = require("./models/Comment")(sequelize, Sequelize);
db.PostLike = require("./models/PostLike")(sequelize, Sequelize);
db.CommentLike = require("./models/CommentLike")(sequelize, Sequelize);

// Associations
// User - has posts, has comments, has postlikes, has commentlikes
db.User.hasMany(db.Post)
db.User.hasMany(db.Comment)
db.User.hasMany(db.PostLike)
db.User.hasMany(db.CommentLike)
// Post - has a user, has post likes, has comments
db.Post.belongsTo(db.User)
db.Post.hasMany(db.PostLike)
db.Post.hasMany(db.Comment)
// Comment - has a user, has a post, has comment likes
db.Comment.belongsTo(db.User)
db.Comment.belongsTo(db.Post)
db.Comment.hasMany(db.CommentLike)
// PostLike - has a user and has a post
db.PostLike.belongsTo(db.User)
db.PostLike.belongsTo(db.Post)
// CommentLike - has a user and has a comment
db.CommentLike.belongsTo(db.User)
db.CommentLike.belongsTo(db.Comment)

module.exports = db;