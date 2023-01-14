"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class electionsModel extends Model {
    static addElection({ electionName, adminID }) {
      return this.create({
        electionName,
        adminID,
      });
    }

    static getElections(adminID) {
      return this.findAll({
        where: {
          adminID,
        },
        order: [["id", "ASC"]],
      });
    }

    static getElection(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }

    static Launchelection(id) {
      return this.update(
        {
          running: true,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      );
    }

    static associate(models) {
      // define association here
      electionsModel.belongsTo(models.adminModel, {
        foreignKey: "adminID",
      });

      electionsModel.hasMany(models.questionsModel, {
        foreignKey: "electionID",
      });

      electionsModel.hasMany(models.votersModel, {
        foreignKey: "electionID",
      });
    }
  }
  electionsModel.init(
    {
      electionName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      running: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "electionsModel",
      freezeTableName: true,
    }
  );
  return electionsModel;
};
