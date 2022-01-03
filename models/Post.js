module.exports = (sequelize, DataTypes) => {
    const Post = sequelize.define('post', {
        uuid: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.STRING,
            allowNull: false
        },
        edited: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        }
    })
    return Post;
}