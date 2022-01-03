module.exports = (sequelize, DataTypes) => {
    const Comment = sequelize.define('comment', {
        uuid: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.STRING,
            allowNull: false
        }
    })
    return Comment;
}