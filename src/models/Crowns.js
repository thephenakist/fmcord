module.exports = (sequelize, DataTypes) => {
  const Crowns = sequelize.define(`crowns`, {
    guildID: DataTypes.STRING,
    userID: DataTypes.STRING,
    artistName: DataTypes.STRING,
    artistPlays: DataTypes.STRING
  }, {
    indexes: [{
      unique: true,
      fields: [`guildID`, `userID`, `artistName`]
    }]
  });
  return Crowns;
};
