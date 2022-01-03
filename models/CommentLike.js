module.exports = (sequelize, DataTypes) => {
    const CommentLike = sequelize.define('commentlike', {
        uuid: {
            type: DataTypes.STRING,
            allowNull: false
        }
    })
    return CommentLike;
}