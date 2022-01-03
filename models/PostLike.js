module.exports = (sequelize, DataTypes) => {
    const PostLike = sequelize.define('postlike', {
        uuid: {
            type: DataTypes.STRING,
            allowNull: false
        }
    })
    return PostLike;
}